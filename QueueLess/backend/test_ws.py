from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app as fastapi_app
from app.db.session import Base
from app.api.deps import get_db, get_current_active_user
import app.models.models 

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def mock_get_current_active_user():
    return app.models.models.User(id=1, name="Test User", role="citizen")

fastapi_app.dependency_overrides[get_db] = override_get_db
fastapi_app.dependency_overrides[get_current_active_user] = mock_get_current_active_user
client = TestClient(fastapi_app)

def seed_db():
    db = TestingSessionLocal()
    o = app.models.models.Office(id=1, name="Test RTO", city="Test")
    s = app.models.models.Service(id=1, name="Test Service", code="TS_01", baseline_service_minutes=15)
    u = app.models.models.User(id=1, name="Test User", email="test@test.com", password_hash="hash")
    db.add_all([o, s, u])
    db.commit()
    db.add(app.models.models.OfficeService(office_id=1, service_id=1, status="active"))
    db.commit()
    db.close()

def run_tests():
    seed_db()
    
    print("\n1. Testing raw Socket connection tracking...")
    with client.websocket_connect("/api/v1/ws/queue/1/1") as websocket:
        # Upon connect, it immediately sends a state!
        data = websocket.receive_json()
        assert data["queue_length"] == 0, data
        print("Initial WS state received natively:", data)

        print("\n2. Testing dynamic REST Broadcast hook...")
        # Client triggers a completely different REST channel endpoint
        res = client.post("/api/v1/tokens", json={"office_id": 1, "service_id": 1})
        assert res.status_code == 200, res.text
        print("REST Token generated. Waiting for WS array blast...")
        
        # TestClient blocks async BackgroundTasks automatically resolving natively
        data2 = websocket.receive_json()
        print("Dynamic Socket Update Captured!", data2)
        assert data2["queue_length"] == 1
        print("Queue accurately broadcasted new +1 length securely across Socket architecture without refreshing!")

if __name__ == "__main__":
    run_tests()
