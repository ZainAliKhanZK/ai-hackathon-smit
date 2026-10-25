from typing import List, Optional
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from app.models import CompanySetting, Department, Designation, LeaveType, PublicHoliday

def get_company_settings(db: Session) -> CompanySetting:
    setting = db.query(CompanySetting).first()
    if not setting:
        setting = CompanySetting(
            company_name="My Company",
            office_start="09:00",
            grace_time_minutes=15,
            half_day_hours=5.0,
            weekend_days="Saturday,Sunday",
            office_latitude=24.8607,
            office_longitude=67.0011,
            office_radius_meters=150.0
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting

def update_company_settings(db: Session, update_data: dict) -> CompanySetting:
    setting = get_company_settings(db)
    for key, value in update_data.items():
        if value is not None and hasattr(setting, key):
            setattr(setting, key, value)
    db.commit()
    db.refresh(setting)
    return setting

def seed_default_leave_types_if_empty(db: Session):
    count = db.query(LeaveType).count()
    if count == 0:
        defaults = [
            LeaveType(name="Annual Leave", quota=14),
            LeaveType(name="Sick Leave", quota=8),
            LeaveType(name="Casual Leave", quota=10),
            LeaveType(name="Unpaid Leave", quota=0),
        ]
        db.add_all(defaults)
        db.commit()

def is_weekend_or_holiday(target_date: date, weekend_str: str, holidays: List[str]) -> bool:
    day_name = target_date.strftime("%A")
    weekends = [w.strip().lower() for w in weekend_str.split(",")]
    if day_name.lower() in weekends:
        return True
    date_str = target_date.strftime("%Y-%m-%d")
    if date_str in holidays:
        return True
    return False

def count_working_days(start_date_str: str, end_date_str: str, db: Session) -> float:
    """
    Skips weekends and public holidays according to Section 3 business rules.
    """
    settings = get_company_settings(db)
    holidays = [h.date for h in db.query(PublicHoliday).all()]
    
    d1 = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    d2 = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    
    if d1 > d2:
        return 0.0

    cur = d1
    working_days = 0
    while cur <= d2:
        if not is_weekend_or_holiday(cur, settings.weekend_days, holidays):
            working_days += 1
        cur += timedelta(days=1)
    return float(working_days)
