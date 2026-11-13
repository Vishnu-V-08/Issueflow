from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.user import UserResponse


class CommentBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000, description="Comment message content")


class CommentCreate(CommentBase):
    user_id: Optional[int] = Field(None, description="ID of user creating comment (auto-assigned from token)")


class CommentResponse(CommentBase):
    id: int
    ticket_id: int
    user_id: int
    created_at: datetime
    author: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

