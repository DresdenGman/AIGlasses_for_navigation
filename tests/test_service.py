from fastapi.testclient import TestClient

from aiglasses.config import Settings
from aiglasses.service import create_app


def client() -> TestClient:
    return TestClient(create_app(Settings()))


def test_health_advertises_hardware_free_demo_mode():
    response = client().get("/api/health")
    assert response.status_code == 200
    assert response.json()["mode"] == "demo"
    assert response.json()["hardware_required"] is False


def test_observation_endpoint_returns_conservative_guidance():
    response = client().post(
        "/api/observations",
        json={"kind": "traffic_light", "confidence": 0.96, "light_state": "red"},
    )
    assert response.status_code == 200
    assert response.json()["level"] == "urgent"
    assert response.json()["actionable"] is True


def test_invalid_observation_is_rejected_before_guidance():
    response = client().post(
        "/api/observations",
        json={"kind": "traffic_light", "confidence": 1.2, "light_state": "red"},
    )
    assert response.status_code == 422
