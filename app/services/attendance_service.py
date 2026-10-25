import math
from datetime import datetime, date, time
from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import Attendance, AttendanceCorrection, Employee, User
from app.services.org_service import get_company_settings
from app.audit import log_audit_event

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def check_in(
    db: Session,
    employee_id: int,
    source: str = "WEB",
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    accuracy: Optional[float] = None
) -> Attendance:
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    check_in_time_str = now.strftime("%H:%M:%S")

    # One record per employee per day rule: second check-in = 409
    existing = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.date == today_str
    ).first()

    if existing and existing.check_in:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee has already checked in today"
        )

    settings = get_company_settings(db)

    # Location check if coordinates provided
    location_verified = False
    if latitude is not None and longitude is not None:
        if accuracy is not None and accuracy > 100.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GPS accuracy too low (> 100m). Please retry outdoors or with better signal."
            )
        dist = haversine_distance_meters(
            latitude, longitude,
            settings.office_latitude, settings.office_longitude
        )
        if dist > settings.office_radius_meters:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Outside office geofence. Distance: {dist:.1f}m (Allowed: {settings.office_radius_meters}m)"
            )
        location_verified = True

    # Rule: Late after office_start + grace_time (e.g. 09:00 + 15m = 09:15)
    start_parts = [int(p) for p in settings.office_start.split(":")]
    start_minute_of_day = start_parts[0] * 60 + start_parts[1]
    grace_cutoff = start_minute_of_day + settings.grace_time_minutes

    check_in_minute_of_day = now.hour * 60 + now.minute
    attendance_status = "LATE" if check_in_minute_of_day > grace_cutoff else "PRESENT"

    if existing:
        existing.check_in = check_in_time_str
        existing.status = attendance_status
        existing.source = source
        existing.location_lat = latitude
        existing.location_lng = longitude
        existing.location_verified = location_verified
        existing.missing_checkout = True
        record = existing
    else:
        record = Attendance(
            employee_id=employee_id,
            date=today_str,
            check_in=check_in_time_str,
            status=attendance_status,
            total_hours=0.0,
            missing_checkout=True,
            source=source,
            location_lat=latitude,
            location_lng=longitude,
            location_verified=location_verified
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return record

def check_out(
    db: Session,
    employee_id: int,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None
) -> Attendance:
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    check_out_time_str = now.strftime("%H:%M:%S")

    record = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.date == today_str
    ).first()

    if not record or not record.check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot check out without checking in first"
        )

    settings = get_company_settings(db)

    # Calculate hours worked
    t_in = datetime.strptime(f"{today_str} {record.check_in}", "%Y-%m-%d %H:%M:%S")
    t_out = now
    diff_hours = (t_out - t_in).total_seconds() / 3600.0
    if diff_hours < 0:
        diff_hours = 0.0

    record.check_out = check_out_time_str
    record.total_hours = round(diff_hours, 2)
    record.missing_checkout = False

    # Rule: half_day under 5 h
    if record.total_hours < settings.half_day_hours:
        record.status = "HALF_DAY"

    db.commit()
    db.refresh(record)
    return record

def request_attendance_correction(
    db: Session,
    employee_id: int,
    date_str: str,
    requested_in: Optional[str],
    requested_out: Optional[str],
    reason: str
) -> AttendanceCorrection:
    corr = AttendanceCorrection(
        employee_id=employee_id,
        date=date_str,
        requested_check_in=requested_in,
        requested_check_out=requested_out,
        reason=reason,
        status="PENDING"
    )
    db.add(corr)
    db.commit()
    db.refresh(corr)
    return corr

def review_attendance_correction(
    db: Session,
    correction_id: int,
    decision: str,  # APPROVED, REJECTED
    comment: Optional[str],
    reviewer: User
) -> AttendanceCorrection:
    corr = db.query(AttendanceCorrection).filter(AttendanceCorrection.id == correction_id).first()
    if not corr:
        raise HTTPException(status_code=404, detail="Correction request not found")
    if corr.status != "PENDING":
        raise HTTPException(status_code=400, detail="Correction request has already been reviewed")

    corr.status = decision
    corr.reviewer_comment = comment
    corr.reviewed_by = reviewer.id

    if decision == "APPROVED":
        # Apply correction to attendance record
        record = db.query(Attendance).filter(
            Attendance.employee_id == corr.employee_id,
            Attendance.date == corr.date
        ).first()

        settings = get_company_settings(db)
        if not record:
            record = Attendance(
                employee_id=corr.employee_id,
                date=corr.date,
                source="CORRECTION"
            )
            db.add(record)

        if corr.requested_check_in:
            record.check_in = corr.requested_check_in
        if corr.requested_check_out:
            record.check_out = corr.requested_check_out

        # recalculate status and hours
        if record.check_in and record.check_out:
            try:
                t1 = datetime.strptime(f"{record.date} {record.check_in}", "%Y-%m-%d %H:%M:%S")
                t2 = datetime.strptime(f"{record.date} {record.check_out}", "%Y-%m-%d %H:%M:%S")
                hours = (t2 - t1).total_seconds() / 3600.0
                record.total_hours = round(max(0.0, hours), 2)
                record.missing_checkout = False
                record.status = "HALF_DAY" if record.total_hours < settings.half_day_hours else "PRESENT"
            except Exception:
                pass
        else:
            record.missing_checkout = True

    db.commit()
    db.refresh(corr)

    log_audit_event(
        db=db,
        actor=reviewer,
        action="APPROVE" if decision == "APPROVED" else "REJECT",
        entity="ATTENDANCE",
        entity_id=str(corr.id),
        after={"decision": decision, "comment": comment}
    )

    return corr
