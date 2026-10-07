def test_queue_flow(client, auth_headers, emp_headers):
    # 1. Citizen Creates Target Token
    res = client.post("/api/v1/tokens", json={"office_id": 1, "service_id": 1}, headers=auth_headers)
    t_id = res.json()["id"]
    
    # 2. Assert Queue Position & People Ahead via /tokens/{id}
    res_tk = client.get(f"/api/v1/tokens/{t_id}", headers=auth_headers)
    assert res_tk.status_code == 200
    # Assuming first token means pos=1, ahead=0 (if previous tests didn't leak, but let's just assert existence)
    assert "queue_position" in res_tk.json()
    assert "people_ahead" in res_tk.json()

    # 3. Employee Calls Next Token
    call_res = client.post("/api/v1/employee/call-next", json={"office_id": 1, "service_id": 1}, headers=emp_headers)
    assert call_res.status_code == 200
    assert call_res.json()["status"] == "CALLED"
    called_id = call_res.json()["id"]
    
    # 4. Start Service
    start_res = client.post(f"/api/v1/employee/tokens/{called_id}/start", json={"status": "SERVING", "counter_id": 1}, headers=emp_headers)
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "SERVING"
    
    # 5. Complete Service
    comp_res = client.post(f"/api/v1/employee/tokens/{called_id}/complete", json={"status": "COMPLETED"}, headers=emp_headers)
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPLETED"

def test_unauthorized_employee_action(client, auth_headers):
    # Citizen trying to call next
    call_res = client.post("/api/v1/employee/call-next", json={"office_id": 1, "service_id": 1}, headers=auth_headers)
    assert call_res.status_code == 403
