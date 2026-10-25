import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from fastapi import Request
from app.models import AuditLog, User

def log_audit_event(
    db: Session,
    actor: Optional[User],
    action: str,  # CREATE, UPDATE, APPROVE, FINALIZE, DELETE_ATTEMPT
    entity: str,  # EMPLOYEE, PAYROLL, LEAVE, SETTINGS, ATTENDANCE, AUTH
    entity_id: Optional[str] = None,
    before: Optional[Any] = None,
    after: Optional[Any] = None,
    ip_address: Optional[str] = None
):
    """
    Creates an immutable audit log record capturing actor, action, entity, and before/after JSON.
    """
    actor_id = actor.id if actor else None
    actor_name = actor.email if actor else "System"
    actor_role = actor.role if actor else "SYSTEM"

    details_payload = {}
    if before is not None:
        details_payload["before"] = before
    if after is not None:
        details_payload["after"] = after

    details_str = json.dumps(details_payload, default=str) if details_payload else None

    log_entry = AuditLog(
        actor_id=actor_id,
        actor_name=actor_name,
        actor_role=actor_role,
        action=action,
        entity=entity,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details_str,
        ip_address=ip_address
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
