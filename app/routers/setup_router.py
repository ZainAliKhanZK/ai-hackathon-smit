from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, CompanySetting, Department, Designation
from app.schemas import FirstRunSetupRequest, CompanySettingResponse
from app.auth import get_password_hash
from app.services.org_service import seed_default_leave_types_if_empty
from app.audit import log_audit_event

router = APIRouter(prefix="/api/setup", tags=["Setup"])

@router.get("/status")
def check_setup_status(db: Session = Depends(get_db)):
    admin_exists = db.query(User).filter(User.role == "ADMIN").first() is not None
    company_setting = db.query(CompanySetting).first()
    return {
        "is_setup_needed": not admin_exists,
        "company_name": company_setting.company_name if company_setting else None
    }

@router.post("/first-run")
def first_run_setup(req: FirstRunSetupRequest, db: Session = Depends(get_db)):
    admin_exists = db.query(User).filter(User.role == "ADMIN").first()
    if admin_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="First-run setup has already been completed. Admin account exists."
        )

    # 1. Company Settings
    setting = db.query(CompanySetting).first()
    if not setting:
        setting = CompanySetting()
        db.add(setting)

    setting.company_name = req.company_name
    setting.office_start = req.office_start or "09:00"
    setting.grace_time_minutes = req.grace_time_minutes or 15
    setting.half_day_hours = req.half_day_hours or 5.0
    setting.weekend_days = req.weekend_days or "Saturday,Sunday"
    setting.office_latitude = req.office_latitude or 24.8607
    setting.office_longitude = req.office_longitude or 67.0011
    setting.office_radius_meters = req.office_radius_meters or 150.0

    # 2. Admin User
    admin_user = User(
        email=req.admin_email,
        hashed_password=get_password_hash(req.admin_password),
        role="ADMIN",
        is_active=True,
        must_change_password=False
    )
    db.add(admin_user)
    db.flush()

    # 3. Seed default leave types (Annual 14, Sick 8, Casual 10, Unpaid 0)
    seed_default_leave_types_if_empty(db)

    db.commit()

    log_audit_event(
        db=db,
        actor=admin_user,
        action="CREATE",
        entity="SETTINGS",
        entity_id=str(setting.id),
        after={"company_name": setting.company_name, "admin_email": admin_user.email}
    )

    return {
        "message": "First-run setup completed successfully! You can now log in as Admin.",
        "company_name": setting.company_name,
        "admin_email": admin_user.email
    }
