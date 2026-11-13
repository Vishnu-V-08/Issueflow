from fastapi import APIRouter
from app.core.config import settings
from app.database.connection import check_db_connection

router = APIRouter()


@router.get("/health", tags=["Health"])
def health_check():
    """
    Check the health status of backend, Supabase PostgreSQL, and Gemini AI.
    Never exposes credentials or secrets.
    """
    conn_info = check_db_connection()
    api_key = (settings.GEMINI_API_KEY or "").strip()
    ai_configured = bool(api_key and not api_key.startswith("your_") and api_key != "replace_with_a_secure_random_secret")

    return {
        "status": "healthy" if conn_info["connected"] else "database_disconnected",
        "application": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": {
            "provider": "Supabase PostgreSQL",
            "connected": conn_info["connected"],
            "details": conn_info.get("version") or conn_info.get("error")
        },
        "ai": {
            "provider": "Google Gemini",
            "model": settings.GEMINI_MODEL,
            "configured": ai_configured,
            "status": "ready" if ai_configured else "api_key_missing"
        }
    }
