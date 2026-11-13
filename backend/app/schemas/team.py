from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class TeamBase(BaseModel):
    team_name: str = Field(..., min_length=2, max_length=100, description="Name of the team or department")
    description: Optional[str] = Field(None, max_length=500, description="Optional team description")


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
    team_name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class TeamResponse(TeamBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

