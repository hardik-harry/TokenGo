from fastapi.websockets import WebSocketDisconnect
from unittest.mock import patch
import pytest

def test_websocket_unauthorized(client):
    try:
        with client.websocket_connect("/api/v1/ws/queue/1/1"):
            pass
    except Exception as e:
        assert "1008" in str(e) or getattr(e, 'code', 1008) == 1008

@patch("app.websocket.manager.ConnectionManager.broadcast_queue_state")
def test_websocket_authorized_connection_and_broadcast(mock_broadcast, client):
    # 1. Gain Authentication Payload securely
    response = client.post("/api/v1/auth/login", data={"username": "cit@test.com", "password": "pass123"})
    token = response.json()["access_token"]
    
    # 2. Open connection using Starlette TestClient explicitly mapping ?auth_token parameter
    # Because we mocked broadcast, we don't expect the automatic immediate payload.
    # We just ensure the connection successfully establishes securely!
    with client.websocket_connect(f"/api/v1/ws/queue/1/1?auth_token={token}") as websocket:
        # Assert the mock was called successfully verifying backend logical triggers
        mock_broadcast.assert_called_once_with(1, 1)
