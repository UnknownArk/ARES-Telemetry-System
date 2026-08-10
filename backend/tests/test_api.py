from unittest.mock import patch

def test_root_endpoint_is_online(client):

    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Space Exploration API is online."}


def test_failed_admin_login(client):

    # Arrange: Create a fake hacker payload
    hacker_payload = {"username": "admin", "password": "wrong_password_123"}

    # Act: Fire a POST request to /login
    response = client.post("/login", data=hacker_payload)

    # Assert: Verify the server throws a 400 Bad Request
    assert response.status_code == 400
    assert response.json() == {"detail": "Incorrect username or password"}


def test_get_missions_endpoint(client):
    response = client.get("/missions")
    assert response.status_code == 200
    assert "missions" in response.json()
    assert isinstance(response.json()["missions"], list)


@patch("routes.live.requests.get")
@patch("routes.live.redis_client")
def test_live_iss_telemetry_endpoint(mock_redis, mock_requests_get, client):
    # Mock the external WhereTheIss.at API
    class MockResponse:
        def json(self):
            return {
                "altitude": 420.0,
                "velocity": 27500.0,
                "latitude": 10.0,
                "longitude": 20.0,
            }

        def raise_for_status(self):
            pass

    mock_requests_get.return_value = MockResponse()

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
def test_telemetry_stream_requires_auth(mock_redis, client):
    payload = {
        "altitude": 400.0,
        "velocity": 27000.0,
        "latitude": 0.0,
        "longitude": 0.0,
    }
    # Unauthenticated request should fail
    response = client.post("/telemetry/stream", json=payload)
    assert response.status_code == 401


@patch("routes.live.redis_client")
def test_analyze_live_iss_cached(mock_redis, client):
    # Mock redis returning a cached report
    mock_redis.get.return_value = "Mocked AI Report"

    response = client.post("/live/iss/analyze")
    assert response.status_code == 200
    assert response.json()["cached"] is True
    assert response.json()["report"] == "Mocked AI Report"
