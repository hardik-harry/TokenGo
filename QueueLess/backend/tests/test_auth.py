def test_register(client):
    response = client.post("/api/v1/auth/register", json={
        "name": "New User",
        "email": "new@test.com",
        "password": "securepassword123!"
    })
    assert response.status_code == 200
    assert response.json()["email"] == "new@test.com"

def test_login(client):
    response = client.post("/api/v1/auth/login", data={
        "username": "cit@test.com",
        "password": "pass123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"

def test_invalid_login(client):
    response = client.post("/api/v1/auth/login", data={
        "username": "cit@test.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_jwt_authorization(client, auth_headers):
    # A protected route
    response = client.get("/api/v1/employee/assigned-info", headers=auth_headers)
    # Citizen trying to access employee route
    assert response.status_code == 403
