import requests
import json

URL = "http://127.0.0.1:8000/api/v1"

def run_test():
    # Login
    auth_data = {"username": "hardik@example.com", "password": "Password123!"}
    resp = requests.post(f"{URL}/auth/login", data=auth_data)
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} - {resp.text}")
        return
    token = resp.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Generate token
    token_req = {"office_id": 1, "service_id": 1}
    resp = requests.post(f"{URL}/tokens", json=token_req, headers=headers)
    print(f"Generate Token Response: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    run_test()
