import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.models import User, Office, Service, OfficeService, Counter, CounterService, Token, QueueEvent, ServiceSession
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_or_create(db, model, defaults=None, **kwargs):
    """
    Safely retrieves an existing record by unique criteria or creates it if it doesn't exist.
    Prevents duplicate entries and safeguards existing user data.
    """
    instance = db.query(model).filter_by(**kwargs).first()
    if instance:
        return instance, False
    else:
        params = dict((k, v) for k, v in kwargs.items())
        params.update(defaults or {})
        instance = model(**params)
        db.add(instance)
        db.commit()
        db.refresh(instance)
        return instance, True

def seed():
    print("=== QueueLess Safe Reproducible Sandbox Seeder ===")
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # 1. Accounts (Safely verifying existence before inserting)
    default_pass = pwd_context.hash("demo1234")
    cit, _ = get_or_create(db, User, defaults={"name": "Demo Citizen", "password_hash": default_pass, "role": "citizen"}, email="citizen@demo.com")
    emp, _ = get_or_create(db, User, defaults={"name": "Demo Employee", "password_hash": default_pass, "role": "employee"}, email="employee@demo.com")
    admin, _ = get_or_create(db, User, defaults={"name": "Demo Admin", "password_hash": default_pass, "role": "admin"}, email="admin@demo.com")

    # 2. Offices
    rajkot, _ = get_or_create(db, Office, defaults={"city": "Rajkot", "address": "RTO East"}, name="Rajkot RTO")
    ahmedabad, _ = get_or_create(db, Office, defaults={"city": "Ahmedabad", "address": "Subhash Bridge"}, name="Ahmedabad RTO")
    surat, _ = get_or_create(db, Office, defaults={"city": "Surat", "address": "Majura Gate"}, name="Surat RTO")
    offices = [rajkot, ahmedabad, surat]

    # 3. Services
    ll_service, _ = get_or_create(db, Service, defaults={"name": "Learner's Licence", "baseline_service_minutes": 25}, code="LL_T")
    dl_service, _ = get_or_create(db, Service, defaults={"name": "Driving Licence Renewal", "baseline_service_minutes": 15}, code="DL_REN")
    veh_service, _ = get_or_create(db, Service, defaults={"name": "New Vehicle Registration", "baseline_service_minutes": 45}, code="NVM_R")
    services = [ll_service, dl_service, veh_service]

    # 4. Safely map all 9 combinations and create realistic counters
    for off in offices:
        for srv in services:
            get_or_create(db, OfficeService, office_id=off.id, service_id=srv.id)
            
            counter_name = f"Desk - {srv.code} Processing"
            counter, _ = get_or_create(db, Counter, defaults={"status": "active"}, office_id=off.id, counter_name=counter_name)
            
            get_or_create(db, CounterService, counter_id=counter.id, service_id=srv.id)

    db.commit()
    print("Success: Safe Sandbox Seed Completed!")
    print("Database relationships generated: 9 Office-Service Combos created mapping to 9 specific realistic processing counters.")
    print("Demo Accounts (Password: demo1234) -> citizen@demo.com | employee@demo.com | admin@demo.com")
    db.close()

if __name__ == "__main__":
    seed()
