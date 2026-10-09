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
    counter_id: int,
    service_id: int = None,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role not in ["employee", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")

    from app.models.models import QueueEvent, ServiceSession
    from datetime import date
    import datetime as dt

    # Today's date boundary in UTC
    today_start = dt.datetime.combine(date.today(), dt.time.min)
    today_end   = dt.datetime.combine(date.today(), dt.time.max)

    # Determine which service IDs this counter handles
    counter = db.query(Counter).filter(Counter.id == current_user.assigned_counter_id).first()
    if not counter:
        return {
            "current_token": None,
            "completed_count": 0, "skipped_count": 0, "no_show_count": 0
        }

    svc_ids = [svc.service_id for svc in counter.services]

    # ── Per-employee, per-day counts via QueueEvent ──────────────────────
    # QueueEvent rows are written on every status change and carry employee_id
    def count_events_today(event_type: str) -> int:
        return db.query(QueueEvent).join(
            Token, Token.id == QueueEvent.token_id
        ).filter(
            QueueEvent.employee_id   == current_user.id,
            QueueEvent.event_type    == event_type,
            QueueEvent.timestamp     >= today_start,
            QueueEvent.timestamp     <= today_end,
            Token.office_id          == current_user.assigned_office_id,
            Token.service_id.in_(svc_ids)
        ).count()

    completed_count = count_events_today("COMPLETED")
    skipped_count   = count_events_today("SKIPPED")
    no_show_count   = count_events_today("NO_SHOW")

    # ── Current active token (CALLED or SERVING) ─────────────────────────
    current_token = db.query(Token).filter(
        Token.office_id == current_user.assigned_office_id,
        Token.service_id.in_(svc_ids),
        Token.status.in_(["CALLED", "SERVING"])
    ).order_by(Token.id.asc()).first()

    current_token_data = None
    if current_token:
        client_name = current_token.user.name if current_token.user else "Walk-in / Guest"
        session = db.query(ServiceSession).filter(
            ServiceSession.token_id == current_token.id,
            ServiceSession.ended_at == None
        ).order_by(ServiceSession.id.desc()).first()
        start_time = (session.started_at.isoformat() + "Z") if (session and session.started_at) else None
        current_token_data = {
            "id":          current_token.id,
            "number":      current_token.token_number,
            "status":      current_token.status,
            "client_name": client_name,
            "start_time":  start_time,
        }

    return {
        "current_token":    current_token_data,
        "completed_count":  completed_count,
        "skipped_count":    skipped_count,
        "no_show_count":    no_show_count,
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

    office  = db.query(Office).filter(Office.id == current_user.assigned_office_id).first()
    counter = db.query(Counter).filter(Counter.id == current_user.assigned_counter_id).first()

    # Determine the primary service this counter handles
    svc_ids = [cs.service_id for cs in counter.services] if counter else []
    primary_service_id = svc_ids[0] if svc_ids else None

    return {
        "assigned_office_id":  current_user.assigned_office_id,
        "office_name":         office.name if office else "",
        "assigned_counter_id": current_user.assigned_counter_id,
        "counter_name":        counter.counter_name if counter else "",
        "assigned_service_id": primary_service_id,
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
    # Important: Employee must never be able to change their own assignment. Admin scope only.
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to assign counters. Contact Administrator.")
        
    # NOTE: Normally an admin assigns OTHERS. This endpoint previously assigned self.
    # To assign others, we would need target_user_id. For now, since employees can't use this,
    # and Admin dashboard normally updates via /admin APIs, we'll leave it secured.
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
