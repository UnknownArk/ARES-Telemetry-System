from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root_endpoint_is_online():
   
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Space Exploration API is online."}

def test_failed_admin_login():

    # Arrange: Create a fake hacker payload
    hacker_payload = {
        "username": "admin",
        "password": "wrong_password_123"
    }
    
    # Act: Fire a POST request to /login
    response = client.post("/login", data=hacker_payload)
    
    # Assert: Verify the server throws a 400 Bad Request
    assert response.status_code == 400
    assert response.json() == {"detail": "Incorrect username or password"}