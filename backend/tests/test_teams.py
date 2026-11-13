def test_create_team_success(client, admin_headers):
    payload = {
        "team_name": "Technical Escalations",
        "description": "Tier 3 senior support engineering team."
    }
    response = client.post("/api/teams/", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["team_name"] == "Technical Escalations"
    assert data["description"] == payload["description"]


def test_create_team_duplicate_name_returns_400(client, admin_headers):
    payload = {
        "team_name": "Billing Support",
        "description": "Handles invoices and subscriptions."
    }
    res1 = client.post("/api/teams/", json=payload, headers=admin_headers)
    assert res1.status_code == 201

    res2 = client.post("/api/teams/", json=payload, headers=admin_headers)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


def test_get_all_teams(client, admin_headers):
    client.post("/api/teams/", json={"team_name": "Alpha Team"}, headers=admin_headers)
    client.post("/api/teams/", json={"team_name": "Beta Team"}, headers=admin_headers)

    response = client.get("/api/teams/", headers=admin_headers)
    assert response.status_code == 200
    teams = response.json()
    assert len(teams) >= 2


def test_update_team(client, admin_headers):
    create_res = client.post("/api/teams/", json={
        "team_name": "Old Team Name",
        "description": "Old desc"
    }, headers=admin_headers)
    team_id = create_res.json()["id"]

    update_res = client.put(f"/api/teams/{team_id}", json={
        "team_name": "New Team Name",
        "description": "Updated desc"
    }, headers=admin_headers)
    assert update_res.status_code == 200
    assert update_res.json()["team_name"] == "New Team Name"


def test_delete_team(client, admin_headers):
    create_res = client.post("/api/teams/", json={"team_name": "Team To Delete"}, headers=admin_headers)
    team_id = create_res.json()["id"]

    del_res = client.delete(f"/api/teams/{team_id}", headers=admin_headers)
    assert del_res.status_code == 204

    get_res = client.get(f"/api/teams/{team_id}", headers=admin_headers)
    assert get_res.status_code == 404
