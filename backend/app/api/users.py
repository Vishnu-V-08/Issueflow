from typing import List
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.user_service import UserService
from app.api.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/users", tags=["Users"])


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user (Admin only)"
)
def create_user(
    user_in: UserCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Administrator endpoint to register users with any role (ADMIN, AGENT, CUSTOMER).
    """
    return UserService.create(db=db, user_in=user_in)


@router.get(
    "/",
    response_model=List[UserResponse],
    summary="Get all users (Admin only)"
)
def get_users(
    skip: int = Query(0, ge=0, description="Offset records to skip for pagination"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Administrator endpoint to view all registered users across the workspace.
    """
    return UserService.get_all(db=db, skip=skip, limit=limit)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user by ID (Admin only)"
)
def get_user_by_id(
    user_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Administrator endpoint to fetch public profile details for a specific user ID.
    """
    user = UserService.get_by_id(db=db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    return user


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update user details (Admin only)"
)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Administrator endpoint to update information or roles for an existing user.
    """
    return UserService.update(db=db, user_id=user_id, user_in=user_in)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user (Admin only)"
)
def delete_user(
    user_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Administrator endpoint to permanently remove a user account.
    """
    UserService.delete(db=db, user_id=user_id)
    return None
