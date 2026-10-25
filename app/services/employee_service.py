import re
import csv
import io
import secrets
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status

from app.models import Employee, User, Department, Designation, Attendance, LeaveRequest, Payslip
from app.auth import get_password_hash
from app.audit import log_audit_event

EMAIL_REGEX = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
ISO_DATE_REGEX = r"^\d{4}-\d{2}-\d{2}$"

def calculate_salary_breakdown(basic_salary: float) -> dict:
    """
    Business rule:
    Gross = 1.5 * basic
    HRA = 40% of gross (0.40 * 1.5 = 0.60 * basic)
    Medical = 10% of gross (0.10 * 1.5 = 0.15 * basic)
    Basic = 50% of gross (0.50 * 1.5 = 0.75 * basic)
    """
    gross = basic_salary * 1.5
    hra = gross * 0.40
    medical = gross * 0.10
    return {
        "basic": basic_salary,
        "gross": gross,
        "hra": hra,
        "medical": medical
    }

def register_employee(db: Session, data: dict, created_by: User) -> Tuple[Employee, str]:
    """
    Registers an employee and automatically creates their user account with a temporary password.
    must_change_password is set to True.
    """
    # Check duplicate code or email
    if db.query(Employee).filter(Employee.employee_code == data["employee_code"]).first():
        raise HTTPException(status_code=400, detail="Employee code already exists")
    if db.query(Employee).filter(Employee.email == data["email"]).first():
        raise HTTPException(status_code=400, detail="Employee email already exists")
    if db.query(User).filter(User.email == data["email"]).first():
        raise HTTPException(status_code=400, detail="A user account with this email already exists")

    temp_password = secrets.token_urlsafe(8)

    emp = Employee(
        employee_code=data["employee_code"],
        first_name=data["first_name"],
        last_name=data["last_name"],
        email=data["email"],
        phone=data.get("phone"),
        address=data.get("address"),
        gender=data.get("gender", "Not Specified"),
        department_id=data["department_id"],
        designation_id=data["designation_id"],
        join_date=data["join_date"],
        status="ACTIVE",
        basic_salary=data["basic_salary"]
    )
    db.add(emp)
    db.flush()

    user = User(
        email=data["email"],
        hashed_password=get_password_hash(temp_password),
        role="EMPLOYEE",
        is_active=True,
        must_change_password=True,
        employee_id=emp.id
    )
    db.add(user)
    db.commit()
    db.refresh(emp)

    log_audit_event(
        db=db,
        actor=created_by,
        action="CREATE",
        entity="EMPLOYEE",
        entity_id=str(emp.id),
        after={"employee_code": emp.employee_code, "name": f"{emp.first_name} {emp.last_name}"}
    )

    return emp, temp_password

def update_employee(db: Session, employee_id: int, update_data: dict, updated_by: User) -> Employee:
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    before = {
        "first_name": emp.first_name,
        "last_name": emp.last_name,
        "phone": emp.phone,
        "address": emp.address,
        "basic_salary": emp.basic_salary,
        "status": emp.status
    }

    for k, v in update_data.items():
        if v is not None and hasattr(emp, k):
            setattr(emp, k, v)

    db.commit()
    db.refresh(emp)

    after = {
        "first_name": emp.first_name,
        "last_name": emp.last_name,
        "phone": emp.phone,
        "address": emp.address,
        "basic_salary": emp.basic_salary,
        "status": emp.status
    }

    log_audit_event(
        db=db,
        actor=updated_by,
        action="UPDATE",
        entity="EMPLOYEE",
        entity_id=str(emp.id),
        before=before,
        after=after
    )

    return emp

def get_employee_360(db: Session, employee_id: int) -> dict:
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    salary_info = calculate_salary_breakdown(emp.basic_salary)

    attendances = db.query(Attendance).filter(Attendance.employee_id == employee_id).order_by(Attendance.date.desc()).limit(30).all()
    leaves = db.query(LeaveRequest).filter(LeaveRequest.employee_id == employee_id).order_by(LeaveRequest.created_at.desc()).limit(10).all()
    payslips = db.query(Payslip).filter(Payslip.employee_id == employee_id).order_by(Payslip.month.desc()).limit(6).all()

    return {
        "profile": {
            "id": emp.id,
            "employee_code": emp.employee_code,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "email": emp.email,
            "phone": emp.phone,
            "address": emp.address,
            "gender": emp.gender,
            "department": emp.department.name if emp.department else None,
            "designation": emp.designation.title if emp.designation else None,
            "join_date": emp.join_date,
            "exit_date": emp.exit_date,
            "status": emp.status,
            "salary": salary_info
        },
        "recent_attendance": [
            {
                "date": a.date,
                "check_in": a.check_in,
                "check_out": a.check_out,
                "status": a.status,
                "total_hours": a.total_hours
            } for a in attendances
        ],
        "recent_leaves": [
            {
                "id": l.id,
                "type": l.leave_type.name if l.leave_type else "",
                "start_date": l.start_date,
                "end_date": l.end_date,
                "working_days": l.working_days,
                "status": l.status,
                "reason": l.reason
            } for l in leaves
        ],
        "recent_payslips": [
            {
                "id": p.id,
                "month": p.month,
                "gross": p.gross_salary,
                "deductions": p.deduction_amount + p.tax_deduction,
                "net": p.net_salary
            } for p in payslips
        ]
    }

