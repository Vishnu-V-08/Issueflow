from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.schemas.user import UserResponse


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Full name of the user")
    email: EmailStr = Field(..., description="Valid personal or work email address")
    password: str = Field(..., min_length=6, max_length=128, description="Password (at least 6 characters)")


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered account email address")
    password: str = Field(..., min_length=1, description="Account password")


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None


class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1, description="Current account password")
    new_password: str = Field(..., min_length=6, max_length=128, description="New password (minimum 6 characters)")
