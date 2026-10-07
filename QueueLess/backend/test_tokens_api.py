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

# Mock Authentication Dependency
def mock_get_current_active_user():
    return app.models.models.User(id=1, name="Test User", role="citizen")

fastapi_app.dependency_overrides[get_db] = override_get_db
fastapi_app.dependency_overrides[get_current_active_user] = mock_get_current_active_user
client = TestClient(fastapi_app)

def seed_db():
    db = TestingSessionLocal()
    if db.query(app.models.models.Office).count() == 0:
        o = app.models.models.Office(id=1, name="Rajkot RTO", city="Rajkot")
        db.add(o)
        s = app.models.models.Service(id=1, name="Learner's Licence", code="LL_01")
        db.add(s)
        u = app.models.models.User(id=1, name="Test User", email="test@test.com", password_hash="hash")
        db.add(u)
        db.commit()
        db.add(app.models.models.OfficeService(office_id=o.id, service_id=s.id))
        db.commit()
    db.close()

def run_tests():
    seed_db()
    
    print("\n1. Testing POST /api/v1/tokens (Create Ticket)...")
    res = client.post("/api/v1/tokens", json={"office_id": 1, "service_id": 1})
    assert res.status_code == 200, res.text
    tk = res.json()
    print(f"Token created! Number: {tk['token_number']} | Queue Position: {tk['queue_position']} | People Ahead: {tk['people_ahead']}")
    
    tk_id = tk['id']

    print("\n2. Testing POST duplicate token prevention...")
    res2 = client.post("/api/v1/tokens", json={"office_id": 1, "service_id": 1})
    assert res2.status_code == 400
    print("Duplicate token blocked correctly:", res2.json()['detail'])

    print(f"\n3. Testing GET /api/v1/tokens/{tk_id} (Read Stats)...")
    res_get = client.get(f"/api/v1/tokens/{tk_id}")
    assert res_get.status_code == 200
    print("Token fetched. Length:", res_get.json()['current_queue_length'])

    print(f"\n4. Testing POST /api/v1/tokens/{tk_id}/cancel (Cancel logic)...")
    res_cancel = client.post(f"/api/v1/tokens/{tk_id}/cancel")
    assert res_cancel.status_code == 200
    print("Token status changed to:", res_cancel.json()['status'])
    
    print("\nAll Virtual Token & Queue tests passed perfectly!")

if __name__ == "__main__":
    run_tests()
