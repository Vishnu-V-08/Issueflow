from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, Token, PasswordChange
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new customer account"
)
def register(
    reg_in: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new user account with role CUSTOMER.
    Returns safe user information and an initial JWT Bearer access token.
    Public registration as ADMIN is strictly prevented.
    """
    user, token = AuthService.register(db=db, reg_in=reg_in)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post(
    "/login",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Log in with email and password (JSON)"
)
def login(
    login_in: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user using email and password JSON payload.
    Returns signed JWT access token and user profile.
    """
    user = AuthService.authenticate(db=db, email=login_in.email, password=login_in.password)
    token = AuthService.create_token_for_user(user)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post(
    "/token",
    summary="OAuth2 compatible token login (used by Swagger UI Authorize button)"
)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Standard OAuth2 password form login endpoint.
    Accepts form-data (username=email, password=password) for Swagger UI Authorize integration.
    """
    user = AuthService.authenticate(db=db, email=form_data.username, password=form_data.password)
    token = AuthService.create_token_for_user(user)
    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile"
)
def get_me(
    current_user: User = Depends(get_current_active_user)
):
    """
    Returns the profile of the user currently authenticated via the JWT Bearer token.
    """
    return current_user


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change account password"
)
def change_password(
    pwd_in: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update password for the currently logged-in user after verifying current password.
    """
    AuthService.change_password(
        db=db,
        user=current_user,
        current_password=pwd_in.current_password,
        new_password=pwd_in.new_password
    )
    return {"message": "Password changed successfully."}

