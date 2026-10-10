from typing import Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.api import deps
from app.schemas.token import TokenCreate, TokenResponse
from app.services.queue_manager import QueueManager
from app.models.models import User, Token

router = APIRouter()

@router.post("", response_model=TokenResponse)
def create_token(
    *,
    db: Session = Depends(deps.get_db),
    token_in: TokenCreate,
    current_user: User = Depends(deps.get_current_active_user),
    background_tasks: BackgroundTasks
) -> Any:
    """
    Generate a new token for an office service.
    """
    token = QueueManager.create_token(db, token_in, current_user.id)
    
    # Inject aggregated stats
    stats = QueueManager.get_queue_stats(db, token.office_id, token.service_id, token.id)
    token.people_ahead = stats["people_ahead"]
    token.queue_position = stats["queue_position"]
    token.current_queue_length = stats["current_queue_length"]
    
    from app.websocket.manager import manager
    background_tasks.add_task(manager.broadcast_queue_state, token.office_id, token.service_id)
    
    return token

@router.get("", response_model=list[TokenResponse])
def get_user_tokens(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Retrieve all tokens created securely by the active citizen.
    """
    tokens = db.query(Token).filter(Token.user_id == current_user.id).order_by(Token.created_at.desc()).all()
    from app.models.models import ServiceSession
    # Dummy stat injections for historical view completeness
    for tk in tokens:
        tk.people_ahead = 0
        tk.queue_position = 0
        tk.current_queue_length = 0
        tk.started_at = None
        tk.completed_at = None
        session = db.query(ServiceSession).filter(ServiceSession.token_id == tk.id).first()
        if session:
            tk.started_at = session.started_at
            tk.completed_at = session.ended_at
    return tokens

@router.get("/verify/{token_number}", response_model=TokenResponse)
def verify_token(
    token_number: str,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Publicly verify a token's status and details using its unique number without requiring auth.
    Uses token_number as reference.
    """
    token = db.query(Token).filter(Token.token_number == token_number).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found or invalid.")

    stats = QueueManager.get_queue_stats(db, token.office_id, token.service_id, token.id)
    token.people_ahead = stats["people_ahead"]
    token.queue_position = stats["queue_position"]
    token.current_queue_length = stats["current_queue_length"]
    
    return token

@router.get("/{token_id}", response_model=TokenResponse)
def read_token(
    token_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get token details by ID. Only token owners or staff/admin can read.
    """
    token = db.query(Token).filter(Token.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    if token.user_id != current_user.id and current_user.role not in ["employee", "admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    stats = QueueManager.get_queue_stats(db, token.office_id, token.service_id, token.id)
    token.people_ahead = stats["people_ahead"]
    token.queue_position = stats["queue_position"]
    token.current_queue_length = stats["current_queue_length"]
    
    return token

@router.post("/{token_id}/cancel", response_model=TokenResponse)
def cancel_ticket(
    token_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Cancel an active token.
    """
    token = QueueManager.cancel_token(db, token_id, current_user.id)
    # Give blank stats for cancelled route
    token.people_ahead = 0
    token.queue_position = 0
    token.current_queue_length = 0
    
    from app.websocket.manager import manager
    background_tasks.add_task(manager.broadcast_queue_state, token.office_id, token.service_id)
    
    return token
