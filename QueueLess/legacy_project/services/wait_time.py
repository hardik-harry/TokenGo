import math
from models import db
from models.token import Token
from models.service import Service
from models.counter import Counter

class WaitTimeCalculator:

    @staticmethod
    def calculate_token_stats(token):
        """
        Calculates queue stats and estimated wait time for a given token.
        Formula: (People Ahead * Average Service Time) / Active Counters
        """
        current_serving = WaitTimeCalculator.get_current_serving_token(token.service_id)

        if token.status != 'waiting':
            return {
                'people_ahead': 0,
                'queue_position': 0,
                'estimated_wait': 0,
                'estimated_wait_mins': 0,
                'current_serving_token': current_serving,
                'current_token': current_serving
            }

        # 1. Count people ahead in line
        people_ahead = Token.query.filter(
            Token.service_id == token.service_id,
            Token.status == 'waiting',
            Token.created_at < token.created_at
        ).count()

        # 2. Get average service time from services table
        service = Service.query.get(token.service_id)
        avg_service_time = service.average_service_time if service else 15

        # 3. Get count of active counters serving this service
        active_counters = Counter.query.filter(
            Counter.service_id == token.service_id,
            Counter.status == 'active'
        ).count()

        # Fallback to 1 if no active counters currently open
        if active_counters <= 0:
            active_counters = 1

        # 4. Calculate estimated wait time (distribute across active counters)
        estimated_wait = math.ceil((people_ahead * avg_service_time) / active_counters)

        return {
            'people_ahead': people_ahead,
            'queue_position': people_ahead + 1,
            'estimated_wait': max(0, estimated_wait),
            'estimated_wait_mins': max(0, estimated_wait),
            'current_serving_token': current_serving,
            'current_token': current_serving
        }

    @staticmethod
    def calculate_service_wait_time(service_id, new_people_count=0):
        """
        Calculates service-level total estimated wait time for new incoming tokens.
        """
        service = Service.query.get(service_id)
        if not service:
            return 0

        people_waiting = Token.query.filter_by(service_id=service_id, status='waiting').count() + new_people_count
        avg_service_time = service.average_service_time
        active_counters = Counter.query.filter_by(service_id=service_id, status='active').count() or 1

        return math.ceil((people_waiting * avg_service_time) / active_counters)

    @staticmethod
    def get_current_serving_token(service_id):
        """
        Returns the token number currently being served at any counter for this service.
        """
        serving_token = Token.query.filter_by(
            service_id=service_id,
            status='serving'
        ).order_by(Token.called_at.desc()).first()

        return serving_token.token_number if serving_token else "QL-000"
