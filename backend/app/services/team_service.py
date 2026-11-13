from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.team import Team
from app.schemas.team import TeamCreate, TeamUpdate


class TeamService:
    @staticmethod
    def get_by_id(db: Session, team_id: int) -> Optional[Team]:
        return db.query(Team).filter(Team.id == team_id).first()

    @staticmethod
    def get_by_name(db: Session, team_name: str) -> Optional[Team]:
        return db.query(Team).filter(Team.team_name.ilike(team_name.strip())).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[Team]:
        return db.query(Team).order_by(Team.team_name.asc()).offset(skip).limit(limit).all()

    @staticmethod
    def create(db: Session, team_in: TeamCreate) -> Team:
        existing = TeamService.get_by_name(db, team_in.team_name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Team with name '{team_in.team_name}' already exists."
            )

        db_team = Team(
            team_name=team_in.team_name.strip(),
            description=team_in.description.strip() if team_in.description else None,
        )
        db.add(db_team)
        db.commit()
        db.refresh(db_team)
        return db_team

    @staticmethod
    def update(db: Session, team_id: int, team_in: TeamUpdate) -> Team:
        db_team = TeamService.get_by_id(db, team_id)
        if not db_team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team with ID {team_id} not found."
            )

        update_data = team_in.model_dump(exclude_unset=True)
        if "team_name" in update_data and update_data["team_name"]:
            new_name = update_data["team_name"].strip()
            existing = TeamService.get_by_name(db, new_name)
            if existing and existing.id != team_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Team name '{new_name}' is already in use."
                )
            update_data["team_name"] = new_name

        for field, value in update_data.items():
            setattr(db_team, field, value)

        db.commit()
        db.refresh(db_team)
        return db_team

    @staticmethod
    def delete(db: Session, team_id: int) -> None:
        db_team = TeamService.get_by_id(db, team_id)
        if not db_team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team with ID {team_id} not found."
            )
        db.delete(db_team)
        db.commit()

