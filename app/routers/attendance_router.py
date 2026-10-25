from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Attendance, AttendanceCorrection, User, Employee, LeaveRequest
from app.schemas import (
    CheckInRequest, CheckOutRequest, AttendanceResponse,
    AttendanceCorrectionCreate, AttendanceCorrectionReview, AttendanceCorrectionResponse
)
from app.auth import get_current_user, RequireRole, enforce_employee_scope
from app.services.attendance_service import (
    check_in, check_out, request_attendance_correction, review_attendance_correction
)

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

# Check in (Functionality 09, Bonus camera)
@router.post("/check-in", response_model=AttendanceResponse)
def employee_check_in(
    req: CheckInRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User account is not linked to an employee")

    record = check_in(
        db=db,
        employee_id=current_user.employee_id,
        source=req.source or "WEB",
        latitude=req.latitude,
        longitude=req.longitude,
        accuracy=req.accuracy
    )

    emp = db.query(Employee).filter(Employee.id == current_user.employee_id).first()
    return AttendanceResponse(
        id=record.id,
        employee_id=record.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        department_name=emp.department.name if emp and emp.department else None,
        date=record.date,
        check_in=record.check_in,
        check_out=record.check_out,
        status=record.status,
        total_hours=record.total_hours,
        missing_checkout=record.missing_checkout,
        source=record.source,
        location_lat=record.location_lat,
        location_lng=record.location_lng,
        location_verified=record.location_verified
    )

# Check out (Functionality 09)
@router.post("/check-out", response_model=AttendanceResponse)
def employee_check_out(
    req: CheckOutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User account is not linked to an employee")

    record = check_out(
        db=db,
        employee_id=current_user.employee_id,
        latitude=req.latitude,
        longitude=req.longitude
    )

    emp = db.query(Employee).filter(Employee.id == current_user.employee_id).first()
    return AttendanceResponse(
        id=record.id,
        employee_id=record.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        department_name=emp.department.name if emp and emp.department else None,
        date=record.date,
        check_in=record.check_in,
        check_out=record.check_out,
        status=record.status,
        total_hours=record.total_hours,
        missing_checkout=record.missing_checkout,
        source=record.source,
        location_lat=record.location_lat,
        location_lng=record.location_lng,
        location_verified=record.location_verified
    )

# Daily attendance board (Functionality 10)
@router.get("/today", response_model=List[AttendanceResponse])
def get_daily_attendance_board(
    date_str: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_date = date_str or date.today().strftime("%Y-%m-%d")
    today_str = date.today().strftime("%Y-%m-%d")

    # Fetch employees
    emp_query = db.query(Employee).filter(Employee.status != "EXITED")
    if current_user.role == "EMPLOYEE":
        emp_query = emp_query.filter(Employee.id == current_user.employee_id)

    employees = emp_query.all()

    # Fetch attendance records for target date
    att_records = db.query(Attendance).filter(Attendance.date == target_date).all()
    att_by_emp = {r.employee_id: r for r in att_records}

    # Fetch approved leaves covering target date
    approved_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.status == "APPROVED",
        LeaveRequest.start_date <= target_date,
        LeaveRequest.end_date >= target_date
    ).all()
    leave_by_emp = {l.employee_id: l for l in approved_leaves}

    results = []
    for emp in employees:
        att = att_by_emp.get(emp.id)
        if att:
            results.append(AttendanceResponse(
                id=att.id,
                employee_id=emp.id,
                employee_name=f"{emp.first_name} {emp.last_name}",
                employee_code=emp.employee_code,
                department_name=emp.department.name if emp.department else "-",
                date=att.date,
                check_in=att.check_in,
                check_out=att.check_out,
                status=att.status,
                total_hours=att.total_hours,
                missing_checkout=att.missing_checkout,
                source=att.source,
                location_lat=att.location_lat,
                location_lng=att.location_lng,
                location_verified=att.location_verified
            ))
        elif emp.id in leave_by_emp:
            l = leave_by_emp[emp.id]
            lt_name = l.leave_type.name if l.leave_type else "Leave"
            results.append(AttendanceResponse(
                id=0,
                employee_id=emp.id,
                employee_name=f"{emp.first_name} {emp.last_name}",
                employee_code=emp.employee_code,
                department_name=emp.department.name if emp.department else "-",
                date=target_date,
                check_in=None,
                check_out=None,
                status=f"ON_LEAVE",
                total_hours=0.0,
                missing_checkout=False,
                source=f"LEAVE: {lt_name}",
                location_lat=None,
                location_lng=None,
                location_verified=False
            ))
        else:
            status_val = "NOT_CHECKED_IN" if target_date >= today_str else "ABSENT"
            results.append(AttendanceResponse(
                id=0,
                employee_id=emp.id,
                employee_name=f"{emp.first_name} {emp.last_name}",
                employee_code=emp.employee_code,
                department_name=emp.department.name if emp.department else "-",
                date=target_date,
                check_in=None,
                check_out=None,
                status=status_val,
                total_hours=0.0,
                missing_checkout=False,
                source="-",
                location_lat=None,
                location_lng=None,
                location_verified=False
            ))

    return results

# Attendance Calendar (Functionality 10)
@router.get("/calendar", response_model=List[AttendanceResponse])
def get_attendance_calendar(
    month: str,  # YYYY-MM
    employee_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Attendance).filter(Attendance.date.startswith(month))

    if current_user.role == "EMPLOYEE":
        query = query.filter(Attendance.employee_id == current_user.employee_id)
    elif employee_id:
        query = query.filter(Attendance.employee_id == employee_id)

    records = query.order_by(Attendance.date.asc()).all()
    results = []
    for r in records:
        emp = r.employee
        results.append(AttendanceResponse(
            id=r.id,
            employee_id=r.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
            employee_code=emp.employee_code if emp else None,
            department_name=emp.department.name if emp and emp.department else None,
            date=r.date,
            check_in=r.check_in,
            check_out=r.check_out,
            status=r.status,
            total_hours=r.total_hours,
            missing_checkout=r.missing_checkout,
            source=r.source,
            location_lat=r.location_lat,
            location_lng=r.location_lng,
            location_verified=r.location_verified
        ))
    return results

# Request correction (Functionality 11)
@router.post("/correction", response_model=AttendanceCorrectionResponse)
def create_correction_request(
    req: AttendanceCorrectionCreate,
    current_user: User = Depends(RequireRole(["EMPLOYEE", "HR"])),
    db: Session = Depends(get_db)
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User account is not linked to an employee")

    corr = request_attendance_correction(
        db=db,
        employee_id=current_user.employee_id,
        date_str=req.date,
        requested_in=req.requested_check_in,
        requested_out=req.requested_check_out,
        reason=req.reason
    )
    emp = db.query(Employee).filter(Employee.id == current_user.employee_id).first()
    return AttendanceCorrectionResponse(
        id=corr.id,
        employee_id=corr.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        date=corr.date,
        requested_check_in=corr.requested_check_in,
        requested_check_out=corr.requested_check_out,
        reason=corr.reason,
        status=corr.status,
        reviewer_comment=corr.reviewer_comment,
        created_at=corr.created_at
    )

# List corrections (Functionality 11)
@router.get("/corrections", response_model=List[AttendanceCorrectionResponse])
def list_corrections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(AttendanceCorrection)
    if current_user.role == "EMPLOYEE":
        query = query.filter(AttendanceCorrection.employee_id == current_user.employee_id)

    corrections = query.order_by(AttendanceCorrection.created_at.desc()).all()
    res = []
    for c in corrections:
        emp = c.employee
        res.append(AttendanceCorrectionResponse(
            id=c.id,
            employee_id=c.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
            date=c.date,
            requested_check_in=c.requested_check_in,
            requested_check_out=c.requested_check_out,
            reason=c.reason,
            status=c.status,
            reviewer_comment=c.reviewer_comment,
            created_at=c.created_at
        ))
    return res

# Review correction (Functionality 11)
@router.post("/corrections/{id}/review", response_model=AttendanceCorrectionResponse)
def review_correction(
    id: int,
    req: AttendanceCorrectionReview,
    current_user: User = Depends(RequireRole(["HR"])),
    db: Session = Depends(get_db)
):
    corr = review_attendance_correction(
        db=db,
        correction_id=id,
        decision=req.status,
        comment=req.reviewer_comment,
        reviewer=current_user
    )
    emp = corr.employee
    return AttendanceCorrectionResponse(
        id=corr.id,
        employee_id=corr.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        date=corr.date,
        requested_check_in=corr.requested_check_in,
        requested_check_out=corr.requested_check_out,
        reason=corr.reason,
        status=corr.status,
        reviewer_comment=corr.reviewer_comment,
        created_at=corr.created_at
    )
