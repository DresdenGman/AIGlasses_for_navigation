import pytest

from aiglasses.adapters import ObservationSource, VisionAdapter
from aiglasses.guidance import GuidanceEngine, Observation
from aiglasses.pipeline import FrameObservationSource
from aiglasses.vision import (
    Detection,
    LocalVisionAdapter,
    VisionDependencyError,
    conflicting_lamps,
    decode_image,
    decode_yolox,
    draw_lamp,
    make_yolox_grids,
    map_detections_to_observations,
    nms_xywh,
    red_square,
    resolve_detector,
    synthetic_demo_frames,
)
from tests.conftest import require_opencv


def test_local_adapter_matches_the_vision_contract():
    adapter = LocalVisionAdapter()
    assert isinstance(adapter, VisionAdapter)


def test_invalid_detector_scores_cannot_become_commands():
    observations = map_detections_to_observations([
        Detection("person", float("nan")),
        Detection("traffic light", 1.4, light_state="red"),
        Detection("cup", 0.99),
    ])
    assert [item.confidence for item in observations] == [0.0, 0.0]
    assert all(not GuidanceEngine().assess(item, now=0).actionable for item in observations)
    assert all(item.distance_m is None for item in observations)


def test_person_box_omits_distance_and_does_not_warn_as_near():
    observations = map_detections_to_observations([
        Detection("person", 0.91, bbox=(0, 0, 20, 40)),
    ])
    assert observations[0].kind == "obstacle"
    assert observations[0].label == "行人"
    assert observations[0].distance_m is None
    result = GuidanceEngine().assess(observations[0], now=0)
    assert result.actionable
    assert "近距离" not in result.message


def test_low_confidence_person_is_not_a_command():
    observation = map_detections_to_observations([Detection("person", 0.42)])[0]
    result = GuidanceEngine().assess(observation, now=0)
    assert not result.actionable
    assert "不确定" in result.message
    assert "向左" not in result.message and "向右" not in result.message


def test_traffic_light_without_a_color_stays_unknown():
    observation = map_detections_to_observations([
        Detection("traffic light", 0.96),
    ])[0]
    assert observation.light_state == "unknown"
    result = GuidanceEngine().assess(observation, now=0)
    assert not result.actionable
    assert "请停下" not in result.message


def test_auto_detector_uses_yolox_only_when_the_file_exists(tmp_path):
    missing = tmp_path / "missing.onnx"
    present = tmp_path / "present.onnx"
    present.write_bytes(b"not-a-model")
    assert resolve_detector("auto", missing) == "heuristic"
    assert resolve_detector("auto", present) == "yolox"
    with pytest.raises(ValueError):
        resolve_detector("custom", missing)


def test_empty_frame_is_rejected_before_a_command():
    with pytest.raises(ValueError, match="Empty frame"):
        decode_image(b"")


def test_yolox_grid_has_the_expected_anchor_count():
    pytest.importorskip("numpy")
    grids, _strides = make_yolox_grids()
    assert grids.shape == (1, 8400, 2)


def test_yolox_decoder_keeps_a_confident_box_and_drops_a_weak_score():
    np = pytest.importorskip("numpy")
    output = np.zeros((1, 8400, 85), dtype=np.float32)
    output[0, 0, 4] = 0.9
    output[0, 0, 5] = 0.8
    output[0, 100, 4] = 0.2
    output[0, 100, 5] = 0.2
    found = decode_yolox(output, conf_threshold=0.25)
    assert len(found) == 1
    x, y, width, height, score, class_id = found[0]
    assert (x, y, width, height) == pytest.approx((-4, -4, 8, 8))
    assert score == pytest.approx(0.72)
    assert class_id == 0


def test_nms_keeps_overlapping_boxes_only_when_the_class_differs():
    np = pytest.importorskip("numpy")
    boxes = np.array([[0, 0, 10, 10], [1, 1, 10, 10], [30, 30, 8, 8]], dtype=np.float32)
    scores = np.array([0.9, 0.8, 0.7], dtype=np.float32)
    classes = np.array([0, 0, 1])
    kept = nms_xywh(boxes, scores, classes, 0.25, 0.45)
    assert set(int(index) for index in kept) == {0, 2}


