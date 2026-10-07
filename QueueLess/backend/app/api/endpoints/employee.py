from typing import Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.api import deps
from app.models.models import User, Token, Counter
from app.services.employee_service import EmployeeService
from app.websocket.manager import manager

router = APIRouter()

class CallNextRequest(BaseModel):
    office_id: int
    service_id: int

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
        
    token = EmployeeService.call_next(db, req.office_id, req.service_id, current_user.id)
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
    
    # Securely retrieve data only for this context preventing unauthorized leaks
    waiting = db.query(Token).filter(Token.office_id == office_id, Token.service_id == service_id, Token.status == "WAITING").all()
    current_token = db.query(Token).filter(Token.office_id == office_id, Token.service_id == service_id, Token.status.in_(["CALLED", "SERVING"])).first()
    completed = db.query(Token).filter(Token.office_id == office_id, Token.service_id == service_id, Token.status == "COMPLETED").all()
    skipped = db.query(Token).filter(Token.office_id == office_id, Token.service_id == service_id, Token.status == "SKIPPED").all()
    no_show = db.query(Token).filter(Token.office_id == office_id, Token.service_id == service_id, Token.status == "NO_SHOW").all()
    
    counter = db.query(Counter).filter(Counter.id == counter_id, Counter.office_id == office_id).first()
    ctr_status = counter.status if counter else "unknown"

    return {
        "waiting_tokens": [{"id": t.id, "number": t.token_number} for t in waiting],
        "current_token": {"id": current_token.id, "number": current_token.token_number, "status": current_token.status} if current_token else None,
        "completed_tokens": [{"id": t.id, "number": t.token_number} for t in completed],
        "skipped_tokens": [{"id": t.id, "number": t.token_number} for t in skipped],
        "no_show_tokens": [{"id": t.id, "number": t.token_number} for t in no_show],
        "queue_length": len(waiting),
        "counter_status": ctr_status
    }

@router.get("/assigned-info")
def get_assigned_info(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role not in ["employee", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
    
    return {
       "assigned_office_id": 1,
       "assigned_service_id": 1,
       "assigned_counter_id": 1
    }

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
