def test_create_and_get_comments(client, customer_headers):
    # Setup ticket as customer
    ticket_res = client.post("/api/tickets/", json={
        "title": "Commentable Ticket",
        "description": "Testing comments discussion trail.",
        "category": "TECHNICAL_ISSUE",
        "priority": "MEDIUM"
    }, headers=customer_headers)
    ticket_id = ticket_res.json()["id"]

    # Post comment
    comment_payload = {
        "content": "Investigating the server logs now."
    }
    c_res = client.post(
        f"/api/tickets/{ticket_id}/comments",
        json=comment_payload,
        headers=customer_headers
    )
    assert c_res.status_code == 201
    c_data = c_res.json()
    assert c_data["id"] is not None
    assert c_data["content"] == comment_payload["content"]
    assert c_data["ticket_id"] == ticket_id

    # Get comments for ticket
    list_res = client.get(f"/api/tickets/{ticket_id}/comments", headers=customer_headers)
    assert list_res.status_code == 200
    comments = list_res.json()
    assert len(comments) == 1
    assert comments[0]["content"] == "Investigating the server logs now."


def test_delete_comment(client, customer_headers):
    ticket_res = client.post("/api/tickets/", json={
        "title": "Another Ticket",
        "description": "Testing comment deletion.",
        "category": "ACCOUNT",
        "priority": "LOW"
    }, headers=customer_headers)
    ticket_id = ticket_res.json()["id"]

    c_res = client.post(
        f"/api/tickets/{ticket_id}/comments",
        json={"content": "Accidental comment to be removed."},
        headers=customer_headers
    )
    comment_id = c_res.json()["id"]

    del_res = client.delete(f"/api/comments/{comment_id}", headers=customer_headers)
    assert del_res.status_code == 204

    # Verify list is empty
    list_res = client.get(f"/api/tickets/{ticket_id}/comments", headers=customer_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 0


def test_comment_on_nonexistent_ticket_returns_404(client, customer_headers):
    res = client.post(
        "/api/tickets/99999/comments",
        json={"content": "Will fail."},
        headers=customer_headers
    )
    assert res.status_code == 404
