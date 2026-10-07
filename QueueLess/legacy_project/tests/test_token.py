import pytest
from models.token import Token

def test_token_generation_success(client, auth, run_context):
    auth.login('1111111111', 'citizenpass')
    response = client.post('/token/generate', data={'service_id': 1}, follow_redirects=True)
    assert response.status_code == 200
    
    token = Token.query.filter_by(user_id=3).first() # user 3 is citizen_user
    assert token is not None
    assert token.service_id == 1
    assert token.status == 'waiting'
    
def test_unique_token_numbers_prevent_duplicate_service(client, auth, run_context):
    auth.login('1111111111', 'citizenpass')
    client.post('/token/generate', data={'service_id': 1}, follow_redirects=True)
    
    # Try creating another token for same service while one is waiting
    response = client.post('/token/generate', data={'service_id': 1}, follow_redirects=True)
    
    tokens = Token.query.filter_by(user_id=3).all()
    assert len(tokens) == 1
    assert b'already have an active token' in response.data
