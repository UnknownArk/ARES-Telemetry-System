import os
os.environ.setdefault("ADMIN_USERNAME", "commander")
os.environ.setdefault("ADMIN_PASSWORD", "deepspace")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("SECRET_KEY", "test-secret")

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app

client = TestClient(app)

@pytest.fixture(scope="module")
def admin_token():
    response = client.post("/login", data={"username": "commander", "password": "deepspace"})
    return response.json()["access_token"]

@patch("routes.simulation.redis_client")
def test_buffer_status_online(mock_redis, admin_token):
    mock_redis.llen.return_value = 42
    response = client.get("/telemetry/buffer/status", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert response.json() == {"status": "online", "count": 42}

def test_buffer_status_auth_required():
    response = client.get("/telemetry/buffer/status")
    assert response.status_code == 401

@patch("routes.simulation.redis_client")
def test_buffer_status_offline(mock_redis, admin_token):
    # Simulate redis connection error
    mock_redis.llen.side_effect = Exception("Connection refused")
    response = client.get("/telemetry/buffer/status", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert response.json()["count"] == 0

@patch("routes.simulation.redis_client")
def test_telemetry_stream_auth(mock_redis):
    payload = {"mission_id": 1, "parameter_name": "temp", "parameter_value": 100.0, "status_level": "Warning"}
    response = client.post("/telemetry/stream", json=payload)
    assert response.status_code == 401

@patch("routes.simulation.redis_client")
def test_telemetry_flush_preserves_status_level(mock_redis, admin_token):
    import json
    # Mock redis to return one item with Critical status and one Nominal
    mock_redis.lrange.return_value = [
        json.dumps({"mission_id": 1, "parameter_name": "O2", "parameter_value": 91.0, "status_level": "Critical"}),
        json.dumps({"mission_id": 1, "parameter_name": "Temp", "parameter_value": 72.0, "status_level": "Nominal"})
    ]
    
    # Ensure agency 1 exists for FK constraints
    client.post("/agencies", json={"name": "Test Agency", "country": "USA", "description": "Desc"}, headers={"Authorization": f"Bearer {admin_token}"})
    # Ensure mission 1 exists for FK constraints
    client.post("/spacecraft", json={"name": "Ship", "classification": "A", "agency_id": 1}, headers={"Authorization": f"Bearer {admin_token}"})
    client.post("/missions", json={
        "name": "Test", "target_destination": "LEO", "spacecraft_id": 1, 
        "launch_date": "2024-01-01", "status": "Success", "objective": "Test"
    }, headers={"Authorization": f"Bearer {admin_token}"})

    response = client.post("/telemetry/flush", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    
    data = response.json()
    assert data["flushed"] == 2
    assert data["nominal"] == 1
    assert data["warning"] == 0
    assert data["critical"] == 1
    assert data["primary_risk"] == "O2"
    
    # Verify in DB via GET telemetry
    res = client.get("/missions/1/telemetry?limit=5")
    assert res.status_code == 200
    telemetry = res.json()["telemetry"]
    
    critical_found = False
    nominal_found = False
    for t in telemetry:
        if t["parameter_name"] == "O2" and t["status_level"] == "Critical":
            critical_found = True
        if t["parameter_name"] == "Temp" and t["status_level"] == "Nominal":
            nominal_found = True
            
    assert critical_found, "Critical status level was not preserved"
    assert nominal_found, "Nominal status level was not preserved"
