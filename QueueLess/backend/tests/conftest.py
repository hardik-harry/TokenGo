import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import warnings

# Filter noisy deprecation warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

from app.db.session import Base
from app.main import app
from app.api.deps import get_db
from app.models.models import Office, Service, OfficeService, Counter, User
from passlib.context import CryptContext

# In-memory SQLite for extremely fast integration tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    # Setup
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Pre-Seed Static Ground Truth Environment for Testing
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    admin = User(name="Admin", email="admin@test.com", password_hash=pwd_context.hash("pass123"), role="admin")
    emp = User(name="Emp", email="emp@test.com", password_hash=pwd_context.hash("pass123"), role="employee")
    cit = User(name="Cit", email="cit@test.com", password_hash=pwd_context.hash("pass123"), role="citizen")
    db.add_all([admin, emp, cit])
    
    office = Office(name="Test RTO", city="Test City")
    service1 = Service(name="Test Service 1", code="TS1", baseline_service_minutes=15)
    service2 = Service(name="Test Service 2", code="TS2", baseline_service_minutes=10)
    db.add_all([office, service1, service2])
    db.commit()
    
    map1 = OfficeService(office_id=office.id, service_id=service1.id, status="active")
    map2 = OfficeService(office_id=office.id, service_id=service2.id, status="disabled") # Disabled on purpose for invalid checks
    
    counter = Counter(office_id=office.id, counter_name="C1", status="active")
    db.add_all([map1, map2, counter])
    db.commit()
    
    yield  # Runs the tests!
    
    # Teardown
    db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture()
def client():
    # Because WebSocket tests can be tricky with Starlette TestClient in async,
    # we return standard TestClient cleanly
    with TestClient(app) as c:
        yield c

@pytest.fixture()
def auth_headers(client):
    # Retrieve standard Citizen JWT header (OAuth2 uses form data)
    response = client.post("/api/v1/auth/login", data={"username": "cit@test.com", "password": "pass123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture()
def emp_headers(client):
    # Retrieve Employee JWT header
    response = client.post("/api/v1/auth/login", data={"username": "emp@test.com", "password": "pass123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture()
def admin_headers(client):
    # Retrieve Admin JWT header
    response = client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "pass123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
