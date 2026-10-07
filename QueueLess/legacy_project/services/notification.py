from models import db
from models.notification import Notification

class NotificationService:
    @staticmethod
    def create_notification(user_id, token_id, message, notif_type='info'):
        notification = Notification(
            user_id=user_id,
            token_id=token_id,
            message=message,
            type=notif_type
        )
        db.session.add(notification)
        db.session.commit()
        return notification

    @staticmethod
    def notify_generated(token):
        message = f"Your token {token.token_number} has been generated."
        return NotificationService.create_notification(
            user_id=token.user_id,
            token_id=token.id,
            message=message,
            notif_type='info'
        )

    @staticmethod
    def notify_approaching(token):
        message = "Your turn is approaching. Please be ready."
        # Optionally, check if we already sent this to avoid spamming
        existing = Notification.query.filter_by(
            user_id=token.user_id,
            token_id=token.id,
            message=message
        ).first()
        
        if not existing:
            return NotificationService.create_notification(
                user_id=token.user_id,
                token_id=token.id,
                message=message,
                notif_type='warning'
            )
        return existing

    @staticmethod
    def notify_turn(token, counter_name):
        message = f"Please proceed to {counter_name}. Your token {token.token_number} is being served."
        return NotificationService.create_notification(
            user_id=token.user_id,
            token_id=token.id,
            message=message,
            notif_type='success'
        )

    @staticmethod
    def notify_completed(token):
        message = "Your service has been completed."
        return NotificationService.create_notification(
            user_id=token.user_id,
            token_id=token.id,
            message=message,
            notif_type='success'
        )
