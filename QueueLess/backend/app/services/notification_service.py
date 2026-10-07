from sqlalchemy.orm import Session
from app.models.models import Notification
from datetime import datetime
import threading

class NotificationService:
    @staticmethod
    def create(db: Session, user_id: int, message: str) -> Notification:
        # Don't create if exact unread message already exists recently to avoid spam (like Token Approaching)
        recent = db.query(Notification).filter(
            Notification.user_id == user_id, 
            Notification.message == message,
            Notification.is_read == False
        ).first()
        if recent:
            return recent
            
        notification = Notification(
            user_id=user_id,
            message=message,
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification
