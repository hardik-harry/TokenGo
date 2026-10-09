from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Token, QueueEvent, OfficeService
from app.schemas.token import TokenCreate
from datetime import datetime
import uuid
from fastapi import HTTPException
from app.services.notification_service import NotificationService

class QueueManager:
    @staticmethod
    def _generate_token_number(db: Session, service_id: int, office_id: int) -> str:
        from app.models.models import Service, Token, Office
        service = db.query(Service).filter(Service.id == service_id).first()
        svc_code = service.code.upper() if service else "TK"
        
        office = db.query(Office).filter(Office.id == office_id).first()
        city_prefix = office.city[:3].upper() if office and office.city else f"O{office_id}"
        
        # Count existing tokens for this specific queue to assign next available sequence
        count = db.query(Token).filter(Token.office_id == office_id, Token.service_id == service_id).count()
        return f"{city_prefix}-{svc_code}{(count + 1):03d}"

    @staticmethod
    def get_queue_stats(db: Session, office_id: int, service_id: int, current_token_id: int = None) -> dict:
        # Active states in line
        active_states = ["WAITING", "CALLED"]
        
        # All tokens in this specific queue
        queue_query = db.query(Token).filter(
            Token.office_id == office_id,
            Token.service_id == service_id,
            Token.status.in_(active_states)
        ).order_by(Token.created_at)

        all_active_tokens = queue_query.all()
        current_queue_length = len(all_active_tokens)
        
        people_ahead = 0
        queue_position = 0
        
        if current_token_id:
            # Find index
            for idx, tk in enumerate(all_active_tokens):
                if tk.id == current_token_id:
                    queue_position = idx + 1
                    people_ahead = idx
                    break
        
        return {
            "current_queue_length": current_queue_length,
            "queue_position": queue_position,
            "people_ahead": people_ahead
        }

    @staticmethod
    def create_token(db: Session, token_in: TokenCreate, user_id: int) -> Token:
        # 1. Validate service is available at office
        mapping = db.query(OfficeService).filter(
            OfficeService.office_id == token_in.office_id,
            OfficeService.service_id == token_in.service_id,
            OfficeService.status == "active"
        ).first()
        
        if not mapping:
            raise HTTPException(status_code=400, detail="Requested service is not actively available at this office.")

        # 2. Prevent duplicate token logic (E.g. user already has WAITING token for this service/office)
        existing = db.query(Token).filter(
            Token.user_id == user_id,
            Token.office_id == token_in.office_id,
            Token.service_id == token_in.service_id,
            Token.status.in_(["WAITING", "CALLED"])
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="You already have an active ticket for this service.")

        try:
            # 3. Create Token
            new_token_number = QueueManager._generate_token_number(db, token_in.service_id, token_in.office_id)
            new_token = Token(
                token_number=new_token_number,
                office_id=token_in.office_id,
                service_id=token_in.service_id,
                user_id=user_id,
                status="WAITING"  # Starts as WAITING
            )
            db.add(new_token)
            db.flush() # Flush to get new_token.id natively before commit

            # 4. Save Event Transition
            event = QueueEvent(
                token_id=new_token.id,
                event_type="CREATED",
                timestamp=datetime.utcnow()
            )
            db.add(event)
            db.commit()
            db.refresh(new_token)
            
            if user_id:
                NotificationService.create(db, user_id, f"Token {new_token.token_number} generated successfully.")

            return new_token
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Transaction failed: {str(e)}")

    @staticmethod
    def cancel_token(db: Session, token_id: int, user_id: int) -> Token:
        token = db.query(Token).filter(Token.id == token_id).first()
        if not token:
            raise HTTPException(status_code=404, detail="Token not found.")
        
        # Validate ownership (Only citizen or admin/staff could cancel in reality)
        if token.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to cancel this token.")

        if token.status not in ["WAITING", "CALLED"]:
            raise HTTPException(status_code=400, detail=f"Cannot cancel token currently in {token.status} state.")

        try:
            token.status = "CANCELLED"
            
            event = QueueEvent(
                token_id=token.id,
                event_type="CANCELLED",
                timestamp=datetime.utcnow(),
                employee_id=user_id
            )
            db.add(event)
            db.commit()
            db.refresh(token)
            
            if token.user_id:
                NotificationService.create(db, token.user_id, f"Token {token.token_number} has been cancelled.")
                
            return token
        except Exception:
            db.rollback()
            raise HTTPException(status_code=500, detail="Cancel transaction failed.")
