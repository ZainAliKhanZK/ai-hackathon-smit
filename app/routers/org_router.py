from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CompanySetting, Department, Designation, LeaveType, PublicHoliday, User
from app.schemas import (
    CompanySettingResponse, CompanySettingUpdate,
    DepartmentCreate, DepartmentResponse,
    DesignationCreate, DesignationResponse,
    LeaveTypeCreate, LeaveTypeResponse,
    PublicHolidayCreate, PublicHolidayResponse
)
from app.auth import get_current_user, RequireRole
from app.services.org_service import get_company_settings, update_company_settings
from app.audit import log_audit_event

router = APIRouter(prefix="/api/org", tags=["Organization Setup"])

# Company Settings (Functionality 03)
@router.get("/settings", response_model=CompanySettingResponse)
def view_settings(
    current_user: User = Depends(RequireRole(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    return get_company_settings(db)

@router.put("/settings", response_model=CompanySettingResponse)
def edit_settings(
    req: CompanySettingUpdate,
    current_user: User = Depends(RequireRole(["ADMIN"])),
    db: Session = Depends(get_db)
):
    before = get_company_settings(db)
    before_dict = {
        "company_name": before.company_name,
        "office_start": before.office_start,
        "grace_time_minutes": before.grace_time_minutes,
        "office_radius_meters": before.office_radius_meters
    }

    updated = update_company_settings(db, req.model_dump(exclude_unset=True))

    log_audit_event(
        db=db,
        actor=current_user,
        action="UPDATE",
        entity="SETTINGS",
        entity_id=str(updated.id),
        before=before_dict,
        after=req.model_dump(exclude_unset=True)
    )

    return updated

# Departments (Functionality 04)
@router.get("/departments", response_model=List[DepartmentResponse])
def list_departments(
    current_user: User = Depends(RequireRole(["ADMIN", "HR", "EMPLOYEE"])),
    db: Session = Depends(get_db)
):
    return db.query(Department).all()

@router.post("/departments", response_model=DepartmentResponse)
def create_department(
    req: DepartmentCreate,
    current_user: User = Depends(RequireRole(["ADMIN"])),
    db: Session = Depends(get_db)
):
    if db.query(Department).filter((Department.name == req.name) | (Department.code == req.code)).first():
        raise HTTPException(status_code=400, detail="Department with this name or code already exists")

    dept = Department(name=req.name, code=req.code)
    db.add(dept)
    db.commit()
    db.refresh(dept)

    log_audit_event(
        db=db,
        actor=current_user,
        action="CREATE",
        entity="SETTINGS",
        entity_id=str(dept.id),
        after={"department_name": dept.name, "code": dept.code}
    )

    return dept

# Designations (Functionality 04)
@router.get("/designations", response_model=List[DesignationResponse])
def list_designations(
    current_user: User = Depends(RequireRole(["ADMIN", "HR", "EMPLOYEE"])),
    db: Session = Depends(get_db)
):
    items = db.query(Designation).all()
    res = []
    for d in items:
        res.append(DesignationResponse(
            id=d.id,
            title=d.title,
            department_id=d.department_id,
            department_name=d.department.name if d.department else None
        ))
    return res

@router.post("/designations", response_model=DesignationResponse)
def create_designation(
    req: DesignationCreate,
    current_user: User = Depends(RequireRole(["ADMIN"])),
    db: Session = Depends(get_db)
):
    dept = db.query(Department).filter(Department.id == req.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    desig = Designation(title=req.title, department_id=req.department_id)
    db.add(desig)
    db.commit()
    db.refresh(desig)

    log_audit_event(
        db=db,
        actor=current_user,
        action="CREATE",
        entity="SETTINGS",
        entity_id=str(desig.id),
        after={"title": desig.title, "department": dept.name}
    )

    return DesignationResponse(
        id=desig.id,
        title=desig.title,
        department_id=desig.department_id,
        department_name=dept.name
    )

# Leave Types & Quotas (Functionality 04)
@router.get("/leave-types", response_model=List[LeaveTypeResponse])
def list_leave_types(
    current_user: User = Depends(RequireRole(["ADMIN", "HR", "EMPLOYEE"])),
    db: Session = Depends(get_db)
):
    return db.query(LeaveType).all()

@router.post("/leave-types", response_model=LeaveTypeResponse)
def create_leave_type(
    req: LeaveTypeCreate,
    current_user: User = Depends(RequireRole(["ADMIN"])),
    db: Session = Depends(get_db)
):
    if db.query(LeaveType).filter(LeaveType.name == req.name).first():
        raise HTTPException(status_code=400, detail="Leave type already exists")

    lt = LeaveType(name=req.name, quota=req.quota)
    db.add(lt)
    db.commit()
    db.refresh(lt)

    log_audit_event(
        db=db,
        actor=current_user,
        action="CREATE",
        entity="SETTINGS",
        entity_id=str(lt.id),
        after={"name": lt.name, "quota": lt.quota}
    )

    return lt

# Public Holidays (Functionality 04)
@router.get("/holidays", response_model=List[PublicHolidayResponse])
def list_holidays(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(PublicHoliday).order_by(PublicHoliday.date.asc()).all()

@router.post("/holidays", response_model=PublicHolidayResponse)
def create_holiday(
    req: PublicHolidayCreate,
    current_user: User = Depends(RequireRole(["ADMIN"])),
    db: Session = Depends(get_db)
):
    if db.query(PublicHoliday).filter(PublicHoliday.date == req.date).first():
        raise HTTPException(status_code=400, detail="Holiday already exists on this date")

    hol = PublicHoliday(name=req.name, date=req.date)
    db.add(hol)
    db.commit()
    db.refresh(hol)

    log_audit_event(
        db=db,
        actor=current_user,
        action="CREATE",
        entity="SETTINGS",
        entity_id=str(hol.id),
        after={"holiday": hol.name, "date": hol.date}
    )

    return hol
