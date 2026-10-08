from typing import Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.api import deps
from app.models.models import User, Token, Counter, Office
from app.services.employee_service import EmployeeService
from app.websocket.manager import manager

router = APIRouter()

class CallNextRequest(BaseModel):
    pass

class UpdateStatusRequest(BaseModel):
    status: str
    counter_id: int = None

@router.post("/call-next")
def call_next_token(
    *,
    db: Session = Depends(deps.get_db),
    req: CallNextRequest,
    current_user: User = Depends(deps.get_current_active_user),
    bg_tasks: BackgroundTasks
) -> Any:
    if current_user.role not in ["employee", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
    if not current_user.assigned_office_id or not current_user.assigned_counter_id:
        raise HTTPException(status_code=400, detail="Counter not assigned")
        
    token = EmployeeService.call_next(db, current_user.assigned_office_id, None, current_user.id, current_user.assigned_counter_id)
    if not token:
        raise HTTPException(status_code=404, detail="No eligible tokens are currently waiting.")
        
    bg_tasks.add_task(manager.broadcast_queue_state, token.office_id, token.service_id)
    return {"id": token.id, "token_number": token.token_number, "status": token.status}

@router.post("/tokens/{token_id}/call")
def call_token(
    *,
    db: Session = Depends(deps.get_db),
    token_id: int,
    current_user: User = Depends(deps.get_current_active_user),
    bg_tasks: BackgroundTasks
) -> Any:
    if current_user.role not in ["employee", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    token = EmployeeService.call_specific_token(db, token_id, current_user.id)
    bg_tasks.add_task(manager.broadcast_queue_state, token.office_id, token.service_id)
    return {"id": token.id, "token_number": token.token_number, "status": token.status}

@router.post("/tokens/{token_id}/start")
def start_token(
    *,
    db: Session = Depends(deps.get_db),
    token_id: int,
    req: UpdateStatusRequest,
    current_user: User = Depends(deps.get_current_active_user),
    bg_tasks: BackgroundTasks
) -> Any:
    if current_user.role not in ["employee", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    token = EmployeeService.update_token_status(db, token_id, "SERVING", current_user.id, req.counter_id)
    bg_tasks.add_task(manager.broadcast_queue_state, token.office_id, token.service_id)
    return {"id": token.id, "token_number": token.token_number, "status": token.status}

@router.post("/tokens/{token_id}/complete")
def complete_token(
    *,
    db: Session = Depends(deps.get_db),
    token_id: int,
    current_user: User = Depends(deps.get_current_active_user),
    bg_tasks: BackgroundTasks
) -> Any:
    if current_user.role not in ["employee", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    token = EmployeeService.update_token_status(db, token_id, "COMPLETED", current_user.id, None)
    bg_tasks.add_task(manager.broadcast_queue_state, token.office_id, token.service_id)
    return {"id": token.id, "token_number": token.token_number, "status": token.status}

@router.post("/tokens/{token_id}/skip")
def skip_token(
    *,
    db: Session = Depends(deps.get_db),
    token_id: int,
    current_user: User = Depends(deps.get_current_active_user),
    bg_tasks: BackgroundTasks
) -> Any:
    if current_user.role not in ["employee", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    token = EmployeeService.update_token_status(db, token_id, "SKIPPED", current_user.id, None)
    bg_tasks.add_task(manager.broadcast_queue_state, token.office_id, token.service_id)
    return {"id": token.id, "token_number": token.token_number, "status": token.status}

@router.post("/tokens/{token_id}/no-show")
def no_show_token(
    *,
    db: Session = Depends(deps.get_db),
    token_id: int,
    current_user: User = Depends(deps.get_current_active_user),
    bg_tasks: BackgroundTasks
) -> Any:
    if current_user.role not in ["employee", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    token = EmployeeService.update_token_status(db, token_id, "NO_SHOW", current_user.id, None)
    bg_tasks.add_task(manager.broadcast_queue_state, token.office_id, token.service_id)
    return {"id": token.id, "token_number": token.token_number, "status": token.status}

@router.get("/dashboard")
def get_dashboard(
    *,
    db: Session = Depends(deps.get_db),
    office_id: int,
    service_id: int,
    counter_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role not in ["employee", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
    
    waiting = []
    completed = []
    skipped = []
    no_show = []
    current_token = None
    
    counter = db.query(Counter).filter(Counter.id == current_user.assigned_counter_id).first()
    ctr_status = counter.status if counter else "unknown"
    
    # We must fetch the queue for ALL services bound to this counter natively
    svc_ids = [svc.service_id for svc in counter.services] if counter else []
    
    if svc_ids:
        waiting = db.query(Token).filter(Token.office_id == current_user.assigned_office_id, Token.service_id.in_(svc_ids), Token.status == "WAITING").order_by(Token.id).all()
        current_token = db.query(Token).filter(Token.office_id == current_user.assigned_office_id, Token.service_id.in_(svc_ids), Token.status.in_(["CALLED", "SERVING"]), Token.events.any(employee_id=current_user.id)).first()
        completed = db.query(Token).filter(Token.office_id == current_user.assigned_office_id, Token.service_id.in_(svc_ids), Token.status == "COMPLETED").order_by(Token.id.desc()).limit(50).all()
        skipped = db.query(Token).filter(Token.office_id == current_user.assigned_office_id, Token.service_id.in_(svc_ids), Token.status == "SKIPPED").order_by(Token.id.desc()).limit(20).all()
        no_show = db.query(Token).filter(Token.office_id == current_user.assigned_office_id, Token.service_id.in_(svc_ids), Token.status == "NO_SHOW").order_by(Token.id.desc()).limit(20).all()

    waiting_list = []
    for i, t in enumerate(waiting):
        waiting_list.append({
            "id": t.id, 
            "number": t.token_number,
            "service": t.service.name if t.service else "Unknown",
            "position": i + 1,
            "people_ahead": i,
            "created_at": t.created_at.strftime("%I:%M %p") if t.created_at else "Unknown",
            "base_wait_mins": ((i + 1) * (t.service.baseline_service_minutes or 20)) / max(1, len(svc_ids))
        })

    return {
        "waiting_tokens": waiting_list,
        "current_token": {"id": current_token.id, "number": current_token.token_number, "status": current_token.status} if current_token else None,
        "completed_tokens": [{"id": t.id, "number": t.token_number} for t in completed],
        "skipped_tokens": [{"id": t.id, "number": t.token_number} for t in skipped],
        "no_show_tokens": [{"id": t.id, "number": t.token_number} for t in no_show],
        "queue_length": len(waiting),
        "counter_status": ctr_status,
        "services": svc_ids
    }

@router.get("/assigned-info")
def get_assigned_info(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role not in ["employee", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
    if not current_user.assigned_office_id:
        return None
        
    office = db.query(Office).filter(Office.id == current_user.assigned_office_id).first()
    counter = db.query(Counter).filter(Counter.id == current_user.assigned_counter_id).first()
        
    return {
       "assigned_office_id": current_user.assigned_office_id,
       "office_name": office.name if office else "",
       "assigned_counter_id": current_user.assigned_counter_id,
       "counter_name": counter.counter_name if counter else ""
    }

class AssignRequest(BaseModel):
    office_id: int
    counter_id: int

@router.post("/assign")
def assign_employee(
    *,
    db: Session = Depends(deps.get_db),
    req: AssignRequest,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    if current_user.role not in ["employee", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    current_user.assigned_office_id = req.office_id
    current_user.assigned_counter_id = req.counter_id
    db.commit()
    return {"status": "success"}

@router.post("/counters/{counter_id}/status")
def update_counter(
    *,
    db: Session = Depends(deps.get_db),
    counter_id: int,
    status: str,
    current_user: User = Depends(deps.get_current_active_user),
    bg_tasks: BackgroundTasks
) -> Any:
    if current_user.role not in ["employee", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
    counter = EmployeeService.set_counter_status(db, counter_id, status, current_user.id)
    
    # Broadcast to all specific services this counter can handle
    for serv in counter.services:
        bg_tasks.add_task(manager.broadcast_queue_state, counter.office_id, serv.service_id)
        
    return {"id": counter.id, "status": counter.status}
