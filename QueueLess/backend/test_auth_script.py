from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app as fastapi_app
from app.db.session import Base
from app.api.deps import get_db
from sqlalchemy.pool import StaticPool
import app.models.models  # Required for Base.metadata to recognize tables

# Create in-memory SQLite DB just for testing Auth logic
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

fastapi_app.dependency_overrides[get_db] = override_get_db
client = TestClient(fastapi_app)

def run_tests():
    print("1. Testing Registration (Citizen)...")
    res = client.post("/api/v1/auth/register", json={
        "name": "Hardik Dabhi",
        "email": "hardik@example.com",
        "password": "securepassword",
        "role": "citizen" # even if he sends an admin role, public endpoint defaults to citizen (simulating security bounds)
    })
    assert res.status_code == 200
    print("Registration successful.")

    print("2. Testing Login...")
    res = client.post("/api/v1/auth/login", data={
        "username": "hardik@example.com",
        "password": "securepassword"
    }) # Note: OAuth2 uses form data
    assert res.status_code == 200
    token = res.json()["access_token"]
    print("Login successful, Token scoped:", token[:15] + "...")

    print("3. Testing Invalid Password...")
    res = client.post("/api/v1/auth/login", data={
        "username": "hardik@example.com",
        "password": "wrongpassword123"
    })
    assert res.status_code == 401
    print("Invalid password blocked correctly.")

    print("4. Testing Invalid Token on Secure Route...")
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer BAD_TOKEN"})
    assert res.status_code == 403
    print("Invalid token blocked correctly.")

    print("5. Testing Role Authorization (Citizen trying to access Admin endpoint)...")
    res = client.get("/api/v1/auth/admin/test", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    print("Role authorization blocked non-admin user successfully!")

    print("\nAll Auth Tests Passed Perfectly!")

if __name__ == "__main__":
    run_tests()
