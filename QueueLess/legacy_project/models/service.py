from datetime import datetime
from models import db

class Service(db.Model):
    __tablename__ = 'services'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    service_name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    average_service_time = db.Column(db.Integer, default=15) # in minutes
    status = db.Column(db.String(20), default='active', index=True) # 'active', 'inactive'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    counters = db.relationship('Counter', backref='service', lazy=True)
    tokens = db.relationship('Token', backref='service', lazy=True)

    @property
    def is_active(self):
        return self.status == 'active'

    def to_dict(self):
        active_tokens = [t for t in self.tokens if t.status in ['waiting', 'serving']]
        return {
            'id': self.id,
            'service_name': self.service_name,
            'name': self.service_name, # helper alias for template compatibility
            'description': self.description,
            'average_service_time': self.average_service_time,
            'status': self.status,
            'is_active': self.is_active,
            'active_queue_count': len(active_tokens),
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }
