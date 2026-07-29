from fastapi.testclient import TestClient

from aiglasses.config import Settings
from aiglasses.service import create_app


PAYLOAD = {"kind": "traffic_light", "confidence": 0.96, "light_state": "red"}


def test_device_ingest_is_disabled_in_demo_mode():
    client = TestClient(create_app(Settings(mode="demo")))
    assert client.post("/api/device/observations", json=PAYLOAD).status_code == 403


def test_hardware_ingest_requires_a_configured_token():
    client = TestClient(create_app(Settings(mode="hardware", device_ingest_token="test-token")))
    assert client.post("/api/device/observations", json=PAYLOAD).status_code == 401
    headers = {"X-Device-Token": "test-token", "X-Device-Id": "test-unit"}
    response = client.post("/api/device/observations", json=PAYLOAD, headers=headers)
    assert response.status_code == 200
    assert response.json()["level"] == "urgent"


def test_hardware_ingest_is_rate_limited_per_device_without_logging_id():
    app = create_app(Settings(mode="hardware", device_ingest_token="test-token", device_max_requests_per_minute=1))
    client = TestClient(app)
    headers = {"X-Device-Token": "test-token", "X-Device-Id": "test-unit"}
    assert client.post("/api/device/observations", json=PAYLOAD, headers=headers).status_code == 200
    assert client.post("/api/device/observations", json=PAYLOAD, headers=headers).status_code == 429
    event = client.get("/api/events").json()[0]
    assert "device_id" not in event
