def test_create_ticket_success(client, customer_user, customer_headers):
    ticket_payload = {
        "title": "Payment gateway timeout on checkout",
        "description": "When clicking pay with credit card, the request times out after 30 seconds.",
        "category": "BILLING",
        "priority": "HIGH"
    }
    response = client.post("/api/tickets/", json=ticket_payload, headers=customer_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["ticket_number"].startswith("ISS-")
    assert data["title"] == ticket_payload["title"]
    assert data["status"] == "OPEN"
    assert data["priority"] == "HIGH"
    assert data["category"] == "BILLING"
    assert data["created_by"] == customer_user.id


def test_create_ticket_invalid_creator_fails(client, admin_headers):
    ticket_payload = {
        "title": "Invalid creator ticket",
        "description": "This ticket creator does not exist in the database.",
        "category": "TECHNICAL_ISSUE",
        "priority": "LOW",
        "created_by": 99999
    }
    response = client.post("/api/tickets/", json=ticket_payload, headers=admin_headers)
    assert response.status_code == 404
    assert "does not exist" in response.json()["detail"]


def test_get_ticket_by_id(client, customer_user, customer_headers):
    create_res = client.post("/api/tickets/", json={
        "title": "Cannot export analytics CSV",
        "description": "Export button downloads an empty file on safari.",
        "category": "BUG_REPORT",
        "priority": "MEDIUM"
    }, headers=customer_headers)
    ticket_id = create_res.json()["id"]

    response = client.get(f"/api/tickets/{ticket_id}", headers=customer_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == ticket_id
    assert data["creator"]["full_name"] == customer_user.full_name


def test_ticket_listing_and_filtering(client, customer_headers, admin_headers):
    client.post("/api/tickets/", json={
        "title": "Stripe webhook failure",
        "description": "Detailed stripe webhook signature mismatch.",
        "category": "BILLING",
        "priority": "CRITICAL"
    }, headers=customer_headers)
    client.post("/api/tickets/", json={
        "title": "Dark mode styling issue",
        "description": "Background color flickers on theme toggle.",
        "category": "FEATURE_REQUEST",
        "priority": "LOW"
    }, headers=customer_headers)

    # Search for 'Stripe' as admin
    search_res = client.get("/api/tickets/?search=Stripe", headers=admin_headers)
    assert search_res.status_code == 200
    items = search_res.json()["items"]
    assert len(items) == 1
    assert "Stripe" in items[0]["title"]

    # Filter by Priority 'CRITICAL' as admin
    priority_res = client.get("/api/tickets/?priority=CRITICAL", headers=admin_headers)
    assert priority_res.status_code == 200
    p_items = priority_res.json()["items"]
    assert len(p_items) == 1
    assert p_items[0]["priority"] == "CRITICAL"


def test_assign_ticket_to_agent(client, customer_headers, agent_user, admin_headers):
    tkt_res = client.post("/api/tickets/", json={
        "title": "Ticket to assign",
        "description": "Ticket description here for agent assignment test.",
        "category": "ACCOUNT",
        "priority": "MEDIUM"
    }, headers=customer_headers)
    ticket_id = tkt_res.json()["id"]

    # Assign ticket as admin
    assign_res = client.post(
        f"/api/tickets/{ticket_id}/assign",
        json={"assigned_to": agent_user.id},
        headers=admin_headers
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["assigned_to"] == agent_user.id
    assert assign_res.json()["assignee"]["full_name"] == agent_user.full_name

    # Unassign ticket as admin
    unassign_res = client.post(
        f"/api/tickets/{ticket_id}/assign",
        json={"assigned_to": None},
        headers=admin_headers
    )
    assert unassign_res.status_code == 200
    assert unassign_res.json()["assigned_to"] is None


def test_update_ticket_status(client, customer_headers, agent_headers):
    tkt_res = client.post("/api/tickets/", json={
        "title": "Status test ticket",
        "description": "Testing status transition from OPEN to IN_PROGRESS to RESOLVED.",
        "category": "GENERAL_INQUIRY",
        "priority": "LOW"
    }, headers=customer_headers)
    ticket_id = tkt_res.json()["id"]

    # Update to IN_PROGRESS by agent
    status_res = client.patch(
        f"/api/tickets/{ticket_id}/status",
        json={"status": "IN_PROGRESS"},
        headers=agent_headers
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "IN_PROGRESS"

    # Fetch details and verify history recorded
    detail_res = client.get(f"/api/tickets/{ticket_id}", headers=agent_headers)
    history = detail_res.json()["history"]
    assert len(history) >= 2  # initial create + status change
    assert history[0]["new_status"] == "IN_PROGRESS"


def test_delete_ticket(client, customer_headers, admin_headers):
    tkt_res = client.post("/api/tickets/", json={
        "title": "Ticket to be deleted",
        "description": "Testing deletion of this record.",
        "category": "BUG_REPORT",
        "priority": "LOW"
    }, headers=customer_headers)
    ticket_id = tkt_res.json()["id"]

    del_res = client.delete(f"/api/tickets/{ticket_id}", headers=admin_headers)
    assert del_res.status_code == 204

    # Verification: should now return 404
    get_res = client.get(f"/api/tickets/{ticket_id}", headers=admin_headers)
    assert get_res.status_code == 404
