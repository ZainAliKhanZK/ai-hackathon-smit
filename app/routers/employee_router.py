import csv
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Employee, User, Department, Designation
from app.schemas import (
    EmployeeCreate, EmployeeUpdate, EmployeeSelfUpdate,
    EmployeeResponse, CSVDryRunResult
)
from app.auth import get_current_user, RequireRole, enforce_employee_scope
from app.services.employee_service import (
    register_employee, update_employee, get_employee_360,
    dry_run_csv_import, calculate_salary_breakdown
)
from app.audit import log_audit_event

router = APIRouter(prefix="/api/employees", tags=["Employees"])

# Register Employee (Functionality 06)
@router.post("", response_model=dict)
def create_new_employee(
    req: EmployeeCreate,
    current_user: User = Depends(RequireRole(["HR"])),
    db: Session = Depends(get_db)
):
    emp, temp_pw = register_employee(db, req.model_dump(), current_user)
    return {
        "message": f"Employee {emp.first_name} {emp.last_name} registered successfully!",
        "employee_id": emp.id,
        "employee_code": emp.employee_code,
        "login_email": emp.email,
        "temporary_password": temp_pw
    }

# Employee Directory (Functionality 07)
@router.get("", response_model=dict)
def list_employees(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Employee)

    # Data scope guard: Employee only sees own record in directory
    if current_user.role == "EMPLOYEE":
        query = query.filter(Employee.id == current_user.employee_id)
    else:
        if department_id:
            query = query.filter(Employee.department_id == department_id)
        if status_filter:
            query = query.filter(Employee.status == status_filter)
        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Employee.first_name.ilike(s),
                    Employee.last_name.ilike(s),
                    Employee.employee_code.ilike(s),
                    Employee.email.ilike(s)
                )
            )

    total = query.count()
    employees = query.order_by(Employee.id.desc()).offset((page - 1) * limit).limit(limit).all()

    items = []
    for e in employees:
        salary_info = calculate_salary_breakdown(e.basic_salary)
        items.append({
            "id": e.id,
            "employee_code": e.employee_code,
            "first_name": e.first_name,
            "last_name": e.last_name,
            "email": e.email,
            "phone": e.phone,
            "address": e.address,
            "gender": e.gender,
            "department_id": e.department_id,
            "department_name": e.department.name if e.department else None,
            "designation_id": e.designation_id,
            "designation_title": e.designation.title if e.designation else None,
            "join_date": e.join_date,
            "exit_date": e.exit_date,
            "status": e.status,
            "basic_salary": e.basic_salary,
            "gross_salary": salary_info["gross"],
            "created_at": e.created_at
        })

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": items
    }

# Employee 360 Profile (Functionality 07)
@router.get("/{employee_id}/360")
def get_employee_360_profile(
    employee_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    enforce_employee_scope(current_user, employee_id)
    return get_employee_360(db, employee_id)

# Edit Employee Details (Functionality 06)
@router.put("/{employee_id}", response_model=dict)
def update_employee_details(
    employee_id: int,
    req: EmployeeUpdate,
    current_user: User = Depends(RequireRole(["HR"])),
    db: Session = Depends(get_db)
):
    updated = update_employee(db, employee_id, req.model_dump(exclude_unset=True), current_user)
    return {"message": "Employee updated successfully", "id": updated.id}

# Employee Self-Service: Edit own phone and address (Functionality 06)
@router.patch("/me/self-update")
def self_update_profile(
    req: EmployeeSelfUpdate,
    current_user: User = Depends(RequireRole(["EMPLOYEE"])),
    db: Session = Depends(get_db)
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User account is not linked to an employee")
    
    emp = db.query(Employee).filter(Employee.id == current_user.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if req.phone is not None:
        emp.phone = req.phone
    if req.address is not None:
        emp.address = req.address

    db.commit()
    db.refresh(emp)

    log_audit_event(
        db=db,
        actor=current_user,
        action="UPDATE",
        entity="EMPLOYEE",
        entity_id=str(emp.id),
        after={"phone": emp.phone, "address": emp.address}
    )

    return {"message": "Contact info updated successfully", "phone": emp.phone, "address": emp.address}

# CSV Dry Run (Functionality 08)
@router.post("/csv-dry-run", response_model=CSVDryRunResult)
async def csv_import_dry_run(
    file: UploadFile = File(...),
    current_user: User = Depends(RequireRole(["HR"])),
    db: Session = Depends(get_db)
):
    content = await file.read()
    csv_text = content.decode("utf-8", errors="replace")
    result = dry_run_csv_import(db, csv_text)
    return result

# CSV Import Execution (Functionality 08)
@router.post("/csv-import")
async def csv_import_execute(
    file: UploadFile = File(...),
    current_user: User = Depends(RequireRole(["HR"])),
    db: Session = Depends(get_db)
):
    content = await file.read()
    csv_text = content.decode("utf-8", errors="replace")
    dry_run = dry_run_csv_import(db, csv_text)

    if dry_run["invalid_count"] > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot import CSV: {dry_run['invalid_count']} validation errors detected. Run dry-run to inspect issues."
        )

    f = io.StringIO(csv_text)
    reader = csv.DictReader(f)
    dept_map = {d.name.lower().strip(): d.id for d in db.query(Department).all()}
    desig_map = {d.title.lower().strip(): d.id for d in db.query(Designation).all()}

    # default designation if missing
    first_desig = db.query(Designation).first()
    first_desig_id = first_desig.id if first_desig else 1

    created_accounts = []
    for row in reader:
        dept_id = dept_map.get((row.get("department") or "").strip().lower(), 1)
        desig_title = (row.get("designation") or "").strip().lower()
        desig_id = desig_map.get(desig_title, first_desig_id)

        data = {
            "employee_code": row["employee_code"].strip(),
            "first_name": row["first_name"].strip(),
            "last_name": row["last_name"].strip(),
            "email": row["email"].strip(),
            "phone": row.get("phone", "").strip(),
            "address": row.get("address", "").strip(),
            "gender": row.get("gender", "Not Specified").strip(),
            "department_id": dept_id,
            "designation_id": desig_id,
            "join_date": row["join_date"].strip(),
            "basic_salary": float(row["basic_salary"].strip())
        }
        emp, temp_pw = register_employee(db, data, current_user)
        created_accounts.append({
            "employee_code": emp.employee_code,
            "email": emp.email,
            "temp_password": temp_pw
        })

    return {
        "message": f"Successfully imported {len(created_accounts)} employees!",
        "imported_count": len(created_accounts),
        "credentials": created_accounts
    }

# CSV Export (Functionality 08)
@router.get("/export-csv")
def export_employees_csv(
    current_user: User = Depends(RequireRole(["HR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    employees = db.query(Employee).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "employee_code", "first_name", "last_name", "email",
        "phone", "gender", "department", "designation", "join_date", "basic_salary", "gross_salary", "status"
    ])

    for e in employees:
        writer.writerow([
            e.employee_code,
            e.first_name,
            e.last_name,
            e.email,
            e.phone or "",
            e.gender or "",
            e.department.name if e.department else "",
            e.designation.title if e.designation else "",
            e.join_date,
            e.basic_salary,
            e.basic_salary * 1.5,
            e.status
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=employees_export.csv"}
    )
