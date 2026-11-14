import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy import inspect
from app.core.config import settings
from app.database.connection import SessionLocal, check_db_connection, engine
from app.api import api_router
from app.models import User, UserRole
from app.core.security import get_password_hash

logger = logging.getLogger("issueflow")


def seed_default_admin():
    """
    Seed or verify the initial administrator account.
    - If any ADMIN user already exists in the database: do not modify existing credentials.
    - In development mode (ENVIRONMENT != "production"):
        Seeds INITIAL_ADMIN_EMAIL with INITIAL_ADMIN_PASSWORD (defaults to demo Admin@123 for local student dev).
        Emits security notice reminding developer to change before deploying.
    - In production mode (ENVIRONMENT == "production"):
        Enforces that INITIAL_ADMIN_PASSWORD is NOT the default "Admin@123" and meets minimum length.
        If default or weak password detected, logs a CRITICAL security warning and refuses insecure auto-seeding.
    - Never prints password in logs.
    """
    try:
        inspector = inspect(engine)
        if "users" not in inspector.get_table_names():
            # Tables have not been migrated yet with Alembic
            return

        db = SessionLocal()
        try:
            # Check if any admin already exists in the database
            existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
            if existing_admin:
                logger.info("Admin user already present in database (id: %s). Seeding skipped.", existing_admin.id)
                return

            admin_email = settings.INITIAL_ADMIN_EMAIL.strip().lower()
            admin_password = settings.INITIAL_ADMIN_PASSWORD
            admin_name = settings.INITIAL_ADMIN_NAME.strip()
            is_production = settings.ENVIRONMENT.strip().lower() == "production"

            # Production safeguard: never seed default dev password into production environment
            if is_production and (admin_password == "Admin@123" or len(admin_password) < 10):
                logger.critical(
                    "PRODUCTION SECURITY ALERT: Admin auto-seeding blocked. "
                    "Cannot use default password 'Admin@123' in production. "
                    "Please set a strong INITIAL_ADMIN_PASSWORD in backend/.env before deploying."
                )
                return

            admin_user = User(
                full_name=admin_name,
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(admin_user)
            db.commit()

            if is_production:
                logger.info("Secure production administrator initialized for '%s'.", admin_email)
            else:
                logger.info(
                    "Development admin account initialized for '%s'. "
                    "(Notice: Default credentials active. Change password before production use.)",
                    admin_email
                )
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Could not seed admin user: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan event handler:
    1. Checks Supabase PostgreSQL connectivity
    2. Seeds the initial demo administrator user if tables are migrated
    3. Safely verifies Google Gemini AI configuration
    """
    conn_status = check_db_connection()
    if conn_status["connected"]:
        logger.info(f"Connected to Supabase PostgreSQL: {conn_status.get('version', '')[:50]}")
        seed_default_admin()
    else:
        logger.warning(f"Supabase connection status: {conn_status.get('error')}")

    # Safe Gemini configuration check (never exposes key)
    api_key = (settings.GEMINI_API_KEY or "").strip()
    if api_key and not api_key.startswith("your_"):
        logger.info(f"Google Gemini AI: Configured (Model: {settings.GEMINI_MODEL}, Key Length: {len(api_key)} chars)")
    else:
        logger.warning("Google Gemini AI: GEMINI_API_KEY is not configured or using placeholder.")

    yield


app = FastAPI(
    title=f"{settings.PROJECT_NAME} API",
    description="AI-Powered Support & Issue Management Platform REST API built with FastAPI, SQLAlchemy, and Supabase PostgreSQL.",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# -----------------------------------------------------------------------------
# CORS Middleware Configuration
# -----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
# Request Diagnostic Logging Middleware
# -----------------------------------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    origin = request.headers.get("origin") or "direct"
    logger.info(f"Incoming {request.method} {request.url.path} from Origin: {origin}")
    response = await call_next(request)
    logger.info(f"Completed {request.method} {request.url.path} with status {response.status_code}")
    return response


# -----------------------------------------------------------------------------
# Error Handlers
# -----------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Custom error response handler for request validation failures.
    Formats Pydantic errors into clear, beginner-friendly JSON responses.
    """
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err["loc"] if loc != "body")
        errors.append({
            "field": field or "body",
            "message": err["msg"]
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "detail": errors
        }
    )


# -----------------------------------------------------------------------------
# Root Welcome & Direct Health Routes
# -----------------------------------------------------------------------------
@app.get("/", tags=["Root"])
def root():
    """
    Welcome endpoint providing project metadata and documentation links.
    """
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "api_v1": settings.API_V1_STR,
        "database": "Supabase PostgreSQL"
    }


@app.get("/health", tags=["Health"])
def root_health():
    """
    Direct root health check endpoint for Docker HEALTHCHECK and cloud orchestrators.
    """
    from app.api.health import health_check
    return health_check()


# Include all modular API endpoints under /api
app.include_router(api_router, prefix=settings.API_V1_STR)
