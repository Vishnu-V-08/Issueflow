import pytest
from datetime import datetime, timezone, timedelta
from app.models.ticket import Ticket, TicketStatus, TicketPriority, TicketCategory
from app.models.user import UserRole


@pytest.fixture
def isolated_tickets(db_session, admin_user, agent_user, customer_user, other_customer_user):
    """
    Creates isolated tickets owned by customer_user and other_customer_user.
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Ticket 1 owned by customer_user
    t1 = Ticket(
        ticket_number="ISS-SEC-1",
        title="Customer 1 Private Ticket",
        description="Confidential billing matter",
        category=TicketCategory.BILLING,
        priority=TicketPriority.HIGH,
        status=TicketStatus.OPEN,
        created_by=customer_user.id,
        assigned_to=agent_user.id,
        created_at=now,
        updated_at=now,
    )
    # Ticket 2 owned by other_customer_user
    t2 = Ticket(
        ticket_number="ISS-SEC-2",
        title="Customer 2 Private Ticket",
        description="Confidential security inquiry",
        category=TicketCategory.ACCOUNT,
        priority=TicketPriority.CRITICAL,
        status=TicketStatus.IN_PROGRESS,
        created_by=other_customer_user.id,
        assigned_to=None,
        created_at=now,
        updated_at=now,
    )
    db_session.add(t1)
    db_session.add(t2)
    db_session.commit()
    db_session.refresh(t1)
    db_session.refresh(t2)
    return t1, t2


def test_customer_cannot_read_another_customer_ticket(client, customer_headers, isolated_tickets):
    _, t2 = isolated_tickets
    # Customer 1 attempts to GET Ticket 2 owned by Customer 2
    res = client.get(f"/api/tickets/{t2.id}", headers=customer_headers)
    assert res.status_code == 403
    assert "access denied" in res.json()["detail"].lower()


def test_customer_cannot_edit_another_customer_ticket(client, customer_headers, isolated_tickets):
    _, t2 = isolated_tickets
    # Customer 1 attempts to PUT Ticket 2 owned by Customer 2
    res = client.put(f"/api/tickets/{t2.id}", json={"title": "Hacked Title"}, headers=customer_headers)
    assert res.status_code == 403


def test_customer_cannot_comment_on_another_customer_ticket(client, customer_headers, isolated_tickets):
    _, t2 = isolated_tickets
    # Customer 1 attempts to POST comment onto Ticket 2 owned by Customer 2
    res = client.post(
        f"/api/tickets/{t2.id}/comments",
        json={"content": "Malicious comment injected"},
        headers=customer_headers
    )
    assert res.status_code == 403


def test_customer_cannot_view_comments_on_another_customer_ticket(client, customer_headers, isolated_tickets):
    _, t2 = isolated_tickets
    res = client.get(f"/api/tickets/{t2.id}/comments", headers=customer_headers)
    assert res.status_code == 403


def test_customer_cannot_assign_agent_to_ticket(client, customer_headers, agent_user, isolated_tickets):
    t1, _ = isolated_tickets
    # Customer attempts to assign agent
    res = client.post(
        f"/api/tickets/{t1.id}/assign",
        json={"assigned_to": agent_user.id},
        headers=customer_headers
    )
    assert res.status_code == 403


def test_customer_cannot_delete_ticket(client, customer_headers, isolated_tickets):
    t1, _ = isolated_tickets
    res = client.delete(f"/api/tickets/{t1.id}", headers=customer_headers)
    assert res.status_code == 403


def test_agent_cannot_delete_ticket(client, agent_headers, isolated_tickets):
    t1, _ = isolated_tickets
    res = client.delete(f"/api/tickets/{t1.id}", headers=agent_headers)
    assert res.status_code == 403


def test_customer_cannot_set_arbitrary_ticket_status(client, customer_headers, isolated_tickets):
    t1, _ = isolated_tickets
    # Customer can only change status to OPEN or CLOSED; cannot self-resolve or set IN_PROGRESS
    res = client.patch(
        f"/api/tickets/{t1.id}/status",
        json={"status": "RESOLVED"},
        headers=customer_headers
    )
    assert res.status_code == 403
    assert "OPEN or CLOSED" in res.json()["detail"]


def test_customer_cannot_access_user_roster(client, customer_headers):
    # GET /api/users is restricted to Admin
    res = client.get("/api/users/", headers=customer_headers)
    assert res.status_code == 403


def test_agent_cannot_access_user_roster(client, agent_headers):
    # GET /api/users is restricted to Admin
    res = client.get("/api/users/", headers=agent_headers)
    assert res.status_code == 403


def test_customer_cannot_manage_teams(client, customer_headers):
    # POST /api/teams/ is restricted to Admin
    res = client.post(
        "/api/teams/",
        json={"team_name": "Unauthorized Team", "description": "test"},
        headers=customer_headers
    )
    assert res.status_code == 403


def test_user_responses_never_expose_password_hashes(client, admin_headers):
    res = client.get("/api/users/", headers=admin_headers)
    assert res.status_code == 200
    users = res.json()
    assert len(users) > 0
    for u in users:
        assert "hashed_password" not in u
        assert "password" not in u


def test_sql_injection_defense_in_ticket_search(client, admin_headers, isolated_tickets):
    # Attempt classic SQL injection payload in search filter
    sql_payload = "'; DROP TABLE tickets; --"
    res = client.get(f"/api/tickets/?search={sql_payload}", headers=admin_headers)
    assert res.status_code == 200
    # Table must still exist and return empty search result
    data = res.json()
    assert data["total"] == 0

