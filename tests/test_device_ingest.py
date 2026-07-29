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
    response = client.post("/api/device/observations", json=PAYLOAD, headers={"X-Device-Token": "test-token"})
    assert response.status_code == 200
    assert response.json()["level"] == "urgent"
