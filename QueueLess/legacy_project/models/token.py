from datetime import datetime
from models import db

class Token(db.Model):
    __tablename__ = 'tokens'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    token_number = db.Column(db.String(20), nullable=False, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False, index=True)
    counter_id = db.Column(db.Integer, db.ForeignKey('counters.id'), nullable=True)
    status = db.Column(db.String(20), default='waiting', index=True) # 'waiting', 'serving', 'completed', 'skipped', 'cancelled'
    queue_position = db.Column(db.Integer, default=0)
    estimated_wait = db.Column(db.Integer, default=0) # in minutes
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    called_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)

    # Composite Index declaration matching schema
    __table_args__ = (
        db.Index('idx_tokens_service_status', 'service_id', 'status'),
    )

    # Relationships
    notifications = db.relationship('Notification', backref='token', lazy=True, cascade="all, delete-orphan")

    @property
    def position(self):
        return self.queue_position

    @property
    def estimated_wait_mins(self):
        return self.estimated_wait

    def to_dict(self):
        return {
            'id': self.id,
            'token_number': self.token_number,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else 'Unknown',
            'service_id': self.service_id,
            'service_name': self.service.service_name if self.service else 'Unknown',
            'counter_id': self.counter_id,
            'counter_number': self.counter.counter_name if self.counter else 'Pending Counter',
            'status': self.status,
            'queue_position': self.queue_position,
            'position': self.queue_position,
            'estimated_wait': self.estimated_wait,
            'estimated_wait_mins': self.estimated_wait,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'called_at': self.called_at.strftime('%Y-%m-%d %H:%M:%S') if self.called_at else None,
            'completed_at': self.completed_at.strftime('%Y-%m-%d %H:%M:%S') if self.completed_at else None
        }
