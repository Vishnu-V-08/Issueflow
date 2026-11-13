import logging
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("issueflow.database")

Base = declarative_base()


def get_normalized_database_url() -> str:
    """
    Returns the normalized PostgreSQL connection string matching the installed psycopg2 driver.
    Normalizes 'postgres://' or 'postgresql://' to 'postgresql+psycopg2://'.
    """
    url = settings.DATABASE_URL.strip() if settings.DATABASE_URL else ""

    # Check if user mistakenly passed the Supabase web URL (https://...)
    if url.startswith("https://") or url.startswith("http://"):
        return url

    # Normalize to postgresql+psycopg2 for SQLAlchemy compatibility
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

    return url


def create_db_engine():
    """
    Create the SQLAlchemy engine configured for Supabase PostgreSQL.
    Configured with connection pooling (pool_pre_ping) and SSL encryption.
    """
    db_url = get_normalized_database_url()

    # If no database URL configured or invalid HTTP URL provided
    if not db_url or db_url.startswith("http"):
        logger.warning(
            "DATABASE_URL is not configured with a valid PostgreSQL URI. "
            "Please configure your Supabase connection string in backend/.env"
        )
        # Fallback dummy engine to prevent import-time failure
        return create_engine("sqlite:///:memory:", echo=False)

    connect_args = {}
    # Enable SSL for Supabase connection if not explicitly disabled
    if "sslmode" not in db_url:
        connect_args["sslmode"] = "require"

    return create_engine(
        db_url,
        pool_size=10,
        max_overflow=20,
        pool_recycle=300,
        pool_pre_ping=True,  # Heartbeat ping: automatically reconnects if Supabase drops idle connection
        connect_args=connect_args,
        echo=False
    )


engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a transactional database session per request.
    Automatically rolls back on exceptions and closes the session.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def check_db_connection() -> dict:
    """
    Test live database connectivity to Supabase PostgreSQL.
    Returns a status dictionary with details.
    """
    from sqlalchemy import text
    db_url = get_normalized_database_url()

    if not db_url:
        return {
            "connected": False,
            "error": "DATABASE_URL is not set in backend/.env."
        }

    if db_url.startswith("http"):
        return {
            "connected": False,
            "error": (
                "DATABASE_URL is set to a Web URL (https://...) instead of a PostgreSQL URI. "
                "Please copy the PostgreSQL Connection String (URI) from Supabase Settings > Database."
            )
        }

    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();")).scalar()
            return {
                "connected": True,
                "version": result,
                "driver": "psycopg2",
                "dialect": "PostgreSQL (Supabase)"
            }
    except Exception as e:
        logger.warning(f"Database connection attempt failed: {e}")
        return {
            "connected": False,
            "error": str(e)
        }
