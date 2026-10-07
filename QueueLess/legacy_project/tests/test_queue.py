import pytest
from services.queue_manager import QueueManager
from models.token import Token
from models import db

def test_queue_position_and_people_ahead(app, run_context):
    with app.app_context():
        t1 = QueueManager.create_token(user_id=3, service_id=1)
        t2 = QueueManager.create_token(user_id=2, service_id=1)
        t3 = QueueManager.create_token(user_id=1, service_id=1)
        
        # Positions
        assert t1.queue_position == 1
        assert t2.queue_position == 2
        assert t3.queue_position == 3
        
        # People ahead
        assert QueueManager.get_people_ahead(t1) == 0
        assert QueueManager.get_people_ahead(t2) == 1
        assert QueueManager.get_people_ahead(t3) == 2

def test_waiting_time_calculation(app, run_context):
    with app.app_context():
        QueueManager.create_token(user_id=3, service_id=1) # index 0 -> 0*10 = 0
        t2 = QueueManager.create_token(user_id=2, service_id=1) # index 1 -> 1*10 = 10
        t3 = QueueManager.create_token(user_id=1, service_id=1) # index 2 -> 2*10 = 20
        
        assert t2.estimated_wait == 10
        assert t3.estimated_wait == 20

def test_call_next_token(app, run_context):
    with app.app_context():
        # Setup tokens
        t1 = QueueManager.create_token(user_id=3, service_id=1)
        t2 = QueueManager.create_token(user_id=2, service_id=1)
    
        called = QueueManager.call_next(counter_id=1, staff_user_id=2)
        assert called.id == t1.id
        assert called.status == 'serving'
        assert called.counter_id == 1
        assert called.called_at is not None
        
        # After call, t2 queue position updates
        db.session.refresh(t2)
        assert t2.queue_position == 1
        assert t2.estimated_wait == 0

def test_completing_token(app, run_context):
    with app.app_context():
        t1 = QueueManager.create_token(user_id=3, service_id=1)
        
        called = QueueManager.call_next(counter_id=1, staff_user_id=2)
        completed = QueueManager.complete_token(called.id)
        
        assert completed.status == 'completed'
        assert completed.completed_at is not None

def test_skipping_token(app, run_context):
    with app.app_context():
        t1 = QueueManager.create_token(user_id=3, service_id=1)
        skipped = QueueManager.skip_token(t1.id)
        
        assert skipped.status == 'skipped'
