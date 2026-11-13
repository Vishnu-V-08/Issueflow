from typing import List
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.team import TeamCreate, TeamUpdate, TeamResponse
from app.services.team_service import TeamService
from app.api.deps import require_admin, require_authenticated
from app.models.user import User

router = APIRouter(prefix="/teams", tags=["Teams"])


@router.post(
    "/",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new team (Admin only)"
)
def create_team(
    team_in: TeamCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Administrator endpoint to create a support team or department.
    """
    return TeamService.create(db=db, team_in=team_in)


@router.get(
    "/",
    response_model=List[TeamResponse],
    summary="Get all teams (Authenticated users)"
)
def get_teams(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """
    Retrieve all support teams in the workspace.
    """
    return TeamService.get_all(db=db, skip=skip, limit=limit)


@router.get(
    "/{team_id}",
    response_model=TeamResponse,
    summary="Get team by ID (Authenticated users)"
)
def get_team_by_id(
    team_id: int,
    current_user: User = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """
    Retrieve details of a single team by its ID.
    """
    team = TeamService.get_by_id(db=db, team_id=team_id)
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with ID {team_id} not found."
        )
    return team


@router.put(
    "/{team_id}",
    response_model=TeamResponse,
    summary="Update team details (Admin only)"
)
def update_team(
    team_id: int,
    team_in: TeamUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Administrator endpoint to update team name or description.
    """
    return TeamService.update(db=db, team_id=team_id, team_in=team_in)


@router.delete(
    "/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a team (Admin only)"
)
def delete_team(
    team_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Administrator endpoint to delete a team.
    """
    TeamService.delete(db=db, team_id=team_id)
    return None
