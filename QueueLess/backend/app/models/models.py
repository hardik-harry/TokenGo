from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    mobile_number = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="citizen") # citizen, staff, admin
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    assigned_office_id = Column(Integer, ForeignKey("offices.id"), nullable=True)
    assigned_counter_id = Column(Integer, ForeignKey("counters.id"), nullable=True)

    def verify_password(self, plain_password):
        return pwd_context.verify(plain_password, self.password_hash)

class Office(Base):
    __tablename__ = "offices"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    city = Column(String, nullable=False)
    address = Column(Text, nullable=True)
    timezone = Column(String, default="Asia/Kolkata")
    opening_time = Column(String, default="10:00")
    closing_time = Column(String, default="18:00")
    status = Column(String, default="active")

    services = relationship("OfficeService", back_populates="office")
    counters = relationship("Counter", back_populates="office")
    tokens = relationship("Token", back_populates="office")

class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    baseline_service_minutes = Column(Integer, default=15)
    status = Column(String, default="active")

    offices = relationship("OfficeService", back_populates="service")
    tokens = relationship("Token", back_populates="service")

class OfficeService(Base):
    __tablename__ = "office_services"
    id = Column(Integer, primary_key=True, index=True)
    office_id = Column(Integer, ForeignKey("offices.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    status = Column(String, default="active")
    
    office = relationship("Office", back_populates="services")
    service = relationship("Service", back_populates="offices")

class Counter(Base):
    __tablename__ = "counters"
    id = Column(Integer, primary_key=True, index=True)
    office_id = Column(Integer, ForeignKey("offices.id"), nullable=False)
    counter_name = Column(String, nullable=False)
    status = Column(String, default="active")
    
    office = relationship("Office", back_populates="counters")
    services = relationship("CounterService", back_populates="counter")
    sessions = relationship("ServiceSession", back_populates="counter")

class CounterService(Base):
    __tablename__ = "counter_services"
    id = Column(Integer, primary_key=True, index=True)
    counter_id = Column(Integer, ForeignKey("counters.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    
    counter = relationship("Counter", back_populates="services")

class Token(Base):
    __tablename__ = "tokens"
    id = Column(Integer, primary_key=True, index=True)
    token_number = Column(String, unique=True, index=True, nullable=False)
    office_id = Column(Integer, ForeignKey("offices.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String, default="pending") # pending, serving, completed, abandoned
    created_at = Column(DateTime, default=datetime.utcnow)
    
    office = relationship("Office", back_populates="tokens")
    service = relationship("Service", back_populates="tokens")
    user = relationship("User")
    events = relationship("QueueEvent", back_populates="token")
    sessions = relationship("ServiceSession", back_populates="token")
    predictions = relationship("Prediction", back_populates="token")

class QueueEvent(Base):
    __tablename__ = "queue_events"
    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(Integer, ForeignKey("tokens.id"), nullable=False)
    event_type = Column(String, nullable=False) # issued, called, completed, cancelled
    timestamp = Column(DateTime, default=datetime.utcnow)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    metadata_ = Column(JSON, nullable=True)
    
    token = relationship("Token", back_populates="events")

class ServiceSession(Base):
    __tablename__ = "service_sessions"
    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(Integer, ForeignKey("tokens.id"), nullable=False)
    counter_id = Column(Integer, ForeignKey("counters.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True) # in seconds
    
    token = relationship("Token", back_populates="sessions")
    counter = relationship("Counter", back_populates="sessions")

class ModelVersion(Base):
    __tablename__ = "model_versions"
    id = Column(Integer, primary_key=True, index=True)
    version_name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=False)
    metrics_json = Column(JSON, nullable=True)

class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(Integer, ForeignKey("tokens.id"), nullable=False)
    predicted_wait = Column(Integer, nullable=False)
    lower_bound = Column(Integer, nullable=True)
    upper_bound = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    model_version = Column(String, ForeignKey("model_versions.version_name"), nullable=True)
    
    token = relationship("Token", back_populates="predictions")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    changes = Column(JSON, nullable=True)

class UserSettings(Base):
    __tablename__ = "user_settings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    notifications_enabled = Column(Boolean, default=True, nullable=False)
    language = Column(String, default="English", nullable=False)
    theme = Column(String, default="Light", nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="settings")


class MockTestQuestion(Base):
    __tablename__ = "mock_test_questions"
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False) # List of strings
    correct_option = Column(Integer, nullable=False) # Index 0-3
    explanation = Column(Text, nullable=False)
    sign_type = Column(String, nullable=True) # Icon/Sign key if applicable
    created_at = Column(DateTime, default=datetime.utcnow)


class MockTestAttempt(Base):
    __tablename__ = "mock_test_attempts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    total_questions = Column(Integer, default=15)
    correct_count = Column(Integer, nullable=False)
    incorrect_count = Column(Integer, nullable=False)
    unanswered_count = Column(Integer, nullable=False)
    score = Column(Integer, nullable=False)
    percentage = Column(Float, nullable=False)
    time_taken_seconds = Column(Integer, nullable=False)
    passed = Column(Boolean, nullable=False)
    details_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="mock_test_attempts")

