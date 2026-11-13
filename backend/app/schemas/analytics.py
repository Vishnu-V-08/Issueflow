from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class AnalyticsOverview(BaseModel):
    total_tickets: int = 0
    open_tickets: int = 0
    in_progress_tickets: int = 0
    pending_tickets: int = 0
    resolved_tickets: int = 0
    closed_tickets: int = 0
    resolution_rate: float = Field(0.0, description="Percentage of resolved and closed tickets")


class StatusDistributionItem(BaseModel):
    status: str
    label: str
    count: int = 0
    percentage: float = 0.0
    color: str


class PriorityDistributionItem(BaseModel):
    priority: str
    label: str
    count: int = 0
    percentage: float = 0.0
    color: str


class TicketTrendItem(BaseModel):
    date: str
    label: str
    created_count: int = 0
    resolved_count: int = 0


class AgentPerformanceItem(BaseModel):
    agent_id: int
    agent_name: str
    email: str
    assigned_tickets: int = 0
    resolved_tickets: int = 0
    pending_tickets: int = 0
    resolution_rate: float = 0.0


class TeamPerformanceItem(BaseModel):
    team_id: Optional[int] = None
    team_name: str
    total_tickets: int = 0
    open_tickets: int = 0
    resolved_tickets: int = 0
    resolution_rate: float = 0.0

