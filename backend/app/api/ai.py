from typing import Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User, UserRole
from app.services.ticket_service import TicketService
from app.services.gemini_service import GeminiService
from app.api.deps import require_authenticated
from app.schemas.ai import (
    AITicketAnalyzeRequest,
    AISummarizeRequest,
    AISentimentRequest,
    AIClassificationResponse,
    AIPriorityResponse,
    AISummaryResponse,
    AIResolutionResponse,
    AISentimentResponse,
)

router = APIRouter(prefix="/ai", tags=["AI Assistance (Gemini)"])


def _resolve_ticket_text(
    req: AITicketAnalyzeRequest,
    db: Session,
    current_user: User
) -> Tuple[str, str]:
    """
    Helper to extract (title, description) either from the request body or from an existing ticket.
    Enforces customer isolation (customers cannot inspect another customer's ticket).
    """
    if req.ticket_id:
        ticket = TicketService.get_by_id(db=db, ticket_id=req.ticket_id)
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket with ID {req.ticket_id} not found."
            )
        if current_user.role == UserRole.CUSTOMER and ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You cannot analyze tickets belonging to other customers."
            )
        title = req.title.strip() if req.title and req.title.strip() else ticket.title
        description = req.description.strip() if req.description and req.description.strip() else ticket.description
    else:
        title = (req.title or "").strip()
        description = (req.description or "").strip()

    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket title cannot be empty."
        )
    if not description:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket description cannot be empty."
        )

    return title, description


@router.post(
    "/classify",
    response_model=AIClassificationResponse,
    summary="Automatically classify ticket category"
)
def classify_ticket(
    req: AITicketAnalyzeRequest,
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """
    Analyzes ticket title and description to suggest the most appropriate category
    (e.g., TECHNICAL_ISSUE, BILLING, ACCOUNT, BUG_REPORT, FEATURE_REQUEST, GENERAL_INQUIRY).
    """
    title, description = _resolve_ticket_text(req, db, current_user)
    return GeminiService.classify_ticket(title=title, description=description)


@router.post(
    "/priority",
    response_model=AIPriorityResponse,
    summary="Suggest ticket priority level"
)
def detect_priority(
    req: AITicketAnalyzeRequest,
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """
    Analyzes urgency, business impact, and keywords to suggest a priority level
    (LOW, MEDIUM, HIGH, CRITICAL). Does not overwrite user selections automatically.
    """
    title, description = _resolve_ticket_text(req, db, current_user)
    return GeminiService.detect_priority(title=title, description=description)


@router.post(
    "/summarize",
    response_model=AISummaryResponse,
    summary="Summarize long ticket descriptions or discussion threads"
)
def summarize_content(
    req: AISummarizeRequest,
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """
    Generates a concise bulleted summary of long technical descriptions or threads.
    """
    if req.ticket_id:
        ticket = TicketService.get_by_id(db=db, ticket_id=req.ticket_id)
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket with ID {req.ticket_id} not found."
            )
        if current_user.role == UserRole.CUSTOMER and ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You cannot analyze tickets belonging to other customers."
            )
        content = req.content.strip() if req.content and req.content.strip() else f"{ticket.title}\n\n{ticket.description}"
    else:
        content = (req.content or "").strip()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content to summarize cannot be empty."
        )

    return GeminiService.summarize_content(content=content, max_words=req.max_words or 80)


@router.post(
    "/suggest-resolution",
    response_model=AIResolutionResponse,
    summary="Suggest diagnostic root causes and resolution steps"
)
def suggest_resolution(
    req: AITicketAnalyzeRequest,
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """
    Generates suspected root cause, troubleshooting steps, and suggested fix.
    Includes explicit disclaimer that suggestions require technical verification.
    """
    title, description = _resolve_ticket_text(req, db, current_user)
    return GeminiService.suggest_resolution(title=title, description=description)


@router.post(
    "/sentiment",
    response_model=AISentimentResponse,
    summary="Analyze customer sentiment and emotional tone"
)
def analyze_sentiment(
    req: AISentimentRequest,
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """
    Evaluates tone of customer messages to detect POSITIVE, NEUTRAL, NEGATIVE, or FRUSTRATED status.
    """
    if req.ticket_id:
        ticket = TicketService.get_by_id(db=db, ticket_id=req.ticket_id)
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket with ID {req.ticket_id} not found."
            )
        if current_user.role == UserRole.CUSTOMER and ticket.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You cannot analyze tickets belonging to other customers."
            )
        text = req.text.strip() if req.text and req.text.strip() else f"{ticket.title}. {ticket.description}"
    else:
        text = (req.text or "").strip()

    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text to analyze cannot be empty."
        )

    return GeminiService.analyze_sentiment(text=text)

