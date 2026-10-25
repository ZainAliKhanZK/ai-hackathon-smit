import calendar
from datetime import datetime, date
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import PayrollRun, Payslip, Employee, Attendance, LeaveRequest, LeaveType, User
from app.services.org_service import count_working_days, get_company_settings
from app.audit import log_audit_event

def calculate_annual_tax(annual_gross: float) -> float:
    """
    Tax slabs on annual gross (gross * 12) per Section 3:
    - 0 to 600k: 0
    - 600k to 1.2M: 5% of amount > 600k
    - 1.2M to 2.4M: 30,000 + 15% of amount > 1.2M
    - 2.4M to 3.6M: 210,000 + 25% of amount > 2.4M
    - > 3.6M: 510,000 + 35% of amount > 3.6M
    """
    if annual_gross <= 600000:
        return 0.0
    elif annual_gross <= 1200000:
        return (annual_gross - 600000) * 0.05
    elif annual_gross <= 2400000:
        return 30000.0 + (annual_gross - 1200000) * 0.15
    elif annual_gross <= 3600000:
        return 210000.0 + (annual_gross - 2400000) * 0.25
    else:
        return 510000.0 + (annual_gross - 3600000) * 0.35

def get_days_in_month(month_str: str) -> int:
    year, month = [int(p) for p in month_str.split("-")]
    _, num_days = calendar.monthrange(year, month)
    return num_days

