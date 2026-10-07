def test_admin_protect(client, emp_headers):
    # Employees shouldn't access admin analytics
    res = client.get("/api/v1/admin/analytics", headers=emp_headers)
    assert res.status_code == 403

def test_admin_analytics(client, admin_headers):
    res = client.get("/api/v1/admin/analytics", headers=admin_headers)
    assert res.status_code == 200
    
    data = res.json()
    assert "kpis" in data
    assert "charts" in data
    assert "total_tokens" in data["kpis"]
    
def test_admin_model_metrics(client, admin_headers):
    res = client.get("/api/v1/admin/model-metrics", headers=admin_headers)
    assert res.status_code == 200
    assert "MAE" in res.json()
