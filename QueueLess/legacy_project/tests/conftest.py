import pytest
import os
import sys

# Ensure project root is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models import db
from models.user import User
from models.service import Service
from models.counter import Counter

@pytest.fixture
def app():
    app = create_app()
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'WTF_CSRF_ENABLED': False,
        'SESSION_COOKIE_SECURE': False
    })
    
    with app.app_context():
        db.drop_all()
        db.create_all()
        
        # Seed basic data for tests
        db.session.add(Service(id=1, service_name='Test Service', average_service_time=10, status='active'))
        db.session.add(Counter(id=1, counter_name='Counter 1', service_id=1, status='active'))
        
        # Seed users
        admin_user = User(
            name='Test Admin',
            mobile='9999999999',
            email='admin@test.com',
            role='admin'
        )
        admin_user.set_password('adminpass')
        
        staff_user = User(
            name='Test Staff',
            mobile='8888888888',
            email='staff@test.com',
            role='staff'
        )
        staff_user.set_password('staffpass')
        
        citizen_user = User(
            name='Standard Citizen',
            mobile='1111111111',
            email='citizen@test.com',
            role='citizen'
        )
        citizen_user.set_password('citizenpass')
        
        db.session.add_all([admin_user, staff_user, citizen_user])
        db.session.commit()
        
        yield app
        
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def runner(app):
    return app.test_cli_runner()

@pytest.fixture
def run_context(app):
    with app.app_context():
        yield db

@pytest.fixture
def auth(client):
    class AuthActions:
        def login(self, identifier='1111111111', password='citizenpass'):
            return client.post('/login', data={'mobile_or_email': identifier, 'password': password})
            
        def logout(self):
            return client.get('/logout')
            
    return AuthActions()
