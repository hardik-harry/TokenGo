from datetime import datetime
from models import db
from models.token import Token
from models.counter import Counter
from models.service import Service
from services.token_generator import TokenGeneratorService
from services.wait_time import WaitTimeCalculator
from services.notification import NotificationService

class QueueManager:

    @staticmethod
    def get_active_queue(service_id):
        """
        1. Get active queue (waiting and serving) for a service.
        """
        return Token.query.filter(
            Token.service_id == service_id,
            Token.status.in_(['waiting', 'serving'])
        ).order_by(Token.created_at.asc()).all()

    @staticmethod
    def get_current_serving_token(service_id):
        """
        4. Find current serving token for a service.
        """
        return Token.query.filter_by(
            service_id=service_id,
            status='serving'
        ).order_by(Token.called_at.desc()).first()

    @staticmethod
    def get_queue_position(token):
        """
        3. Calculate queue position for a waiting token.
        """
        if token.status != 'waiting':
            return 0

        tokens_ahead = Token.query.filter(
            Token.service_id == token.service_id,
            Token.status == 'waiting',
            Token.created_at < token.created_at
        ).count()
        return tokens_ahead + 1

    @staticmethod
    def get_people_ahead(token):
        """
        5. Count people ahead of a waiting token.
        """
        if token.status != 'waiting':
            return 0

        return Token.query.filter(
            Token.service_id == token.service_id,
            Token.status == 'waiting',
            Token.created_at < token.created_at
        ).count()

    @staticmethod
    def update_queue_positions(service_id):
        """
        6. Update queue positions & estimated wait for all waiting tokens in a service.
        """
        waiting_tokens = Token.query.filter_by(
            service_id=service_id,
            status='waiting'
        ).order_by(Token.created_at.asc()).all()

        service = Service.query.get(service_id)
        avg_time = service.average_service_time if service else 15

        for index, token in enumerate(waiting_tokens):
            token.queue_position = index + 1
            token.estimated_wait = index * avg_time
            
            # If token is approaching (e.g. 1st or 2nd in queue), send approaching notification
            if index < 2:
                NotificationService.notify_approaching(token)
                
        db.session.commit()

    @staticmethod
    def create_token(user_id, service_id):
        """
        7. Handle waiting tokens: Creates a new virtual token safely for a citizen.
        """
        service = Service.query.get(service_id)
        if not service or service.status != 'active':
            raise ValueError("Service is currently unavailable")

        # 2. Generate next unique token number safely
        token_num = TokenGeneratorService.generate_token_number(service_id)

        token = Token(
            token_number=token_num,
            user_id=user_id,
            service_id=service_id,
            status='waiting',
            created_at=datetime.utcnow()
        )
        db.session.add(token)
        db.session.commit()

        # Update queue position & estimated wait
        QueueManager.update_queue_positions(service_id)

        NotificationService.notify_generated(token)

        return token

    @staticmethod
    def call_next(counter_id, staff_user_id):
        """
        8 & 9. Handle called and serving tokens: Calls next token to counter.
        Lifecycle: WAITING -> CALLED -> SERVING
        """
        counter = Counter.query.get(counter_id)
        if not counter or not counter.service_id:
            raise ValueError("Invalid counter or no assigned service")

        # 10. Complete existing active token at this counter if any
        current_serving = Token.query.filter_by(counter_id=counter_id, status='serving').first()
        if current_serving:
            current_serving.status = 'completed'
            current_serving.completed_at = datetime.utcnow()
            NotificationService.notify_completed(current_serving)

        # Get next waiting token in queue
        next_token = Token.query.filter_by(
            service_id=counter.service_id,
            status='waiting'
        ).order_by(Token.created_at.asc()).first()

        if not next_token:
            db.session.commit()
            return None

        # Transition WAITING -> CALLED -> SERVING
        next_token.status = 'serving'
        next_token.counter_id = counter_id
        next_token.called_at = datetime.utcnow()
        db.session.commit()

        # Recalculate remaining waiting tokens
        QueueManager.update_queue_positions(counter.service_id)

        # Notify citizen turn
        NotificationService.notify_turn(next_token, counter.counter_name)

        return next_token

    @staticmethod
    def complete_token(token_id):
        """
        10. Handle completed tokens: SERVING -> COMPLETED
        """
        token = Token.query.get(token_id)
        if not token:
            raise ValueError("Token not found")

        token.status = 'completed'
        token.completed_at = datetime.utcnow()
        db.session.commit()

        QueueManager.update_queue_positions(token.service_id)
        NotificationService.notify_completed(token)
        return token

    @staticmethod
    def skip_token(token_id):
        """
        11. Handle skipped tokens: WAITING/SERVING -> SKIPPED
        """
        token = Token.query.get(token_id)
        if not token:
            raise ValueError("Token not found")

        token.status = 'skipped'
        db.session.commit()

        QueueManager.update_queue_positions(token.service_id)
        NotificationService.create_notification(
            user_id=token.user_id,
            token_id=token.id,
            message=f"Your Token {token.token_number} was marked as skipped.",
            notif_type='warning'
        )
        return token

    @staticmethod
    def cancel_token(token_id, user_id):
        """
        12. Handle cancelled tokens: WAITING/SERVING -> CANCELLED
        """
        token = Token.query.filter_by(id=token_id, user_id=user_id).first()
        if not token:
            raise ValueError("Token not found or unauthorized")

        if token.status not in ['waiting', 'serving']:
            raise ValueError("Cannot cancel completed or inactive token")

        token.status = 'cancelled'
        db.session.commit()

        QueueManager.update_queue_positions(token.service_id)
        return token
