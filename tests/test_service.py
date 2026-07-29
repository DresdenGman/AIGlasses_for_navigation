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


def test_root_serves_the_browser_demo_page():
    response = client().get("/")
    assert response.status_code == 200
    assert "安全提示演示台" in response.text


def test_observation_endpoint_returns_conservative_guidance():
    response = client().post(
        "/api/observations",
        json={"kind": "traffic_light", "confidence": 0.96, "light_state": "red"},
    )
    assert response.status_code == 200
    assert response.json()["level"] == "urgent"
    assert response.json()["actionable"] is True
    assert response.json()["event"]["kind"] == "traffic_light"


def test_events_are_bounded_metadata_without_raw_media():
    demo = client()
    demo.post("/api/observations", json={"kind": "crosswalk", "confidence": 0.85})
    response = demo.get("/api/events?limit=1")
    assert response.status_code == 200
    assert response.json()[0]["kind"] == "crosswalk"
    assert "frame" not in response.json()[0]


def test_invalid_observation_is_rejected_before_guidance():
    response = client().post(
        "/api/observations",
        json={"kind": "traffic_light", "confidence": 1.2, "light_state": "red"},
    )
    assert response.status_code == 422
