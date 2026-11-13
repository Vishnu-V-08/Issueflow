from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models.user import UserRole


class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Full name of user")
    email: EmailStr = Field(..., description="Unique email address")
    role: UserRole = Field(default=UserRole.CUSTOMER, description="Role of the user (ADMIN, AGENT, CUSTOMER)")


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128, description="Plain text password (will be hashed)")


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=128)


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Config to allow reading from SQLAlchemy ORM instances
    model_config = ConfigDict(from_attributes=True)

