from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status

from app.models import LeaveRequest, LeaveType, User, Employee
from app.services.org_service import count_working_days
from app.audit import log_audit_event

def get_employee_leave_balances(db: Session, employee_id: int) -> List[dict]:
    leave_types = db.query(LeaveType).all()
    results = []

    for lt in leave_types:
        # Sum approved working days
        approved_reqs = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.leave_type_id == lt.id,
            LeaveRequest.status == "APPROVED"
        ).all()

        used = sum(req.working_days for req in approved_reqs)
        quota = lt.quota
        # Unpaid leave is unlimited (quota=0)
        remaining = max(0.0, quota - used) if quota > 0 else 999.0

        results.append({
            "leave_type_id": lt.id,
            "name": lt.name,
            "quota": quota,
            "used": used,
            "remaining": remaining
        })

    return results

def apply_leave(
    db: Session,
    employee_id: int,
    leave_type_id: int,
    start_date: str,
    end_date: str,
    reason: str,
    actor: User
) -> LeaveRequest:
    # Validate dates
    try:
        d1 = datetime.strptime(start_date, "%Y-%m-%d").date()
        d2 = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD")

    if d1 > d2:
        raise HTTPException(status_code=400, detail="start_date cannot be after end_date")

    # Calculate working days (skips weekends and public holidays)
    working_days = count_working_days(start_date, end_date, db)
    if working_days <= 0:
        raise HTTPException(status_code=400, detail="Selected date range contains no working days")

    # Check overlap with existing pending or approved leave requests
    # Rule: Overlap = 422
    overlapping = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee_id,
        LeaveRequest.status.in_(["PENDING", "APPROVED"]),
        or_(
            and_(LeaveRequest.start_date <= start_date, LeaveRequest.end_date >= start_date),
            and_(LeaveRequest.start_date <= end_date, LeaveRequest.end_date >= end_date),
            and_(LeaveRequest.start_date >= start_date, LeaveRequest.end_date <= end_date)
        )
    ).first()

    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Leave request overlaps with existing {overlapping.status} leave ({overlapping.start_date} to {overlapping.end_date})"
        )

    # Check balance
    # Rule: Over-balance = 422
    lt = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    if not lt:
        raise HTTPException(status_code=404, detail="Leave type not found")

    if lt.quota > 0:  # If not unlimited/unpaid
        balances = get_employee_leave_balances(db, employee_id)
        current_balance = next((b for b in balances if b["leave_type_id"] == leave_type_id), None)
        if current_balance and working_days > current_balance["remaining"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Insufficient leave balance. Requested: {working_days} day(s), Remaining: {current_balance['remaining']} day(s)"
            )

    req = LeaveRequest(
        employee_id=employee_id,
        leave_type_id=leave_type_id,
        start_date=start_date,
        end_date=end_date,
        working_days=working_days,
        reason=reason,
        status="PENDING"
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    log_audit_event(
        db=db,
        actor=actor,
        action="CREATE",
        entity="LEAVE",
        entity_id=str(req.id),
        after={"start": start_date, "end": end_date, "days": working_days, "type": lt.name}
    )

    return req

def cancel_leave(db: Session, leave_id: int, actor: User) -> LeaveRequest:
    req = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if req.status not in ["PENDING", "APPROVED"]:
        raise HTTPException(status_code=400, detail="Only pending or approved leave can be cancelled")

    req.status = "CANCELLED"
    db.commit()
    db.refresh(req)

    log_audit_event(
        db=db,
        actor=actor,
        action="UPDATE",
        entity="LEAVE",
        entity_id=str(req.id),
        after={"status": "CANCELLED"}
    )
    return req

def review_leave(
    db: Session,
    leave_id: int,
    decision: str,  # APPROVED, REJECTED
    comment: Optional[str],
    reviewer: User
) -> LeaveRequest:
    req = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail="Leave request has already been reviewed")

    req.status = decision
    req.reviewer_comment = comment
    req.reviewed_by = reviewer.id

    db.commit()
    db.refresh(req)

    log_audit_event(
        db=db,
        actor=reviewer,
        action="APPROVE" if decision == "APPROVED" else "REJECT",
        entity="LEAVE",
        entity_id=str(req.id),
        after={"decision": decision, "comment": comment}
    )

    return req
