import pytest
from models.user import User

def test_registration_success(client, run_context):
    response = client.post('/register', data={
        'name': 'New Citizen',
        'mobile': '7777777777',
        'email': 'new@citizen.com',
        'password': 'password123',
        'confirm_password': 'password123',
        'terms': 'on'
    }, follow_redirects=True)
    
    assert response.status_code == 200
    user = User.query.filter_by(mobile='7777777777').first()
    assert user is not None
    assert user.name == 'New Citizen'

def test_registration_duplicate_mobile(client, run_context):
    # '1111111111' already seeded
    response = client.post('/register', data={
        'name': 'Duplicate Guy',
        'mobile': '1111111111', 
        'email': 'unique@email.com',
        'password': 'password123',
        'confirm_password': 'password123',
        'terms': 'on'
    }, follow_redirects=True)
    
    assert response.status_code == 200
    assert b'already registered' in response.data or b'successfully' not in response.data

def test_login_success(auth, client):
    response = auth.login('1111111111', 'citizenpass')
    assert response.headers.get('Location') == '/citizen/dashboard'
    
def test_login_invalid(auth, client):
    response = auth.login('1111111111', 'wrongpass')
    assert b'Invalid mobile/email or password.' in response.data or response.status_code == 200

def test_role_authorization_admin_access(auth, client):
    auth.login('9999999999', 'adminpass')
    response = client.get('/admin/dashboard', follow_redirects=False)
    assert response.status_code == 200
    
def test_role_authorization_staff_blocked_from_admin(auth, client):
    auth.login('8888888888', 'staffpass')
    response = client.get('/admin/dashboard', follow_redirects=True)
    assert response.status_code == 200
    assert b'Access denied' in response.data or b'Administrator privileges required' in response.data

def test_role_authorization_citizen_blocked_from_staff(auth, client):
    auth.login('1111111111', 'citizenpass')
    response = client.get('/staff/dashboard', follow_redirects=True)
    assert response.status_code == 200
    assert b'Access denied' in response.data or b'Staff role required' in response.data
