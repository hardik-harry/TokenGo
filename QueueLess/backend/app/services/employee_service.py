from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime
from app.models.models import Token, QueueEvent, ServiceSession, Counter
from app.services.notification_service import NotificationService

class EmployeeService:
    @staticmethod
    def call_next(db: Session, office_id: int, service_id: int, employee_id: int):
        token = db.query(Token).filter(
            Token.office_id == office_id, 
            Token.service_id == service_id, 
            Token.status == "WAITING"
        ).order_by(Token.created_at.asc()).first()
        
        if not token:
            raise HTTPException(status_code=404, detail="No waiting tokens in the queue.")
            
        token.status = "CALLED"
        db.add(QueueEvent(token_id=token.id, event_type="CALLED", timestamp=datetime.utcnow(), employee_id=employee_id))
        db.commit()
        db.refresh(token)
        
        if token.user_id:
            NotificationService.create(db, token.user_id, f"Your token ({token.token_number}) has been called to Counter!")
            
        return token

    @staticmethod
    def call_specific_token(db: Session, token_id: int, employee_id: int):
        token = db.query(Token).filter(Token.id == token_id).first()
        if not token:
            raise HTTPException(status_code=404, detail="Token not found.")
        if token.status != "WAITING":
            raise HTTPException(status_code=400, detail="Only waiting tokens can be called directly.")
            
        token.status = "CALLED"
        db.add(QueueEvent(token_id=token.id, event_type="CALLED", timestamp=datetime.utcnow(), employee_id=employee_id))
        db.commit()
        db.refresh(token)
        
        if token.user_id:
            NotificationService.create(db, token.user_id, f"Your token ({token.token_number}) has been called to Counter!")
            
        return token

    @staticmethod
    def update_token_status(db: Session, token_id: int, status: str, employee_id: int, counter_id: int = None):
        valid_statuses = ["SERVING", "COMPLETED", "SKIPPED", "NO_SHOW"]
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail="Invalid token status.")

        token = db.query(Token).filter(Token.id == token_id).first()
        if not token:
            raise HTTPException(status_code=404, detail="Token not found.")

        token.status = status
        db.add(QueueEvent(token_id=token.id, event_type=status, timestamp=datetime.utcnow(), employee_id=employee_id))

        if status == "SERVING" and counter_id:
            # Start service session mapping
            session = ServiceSession(token_id=token.id, counter_id=counter_id, started_at=datetime.utcnow())
            db.add(session)
            
        elif status == "COMPLETED" or status == "SKIPPED" or status == "NO_SHOW":
            # End service session organically mapping metrics
            session = db.query(ServiceSession).filter(ServiceSession.token_id == token.id, ServiceSession.ended_at == None).first()
            if session:
                session.ended_at = datetime.utcnow()
                diff = (session.ended_at - session.started_at).total_seconds()
                session.duration = int(diff)

        db.commit()
        db.refresh(token)
        
        if token.user_id:
            msg_map = {
                "SERVING": f"Service for {token.token_number} has started.",
                "COMPLETED": f"Service for {token.token_number} is completed. Thank you!",
                "SKIPPED": f"Your token {token.token_number} was skipped.",
                "NO_SHOW": f"Your token {token.token_number} was marked as No-Show."
            }
            if status in msg_map:
                NotificationService.create(db, token.user_id, msg_map[status])
                
        return token
        
    @staticmethod
    def set_counter_status(db: Session, counter_id: int, status: str, employee_id: int):
        counter = db.query(Counter).filter(Counter.id == counter_id).first()
        if not counter:
            raise HTTPException(status_code=404, detail="Counter not found.")
            
        counter.status = status # active, paused, closed
        db.commit()
        db.refresh(counter)
        return counter
