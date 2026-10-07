def test_prediction_endpoint(client, auth_headers):
    # Valid Request
    res = client.post("/api/v1/predictions/wait-time", json={
        "office_id": 1,
        "service_id": 1
    }, headers=auth_headers)
    
    assert res.status_code == 200
    data = res.json()
    assert "predicted_wait_minutes" in data
    assert "lower_bound_minutes" in data
    assert "upper_bound_minutes" in data
    assert "prediction_source" in data
    
    # Assert non-negative prediction
    assert data["predicted_wait_minutes"] >= 0
    assert data["lower_bound_minutes"] >= 0
    
    # Check fallback structure (assuming ML doesn't exist locally it falls back gracefully)
    assert data["prediction_source"] == "BASELINE" or data["prediction_source"] == "FALLBACK" or data["prediction_source"] == "ML_MODEL"

def test_prediction_required_fields(client, auth_headers):
    # Missing service_id
    res = client.post("/api/v1/predictions/wait-time", json={
        "office_id": 1
    }, headers=auth_headers)
    assert res.status_code == 422