def test_clear_red_lamp_is_actionable_and_a_green_lamp_is_not():
    require_opencv()
    adapter = LocalVisionAdapter()
    red, green, yellow, speck = synthetic_demo_frames()
    red_rows = adapter.analyze_image(red)
    green_rows = adapter.analyze_image(green)
    assert red_rows[0].light_state == "red"
    assert red_rows[0].confidence >= 0.70
    red_guidance = GuidanceEngine().assess(red_rows[0], now=0)
    assert red_guidance.actionable
    assert "红灯" in red_guidance.message

    assert green_rows[0].light_state == "green"
    assert green_rows[0].confidence >= 0.70
    green_guidance = GuidanceEngine().assess(green_rows[0], now=0)
    assert not green_guidance.actionable
    assert "无法判断" in green_guidance.message


def test_weak_or_ambiguous_lamps_do_not_become_stop_commands():
    require_opencv()
    adapter = LocalVisionAdapter()
    _red, _green, yellow, speck = synthetic_demo_frames()
    for frame in (yellow, speck, red_square(), conflicting_lamps()):
        guidance, observations = _guide(adapter, frame)
        assert not guidance.actionable
        assert "请停下" not in guidance.message
        assert all(item.distance_m is None for item in observations)


def test_encoded_red_lamp_round_trips_through_analyze():
    cv2 = require_opencv()
    ok, encoded = cv2.imencode(".png", draw_lamp((0, 0, 220), radius=36))
    assert ok
    observations = LocalVisionAdapter().analyze(encoded.tobytes())
    guidance = GuidanceEngine().assess(observations[0], now=0)
    assert guidance.actionable
    assert "红灯" in guidance.message


def test_garbage_bytes_do_not_invent_an_observation():
    require_opencv()
    with pytest.raises(ValueError, match="decodable"):
        LocalVisionAdapter().analyze(b"this is not an image")


def test_frame_source_yields_the_red_observation_first():
    require_opencv()
    source = FrameObservationSource(synthetic_demo_frames(), LocalVisionAdapter())
    assert isinstance(source, ObservationSource)
    first = next(iter(source.observations()))
    assert first.kind == "traffic_light"
    assert first.light_state == "red"


def test_color_crop_can_turn_a_yolox_box_into_red_without_adding_distance():
    require_opencv()
    import numpy as np

    image = np.zeros((80, 80, 3), dtype=np.uint8)
    image[:, :] = (0, 0, 220)
    observations = map_detections_to_observations(
        [Detection("traffic light", 0.9, bbox=(10, 10, 40, 40))],
        image=image,
    )
    assert observations[0].light_state == "red"
    assert 0.70 <= observations[0].confidence <= 0.9
    assert observations[0].distance_m is None


def test_yellow_crop_cannot_authorize_a_crossing():
    require_opencv()
    import numpy as np

    image = np.zeros((80, 80, 3), dtype=np.uint8)
    image[:, :] = (0, 220, 220)
    observation = map_detections_to_observations(
        [Detection("traffic light", 0.95, bbox=(0, 0, 80, 80))],
        image=image,
    )[0]
    result = GuidanceEngine().assess(observation, now=0)
    assert observation.light_state == "unknown"
    assert not result.actionable
    assert "请停下" not in result.message


def test_oversized_decoded_image_is_rejected():
    require_opencv()
    import numpy as np

    from aiglasses.vision import _validate_color_image

    huge = np.zeros((4001, 2, 3), dtype=np.uint8)
    with pytest.raises(ValueError, match="4000"):
        _validate_color_image(huge)


def test_published_weight_checksum_is_a_sha256_hex_digest():
    from aiglasses.vision import YOLOX_SHA256

    assert len(YOLOX_SHA256) == 64
    int(YOLOX_SHA256, 16)


def _guide(adapter, frame):
    observations = list(adapter.analyze_image(frame))
    if not observations:
        from aiglasses.pipeline import NO_OBSERVATION

        return NO_OBSERVATION, observations
    return GuidanceEngine().assess(observations[0], now=0), observations


def test_missing_yolox_weights_do_not_fall_back_to_a_silent_command(tmp_path):
    adapter = LocalVisionAdapter("yolox", tmp_path / "absent.onnx")
    with pytest.raises(VisionDependencyError, match="download_vision_weights"):
        adapter.analyze_image(_blank())


def _blank():
    cv2 = require_opencv()
    import numpy as np

    return np.zeros((32, 32, 3), dtype=np.uint8)
