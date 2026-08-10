import pytest
from unittest.mock import patch


@pytest.fixture(scope="module")
def admin_token(client):
    response = client.post(
        "/login", data={"username": "commander", "password": "deepspace"}
    )
    return response.json()["access_token"]


@patch("routes.simulation.redis_client")
def test_buffer_status_online(mock_redis, admin_token, client):
    mock_redis.llen.return_value = 42
    response = client.get(
        "/telemetry/buffer/status", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    assert response.json() == {"status": "online", "count": 42}


def test_buffer_status_auth_required(client):
    response = client.get("/telemetry/buffer/status")
    assert response.status_code == 401


@patch("routes.simulation.redis_client")
def test_buffer_status_offline(mock_redis, admin_token, client):
    # Simulate redis connection error
    mock_redis.llen.side_effect = Exception("Connection refused")
    response = client.get(
        "/telemetry/buffer/status", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert response.json()["count"] == 0


@patch("routes.simulation.redis_client")
def test_telemetry_stream_auth(mock_redis, client):
    payload = {
        "mission_id": 1,
        "parameter_name": "temp",
        "parameter_value": 100.0,
        "status_level": "Warning",
    }
    response = client.post("/telemetry/stream", json=payload)
    assert response.status_code == 401


@patch("routes.simulation.redis_client")
def test_telemetry_flush_preserves_status_level(mock_redis, admin_token, client):
    import json

    # Ensure agency 1 exists for FK constraints
    ag_res = client.post(
        "/agencies",
        json={"name": "Test Agency", "country": "USA", "description": "Desc"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    ag_id = ag_res.json()["agency_id"]
    
    # Ensure mission 1 exists for FK constraints
    sc_res = client.post(
        "/spacecraft",
        json={"name": "Ship", "classification": "A", "agency_id": ag_id},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    sc_id = sc_res.json()["spacecraft_id"]
    
    m_res = client.post(
        "/missions",
        json={
            "name": "Test",
            "target_destination": "LEO",
            "spacecraft_id": sc_id,
            "launch_date": "2024-01-01",
            "status": "Success",
            "objective": "Test",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    m_id = m_res.json()["mission_id"]

    # Mock redis to return one item with Critical status and one Nominal
    mock_redis.lrange.return_value = [
        json.dumps(
            {
                "mission_id": m_id,
                "parameter_name": "O2",
                "parameter_value": 91.0,
                "status_level": "Critical",
            }
        ),
        json.dumps(
            {
                "mission_id": m_id,
                "parameter_name": "Temp",
                "parameter_value": 72.0,
                "status_level": "Nominal",
            }
        ),
    ]

    response = client.post(
        "/telemetry/flush", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200

    data = response.json()
    assert data["flushed"] == 2
    assert data["nominal"] == 1
    assert data["warning"] == 0
    assert data["critical"] == 1
    assert data["primary_risk"] == "O2"

    # Verify in DB via GET telemetry
    res = client.get(f"/missions/{m_id}/telemetry?limit=5")
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
