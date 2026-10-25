from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Announcement, Notification, User
from app.schemas import AnnouncementCreate, AnnouncementResponse, NotificationResponse
from app.auth import get_current_user, RequireRole
from app.audit import log_audit_event

router = APIRouter(prefix="/api/comms", tags=["Comms & Notifications"])

# Post Announcement (Functionality 23)
@router.post("/announcements", response_model=AnnouncementResponse)
def post_announcement(
    req: AnnouncementCreate,
    current_user: User = Depends(RequireRole(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    anno = Announcement(
        title=req.title,
        content=req.content,
        priority=req.priority or "NORMAL",
        posted_by=current_user.id
    )
    db.add(anno)
    db.commit()
    db.refresh(anno)

    log_audit_event(
        db=db,
        actor=current_user,
        action="CREATE",
        entity="SETTINGS",
        entity_id=str(anno.id),
        after={"announcement_title": anno.title, "priority": anno.priority}
    )

    return anno

# List Announcements (Functionality 23)
@router.get("/announcements", response_model=List[AnnouncementResponse])
def list_announcements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Announcement).order_by(Announcement.created_at.desc()).all()

# Get User Notifications (Functionality 24)
@router.get("/notifications", response_model=List[NotificationResponse])
def get_user_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(20).all()

# Mark Notification as Read (Functionality 24)
@router.patch("/notifications/{id}/read")
def mark_notification_read(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "Notification marked as read"}
