from typing import Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User, UserRole
from app.schemas.auth import RegisterRequest
from app.core.security import get_password_hash, verify_password, create_access_token


class AuthService:
    @staticmethod
    def register(db: Session, reg_in: RegisterRequest) -> Tuple[User, str]:
        """
        Register a new user account as CUSTOMER and generate an initial JWT access token.
        Enforces unique email, hashes password, and prevents privilege escalation.
        """
        normalized_email = reg_in.email.lower().strip()
        existing = db.query(User).filter(User.email == normalized_email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with email '{reg_in.email}' already exists."
            )

        hashed_password = get_password_hash(reg_in.password)
        new_user = User(
            full_name=reg_in.full_name.strip(),
            email=normalized_email,
            hashed_password=hashed_password,
            role=UserRole.CUSTOMER,  # Always default to CUSTOMER; never allow self-service admin
            is_active=True,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        token = AuthService.create_token_for_user(new_user)
        return new_user, token

    @staticmethod
    def authenticate(db: Session, email: str, password: str) -> User:
        """
        Verify credentials for login.
        Returns user on success, raises 401 on bad credentials, 400 on inactive account.
        """
        normalized_email = email.lower().strip()
        user = db.query(User).filter(User.email == normalized_email).first()

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is inactive. Please contact your workspace administrator."
            )

        return user

    @staticmethod
    def create_token_for_user(user: User) -> str:
        """
        Builds JWT payload claims (sub, email, role) and signs access token.
        """
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
        }
        return create_access_token(payload)

    @staticmethod
    def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
        """
        Validates current password and updates to newly hashed password.
        """
        if not verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect."
            )

        user.hashed_password = get_password_hash(new_password)
        db.commit()

