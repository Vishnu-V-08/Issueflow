from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.api.deps import require_authenticated
from app.models.user import User
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import (
    AnalyticsOverview,
    StatusDistributionItem,
    PriorityDistributionItem,
    TicketTrendItem,
    AgentPerformanceItem,
    TeamPerformanceItem,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get(
    "/overview",
    response_model=AnalyticsOverview,
    summary="Dashboard ticket counts and resolution rate (Role-scoped)",
)
def get_analytics_overview(
    period: str = Query("30d", description="Filter period: today, 7d, 30d, 90d, all, custom"),
    start_date: Optional[str] = Query(None, description="Custom start date (ISO 8601 or YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Custom end date (ISO 8601 or YYYY-MM-DD)"),
    assigned_to: Optional[int] = Query(None, description="Filter by assigned agent ID"),
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    """
    Returns high-level KPI counts:
    - Total tickets
    - Open tickets
    - In-progress tickets
    - Pending tickets
    - Resolved tickets
    - Closed tickets
    - Resolution rate percentage
    Customers only see metrics for their own tickets.
    """
    return AnalyticsService.get_overview(
        db=db,
        current_user=current_user,
        period=period,
        start_date=start_date,
        end_date=end_date,
        assigned_to=assigned_to,
    )


@router.get(
    "/tickets-by-status",
    response_model=List[StatusDistributionItem],
    summary="Ticket distribution by status (Pie chart data)",
)
def get_tickets_by_status(
    period: str = Query("30d", description="Filter period: today, 7d, 30d, 90d, all, custom"),
    start_date: Optional[str] = Query(None, description="Custom start date (ISO 8601 or YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Custom end date (ISO 8601 or YYYY-MM-DD)"),
    assigned_to: Optional[int] = Query(None, description="Filter by assigned agent ID"),
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    """
    Returns status distribution counts and percentages (Open, In Progress, Pending, Resolved, Closed).
    """
    return AnalyticsService.get_tickets_by_status(
        db=db,
        current_user=current_user,
        period=period,
        start_date=start_date,
        end_date=end_date,
        assigned_to=assigned_to,
    )


@router.get(
    "/tickets-by-priority",
    response_model=List[PriorityDistributionItem],
    summary="Ticket distribution by priority (Bar chart data)",
)
def get_tickets_by_priority(
    period: str = Query("30d", description="Filter period: today, 7d, 30d, 90d, all, custom"),
    start_date: Optional[str] = Query(None, description="Custom start date (ISO 8601 or YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Custom end date (ISO 8601 or YYYY-MM-DD)"),
    assigned_to: Optional[int] = Query(None, description="Filter by assigned agent ID"),
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    """
    Returns priority distribution counts and percentages (Critical, High, Medium, Low).
    """
    return AnalyticsService.get_tickets_by_priority(
        db=db,
        current_user=current_user,
        period=period,
        start_date=start_date,
        end_date=end_date,
        assigned_to=assigned_to,
    )


@router.get(
    "/ticket-trends",
    response_model=List[TicketTrendItem],
    summary="Daily/weekly/monthly inbound vs resolved ticket velocity (Line chart data)",
)
def get_ticket_trends(
    period: str = Query("30d", description="Filter period: today, 7d, 30d, 90d, all, custom"),
    start_date: Optional[str] = Query(None, description="Custom start date (ISO 8601 or YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Custom end date (ISO 8601 or YYYY-MM-DD)"),
    assigned_to: Optional[int] = Query(None, description="Filter by assigned agent ID"),
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    """
    Returns chronological ticket creation and resolution trends grouped by date.
    """
    return AnalyticsService.get_ticket_trends(
        db=db,
        current_user=current_user,
        period=period,
        start_date=start_date,
        end_date=end_date,
        assigned_to=assigned_to,
    )


@router.get(
    "/agent-performance",
    response_model=List[AgentPerformanceItem],
    summary="Agent performance metrics and resolution rates (Admin & Agent)",
)
def get_agent_performance(
    period: str = Query("30d", description="Filter period: today, 7d, 30d, 90d, all, custom"),
    start_date: Optional[str] = Query(None, description="Custom start date (ISO 8601 or YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Custom end date (ISO 8601 or YYYY-MM-DD)"),
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    """
    Returns agent performance scorecard:
    - Agent Name & Email
    - Assigned tickets count
    - Resolved tickets count
    - Pending tickets count
    - Resolution performance percentage
    Forbidden for Customers.
    """
    return AnalyticsService.get_agent_performance(
        db=db,
        current_user=current_user,
        period=period,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/team-performance",
    response_model=List[TeamPerformanceItem],
    summary="Team-wise ticket load and resolution efficiency (Admin & Agent)",
)
def get_team_performance(
    period: str = Query("30d", description="Filter period: today, 7d, 30d, 90d, all, custom"),
    start_date: Optional[str] = Query(None, description="Custom start date (ISO 8601 or YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Custom end date (ISO 8601 or YYYY-MM-DD)"),
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    """
    Returns team-wise performance:
    - Team name
    - Total tickets
    - Open tickets
    - Resolved tickets
    - Team resolution rate percentage
    Forbidden for Customers.
    """
    return AnalyticsService.get_team_performance(
        db=db,
        current_user=current_user,
        period=period,
        start_date=start_date,
        end_date=end_date,
    )
