from aiglasses.guidance import GuidanceEngine, Observation
import pytest


def test_red_light_is_an_actionable_urgent_prompt():
    result = GuidanceEngine().assess(Observation("traffic_light", 0.95, light_state="red"), now=0)
    assert result.level == "urgent"
    assert result.actionable
    assert "红灯" in result.message


def test_low_confidence_never_becomes_a_direction():
    result = GuidanceEngine().assess(Observation("obstacle", 0.40, distance_m=0.5), now=0)
    assert not result.actionable
    assert "不确定" in result.message


def test_repeated_alert_is_suppressed():
    engine = GuidanceEngine(cooldown_seconds=3)
    event = Observation("obstacle", 0.9, distance_m=1.0)
    assert engine.assess(event, now=0).actionable
    assert not engine.assess(event, now=1).actionable


def test_green_light_never_authorizes_crossing_even_at_full_confidence():
    result = GuidanceEngine().assess(Observation("traffic_light", 1.0, light_state="green"), now=0)
    assert result.level == "status"
    assert not result.actionable
    assert "无法判断" in result.message
    assert "后通行" not in result.message


def test_informational_green_light_retains_repeat_suppression():
    engine = GuidanceEngine()
    event = Observation("traffic_light", .95, light_state="green")
    first = engine.assess(event, now=0)
    repeated = engine.assess(event, now=1)
    resumed = engine.assess(event, now=3)
    assert not first.actionable and not repeated.actionable and not resumed.actionable
    assert "抑制" in repeated.message
    assert resumed.message == first.message


@pytest.mark.parametrize("distance", [-1, float("nan"), float("inf"), -float("inf")])
def test_invalid_distance_cannot_emit_actionable_obstacle_warning(distance):
    result = GuidanceEngine().assess(Observation("obstacle", .95, distance_m=distance), now=0)
    assert not result.actionable
    assert "距离无效" in result.message


@pytest.mark.parametrize("confidence", [-.1, 1.1, float("nan"), float("inf")])
def test_invalid_confidence_is_not_actionable(confidence):
    assert not GuidanceEngine().assess(Observation("crosswalk", confidence), now=0).actionable


@pytest.mark.parametrize("kwargs", [
    {"min_confidence": float("nan")}, {"min_confidence": -.1},
    {"min_confidence": 1.1}, {"cooldown_seconds": -1},
    {"cooldown_seconds": float("inf")},
])
def test_invalid_engine_settings_are_rejected(kwargs):
    with pytest.raises(ValueError):
        GuidanceEngine(**kwargs)
