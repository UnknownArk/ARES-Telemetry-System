import os

os.environ.setdefault("ADMIN_USERNAME", "commander")
os.environ.setdefault("ADMIN_PASSWORD", "deepspace")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("SECRET_KEY", "test-secret")

from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app
from database import engine
import models

# Create all tables in the test database
models.Base.metadata.create_all(bind=engine)

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



def test_get_missions_endpoint():
    response = client.get("/missions")
    assert response.status_code == 200
    assert "missions" in response.json()
    assert isinstance(response.json()["missions"], list)

@patch("routes.live.redis_client")
def test_live_iss_telemetry_endpoint(mock_redis):
    # This endpoint does not actually use redis in /live/iss/telemetry, it uses requests. 
    # But /live/iss/analyze uses redis and gemini. The user requested /live/iss/telemetry tests.
    response = client.get("/live/iss/telemetry")
    assert response.status_code == 200
    data = response.json()
    assert "target" in data
    assert "altitude_km" in data
    assert "velocity_kmh" in data
    assert "latitude" in data
    assert "longitude" in data
    assert data["target"] == "ISS"

@patch("routes.simulation.redis_client")
def test_telemetry_stream_requires_auth(mock_redis):
    payload = {"altitude": 400.0, "velocity": 27000.0, "latitude": 0.0, "longitude": 0.0}
    # Unauthenticated request should fail
    response = client.post("/telemetry/stream", json=payload)
    assert response.status_code == 401
    
@patch("routes.live.redis_client")
@patch("routes.live.gemini_client")
def test_analyze_live_iss_cached(mock_gemini, mock_redis):
    # Mock redis returning a cached report
    mock_redis.get.return_value = "Mocked AI Report"
    
    response = client.post("/live/iss/analyze")
    assert response.status_code == 200
    assert response.json()["cached"] is True
    assert response.json()["report"] == "Mocked AI Report"
    mock_gemini.models.generate_content.assert_not_called()
