from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog, User
from app.schemas import AuditLogResponse
from app.auth import RequireRole

router = APIRouter(prefix="/api/audit", tags=["Audit Log"])

# View Audit Log (Functionality 25: Admin only)
@router.get("/logs", response_model=List[AuditLogResponse])
def view_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    entity: Optional[str] = None,
    action: Optional[str] = None,
    current_user: User = Depends(RequireRole(["ADMIN"])),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if entity:
        query = query.filter(AuditLog.entity == entity)
    if action:
        query = query.filter(AuditLog.action == action)

    return query.order_by(AuditLog.created_at.desc()).limit(limit).all()
