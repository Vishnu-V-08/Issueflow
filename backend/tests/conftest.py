import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database.connection import Base, get_db
from app.main import app
from app.models.user import User, UserRole
from app.core.security import get_password_hash, create_access_token

# Use an isolated in-memory SQLite database for test executions
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """
    Creates a fresh database schema for every single test and rolls it back when done.
    Ensures zero side-effects between test runs.
    """
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """
    FastAPI TestClient with the database dependency overridden to use the test database.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# Precompute test hash once at startup to speed up tests by ~20x
_CACHED_PASSWORD_HASH = get_password_hash("Password123")


@pytest.fixture
def create_user(db_session):
    def _create(
        full_name="Test User",
        email="test@example.com",
        password="Password123",
        role=UserRole.CUSTOMER,
        is_active=True
    ):
        hashed_pw = _CACHED_PASSWORD_HASH if password == "Password123" else get_password_hash(password)
        user = User(
            full_name=full_name,
            email=email,
            hashed_password=hashed_pw,
            role=role,
            is_active=is_active
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    return _create


@pytest.fixture
def auth_headers():
    def _get_headers(user: User):
        token = create_access_token(
            data={"sub": str(user.id), "role": user.role.value, "email": user.email}
        )
        return {"Authorization": f"Bearer {token}"}
    return _get_headers


@pytest.fixture
def admin_user(create_user):
    return create_user(full_name="Admin Boss", email="admin@test.com", role=UserRole.ADMIN)


@pytest.fixture
def admin_headers(admin_user, auth_headers):
    return auth_headers(admin_user)


@pytest.fixture
def agent_user(create_user):
    return create_user(full_name="Agent Smith", email="agent@test.com", role=UserRole.AGENT)


@pytest.fixture
def agent_headers(agent_user, auth_headers):
    return auth_headers(agent_user)


@pytest.fixture
def customer_user(create_user):
    return create_user(full_name="Customer Alice", email="alice@test.com", role=UserRole.CUSTOMER)


@pytest.fixture
def customer_headers(customer_user, auth_headers):
    return auth_headers(customer_user)


@pytest.fixture
def other_customer_user(create_user):
    return create_user(full_name="Customer Bob", email="bob@test.com", role=UserRole.CUSTOMER)


@pytest.fixture
def other_customer_headers(other_customer_user, auth_headers):
    return auth_headers(other_customer_user)
