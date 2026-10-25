from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import LeaveRequest, LeaveType, User, Employee
from app.schemas import (
    LeaveRequestCreate, LeaveReviewRequest, LeaveResponse, LeaveBalanceItem
)
from app.auth import get_current_user, RequireRole, enforce_employee_scope
from app.services.leave_service import (
    apply_leave, cancel_leave, review_leave, get_employee_leave_balances
)

router = APIRouter(prefix="/api/leave", tags=["Leave"])

# Apply for leave (Functionality 12)
@router.post("/apply", response_model=LeaveResponse)
def submit_leave_request(
    req: LeaveRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User account is not linked to an employee")

    leave = apply_leave(
        db=db,
        employee_id=current_user.employee_id,
        leave_type_id=req.leave_type_id,
        start_date=req.start_date,
        end_date=req.end_date,
        reason=req.reason,
        actor=current_user
    )

    emp = leave.employee
    lt = leave.leave_type
    return LeaveResponse(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        leave_type_id=leave.leave_type_id,
        leave_type_name=lt.name if lt else None,
        start_date=leave.start_date,
        end_date=leave.end_date,
        working_days=leave.working_days,
        reason=leave.reason,
        status=leave.status,
        reviewer_comment=leave.reviewer_comment,
        created_at=leave.created_at
    )

# Leave balances (Functionality 12)
@router.get("/balances", response_model=List[LeaveBalanceItem])
def view_leave_balances(
    employee_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_id = employee_id if employee_id and current_user.role in ["ADMIN", "HR"] else current_user.employee_id
    if not target_id:
        raise HTTPException(status_code=400, detail="No employee ID specified")

    enforce_employee_scope(current_user, target_id)
    return get_employee_leave_balances(db, target_id)

# Employee's leave requests (Functionality 12)
@router.get("/my-requests", response_model=List[LeaveResponse])
def view_own_leave_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.employee_id:
        return []

    requests = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == current_user.employee_id
    ).order_by(LeaveRequest.created_at.desc()).all()

    results = []
    for r in requests:
        emp = r.employee
        lt = r.leave_type
        results.append(LeaveResponse(
            id=r.id,
            employee_id=r.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
            leave_type_id=r.leave_type_id,
            leave_type_name=lt.name if lt else None,
            start_date=r.start_date,
            end_date=r.end_date,
            working_days=r.working_days,
            reason=r.reason,
            status=r.status,
            reviewer_comment=r.reviewer_comment,
            created_at=r.created_at
        ))
    return results

# Cancel leave (Functionality 12)
@router.post("/{leave_id}/cancel", response_model=LeaveResponse)
def cancel_own_leave(
    leave_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    req = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")

    enforce_employee_scope(current_user, req.employee_id)
    cancelled = cancel_leave(db, leave_id, current_user)

    emp = cancelled.employee
    lt = cancelled.leave_type
    return LeaveResponse(
        id=cancelled.id,
        employee_id=cancelled.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        leave_type_id=cancelled.leave_type_id,
        leave_type_name=lt.name if lt else None,
        start_date=cancelled.start_date,
        end_date=cancelled.end_date,
        working_days=cancelled.working_days,
        reason=cancelled.reason,
        status=cancelled.status,
        reviewer_comment=cancelled.reviewer_comment,
        created_at=cancelled.created_at
    )

# HR Approval Inbox (Functionality 13)
@router.get("/inbox", response_model=List[LeaveResponse])
def get_leave_inbox(
    current_user: User = Depends(RequireRole(["HR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    requests = db.query(LeaveRequest).filter(
        LeaveRequest.status == "PENDING"
    ).order_by(LeaveRequest.created_at.desc()).all()

    results = []
    for r in requests:
        emp = r.employee
        lt = r.leave_type
        results.append(LeaveResponse(
            id=r.id,
            employee_id=r.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
            leave_type_id=r.leave_type_id,
            leave_type_name=lt.name if lt else None,
            start_date=r.start_date,
            end_date=r.end_date,
            working_days=r.working_days,
            reason=r.reason,
            status=r.status,
            reviewer_comment=r.reviewer_comment,
            created_at=r.created_at
        ))
    return results

# Review Leave Request (Functionality 13)
@router.post("/{leave_id}/review", response_model=LeaveResponse)
def review_leave_request(
    leave_id: int,
    req: LeaveReviewRequest,
    current_user: User = Depends(RequireRole(["HR"])),
    db: Session = Depends(get_db)
):
    reviewed = review_leave(
        db=db,
        leave_id=leave_id,
        decision=req.status,
        comment=req.reviewer_comment,
        reviewer=current_user
    )

    emp = reviewed.employee
    lt = reviewed.leave_type
    return LeaveResponse(
        id=reviewed.id,
        employee_id=reviewed.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        leave_type_id=reviewed.leave_type_id,
        leave_type_name=lt.name if lt else None,
        start_date=reviewed.start_date,
        end_date=reviewed.end_date,
        working_days=reviewed.working_days,
        reason=reviewed.reason,
        status=reviewed.status,
        reviewer_comment=reviewed.reviewer_comment,
        created_at=reviewed.created_at
    )