def run_monthly_payroll(db: Session, month_str: str, prepared_by: User) -> PayrollRun:
    """
    HR creates and reviews monthly payroll draft.
    If draft exists, updates it. If finalized, raises 400.
    """
    existing_run = db.query(PayrollRun).filter(PayrollRun.month == month_str).first()
    if existing_run and existing_run.status == "FINALIZED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payroll for {month_str} is already FINALIZED and locked. It cannot be edited."
        )

    year, month = [int(p) for p in month_str.split("-")]
    num_days = get_days_in_month(month_str)
    month_start = f"{month_str}-01"
    month_end = f"{month_str}-{num_days:02d}"

    working_days_in_month = count_working_days(month_start, month_end, db)
    if working_days_in_month <= 0:
        working_days_in_month = 22.0  # fallback

    employees = db.query(Employee).filter(Employee.status != "EXITED").all()

    if existing_run:
        # Delete existing draft payslips to recalculate
        db.query(Payslip).filter(Payslip.payroll_run_id == existing_run.id).delete()
        run = existing_run
    else:
        run = PayrollRun(
            month=month_str,
            status="DRAFT"
        )
        db.add(run)
        db.flush()

    total_gross = 0.0
    total_deductions = 0.0
    total_net = 0.0

    unpaid_type = db.query(LeaveType).filter(LeaveType.name.ilike("%unpaid%")).first()
    unpaid_type_id = unpaid_type.id if unpaid_type else None

    for emp in employees:
        # Prorate joiners & leavers
        join_d = datetime.strptime(emp.join_date, "%Y-%m-%d").date()
        m_start_d = datetime.strptime(month_start, "%Y-%m-%d").date()
        m_end_d = datetime.strptime(month_end, "%Y-%m-%d").date()

        # Check if joined after this month
        if join_d > m_end_d:
            continue

        emp_start_d = max(join_d, m_start_d)
        emp_end_d = m_end_d
        if emp.exit_date:
            exit_d = datetime.strptime(emp.exit_date, "%Y-%m-%d").date()
            if exit_d < m_start_d:
                continue
            emp_end_d = min(emp_end_d, exit_d)

        active_working_days = count_working_days(
            emp_start_d.strftime("%Y-%m-%d"),
            emp_end_d.strftime("%Y-%m-%d"),
            db
        )
        prorate_factor = min(1.0, active_working_days / working_days_in_month) if working_days_in_month > 0 else 1.0

        # Base Gross calculation
        base_gross = emp.basic_salary * 1.5
        emp_gross = base_gross * prorate_factor
        emp_basic = (emp.basic_salary) * prorate_factor
        emp_hra = emp_gross * 0.40
        emp_medical = emp_gross * 0.10
        per_day_rate = emp_gross / working_days_in_month if working_days_in_month > 0 else 0.0

        # Attendance counts
        attendances = db.query(Attendance).filter(
            Attendance.employee_id == emp.id,
            Attendance.date >= month_start,
            Attendance.date <= month_end
        ).all()

        half_days = sum(1.0 for a in attendances if a.status == "HALF_DAY")
        lates = sum(1.0 for a in attendances if a.status == "LATE")

        # Unpaid leaves in this month
        unpaid_leaves = 0.0
        if unpaid_type_id:
            unpaid_reqs = db.query(LeaveRequest).filter(
                LeaveRequest.employee_id == emp.id,
                LeaveRequest.leave_type_id == unpaid_type_id,
                LeaveRequest.status == "APPROVED",
                LeaveRequest.start_date <= month_end,
                LeaveRequest.end_date >= month_start
            ).all()
            for r in unpaid_reqs:
                overlap_start = max(r.start_date, month_start)
                overlap_end = min(r.end_date, month_end)
                unpaid_leaves += count_working_days(overlap_start, overlap_end, db)

        # Approved paid leaves in this month
        paid_leave_days = 0.0
        paid_reqs = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == emp.id,
            LeaveRequest.leave_type_id != unpaid_type_id if unpaid_type_id else True,
            LeaveRequest.status == "APPROVED",
            LeaveRequest.start_date <= month_end,
            LeaveRequest.end_date >= month_start
        ).all()
        for r in paid_reqs:
            overlap_start = max(r.start_date, month_start)
            overlap_end = min(r.end_date, month_end)
            paid_leave_days += count_working_days(overlap_start, overlap_end, db)

        # Expected working days vs attended + paid leaves
        attended_days = len(attendances)
        # Absent = expected working days - attended - paid leaves - unpaid leaves
        absent_days = max(0.0, active_working_days - attended_days - paid_leave_days - unpaid_leaves)

        # Bonus Rule: 3 lates = 0.5 day deduction
        late_penalty_days = (int(lates) // 3) * 0.5

        # Deductions
        deduct_days = absent_days + unpaid_leaves + (0.5 * half_days) + late_penalty_days
        deduction_amount = round(deduct_days * per_day_rate, 2)

        # Tax calculation
        annual_gross = emp_gross * 12.0
        annual_tax = calculate_annual_tax(annual_gross)
        monthly_tax = round(annual_tax / 12.0, 2)

        net_salary = round(max(0.0, emp_gross - deduction_amount - monthly_tax), 2)

        payslip = Payslip(
            payroll_run_id=run.id,
            employee_id=emp.id,
            month=month_str,
            basic_salary=round(emp_basic, 2),
            hra=round(emp_hra, 2),
            medical_allowance=round(emp_medical, 2),
            gross_salary=round(emp_gross, 2),
            absent_days=round(absent_days, 1),
            half_days=round(half_days, 1),
            unpaid_leave_days=round(unpaid_leaves, 1),
            deduction_amount=deduction_amount,
            tax_deduction=monthly_tax,
            net_salary=net_salary
        )
        db.add(payslip)

        total_gross += emp_gross
        total_deductions += (deduction_amount + monthly_tax)
        total_net += net_salary

    run.total_gross = round(total_gross, 2)
    run.total_deductions = round(total_deductions, 2)
    run.total_net = round(total_net, 2)

    db.commit()
    db.refresh(run)

    log_audit_event(
        db=db,
        actor=prepared_by,
        action="CREATE" if run.status == "DRAFT" else "UPDATE",
        entity="PAYROLL",
        entity_id=str(run.id),
        after={"month": month_str, "total_gross": run.total_gross, "total_net": run.total_net}
    )

    return run

def finalize_payroll(db: Session, payroll_run_id: int, admin_user: User) -> PayrollRun:
    """
    Only Admin can lock and finalize the payroll run.
    Once finalized, runs are locked and cannot be edited.
    """
    run = db.query(PayrollRun).filter(PayrollRun.id == payroll_run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")

    if run.status == "FINALIZED":
        raise HTTPException(status_code=400, detail="Payroll run is already finalized")

    run.status = "FINALIZED"
    run.finalized_by = admin_user.id
    run.finalized_at = datetime.utcnow()

    db.commit()
    db.refresh(run)

    log_audit_event(
        db=db,
        actor=admin_user,
        action="FINALIZE",
        entity="PAYROLL",
        entity_id=str(run.id),
        after={"month": run.month, "status": "FINALIZED"}
    )

    return run
