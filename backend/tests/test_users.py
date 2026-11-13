def test_create_user_success(client, admin_headers):
    payload = {
        "full_name": "Alex Rivera",
        "email": "alex.rivera@example.com",
        "password": "SecretPassword123",
        "role": "AGENT"
    }
    response = client.post("/api/users/", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["full_name"] == "Alex Rivera"
    assert data["email"] == "alex.rivera@example.com"
    assert data["role"] == "AGENT"
    assert data["is_active"] is True
    # Verify hashed password is NEVER exposed in API response
    assert "password" not in data
    assert "hashed_password" not in data


def test_create_user_duplicate_email(client, admin_headers):
    payload = {
        "full_name": "User One",
        "email": "duplicate@example.com",
        "password": "Password123",
        "role": "CUSTOMER"
    }
    # First creation succeeds
    res1 = client.post("/api/users/", json=payload, headers=admin_headers)
    assert res1.status_code == 201

    # Second creation with identical email fails with 400
    res2 = client.post("/api/users/", json=payload, headers=admin_headers)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


def test_get_all_users(client, admin_headers):
    client.post("/api/users/", json={
        "full_name": "Test User A",
        "email": "user.a@example.com",
        "password": "Password123",
        "role": "CUSTOMER"
    }, headers=admin_headers)
    client.post("/api/users/", json={
        "full_name": "Test User B",
        "email": "user.b@example.com",
        "password": "Password123",
        "role": "AGENT"
    }, headers=admin_headers)

    response = client.get("/api/users/", headers=admin_headers)
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 2


def test_get_user_by_id(client, admin_headers):
    create_res = client.post("/api/users/", json={
        "full_name": "Sarah Connor",
        "email": "sarah.c@example.com",
        "password": "Password123",
        "role": "ADMIN"
    }, headers=admin_headers)
    user_id = create_res.json()["id"]

    response = client.get(f"/api/users/{user_id}", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user_id
    assert data["full_name"] == "Sarah Connor"


def test_update_user(client, admin_headers):
    create_res = client.post("/api/users/", json={
        "full_name": "Old Name",
        "email": "old.email@example.com",
        "password": "OldPassword123",
        "role": "CUSTOMER"
    }, headers=admin_headers)
    user_id = create_res.json()["id"]

    update_payload = {
        "full_name": "New Updated Name",
        "role": "AGENT"
    }
    response = client.put(f"/api/users/{user_id}", json=update_payload, headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "New Updated Name"
    assert data["role"] == "AGENT"
    assert data["email"] == "old.email@example.com"


def test_delete_user(client, admin_headers):
    create_res = client.post("/api/users/", json={
        "full_name": "To Delete",
        "email": "delete.me@example.com",
        "password": "Password123",
        "role": "CUSTOMER"
    }, headers=admin_headers)
    user_id = create_res.json()["id"]

    del_res = client.delete(f"/api/users/{user_id}", headers=admin_headers)
    assert del_res.status_code == 204

    # Now retrieval should return 404
    get_res = client.get(f"/api/users/{user_id}", headers=admin_headers)
    assert get_res.status_code == 404


def test_get_nonexistent_user_returns_404(client, admin_headers):
    response = client.get("/api/users/99999", headers=admin_headers)
    assert response.status_code == 404
