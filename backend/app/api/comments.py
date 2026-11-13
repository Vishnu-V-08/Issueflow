from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.services.comment_service import CommentService
from app.api.deps import get_current_user
from app.models.user import User, UserRole

router = APIRouter(prefix="/comments", tags=["Comments"])


@router.delete(
    "/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a comment"
)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove an existing comment by ID.
    Only the comment author or an Admin can delete it.
    """
    comment = CommentService.get_by_id(db, comment_id)
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Comment with ID {comment_id} not found."
        )

    # Permission check: comment author or admin only
    if current_user.role != UserRole.ADMIN and comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this comment."
        )

    CommentService.delete(db=db, comment_id=comment_id)
    return None
