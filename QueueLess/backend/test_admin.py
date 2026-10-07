import requests
import json

def test():
    # Login as admin
    r = requests.post('http://127.0.0.1:8000/api/v1/auth/login', data={'username': 'admin@demo.com', 'password':'demo1234'})
    if r.status_code != 200:
        print("Login failed:", r.text)
        return
    token = r.json()['access_token']
    
    headers = {'Authorization': f'Bearer {token}'}
    r2 = requests.get('http://127.0.0.1:8000/api/v1/admin/analytics', headers=headers)
    print("Analytics:", r2.status_code)
    try:
        print(r2.json())
    except:
        print(r2.text)

    r3 = requests.get('http://127.0.0.1:8000/api/v1/admin/model-metrics', headers=headers)
    print("Metrics:", r3.status_code)
    try:
        print(r3.json())
    except:
        print(r3.text)

test()
