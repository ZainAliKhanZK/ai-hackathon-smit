import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, Employee
from app.schemas import (
    LoginRequest, TokenResponse, ChangePasswordRequest,
    CreateHRUserRequest, UserResponse
)
from app.auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, RequireRole
)
from app.audit import log_audit_event

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact Admin."
        )

    token = create_access_token(data={"sub": user.id, "role": user.role, "email": user.email})

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "email": user.email,
        "employee_id": user.employee_id,
        "must_change_password": user.must_change_password
    }

@router.get("/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    emp_details = None
    if current_user.employee_id:
        emp = db.query(Employee).filter(Employee.id == current_user.employee_id).first()
        if emp:
            emp_details = {
                "id": emp.id,
                "employee_code": emp.employee_code,
                "first_name": emp.first_name,
                "last_name": emp.last_name,
                "department": emp.department.name if emp.department else None,
                "designation": emp.designation.title if emp.designation else None,
            }

    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "must_change_password": current_user.must_change_password,
        "employee_id": current_user.employee_id,
        "employee_info": emp_details
    }

@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(req.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password does not match")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    current_user.hashed_password = get_password_hash(req.new_password)
    current_user.must_change_password = False
    db.commit()

    log_audit_event(
        db=db,
        actor=current_user,
        action="UPDATE",
        entity="AUTH",
        entity_id=str(current_user.id),
        after={"event": "password_changed"}
    )

    return {"message": "Password changed successfully"}

@router.post("/users/hr", response_model=UserResponse)
def create_hr_login(
    req: CreateHRUserRequest,
    current_user: User = Depends(RequireRole(["ADMIN"])),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    hr_user = User(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        role="HR",
        is_active=True,
        must_change_password=False
    )
    db.add(hr_user)
    db.commit()
    db.refresh(hr_user)

    log_audit_event(
        db=db,
        actor=current_user,
        action="CREATE",
        entity="AUTH",
        entity_id=str(hr_user.id),
        after={"email": hr_user.email, "role": "HR"}
    )

    return hr_user

@router.get("/users", response_model=List[UserResponse])
def list_users(
    current_user: User = Depends(RequireRole(["ADMIN"])),
    db: Session = Depends(get_db)
):
    return db.query(User).all()

@router.patch("/users/{user_id}/status")
def toggle_user_status(
    user_id: int,
    is_active: bool,
    current_user: User = Depends(RequireRole(["ADMIN"])),
    db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own active status")

    target.is_active = is_active
    db.commit()

    log_audit_event(
        db=db,
        actor=current_user,
        action="UPDATE",
        entity="AUTH",
        entity_id=str(target.id),
        after={"is_active": is_active}
    )

    return {"message": f"User status set to {'active' if is_active else 'deactivated'}"}

@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    current_user: User = Depends(RequireRole(["ADMIN"])),
    db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    temp_password = secrets.token_urlsafe(8)
    target.hashed_password = get_password_hash(temp_password)
    target.must_change_password = True
    db.commit()

    log_audit_event(
        db=db,
        actor=current_user,
        action="UPDATE",
        entity="AUTH",
        entity_id=str(target.id),
        after={"event": "password_reset"}
    )

    return {
        "message": "Password reset successfully",
        "email": target.email,
        "temporary_password": temp_password
    }
