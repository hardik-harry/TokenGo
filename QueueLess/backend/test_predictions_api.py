from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app as fastapi_app
from app.db.session import Base
from app.api.deps import get_db
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

fastapi_app.dependency_overrides[get_db] = override_get_db
client = TestClient(fastapi_app)

def seed_db():
    db = TestingSessionLocal()
    # Mock Office
    o = app.models.models.Office(id=1, name="Test RTO", city="TestCity")
    db.add(o)
    
    # Mock Service exactly 15 minutes avg
    s = app.models.models.Service(id=1, name="Learner's Licence", code="LL_01", baseline_service_minutes=15)
    db.add(s)
    
    db.commit()
    
    # Map them securely
    db.add(app.models.models.OfficeService(office_id=o.id, service_id=s.id))
    
    # Mock Token (in waiting list)
    tk1 = app.models.models.Token(id=1, token_number="T1", office_id=1, service_id=1, status="WAITING")
    tk2 = app.models.models.Token(id=2, token_number="T2", office_id=1, service_id=1, status="WAITING")
    tk3 = app.models.models.Token(id=3, token_number="T3", office_id=1, service_id=1, status="WAITING") # Should have 2 ahead 
    db.add_all([tk1, tk2, tk3])
    
    # Note: 0 active counters added to simulate safe math bounds automatically overriding 0 to 1 div factor.
    db.commit()
    db.close()

def run_tests():
    seed_db()
    
    # 1. Base prediction checking (No token passed, computes 3 people ahead)
    print("\n1. Testing New Arrival Prediction Model (No token, 0 counters simulation)...")
    res1 = client.post("/api/v1/predictions/wait-time", json={"office_id": 1, "service_id": 1})
    assert res1.status_code == 200, res1.text
    data = res1.json()
    print(f"Data: {data['predicted_wait_minutes']} mins | Bounds: {data['lower_bound_minutes']}-{data['upper_bound_minutes']} | Flag: {data['prediction_source']}")
    
    # Expectation: 3 people ahead * 15 / 1 fallback counter = 45 minutes
    assert data["predicted_wait_minutes"] == 45
    
    # 2. Token target prediction (Token #3 has 2 people ahead of it)
    print("\n2. Testing Specific Token Target (#3)...")
    res2 = client.post("/api/v1/predictions/wait-time", json={"office_id": 1, "service_id": 1, "token_id": 3})
    data2 = res2.json()
    print(f"Data (Token 3): {data2['predicted_wait_minutes']} mins")
    
    # Expectation: 2 people ahead * 15 = 30 minutes
    assert data2["predicted_wait_minutes"] == 30
    
    print("\nAll Wait-Time Baseline endpoints generated mathematics accurately!")

if __name__ == "__main__":
    run_tests()
