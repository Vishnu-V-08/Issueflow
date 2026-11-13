def test_root_welcome(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "IssueFlow" in data["message"]
    assert data["docs_url"] == "/docs"


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["application"] == "IssueFlow"
    assert "database" in data
    assert "connected" in data["database"]
