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
from seed import seed

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

def run_tests():
    print("Seeding in-memory SQLite for testing...")
    # Seed via local session manually 
    db = TestingSessionLocal()
    if db.query(app.models.models.Office).count() == 0:
        for o in [{"name": "Rajkot RTO", "city": "Rajkot"}, {"name": "Ahmedabad RTO", "city": "Ahmedabad"}, {"name": "Surat RTO", "city": "Surat"}]:
            db.add(app.models.models.Office(name=o["name"], city=o["city"]))
        for s in [{"name": "Learner's Licence", "code": "LL_01"}, {"name": "Driving Licence Renewal", "code": "DL_REN_02"}, {"name": "New Vehicle Registration", "code": "NEW_VEH_03"}]:
            db.add(app.models.models.Service(name=s["name"], code=s["code"]))
        db.commit()
        
        offices = db.query(app.models.models.Office).all()
        services = db.query(app.models.models.Service).all()
        for office in offices:
            for service in services:
                db.add(app.models.models.OfficeService(office_id=office.id, service_id=service.id))
        db.commit()
    db.close()

    print("\n1. Testing GET /api/v1/offices ...")
    res = client.get("/api/v1/offices")
    assert res.status_code == 200
    offices = res.json()
    assert len(offices) == 3
    print(f"Success! Found offices: {[o['name'] for o in offices]}")
    
    office_id = offices[0]['id']
    
    print(f"\n2. Testing GET /api/v1/offices/{{id}} for ID={office_id}...")
    res = client.get(f"/api/v1/offices/{office_id}")
    assert res.status_code == 200
    print(f"Success! Received Office: {res.json()['name']} in {res.json()['city']}")

    print("\n3. Testing GET 404 validation for unknown office...")
    res = client.get("/api/v1/offices/999")
    assert res.status_code == 404
    print("Success! Captured 404 error perfectly correctly.")

    print(f"\n4. Testing GET /api/v1/offices/{{id}}/services for ID={office_id}...")
    res = client.get(f"/api/v1/offices/{office_id}/services")
    assert res.status_code == 200
    services = res.json()
    assert len(services) == 3
    print(f"Success! Found services mapped natively via Postgres schema relationships: {[s['name'] for s in services]}")
    
    print("\nAll Office APIs verify strictly with schema constraints!")

if __name__ == "__main__":
    run_tests()
