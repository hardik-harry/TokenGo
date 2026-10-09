import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.models import User, Office, Service, OfficeService, Counter, CounterService, Token, QueueEvent, ServiceSession
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed():
    print("=== QueueLess Structured Role-based Seeder ===")
    
    # 1. Start fresh - Wiping db securely in development
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    default_pass = pwd_context.hash("123")
    
    # 2. Administrative Accounts
    db.add(User(name="System Administrator", password_hash=default_pass, role="admin", email="admin@gmail.com"))
    db.add(User(name="Demo Citizen", password_hash=default_pass, role="citizen", email="user@gmail.com"))
    db.flush()

    # 3. Exactly 3 RTO Offices
    offices_data = [
        {"name": "Ahmedabad RTO", "city": "Ahmedabad", "code": "amd"},
        {"name": "Rajkot RTO", "city": "Rajkot", "code": "rjk"},
        {"name": "Surat RTO", "city": "Surat", "code": "srt"}
    ]
    
    offices_dict = {}
    for o in offices_data:
        office = Office(name=o["name"], city=o["city"])
        db.add(office)
        db.flush()
        offices_dict[o["code"]] = office
        
    # 4. Exactly 3 Services
    services_data = [
        {"name": "Learner's Licence", "code": "ll", "time": 15},
        {"name": "Driving Licence Renewal", "code": "dlr", "time": 10},
        {"name": "New Vehicle Registration", "code": "nvr", "time": 30}
    ]
    
    services_dict = {}
    for s in services_data:
        service = Service(name=s["name"], code=s["code"], baseline_service_minutes=s["time"])
        db.add(service)
        db.flush()
        services_dict[s["code"]] = service
        
    # 5. Exactly 9 Combinations / Employee Mapping
    for city_code, office in offices_dict.items():
        for svc_code, service in services_dict.items():
            
            # Map Service to Office globally
            db.add(OfficeService(office_id=office.id, service_id=service.id))
            db.flush()
            
            # Create the 1 Counter per scope specifically bound
            # e.g., Ahmedabad RTO - Learner's Licence Counter
            counter_name = f"{office.city} - {service.name} Desk"
            counter = Counter(office_id=office.id, counter_name=counter_name, status="active")
            db.add(counter)
            db.flush()
            
            db.add(CounterService(counter_id=counter.id, service_id=service.id))
            db.flush()
            
            # Create Employee Account bound exactly to that Counter scope ONLY.
            # e.g., amdll / amdll@gmail.com
            emp_id_code = f"{city_code}{svc_code}" 
            emp_email = f"{emp_id_code}@gmail.com"
            
            emp = User(
                name=f"Emp {emp_id_code.upper()}",
                email=emp_email,
                password_hash=default_pass,
                role="employee",
                assigned_office_id=office.id,
                assigned_counter_id=counter.id
            )
            db.add(emp)

    db.commit()
    print("Success: 9 Employees firmly mapped to 9 independent isolated Queue queues!")
    db.close()

if __name__ == "__main__":
    seed()
