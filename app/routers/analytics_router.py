from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.auth import get_current_user, RequireRole
from app.services.analytics_service import (
    get_admin_dashboard_metrics, get_hr_dashboard_metrics, get_employee_dashboard_metrics
)

router = APIRouter(prefix="/api/analytics", tags=["Dashboards & Analytics"])

# Admin Dashboard (Functionality 18)
@router.get("/admin")
def get_admin_dashboard(
    department_id: Optional[int] = None,
    current_user: User = Depends(RequireRole(["ADMIN"])),
    db: Session = Depends(get_db)
):
    return get_admin_dashboard_metrics(db, department_id=department_id)

# HR Dashboard (Functionality 18)
@router.get("/hr")
def get_hr_dashboard(
    department_id: Optional[int] = None,
    current_user: User = Depends(RequireRole(["HR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    return get_hr_dashboard_metrics(db, department_id=department_id)

# Employee Dashboard (Functionality 18)
@router.get("/employee")
def get_employee_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User is not linked to an employee record")
    return get_employee_dashboard_metrics(db, current_user.employee_id)
