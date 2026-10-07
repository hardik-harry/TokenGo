from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from models import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False, unique=True, index=True)
    mobile = db.Column(db.String(20), nullable=True)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('citizen', 'staff', 'admin', name='user_roles'), nullable=False, default='citizen', index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    tokens = db.relationship('Token', backref='user', lazy=True, cascade="all, delete-orphan")
    notifications = db.relationship('Notification', backref='user', lazy=True, cascade="all, delete-orphan")
    assigned_counters = db.relationship('Counter', backref='assigned_staff', foreign_keys='Counter.staff_id', lazy=True)

    @property
    def counter_id(self):
        return self.assigned_counters[0].id if self.assigned_counters else None
        
    @counter_id.setter
    def counter_id(self, value):
        from models.counter import Counter
        # Clear existing assignments
        for c in self.assigned_counters:
            c.staff_id = None
        # Add new assignment if not None
        if value:
            counter = Counter.query.get(value)
            if counter:
                counter.staff_id = self.id

    def set_password(self, pwd_text):
        self.password = generate_password_hash(pwd_text)

    def check_password(self, pwd_text):
        return check_password_hash(self.password, pwd_text)

    def is_staff(self):
        return self.role in ['staff', 'admin']

    def is_admin(self):
        return self.role == 'admin'

    def to_dict(self):
        assigned_counter = self.assigned_counters[0] if self.assigned_counters else None
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'mobile': self.mobile,
            'role': self.role,
            'counter_id': assigned_counter.id if assigned_counter else None,
            'counter_name': assigned_counter.counter_name if assigned_counter else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }
