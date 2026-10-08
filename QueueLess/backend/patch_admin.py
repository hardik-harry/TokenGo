import os

file_path = "c:/Users/HARDIK DABHI/OneDrive/Desktop/hackathon/project/QueueLess/backend/app/api/endpoints/admin.py"

with open(file_path, "a") as f:
    f.write("""
from pydantic import BaseModel
from typing import List, Optional

class OfficeCreate(BaseModel):
    name: str
    city: str
    address: Optional[str] = None
    status: Optional[str] = "active"

class ServiceCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    baseline_service_minutes: Optional[int] = 15
    status: Optional[str] = "active"
    office_id: int

class CounterCreate(BaseModel):
    office_id: int
    counter_name: str
    status: Optional[str] = "active"

@router.get("/offices")
def get_admin_offices(db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_user)):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Admin only")
    return db.query(Office).all()

@router.post("/offices")
def create_admin_office(office: OfficeCreate, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_user)):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Admin only")
    db_office = Office(**office.dict())
    db.add(db_office)
    db.commit()
    db.refresh(db_office)
    return db_office

@router.put("/offices/{office_id}")
def update_admin_office(office_id: int, office: OfficeCreate, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_user)):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Admin only")
    db_office = db.query(Office).filter(Office.id == office_id).first()
    if not db_office: raise HTTPException(status_code=404)
    for k, v in office.dict().items(): setattr(db_office, k, v)
    db.commit()
    db.refresh(db_office)
    return db_office

@router.get("/services")
def get_admin_services(db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_user)):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Admin only")
    return db.query(Service).all()

@router.post("/services")
def create_admin_service(service: ServiceCreate, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_user)):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Admin only")
    from app.models.models import OfficeService
    db_service = Service(name=service.name, code=service.code, description=service.description, baseline_service_minutes=service.baseline_service_minutes, status=service.status)
    db.add(db_service)
    db.flush()
    oserv = OfficeService(office_id=service.office_id, service_id=db_service.id)
    db.add(oserv)
    db.commit()
    return db_service

@router.put("/services/{service_id}")
def update_admin_service(service_id: int, service: ServiceCreate, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_user)):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Admin only")
    db_service = db.query(Service).filter(Service.id == service_id).first()
    if not db_service: raise HTTPException(status_code=404)
    db_service.name = service.name
    db_service.code = service.code
    db_service.description = service.description
    db_service.baseline_service_minutes = service.baseline_service_minutes
    db_service.status = service.status
    db.commit()
    return db_service

@router.get("/counters")
def get_admin_counters(db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_user)):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Admin only")
    from app.models.models import Counter
    counters = db.query(Counter).all()
    res = []
    for c in counters:
        o = db.query(Office).filter(Office.id == c.office_id).first()
        res.append({
            "id": c.id, "counter_name": c.counter_name, "office_id": c.office_id, "status": c.status, "office_name": o.name if o else "Unknown"
        })
    return res

@router.post("/counters")
def create_admin_counter(counter: CounterCreate, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_user)):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Admin only")
    from app.models.models import Counter
    c = Counter(**counter.dict())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@router.put("/counters/{counter_id}")
def update_admin_counter(counter_id: int, counter: CounterCreate, db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_user)):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Admin only")
    from app.models.models import Counter
    db_counter = db.query(Counter).filter(Counter.id == counter_id).first()
    if not db_counter: raise HTTPException(status_code=404)
    for k, v in counter.dict().items(): setattr(db_counter, k, v)
    db.commit()
    db.refresh(db_counter)
    return db_counter

@router.get("/tokens")
def get_admin_tokens(db: Session = Depends(deps.get_db), current_user: User = Depends(deps.get_current_active_user)):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Admin only")
    tokens = db.query(Token).order_by(Token.created_at.desc()).limit(200).all()
    res = []
    for t in tokens:
        o = db.query(Office).filter(Office.id == t.office_id).first()
        s = db.query(Service).filter(Service.id == t.service_id).first()
        res.append({
            "id": t.id, "token_number": t.token_number, "status": t.status, "created_at": t.created_at,
            "office_name": o.name if o else "Unknown", "service_name": s.name if s else "Unknown"
        })
    return res
""")
print("done")