def dry_run_csv_import(db: Session, csv_content: str) -> dict:
    """
    Dry run checking:
    required fields, unique code/email, valid email, known dept, ISO date, salary > 0.
    Returns: row + field + reason.
    """
    f = io.StringIO(csv_content)
    reader = csv.DictReader(f)

    departments_map = {d.name.lower().strip(): d.id for d in db.query(Department).all()}
    existing_codes = set(db.query(Employee.employee_code).all())
    existing_codes = {c[0] for c in existing_codes}
    existing_emails = set(db.query(Employee.email).all())
    existing_emails = {e[0].lower() for e in existing_emails}
    user_emails = set(db.query(User.email).all())
    user_emails = {e[0].lower() for e in user_emails}

    errors = []
    preview = []
    seen_codes = set()
    seen_emails = set()

    row_index = 1
    valid_count = 0

    for row in reader:
        row_index += 1
        row_errors = []

        code = (row.get("employee_code") or "").strip()
        first_name = (row.get("first_name") or "").strip()
        last_name = (row.get("last_name") or "").strip()
        email = (row.get("email") or "").strip()
        dept_name = (row.get("department") or "").strip().lower()
        designation = (row.get("designation") or "").strip()
        join_date = (row.get("join_date") or "").strip()
        salary_str = (row.get("basic_salary") or "").strip()

        # Check required fields
        if not code:
            row_errors.append({"row": row_index, "field": "employee_code", "reason": "employee_code is required"})
        elif code in existing_codes or code in seen_codes:
            row_errors.append({"row": row_index, "field": "employee_code", "reason": f"Employee code '{code}' already exists"})
        seen_codes.add(code)

        if not first_name:
            row_errors.append({"row": row_index, "field": "first_name", "reason": "first_name is required"})
        if not last_name:
            row_errors.append({"row": row_index, "field": "last_name", "reason": "last_name is required"})

        # Check email
        if not email:
            row_errors.append({"row": row_index, "field": "email", "reason": "email is required"})
        elif not re.match(EMAIL_REGEX, email):
            row_errors.append({"row": row_index, "field": "email", "reason": "invalid email format"})
        elif email.lower() in existing_emails or email.lower() in user_emails or email.lower() in seen_emails:
            row_errors.append({"row": row_index, "field": "email", "reason": f"Email '{email}' is already registered"})
        seen_emails.add(email.lower())

        # Check department
        if not dept_name:
            row_errors.append({"row": row_index, "field": "department", "reason": "department is required"})
        elif dept_name not in departments_map:
            row_errors.append({"row": row_index, "field": "department", "reason": f"Department '{dept_name}' not found"})

        # Check ISO date
        if not join_date:
            row_errors.append({"row": row_index, "field": "join_date", "reason": "join_date is required"})
        elif not re.match(ISO_DATE_REGEX, join_date):
            row_errors.append({"row": row_index, "field": "join_date", "reason": "join_date must be in ISO format (YYYY-MM-DD)"})

        # Check salary > 0
        try:
            salary = float(salary_str)
            if salary <= 0:
                row_errors.append({"row": row_index, "field": "basic_salary", "reason": "basic_salary must be > 0"})
        except (ValueError, TypeError):
            row_errors.append({"row": row_index, "field": "basic_salary", "reason": "basic_salary must be a valid number"})

        if row_errors:
            errors.extend(row_errors)
        else:
            valid_count += 1
            if len(preview) < 5:
                preview.append({
                    "employee_code": code,
                    "name": f"{first_name} {last_name}",
                    "email": email,
                    "department": dept_name,
                    "join_date": join_date,
                    "basic_salary": salary_str
                })

    return {
        "valid_count": valid_count,
        "invalid_count": len(errors),
        "total_rows": row_index - 1,
        "errors": errors,
        "preview": preview
    }
