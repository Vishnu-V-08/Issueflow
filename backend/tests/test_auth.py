from datetime import timedelta
import pytest
from app.core.security import create_access_token
from app.models.user import User, UserRole


# -----------------------------------------------------------------------------
# 1. User Registration Success
# -----------------------------------------------------------------------------
def test_register_user_success(client):
    payload = {
        "full_name": "New Customer",
        "email": "new.customer@example.com",
        "password": "Password123"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["id"] is not None
    assert data["user"]["full_name"] == "New Customer"
    assert data["user"]["email"] == "new.customer@example.com"
    assert data["user"]["role"] == "CUSTOMER"
    assert data["user"]["is_active"] is True
    assert "password" not in data["user"]
    assert "hashed_password" not in data["user"]


# -----------------------------------------------------------------------------
# 2. Duplicate Email Registration Rejected
# -----------------------------------------------------------------------------
def test_register_duplicate_email_rejected(client, customer_user):
    payload = {
        "full_name": "Duplicate User",
        "email": customer_user.email,
        "password": "Password123"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


# -----------------------------------------------------------------------------
# 3. Password Hashed in Database (Never Plain-text)
# -----------------------------------------------------------------------------
def test_password_is_hashed_in_database(client, db_session):
    payload = {
        "full_name": "Hash Checker",
        "email": "hasher@example.com",
        "password": "PlainSecretPassword123"
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 201

    user_in_db = db_session.query(User).filter(User.email == "hasher@example.com").first()
    assert user_in_db is not None
    assert user_in_db.hashed_password != "PlainSecretPassword123"
    assert user_in_db.hashed_password.startswith("$2b$")


# -----------------------------------------------------------------------------
# 4. User Login Success (JSON Endpoint)
# -----------------------------------------------------------------------------
def test_login_success(client, customer_user):
    payload = {
        "email": customer_user.email,
        "password": "Password123"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == customer_user.email
    assert data["user"]["role"] == "CUSTOMER"


# -----------------------------------------------------------------------------
# 5. Login with Incorrect Password Rejected (401)
# -----------------------------------------------------------------------------
def test_login_invalid_password_rejected(client, customer_user):
    payload = {
        "email": customer_user.email,
        "password": "WrongPassword999"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


# -----------------------------------------------------------------------------
# 6. Inactive User Login Blocked (400)
# -----------------------------------------------------------------------------
def test_inactive_user_login_blocked(client, create_user):
    inactive = create_user(
        full_name="Disabled User",
        email="disabled@example.com",
        password="Password123",
        role=UserRole.CUSTOMER,
        is_active=False
    )
    payload = {
        "email": inactive.email,
        "password": "Password123"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 400
    assert "inactive" in response.json()["detail"].lower()


# -----------------------------------------------------------------------------
# 7. Valid JWT Authentication (GET /api/auth/me)
# -----------------------------------------------------------------------------
def test_get_current_user_me(client, customer_user, customer_headers):
    response = client.get("/api/auth/me", headers=customer_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == customer_user.id
    assert data["email"] == customer_user.email
    assert data["role"] == "CUSTOMER"


# -----------------------------------------------------------------------------
# 8. Invalid JWT Token Rejected (401)
# -----------------------------------------------------------------------------
def test_invalid_jwt_rejected(client):
    headers = {"Authorization": "Bearer invalid.fake.token.string"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]


# -----------------------------------------------------------------------------
# 9. Expired JWT Token Rejected (401)
# -----------------------------------------------------------------------------
def test_expired_jwt_rejected(client, customer_user):
    expired_token = create_access_token(
        data={"sub": str(customer_user.id), "role": customer_user.role.value},
        expires_delta=timedelta(minutes=-10)  # expired 10 minutes ago
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]


# -----------------------------------------------------------------------------
# 10. Missing Token on Protected Route Rejected (401)
# -----------------------------------------------------------------------------
def test_missing_token_rejected(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]


# -----------------------------------------------------------------------------
# 11. Admin Role Authorization (Admin Allowed, Customer Forbidden)
# -----------------------------------------------------------------------------
def test_admin_authorization(client, admin_headers, customer_headers):
    # Admin can access user management
    admin_res = client.get("/api/users/", headers=admin_headers)
    assert admin_res.status_code == 200

    # Customer is strictly forbidden
    cust_res = client.get("/api/users/", headers=customer_headers)
    assert cust_res.status_code == 403
    assert "Access denied" in cust_res.json()["detail"]


# -----------------------------------------------------------------------------
# 12. Agent Role Authorization
# -----------------------------------------------------------------------------
def test_agent_authorization(client, agent_headers):
    # Agent can view all tickets
    res = client.get("/api/tickets/", headers=agent_headers)
    assert res.status_code == 200

    # But Agent cannot access Admin-only user management
    admin_route_res = client.get("/api/users/", headers=agent_headers)
    assert admin_route_res.status_code == 403


# -----------------------------------------------------------------------------
# 13. Customer Role Authorization
# -----------------------------------------------------------------------------
def test_customer_authorization(client, customer_headers):
    # Customer can create their own ticket
    res = client.post("/api/tickets/", json={
        "title": "My Customer Ticket",
        "description": "Need assistance with logging into my profile.",
        "category": "ACCOUNT",
        "priority": "LOW"
    }, headers=customer_headers)
    assert res.status_code == 201

    # Customer CANNOT assign an agent when creating a ticket
    res_assign = client.post("/api/tickets/", json={
        "title": "Attempting unauthorized assignment",
        "description": "Customer tries to assign an agent directly.",
        "category": "ACCOUNT",
        "priority": "LOW",
        "assigned_to": 2
    }, headers=customer_headers)
    assert res_assign.status_code == 403


# -----------------------------------------------------------------------------
# 14. Customer Cannot Access Another Customer's Ticket (403 Forbidden)
# -----------------------------------------------------------------------------
def test_customer_cannot_access_other_customer_ticket(
    client,
    customer_headers,
    other_customer_headers
):
    # Customer A creates a ticket
    create_res = client.post("/api/tickets/", json={
        "title": "Customer A Private Ticket",
        "description": "Sensitive billing details.",
        "category": "BILLING",
        "priority": "HIGH"
    }, headers=customer_headers)
    assert create_res.status_code == 201
    ticket_id = create_res.json()["id"]

    # Customer B attempts to view Customer A's ticket
    peek_res = client.get(f"/api/tickets/{ticket_id}", headers=other_customer_headers)
    assert peek_res.status_code == 403
    assert "Access denied" in peek_res.json()["detail"]

    # Customer B attempts to comment on Customer A's ticket
    comment_res = client.post(
        f"/api/tickets/{ticket_id}/comments",
        json={"content": "Sneaky comment"},
        headers=other_customer_headers
    )
    assert comment_res.status_code == 403


# -----------------------------------------------------------------------------
# 15. Customer Cannot Self-Promote to Admin
# -----------------------------------------------------------------------------
def test_customer_cannot_self_promote_to_admin(client, customer_headers):
    # Public registration forces CUSTOMER role even if an attacker sends "role": "ADMIN"
    res = client.post("/api/auth/register", json={
        "full_name": "Wannabe Admin",
        "email": "wannabe@example.com",
        "password": "Password123"
    })
    assert res.status_code == 201
    assert res.json()["user"]["role"] == "CUSTOMER"

    # Also cannot call admin user creation route
    res_admin_create = client.post("/api/users/", json={
        "full_name": "New Admin Attempt",
        "email": "hacked@example.com",
        "password": "Password123",
        "role": "ADMIN"
    }, headers=customer_headers)
    assert res_admin_create.status_code == 403


# -----------------------------------------------------------------------------
# 16. JWT Default Expiration is 30 Minutes
# -----------------------------------------------------------------------------
def test_jwt_token_default_expiration_is_30_minutes(customer_user):
    from datetime import datetime, timezone
    from app.core.security import decode_access_token
    from app.core.config import settings

    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 30
    now = datetime.now(timezone.utc)
    token = create_access_token(data={"sub": str(customer_user.id), "role": customer_user.role.value})
    payload = decode_access_token(token)

    assert payload is not None
    exp_timestamp = payload.get("exp")
    assert exp_timestamp is not None
    # Expire should be ~30 minutes from now (between 28 and 31 minutes)
    diff_seconds = exp_timestamp - int(now.timestamp())
    assert 28 * 60 <= diff_seconds <= 31 * 60


# -----------------------------------------------------------------------------
# 17. Production Admin Seeding Safeguards
# -----------------------------------------------------------------------------
def test_production_admin_seeding_blocks_default_password(db_session, monkeypatch):
    from app.main import seed_default_admin
    from app.core.config import settings
    from unittest.mock import patch

    # Ensure no admin exists
    db_session.query(User).filter(User.role == UserRole.ADMIN).delete()
    db_session.commit()

    # In production with default password, seeding should be aborted
    with patch.object(settings, "ENVIRONMENT", "production"), \
         patch.object(settings, "INITIAL_ADMIN_PASSWORD", "Admin@123"), \
         patch("app.main.SessionLocal", return_value=db_session):
        seed_default_admin()

        # No admin should be created
        admin = db_session.query(User).filter(User.role == UserRole.ADMIN).first()
        assert admin is None


def test_admin_seeding_preserves_existing_admin(db_session):
    from app.main import seed_default_admin
    from unittest.mock import patch

    # Create an initial admin with a known custom password hash
    original_admin = User(
        full_name="Existing Boss",
        email="existing_boss@issueflow.com",
        hashed_password="original_untouched_hash",
        role=UserRole.ADMIN,
        is_active=True
    )
    db_session.add(original_admin)
    db_session.commit()

    with patch("app.main.SessionLocal", return_value=db_session):
        seed_default_admin()

        # Existing admin hash must remain intact
        reloaded = db_session.query(User).filter(User.email == "existing_boss@issueflow.com").first()
        assert reloaded is not None
        assert reloaded.hashed_password == "original_untouched_hash"
