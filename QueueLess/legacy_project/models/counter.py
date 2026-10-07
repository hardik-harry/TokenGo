from datetime import datetime
from models import db

class Counter(db.Model):
    __tablename__ = 'counters'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    counter_name = db.Column(db.String(50), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=True, index=True)
    staff_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    status = db.Column(db.String(20), default='active') # 'active', 'inactive', 'paused'

    tokens = db.relationship('Token', backref='counter', lazy=True)

    @property
    def counter_number(self):
        return self.counter_name # helper alias for template compatibility

    def to_dict(self):
        return {
            'id': self.id,
            'counter_name': self.counter_name,
            'counter_number': self.counter_name,
            'service_id': self.service_id,
            'service_name': self.service.service_name if self.service else 'Unassigned',
            'staff_id': self.staff_id,
            'staff_name': self.assigned_staff.name if self.assigned_staff else 'Unassigned',
            'status': self.status
        }
