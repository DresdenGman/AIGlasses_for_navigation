import pytest
from fastapi.testclient import TestClient

from aiglasses.config import Settings, load_settings
from aiglasses.service import MAX_FRAME_BYTES, create_app
from aiglasses.vision import VisionDependencyError, draw_lamp
from tests.conftest import require_opencv


def client(**kwargs) -> TestClient:
    return TestClient(create_app(Settings(**kwargs)))


def test_health_keeps_the_demo_hardware_free_and_refuses_a_certification_claim():
    payload = client().get("/api/health").json()
    assert payload["mode"] == "demo"
    assert payload["hardware_required"] is False
    assert payload["tts"] == "none"
    assert payload["vision_detector"] == "heuristic"
    assert payload["certified_navigation_aid"] is False


def test_dashboard_still_has_the_scenario_buttons_and_the_camera_trial():
    page = client().get("/")
    assert page.status_code == 200
    assert "安全提示演示台" in page.text
    assert "红灯" in page.text
    assert "低置信度" in page.text
    assert "使用摄像头拍一帧" in page.text
    assert "不是经过认证的导航辅助" in page.text


def test_json_sent_to_the_frame_endpoint_is_not_treated_as_guidance():
    response = client().post("/api/vision/frame", json={"kind": "traffic_light", "confidence": 0.99, "light_state": "red"})
    assert response.status_code == 415
    assert "actionable" not in response.json()


def test_empty_frame_is_rejected():
    response = client().post("/api/vision/frame", content=b"", headers={"content-type": "image/jpeg"})
    assert response.status_code == 400


def test_oversize_frame_is_rejected(monkeypatch):
    monkeypatch.setattr("aiglasses.service.MAX_FRAME_BYTES", 8)
    response = client().post(
        "/api/vision/frame",
        content=b"0123456789",
        headers={"content-type": "image/jpeg"},
    )
    assert response.status_code == 413
    assert MAX_FRAME_BYTES > 8


def test_missing_vision_runtime_does_not_invent_a_command(monkeypatch):
    def unavailable(*_args, **_kwargs):
        raise VisionDependencyError("OpenCV is not installed. Install the vision extra: pip install -e '.[vision]'")

    monkeypatch.setattr("aiglasses.service.analyze_frame", unavailable)
    response = client().post("/api/vision/frame", content=b"jpeg", headers={"content-type": "image/jpeg"})
    assert response.status_code == 503
    assert "vision" in response.json()["detail"]
    assert "actionable" not in response.json()


def test_classic_observation_endpoint_is_unchanged():
    response = client().post(
        "/api/observations",
        json={"kind": "traffic_light", "confidence": 0.96, "light_state": "red"},
    )
    assert response.status_code == 200
    assert response.json()["actionable"] is True
    assert response.json()["level"] == "urgent"


def _png(image) -> bytes:
    cv2 = require_opencv()
    ok, encoded = cv2.imencode(".png", image)
    assert ok
    return encoded.tobytes()


def test_red_lamp_upload_returns_an_urgent_prompt_without_pixels_in_the_log(monkeypatch):
    # Pin the engine clock so repeat suppression does not depend on wall time.
    monkeypatch.setattr("aiglasses.guidance.monotonic", lambda: 0.0)
    body = _png(draw_lamp((0, 0, 220), radius=36))
    demo = client()
    first = demo.post("/api/vision/frame", content=body, headers={"content-type": "image/png"})
    second = demo.post("/api/vision/frame", content=body, headers={"content-type": "image/png"})
    assert first.status_code == 200
    payload = first.json()
    assert payload["actionable"] is True
    assert "红灯" in payload["message"]
    assert "notice" in payload
    assert "认证" in payload["notice"]
    assert payload["observations"][0]["distance_m"] is None
    assert set(payload["event"]) == {"timestamp", "kind", "confidence", "level", "actionable", "message"}
    assert second.status_code == 200
    assert second.json()["actionable"] is False
    assert "抑制" in second.json()["message"]


def test_speck_upload_is_not_a_command():
    body = _png(draw_lamp((0, 0, 220), radius=2))
    response = client().post("/api/vision/frame", content=body, headers={"content-type": "image/png"})
    assert response.status_code == 200
    assert response.json()["actionable"] is False
    assert "请停下" not in response.json()["message"]


def test_garbage_image_is_a_client_error():
    require_opencv()
    response = client().post(
        "/api/vision/frame",
        content=b"not-an-image",
        headers={"content-type": "image/jpeg"},
    )
    assert response.status_code == 400


def test_settings_reject_unknown_speech_and_vision_modes(monkeypatch):
    monkeypatch.setenv("AIGLASSES_TTS", "cloud")
    with pytest.raises(ValueError, match="AIGLASSES_TTS"):
        load_settings()
    monkeypatch.setenv("AIGLASSES_TTS", "none")
    monkeypatch.setenv("AIGLASSES_VISION", "yolo")
    with pytest.raises(ValueError, match="AIGLASSES_VISION"):
        load_settings()
