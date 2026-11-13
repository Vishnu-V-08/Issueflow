import pytest
from datetime import datetime, timezone, timedelta
from app.models.ticket import Ticket, TicketStatus, TicketPriority, TicketCategory
from app.models.team import Team
from app.models.user import UserRole


@pytest.fixture
def seed_tickets(db_session, admin_user, agent_user, customer_user, other_customer_user):
    """
    Populates sample tickets with various statuses, priorities, categories, and dates.
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    tickets = [
        # Customer 1 ticket - Open, Critical, Billing, today
        Ticket(
            ticket_number="ISS-1001",
            title="Stripe billing webhook failure",
            description="Payment hook not received",
            category=TicketCategory.BILLING,
            priority=TicketPriority.CRITICAL,
            status=TicketStatus.OPEN,
            created_by=customer_user.id,
            assigned_to=agent_user.id,
            created_at=now,
            updated_at=now,
        ),
        # Customer 1 ticket - In Progress, High, Technical, 2 days ago
        Ticket(
            ticket_number="ISS-1002",
            title="Database slow query in API",
            description="Response times elevated",
            category=TicketCategory.TECHNICAL_ISSUE,
            priority=TicketPriority.HIGH,
            status=TicketStatus.IN_PROGRESS,
            created_by=customer_user.id,
            assigned_to=agent_user.id,
            created_at=now - timedelta(days=2),
            updated_at=now - timedelta(days=1),
        ),
        # Customer 1 ticket - Resolved, Medium, Bug report, 5 days ago
        Ticket(
            ticket_number="ISS-1003",
            title="Button overflow on mobile",
            description="CSS alignment issue",
            category=TicketCategory.BUG_REPORT,
            priority=TicketPriority.MEDIUM,
            status=TicketStatus.RESOLVED,
            created_by=customer_user.id,
            assigned_to=agent_user.id,
            created_at=now - timedelta(days=5),
            updated_at=now - timedelta(days=3),
        ),
        # Customer 2 ticket - Closed, Low, General inquiry, 10 days ago
        Ticket(
            ticket_number="ISS-1004",
            title="Inquiry about API rate limits",
            description="How many calls per minute?",
            category=TicketCategory.GENERAL_INQUIRY,
            priority=TicketPriority.LOW,
            status=TicketStatus.CLOSED,
            created_by=other_customer_user.id,
            assigned_to=admin_user.id,
            created_at=now - timedelta(days=10),
            updated_at=now - timedelta(days=8),
        ),
        # Customer 2 ticket - Pending, High, Account, 40 days ago (outside 30d filter)
        Ticket(
            ticket_number="ISS-1005",
            title="Cannot reset 2FA device",
            description="Lost security key",
            category=TicketCategory.ACCOUNT,
            priority=TicketPriority.HIGH,
            status=TicketStatus.PENDING,
            created_by=other_customer_user.id,
            assigned_to=None,
            created_at=now - timedelta(days=40),
            updated_at=now - timedelta(days=40),
        ),
    ]

    for t in tickets:
        db_session.add(t)

    # Also add a sample team
    team = Team(
        team_name="Billing & Accounts",
        description="Handles invoicing and subscriptions"
    )
    db_session.add(team)

    db_session.commit()
    return tickets


def test_analytics_endpoints_require_authentication(client):
    endpoints = [
        "/api/analytics/overview",
        "/api/analytics/tickets-by-status",
        "/api/analytics/tickets-by-priority",
        "/api/analytics/ticket-trends",
        "/api/analytics/agent-performance",
        "/api/analytics/team-performance",
    ]
    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 401, f"{ep} did not enforce authentication"


def test_empty_database_returns_clean_zero_metrics(client, admin_headers):
    # Overview
    res = client.get("/api/analytics/overview", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_tickets"] == 0
    assert data["resolution_rate"] == 0.0

    # Status distribution
    res_status = client.get("/api/analytics/tickets-by-status", headers=admin_headers)
    assert res_status.status_code == 200
    statuses = res_status.json()
    assert len(statuses) == 5
    assert all(s["count"] == 0 for s in statuses)

    # Priority distribution
    res_priority = client.get("/api/analytics/tickets-by-priority", headers=admin_headers)
    assert res_priority.status_code == 200
    priorities = res_priority.json()
    assert len(priorities) == 4
    assert all(p["count"] == 0 for p in priorities)


def test_analytics_overview_calculation(client, admin_headers, seed_tickets):
    # All period (5 tickets: 1 open, 1 in_progress, 1 pending, 1 resolved, 1 closed)
    res = client.get("/api/analytics/overview?period=all", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_tickets"] == 5
    assert data["open_tickets"] == 1
    assert data["in_progress_tickets"] == 1
    assert data["pending_tickets"] == 1
    assert data["resolved_tickets"] == 1
    assert data["closed_tickets"] == 1
    # Resolution rate = (1 resolved + 1 closed) / 5 = 40.0%
    assert data["resolution_rate"] == 40.0


def test_analytics_status_distribution(client, admin_headers, seed_tickets):
    res = client.get("/api/analytics/tickets-by-status?period=all", headers=admin_headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 5
    status_map = {item["status"]: item for item in items}
    assert status_map["OPEN"]["count"] == 1
    assert status_map["IN_PROGRESS"]["count"] == 1
    assert status_map["PENDING"]["count"] == 1
    assert status_map["RESOLVED"]["count"] == 1
    assert status_map["CLOSED"]["count"] == 1


def test_analytics_priority_distribution(client, admin_headers, seed_tickets):
    res = client.get("/api/analytics/tickets-by-priority?period=all", headers=admin_headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 4
    priority_map = {item["priority"]: item for item in items}
    assert priority_map["CRITICAL"]["count"] == 1
    assert priority_map["HIGH"]["count"] == 2
    assert priority_map["MEDIUM"]["count"] == 1
    assert priority_map["LOW"]["count"] == 1


def test_analytics_ticket_trends(client, admin_headers, seed_tickets):
    res = client.get("/api/analytics/ticket-trends?period=all", headers=admin_headers)
    assert res.status_code == 200
    trends = res.json()
    assert len(trends) > 0
    # Inbound creation count sum should match total created
    total_created = sum(t["created_count"] for t in trends)
    assert total_created == 5


def test_agent_performance_metrics(client, admin_headers, agent_user, seed_tickets):
    res = client.get("/api/analytics/agent-performance?period=all", headers=admin_headers)
    assert res.status_code == 200
    agents = res.json()
    assert len(agents) >= 2  # Admin and Agent

    agent_entry = next((a for a in agents if a["agent_id"] == agent_user.id), None)
    assert agent_entry is not None
    assert agent_entry["assigned_tickets"] == 3
    assert agent_entry["resolved_tickets"] == 1
    assert agent_entry["pending_tickets"] == 2
    # 1 resolved out of 3 assigned = 33.3%
    assert agent_entry["resolution_rate"] == 33.3


def test_team_performance_metrics(client, admin_headers, seed_tickets):
    res = client.get("/api/analytics/team-performance?period=all", headers=admin_headers)
    assert res.status_code == 200
    teams = res.json()
    assert len(teams) >= 1
    billing_team = next((t for t in teams if "billing" in t["team_name"].lower()), None)
    assert billing_team is not None
    assert billing_team["total_tickets"] >= 1


def test_customer_role_restrictions(client, customer_headers, seed_tickets):
    # Customer forbidden from agent scorecard
    res_agent = client.get("/api/analytics/agent-performance", headers=customer_headers)
    assert res_agent.status_code == 403

    # Customer forbidden from team scorecard
    res_team = client.get("/api/analytics/team-performance", headers=customer_headers)
    assert res_team.status_code == 403

    # Customer overview is strictly scoped to own tickets (Customer 1 has 3 tickets)
    res_overview = client.get("/api/analytics/overview?period=all", headers=customer_headers)
    assert res_overview.status_code == 200
    data = res_overview.json()
    assert data["total_tickets"] == 3


def test_date_filters(client, admin_headers, seed_tickets):
    # 7 days filter: should exclude tickets created 10 and 40 days ago (leaving 3 tickets)
    res_7d = client.get("/api/analytics/overview?period=7d", headers=admin_headers)
    assert res_7d.status_code == 200
    assert res_7d.json()["total_tickets"] == 3

    # 30 days filter: should exclude ticket created 40 days ago (leaving 4 tickets)
    res_30d = client.get("/api/analytics/overview?period=30d", headers=admin_headers)
    assert res_30d.status_code == 200
    assert res_30d.json()["total_tickets"] == 4

    # Invalid period returns 400
    res_bad = client.get("/api/analytics/overview?period=invalid_period", headers=admin_headers)
    assert res_bad.status_code == 400

    # Custom period with start_date > end_date returns 400
    now = datetime.now(timezone.utc)
    future = (now + timedelta(days=5)).isoformat()
    past = (now - timedelta(days=5)).isoformat()
    res_invalid_custom = client.get(
        f"/api/analytics/overview?period=custom&start_date={future}&end_date={past}",
        headers=admin_headers
    )
    assert res_invalid_custom.status_code == 400
