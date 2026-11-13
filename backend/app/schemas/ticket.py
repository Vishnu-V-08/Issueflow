from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.ticket import TicketStatus, TicketPriority, TicketCategory
from app.schemas.user import UserResponse
from app.schemas.comment import CommentResponse


class TicketBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="Ticket title/subject")
    description: str = Field(..., min_length=5, description="Detailed problem description")
    category: TicketCategory = Field(..., description="Ticket category")
    priority: TicketPriority = Field(default=TicketPriority.MEDIUM, description="Ticket priority level")


class TicketCreate(TicketBase):
    created_by: Optional[int] = Field(None, description="User ID of creator (auto-assigned from token)")
    assigned_to: Optional[int] = Field(None, description="Optional agent User ID assigned to ticket")


class TicketUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, min_length=5)
    category: Optional[TicketCategory] = None
    priority: Optional[TicketPriority] = None
    status: Optional[TicketStatus] = None
    assigned_to: Optional[int] = None
    ai_summary: Optional[str] = None


class TicketStatusUpdate(BaseModel):
    status: TicketStatus = Field(..., description="New ticket status")
    changed_by: Optional[int] = Field(None, description="User ID of the person updating the status")


class TicketAssign(BaseModel):
    assigned_to: Optional[int] = Field(None, description="Agent User ID to assign, or null to unassign")


class TicketHistoryResponse(BaseModel):
    id: int
    ticket_id: int
    changed_by: Optional[int]
    old_status: Optional[str]
    new_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TicketResponse(TicketBase):
    id: int
    ticket_number: str
    status: TicketStatus
    created_by: int
    assigned_to: Optional[int] = None
    ai_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    creator: Optional[UserResponse] = None
    assignee: Optional[UserResponse] = None
    comments: Optional[List[CommentResponse]] = []
    history: Optional[List[TicketHistoryResponse]] = []

    model_config = ConfigDict(from_attributes=True)


class TicketListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[TicketResponse]

