from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PayrollRun, Payslip, Employee, User, CompanySetting
from app.schemas import PayrollRunCreate, PayrollRunResponse, PayslipResponse
from app.auth import get_current_user, RequireRole, enforce_employee_scope
from app.services.payroll_service import run_monthly_payroll, finalize_payroll
from app.services.pdf_service import generate_payslip_pdf
from app.services.org_service import get_company_settings

router = APIRouter(prefix="/api/payroll", tags=["Payroll Lite"])

# Create / review payroll draft (Functionality 15)
@router.post("/run", response_model=PayrollRunResponse)
def create_payroll_run(
    req: PayrollRunCreate,
    current_user: User = Depends(RequireRole(["HR"])),
    db: Session = Depends(get_db)
):
    run = run_monthly_payroll(db, req.month, current_user)
    return run

# List payroll runs (Functionality 15)
@router.get("/runs", response_model=List[PayrollRunResponse])
def list_payroll_runs(
    current_user: User = Depends(RequireRole(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    return db.query(PayrollRun).order_by(PayrollRun.month.desc()).all()

# Get payroll run details (Functionality 15)
@router.get("/runs/{id}", response_model=PayrollRunResponse)
def get_payroll_run_details(
    id: int,
    current_user: User = Depends(RequireRole(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    run = db.query(PayrollRun).filter(PayrollRun.id == id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    return run

# Finalize payroll (Functionality 16: Admin only locks the month)
@router.post("/runs/{id}/finalize", response_model=PayrollRunResponse)
def finalize_month_payroll(
    id: int,
    current_user: User = Depends(RequireRole(["ADMIN"])),
    db: Session = Depends(get_db)
):
    return finalize_payroll(db, id, current_user)

# List payslips (Functionality 17: Employee sees own, HR/Admin see all)
@router.get("/payslips", response_model=List[PayslipResponse])
def list_payslips(
    month: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Payslip)
    if current_user.role == "EMPLOYEE":
        query = query.filter(Payslip.employee_id == current_user.employee_id)
    if month:
        query = query.filter(Payslip.month == month)

    payslips = query.order_by(Payslip.month.desc()).all()
    results = []
    for p in payslips:
        emp = p.employee
        results.append(PayslipResponse(
            id=p.id,
            payroll_run_id=p.payroll_run_id,
            employee_id=p.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
            employee_code=emp.employee_code if emp else "-",
            department_name=emp.department.name if emp and emp.department else "-",
            designation_title=emp.designation.title if emp and emp.designation else "-",
            month=p.month,
            basic_salary=p.basic_salary,
            hra=p.hra,
            medical_allowance=p.medical_allowance,
            gross_salary=p.gross_salary,
            absent_days=p.absent_days,
            half_days=p.half_days,
            unpaid_leave_days=p.unpaid_leave_days,
            deduction_amount=p.deduction_amount,
            tax_deduction=p.tax_deduction,
            net_salary=p.net_salary
        ))
    return results

# Payslip PDF download (Functionality 17)
@router.get("/payslips/{id}/pdf")
def download_payslip_pdf(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    payslip = db.query(Payslip).filter(Payslip.id == id).first()
    if not payslip:
        raise HTTPException(status_code=404, detail="Payslip not found")

    enforce_employee_scope(current_user, payslip.employee_id)

    setting = get_company_settings(db)
    pdf_bytes = generate_payslip_pdf(payslip, setting)

    filename = f"payslip_{payslip.employee.employee_code}_{payslip.month}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
