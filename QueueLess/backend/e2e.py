import os
import sys
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup for E2E
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.main import app
from app.db.session import Base
from app.models.models import User, Office, Service, OfficeService, Counter, CounterService, Token, QueueEvent
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Use a specific test DB so we don't blow up production DB in case it's used
SQLALCHEMY_DATABASE_URL = "sqlite:///./e2e_test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def e2e_test():
    print("=== QueueLess E2E Test Pipeline ===")
    
    # 1. DB PREP
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Overwrite dependency
    from app.api.deps import get_db
    import app.db.session as session_module
    
    def override_get_db():
        try:
            db_instance = TestingSessionLocal()
            yield db_instance
        finally:
            db_instance.close()
            
    app.dependency_overrides[get_db] = override_get_db
    session_module.SessionLocal = TestingSessionLocal

    # Clean DB
    db.query(QueueEvent).delete()
    db.query(Token).delete()
    db.query(CounterService).delete()
    db.query(Counter).delete()
    db.query(OfficeService).delete()
    db.query(Service).delete()
    db.query(Office).delete()
    db.query(User).delete()
    db.commit()

    # Seed
    print("[1] Seeding Database...")
    rajkot = Office(name="Rajkot RTO", city="Rajkot")
    dl_service = Service(name="Driving Licence Renewal", code="DL_REN")
    db.add(rajkot)
    db.add(dl_service)
    db.commit()
    db.refresh(rajkot)
    db.refresh(dl_service)
    
    os_map = OfficeService(office_id=rajkot.id, service_id=dl_service.id)
    counter = Counter(office_id=rajkot.id, counter_name="C1")
    db.add_all([os_map, counter])
    db.commit()
    db.refresh(counter)
    
    cs_map = CounterService(counter_id=counter.id, service_id=dl_service.id)
    
    emp = User(name="Employee A", email="emp@rajkot.com", password_hash=pwd_context.hash("pass"), role="employee")
    admin = User(name="Admin", email="admin@rto.com", password_hash=pwd_context.hash("pass"), role="admin")
    cit = User(name="Citizen 1", email="cit@gmail.com", password_hash=pwd_context.hash("pass"), role="citizen")
    
    db.add_all([cs_map, emp, admin, cit])
    db.commit()
    
    client = TestClient(app)
    
    # 2. CITIZEN LOGIN
    print("[2] Citizen Login")
    res = client.post("/api/v1/auth/login", data={"username": "cit@gmail.com", "password": "pass"})
    assert res.status_code == 200
    cit_token = res.json()["access_token"]
    cit_headers = {"Authorization": f"Bearer {cit_token}"}
    
    # 3. GENERATE TOKEN
    print("[3] Citizen Generating Token for Rajkot RTO DL Renewal")
    res = client.post("/api/v1/tokens", json={"office_id": rajkot.id, "service_id": dl_service.id}, headers=cit_headers)
    assert res.status_code == 200
    token_obj = res.json()
    t_id = token_obj["id"]
    t_num = token_obj["token_number"]
    print(f"    -> Token Generated: {t_num}")
    
    # 4. PREDICTION RANGE
    print("[4] AI Predicted Waiting Range")
    res = client.post("/api/v1/predictions/wait-time", json={"office_id": rajkot.id, "service_id": dl_service.id}, headers=cit_headers)
    assert res.status_code == 200
    pred = res.json()
    print(f"    -> Estimated Wait: {pred['lower_bound_minutes']} - {pred['upper_bound_minutes']} minutes (Source: {pred['prediction_source']})")
    
    # 5. WEBSOCKET TEST (Simulating frontend subscription)
    print("[5] Subscribing to WebSockets")
    with client.websocket_connect(f"/api/v1/ws/queue/{rajkot.id}/{dl_service.id}?auth_token={cit_token}") as ws:
        msg = ws.receive_json()
        print(f"    -> WS Init Payload: Queue Length = {msg['queue_length']}")
    
    # 6. EMPLOYEE LOGIN & ACTION
    print("[6] Employee Actions")
    res = client.post("/api/v1/auth/login", data={"username": "emp@rajkot.com", "password": "pass"})
    emp_token = res.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    
    res = client.post("/api/v1/employee/call-next", json={"office_id": rajkot.id, "service_id": dl_service.id}, headers=emp_headers)
    assert res.status_code == 200
    print(f"    -> Token Called: {res.json()['token_number']}")
    
    res = client.post(f"/api/v1/employee/tokens/{t_id}/status", json={"status": "SERVING", "counter_id": counter.id}, headers=emp_headers)
    assert res.status_code == 200
    print("    -> Service Started")
    
    res = client.post(f"/api/v1/employee/tokens/{t_id}/status", json={"status": "COMPLETED"}, headers=emp_headers)
    assert res.status_code == 200
    print("    -> Service Completed")
    
    # 7. VERIFY DURATION IS STORED
    print("[7] Verifying Duration")
    from app.models.models import ServiceSession
    session = db.query(ServiceSession).filter(ServiceSession.token_id == t_id).first()
    assert session is not None
    print(f"    -> Session mapped successfully.")
    
    # 8. NOTIFICATIONS
    print("[8] Verifying Notifications")
    from app.models.models import Notification
    nots = db.query(Notification).filter(Notification.user_id == cit.id).all()
    assert len(nots) > 0
    print(f"    -> Emitted {len(nots)} Notifications gracefully (e.g. {nots[-1].message})")

    # 9. ADMIN ANALYTICS
    print("[9] Admin Dashboard Validation")
    res = client.post("/api/v1/auth/login", data={"username": "admin@rto.com", "password": "pass"})
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    res = client.get("/api/v1/admin/analytics", headers=admin_headers)
    assert res.status_code == 200
    print(f"    -> Total Tokens Logged Globally: {res.json()['kpis']['total_tokens']}")

    print("=== E2E Test Protocol Result: 100% SUCCESS ===")

if __name__ == "__main__":
    e2e_test()
