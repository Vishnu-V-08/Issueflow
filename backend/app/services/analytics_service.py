from typing import List, Optional, Tuple, Dict, Any, Union
from datetime import datetime, timezone, timedelta
from sqlalchemy import func, case, or_, and_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.ticket import Ticket, TicketStatus, TicketPriority, TicketCategory
from app.models.user import User, UserRole
from app.models.team import Team
from app.schemas.analytics import (
    AnalyticsOverview,
    StatusDistributionItem,
    PriorityDistributionItem,
    TicketTrendItem,
    AgentPerformanceItem,
    TeamPerformanceItem,
)


class AnalyticsService:

    @staticmethod
    def _parse_dt(val: Union[str, datetime, None]) -> Optional[datetime]:
        """
        Parses string or datetime into a naive UTC datetime object.
        """
        if not val:
            return None
        if isinstance(val, datetime):
            return val.replace(tzinfo=None) if val.tzinfo else val
        try:
            cleaned = str(val).strip().replace("Z", "").replace(" ", "T")
            if "T" in cleaned:
                # Handle possible timezone offset like +00:00 or -05:00
                if "+" in cleaned:
                    cleaned = cleaned.split("+")[0]
                elif cleaned.count("-") > 2:
                    # e.g. 2026-11-13T12:00:00-05:00
                    parts = cleaned.rsplit("-", 1)
                    cleaned = parts[0]
                return datetime.fromisoformat(cleaned)
            else:
                return datetime.strptime(cleaned, "%Y-%m-%d")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date format '{val}'. Expected YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS."
            )

    @classmethod
    def _parse_and_validate_dates(
        cls,
        period: str = "all",
        start_date: Optional[Union[str, datetime]] = None,
        end_date: Optional[Union[str, datetime]] = None,
    ) -> Tuple[Optional[datetime], Optional[datetime]]:
        """
        Validates date parameters and returns normalized naive UTC datetime bounds.
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        if period == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now
            return start, end
        elif period == "7d":
            return now - timedelta(days=7), now
        elif period == "30d":
            return now - timedelta(days=30), now
        elif period == "90d":
            return now - timedelta(days=90), now
        elif period == "custom":
            s = cls._parse_dt(start_date)
            e = cls._parse_dt(end_date)
            if s and e and s > e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="start_date cannot be later than end_date."
                )
            return s, e
        elif period == "all":
            return None, None
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid period '{period}'. Valid options: today, 7d, 30d, 90d, all, custom."
            )

    @classmethod
    def apply_filters(
        cls,
        query,
        current_user: User,
        date_column=Ticket.created_at,
        period: str = "all",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        assigned_to: Optional[int] = None,
    ):
        """
        Applies date filtering and role-based access restrictions to a SQLAlchemy Ticket query.
        - CUSTOMER: strictly isolated to tickets created by the current customer.
        - AGENT / ADMIN: workspace-level access, optional filter by assigned_to.
        """
        # Role-based scoping
        if current_user.role == UserRole.CUSTOMER:
            query = query.filter(Ticket.created_by == current_user.id)
        elif assigned_to is not None:
            query = query.filter(Ticket.assigned_to == assigned_to)

        # Date filtering
        start_dt, end_dt = cls._parse_and_validate_dates(period, start_date, end_date)
        if start_dt is not None:
            query = query.filter(date_column >= start_dt)
        if end_dt is not None:
            query = query.filter(date_column <= end_dt)

        return query

    @classmethod
    def get_overview(
        cls,
        db: Session,
        current_user: User,
        period: str = "all",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        assigned_to: Optional[int] = None,
    ) -> AnalyticsOverview:
        """
        Calculates workspace or role-scoped ticket overview counts using SQL aggregation.
        """
        base_query = db.query(
            func.count(Ticket.id).label("total"),
            func.count(case((Ticket.status == TicketStatus.OPEN, 1))).label("open"),
            func.count(case((Ticket.status == TicketStatus.IN_PROGRESS, 1))).label("in_progress"),
            func.count(case((Ticket.status == TicketStatus.PENDING, 1))).label("pending"),
            func.count(case((Ticket.status == TicketStatus.RESOLVED, 1))).label("resolved"),
            func.count(case((Ticket.status == TicketStatus.CLOSED, 1))).label("closed"),
        )

        filtered_query = cls.apply_filters(
            query=base_query,
            current_user=current_user,
            date_column=Ticket.created_at,
            period=period,
            start_date=start_date,
            end_date=end_date,
            assigned_to=assigned_to,
        )

        row = filtered_query.first()
        if not row or not row.total:
            return AnalyticsOverview()

        total = row.total or 0
        resolved_and_closed = (row.resolved or 0) + (row.closed or 0)
        resolution_rate = round((resolved_and_closed / total * 100), 1) if total > 0 else 0.0

        return AnalyticsOverview(
            total_tickets=total,
            open_tickets=row.open or 0,
            in_progress_tickets=row.in_progress or 0,
            pending_tickets=row.pending or 0,
            resolved_tickets=row.resolved or 0,
            closed_tickets=row.closed or 0,
            resolution_rate=resolution_rate,
        )

    @classmethod
    def get_tickets_by_status(
        cls,
        db: Session,
        current_user: User,
        period: str = "all",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        assigned_to: Optional[int] = None,
    ) -> List[StatusDistributionItem]:
        """
        Returns distribution of tickets grouped by status using SQL aggregation.
        Ensures all 5 valid statuses are represented in the output even with 0 counts.
        """
        base_query = db.query(
            Ticket.status,
            func.count(Ticket.id).label("count")
        )

        filtered_query = cls.apply_filters(
            query=base_query,
            current_user=current_user,
            date_column=Ticket.created_at,
            period=period,
            start_date=start_date,
            end_date=end_date,
            assigned_to=assigned_to,
        ).group_by(Ticket.status)

        rows = filtered_query.all()
        counts_by_status = {r.status: r.count for r in rows}
        total_count = sum(counts_by_status.values())

        status_meta = [
            (TicketStatus.OPEN, "Open", "#f59e0b"),
            (TicketStatus.IN_PROGRESS, "In Progress", "#0ea5e9"),
            (TicketStatus.PENDING, "Pending", "#8b5cf6"),
            (TicketStatus.RESOLVED, "Resolved", "#10b981"),
            (TicketStatus.CLOSED, "Closed", "#64748b"),
        ]

        result = []
        for status_enum, label, color in status_meta:
            cnt = counts_by_status.get(status_enum, 0)
            pct = round((cnt / total_count * 100), 1) if total_count > 0 else 0.0
            result.append(
                StatusDistributionItem(
                    status=status_enum.value,
                    label=label,
                    count=cnt,
                    percentage=pct,
                    color=color,
                )
            )

        return result

    @classmethod
    def get_tickets_by_priority(
        cls,
        db: Session,
        current_user: User,
        period: str = "all",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        assigned_to: Optional[int] = None,
    ) -> List[PriorityDistributionItem]:
        """
        Returns distribution of tickets grouped by priority using SQL aggregation.
        Ensures all 4 priority tiers (Critical, High, Medium, Low) are always returned.
        """
        base_query = db.query(
            Ticket.priority,
            func.count(Ticket.id).label("count")
        )

        filtered_query = cls.apply_filters(
            query=base_query,
            current_user=current_user,
            date_column=Ticket.created_at,
            period=period,
            start_date=start_date,
            end_date=end_date,
            assigned_to=assigned_to,
        ).group_by(Ticket.priority)

        rows = filtered_query.all()
        counts_by_priority = {r.priority: r.count for r in rows}
        total_count = sum(counts_by_priority.values())

        priority_meta = [
            (TicketPriority.CRITICAL, "Critical", "#ef4444"),
            (TicketPriority.HIGH, "High", "#f59e0b"),
            (TicketPriority.MEDIUM, "Medium", "#3b82f6"),
            (TicketPriority.LOW, "Low", "#10b981"),
        ]

        result = []
        for priority_enum, label, color in priority_meta:
            cnt = counts_by_priority.get(priority_enum, 0)
            pct = round((cnt / total_count * 100), 1) if total_count > 0 else 0.0
            result.append(
                PriorityDistributionItem(
                    priority=priority_enum.value,
                    label=label,
                    count=cnt,
                    percentage=pct,
                    color=color,
                )
            )

        return result

    @classmethod
    def get_ticket_trends(
        cls,
        db: Session,
        current_user: User,
        period: str = "30d",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        assigned_to: Optional[int] = None,
    ) -> List[TicketTrendItem]:
        """
        Returns chronological inbound vs resolved ticket trends grouped by day using SQL aggregation.
        """
        # Inbound creations query
        inbound_base = db.query(
            func.date(Ticket.created_at).label("day"),
            func.count(Ticket.id).label("count")
        )
        inbound_query = cls.apply_filters(
            query=inbound_base,
            current_user=current_user,
            date_column=Ticket.created_at,
            period=period,
            start_date=start_date,
            end_date=end_date,
            assigned_to=assigned_to,
        ).group_by(func.date(Ticket.created_at)).order_by(func.date(Ticket.created_at).asc())

        inbound_rows = inbound_query.all()
        created_by_date = {str(r.day): r.count for r in inbound_rows if r.day}

        # Resolved tickets query
        resolved_base = db.query(
            func.date(Ticket.updated_at).label("day"),
            func.count(Ticket.id).label("count")
        ).filter(
            Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
        )
        resolved_query = cls.apply_filters(
            query=resolved_base,
            current_user=current_user,
            date_column=Ticket.updated_at,
            period=period,
            start_date=start_date,
            end_date=end_date,
            assigned_to=assigned_to,
        ).group_by(func.date(Ticket.updated_at)).order_by(func.date(Ticket.updated_at).asc())

        resolved_rows = resolved_query.all()
        resolved_by_date = {str(r.day): r.count for r in resolved_rows if r.day}

        all_dates = sorted(list(set(list(created_by_date.keys()) + list(resolved_by_date.keys()))))

        if not all_dates:
            # When empty, supply sample empty window points based on period
            now = datetime.now(timezone.utc)
            days_count = 7 if period == "7d" else (30 if period == "30d" else 7)
            points = []
            for i in range(days_count - 1, -1, -1):
                d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
                d_label = (now - timedelta(days=i)).strftime("%b %d")
                points.append(
                    TicketTrendItem(
                        date=d,
                        label=d_label,
                        created_count=0,
                        resolved_count=0,
                    )
                )
            return points

        items = []
        for d_str in all_dates:
            try:
                parsed = datetime.strptime(d_str, "%Y-%m-%d")
                label = parsed.strftime("%b %d")
            except Exception:
                label = d_str

            items.append(
                TicketTrendItem(
                    date=d_str,
                    label=label,
                    created_count=created_by_date.get(d_str, 0),
                    resolved_count=resolved_by_date.get(d_str, 0),
                )
            )

        return items

    @classmethod
    def get_agent_performance(
        cls,
        db: Session,
        current_user: User,
        period: str = "all",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[AgentPerformanceItem]:
        """
        Calculates agent performance scorecard.
        - Restricted to ADMIN and AGENT (CUSTOMERS receive 403 Forbidden).
        - Uses SQL outer-join and aggregation between User and Ticket.
        """
        if current_user.role == UserRole.CUSTOMER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customers are not authorized to view internal agent performance analytics."
            )

        start_dt, end_dt = cls._parse_and_validate_dates(period, start_date, end_date)

        # Build join conditions with optional date filtering on Ticket
        ticket_conditions = []
        if start_dt is not None:
            ticket_conditions.append(Ticket.created_at >= start_dt)
        if end_dt is not None:
            ticket_conditions.append(Ticket.created_at <= end_dt)

        join_condition = (Ticket.assigned_to == User.id)
        if ticket_conditions:
            join_condition = and_(join_condition, *ticket_conditions)

        query = db.query(
            User.id.label("agent_id"),
            User.full_name.label("agent_name"),
            User.email.label("email"),
            func.count(Ticket.id).label("assigned_tickets"),
            func.count(
                case((Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED]), 1))
            ).label("resolved_tickets"),
            func.count(
                case((Ticket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.PENDING]), 1))
            ).label("pending_tickets"),
        ).outerjoin(
            Ticket, join_condition
        ).filter(
            User.role.in_([UserRole.AGENT, UserRole.ADMIN])
        ).group_by(
            User.id, User.full_name, User.email
        ).order_by(
            func.count(Ticket.id).desc(), User.full_name.asc()
        )

        rows = query.all()
        result = []
        for r in rows:
            assigned = r.assigned_tickets or 0
            resolved = r.resolved_tickets or 0
            pending = r.pending_tickets or 0
            rate = round((resolved / assigned * 100), 1) if assigned > 0 else 0.0

            result.append(
                AgentPerformanceItem(
                    agent_id=r.agent_id,
                    agent_name=r.agent_name,
                    email=r.email,
                    assigned_tickets=assigned,
                    resolved_tickets=resolved,
                    pending_tickets=pending,
                    resolution_rate=rate,
                )
            )

        return result

    @classmethod
    def get_team_performance(
        cls,
        db: Session,
        current_user: User,
        period: str = "all",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[TeamPerformanceItem]:
        """
        Calculates team-wise performance.
        - Restricted to ADMIN and AGENT (CUSTOMERS receive 403 Forbidden).
        - Queries existing Team models and groups tickets by functional categories.
        """
        if current_user.role == UserRole.CUSTOMER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customers are not authorized to view internal team performance analytics."
            )

        # First, aggregate tickets by Category using SQL aggregation
        base_query = db.query(
            Ticket.category,
            func.count(Ticket.id).label("total"),
            func.count(
                case((Ticket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.PENDING]), 1))
            ).label("open"),
            func.count(
                case((Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED]), 1))
            ).label("resolved"),
        )

        start_dt, end_dt = cls._parse_and_validate_dates(period, start_date, end_date)
        if start_dt is not None:
            base_query = base_query.filter(Ticket.created_at >= start_dt)
        if end_dt is not None:
            base_query = base_query.filter(Ticket.created_at <= end_dt)

        cat_rows = base_query.group_by(Ticket.category).all()
        cat_stats = {r.category: (r.total or 0, r.open or 0, r.resolved or 0) for r in cat_rows}

        # Check existing Team records in the database
        teams = db.query(Team).order_by(Team.team_name.asc()).all()

        # Category mapping dictionary for team names
        category_name_map = {
            TicketCategory.TECHNICAL_ISSUE: "Technical Support",
            TicketCategory.BILLING: "Billing & Accounts",
            TicketCategory.ACCOUNT: "Account Security & Access",
            TicketCategory.BUG_REPORT: "Product Quality & QA",
            TicketCategory.FEATURE_REQUEST: "Product Operations",
            TicketCategory.GENERAL_INQUIRY: "Customer Success",
        }

        result = []

        if teams:
            # If explicit teams exist in the database, calculate their counts
            for team in teams:
                team_name_lower = team.team_name.lower()
                # Find matching category stats
                matched_cat = None
                for cat, label in category_name_map.items():
                    if cat.value.lower() in team_name_lower or label.lower() in team_name_lower:
                        matched_cat = cat
                        break

                if matched_cat and matched_cat in cat_stats:
                    total, open_cnt, resolved = cat_stats[matched_cat]
                else:
                    total, open_cnt, resolved = 0, 0, 0

                rate = round((resolved / total * 100), 1) if total > 0 else 0.0
                result.append(
                    TeamPerformanceItem(
                        team_id=team.id,
                        team_name=team.team_name,
                        total_tickets=total,
                        open_tickets=open_cnt,
                        resolved_tickets=resolved,
                        resolution_rate=rate,
                    )
                )
        else:
            # If no teams have been inserted into the Team table yet, return category-based team departments
            for cat, label in category_name_map.items():
                total, open_cnt, resolved = cat_stats.get(cat, (0, 0, 0))
                rate = round((resolved / total * 100), 1) if total > 0 else 0.0
                result.append(
                    TeamPerformanceItem(
                        team_id=None,
                        team_name=label,
                        total_tickets=total,
                        open_tickets=open_cnt,
                        resolved_tickets=resolved,
                        resolution_rate=rate,
                    )
                )

        return result
