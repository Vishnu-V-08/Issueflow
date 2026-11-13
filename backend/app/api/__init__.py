from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.tickets import router as tickets_router
from app.api.comments import router as comments_router
from app.api.teams import router as teams_router
from app.api.ai import router as ai_router
from app.api.analytics import router as analytics_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(tickets_router)
api_router.include_router(comments_router)
api_router.include_router(teams_router)
api_router.include_router(ai_router)
api_router.include_router(analytics_router)

__all__ = ["api_router"]
