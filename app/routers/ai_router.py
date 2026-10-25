from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import (
    AIChatRequest, AIChatResponse,
    SmartLeaveRequest, SmartLeaveResponse,
    DashboardSummaryRequest, DashboardSummaryResponse
)
from app.auth import get_current_user, RequireRole
from app.services.ai_service import process_ai_chat, parse_smart_leave, generate_dashboard_summary

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])

# AI Chat (Functionality 19, 22)
@router.post("/chat", response_model=AIChatResponse)
def chat_with_assistant(
    req: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = process_ai_chat(db, current_user, req.message)
    return AIChatResponse(
        reply=result["reply"],
        tool_called=result.get("tool_called"),
        is_ai_generated=True
    )

# Dashboard Summary (Functionality 20)
@router.post("/dashboard-summary", response_model=DashboardSummaryResponse)
def get_ai_dashboard_summary(
    req: DashboardSummaryRequest,
    current_user: User = Depends(RequireRole(["ADMIN", "HR"]))
):
    bullets = generate_dashboard_summary(req.kpi_data)
    return DashboardSummaryResponse(summary_bullets=bullets)

# Smart Leave (Functionality 21)
@router.post("/smart-leave", response_model=SmartLeaveResponse)
def get_smart_leave_prefill(
    req: SmartLeaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = parse_smart_leave(req.sentence, db)
    return SmartLeaveResponse(
        leave_type_id=result["leave_type_id"],
        leave_type_name=result["leave_type_name"],
        start_date=result["start_date"],
        end_date=result["end_date"],
        reason=result["reason"],
        raw_understanding=result["raw_understanding"]
    )
