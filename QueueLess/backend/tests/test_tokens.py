def test_token_creation(client, auth_headers):
    # Valid generation
    res = client.post("/api/v1/tokens", json={"office_id": 1, "service_id": 1}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "WAITING"
    assert "token_number" in res.json()
    t_id = res.json()["id"]
    # Cleanup to prevent HTTP 400 Duplicate block natively
    client.post(f"/api/v1/tokens/{t_id}/cancel", headers=auth_headers)

def test_invalid_service_creation(client, auth_headers):
    # Service 2 is mapped as disabled in DB pre-seed
    res = client.post("/api/v1/tokens", json={"office_id": 1, "service_id": 2}, headers=auth_headers)
    assert res.status_code == 400

def test_token_ownership_and_cancellation(client, auth_headers, emp_headers):
    # 1. Create token as Citizen
    res = client.post("/api/v1/tokens", json={"office_id": 1, "service_id": 1}, headers=auth_headers)
    t_id = res.json()["id"]
    
    # 2. Try cancelling as employee (forbidden normally via this citizen endpoint)
    cancel_res_emp = client.post(f"/api/v1/tokens/{t_id}/cancel", headers=emp_headers)
    assert cancel_res_emp.status_code == 403
    
    # 3. Cancel as true owner
    cancel_res = client.post(f"/api/v1/tokens/{t_id}/cancel", headers=auth_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"
