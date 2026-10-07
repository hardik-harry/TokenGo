from models import db
from models.token import Token
from models.service import Service
from datetime import datetime

class TokenGeneratorService:
    @staticmethod
    def generate_token_number(service_id):
        """
        Generates unique token number like PAS-101, AAD-202 based on service_name code
        and existing tokens count for the day.
        """
        service = Service.query.get(service_id)
        if not service:
            raise ValueError("Invalid Service ID")

        # Generate a 3-letter prefix code from service_name
        words = service.service_name.split()
        if len(words) >= 2:
            prefix = (words[0][0] + words[1][0] + (words[2][0] if len(words)>2 else words[1][1])).upper()
        else:
            prefix = service.service_name[:3].upper()

        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        latest_token = Token.query.filter(
            Token.service_id == service_id,
            Token.created_at >= today_start
        ).order_by(Token.id.desc()).first()

        if latest_token:
            try:
                num_part = int(latest_token.token_number.rsplit('-', 1)[1])
                next_num = num_part + 1
            except (IndexError, ValueError):
                next_num = 101
        else:
            next_num = 101

        return f"{prefix}-{next_num}"
