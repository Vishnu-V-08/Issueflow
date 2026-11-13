import os
from pathlib import Path
from typing import List, Union
from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Reliable absolute path to the backend project root and .env file
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BACKEND_DIR / ".env"

# Load backend/.env using absolute path, forcing override to ensure fresh values
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH, override=True)


class Settings(BaseSettings):
    """
    Application configuration settings loaded reliably from backend/.env.
    """
    PROJECT_NAME: str = "IssueFlow"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Database URL: Supabase PostgreSQL connection string
    DATABASE_URL: str = ""

    # CORS origins: list of allowed frontend URLs
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # Deployment & Environment Mode
    ENVIRONMENT: str = "development"

    # Security & JWT Token settings
    SECRET_KEY: str = "issueflow-development-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # Standard 30-minute access token lifetime

    # Initial Admin Seeding Configuration
    INITIAL_ADMIN_EMAIL: str = "admin@issueflow.com"
    INITIAL_ADMIN_PASSWORD: str = "Admin@123"
    INITIAL_ADMIN_NAME: str = "Sarah Jenkins"

    # Google Gemini AI settings (default to Google's current flash model)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Union[str, List[str]]) -> List[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH) if ENV_PATH.exists() else None,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
