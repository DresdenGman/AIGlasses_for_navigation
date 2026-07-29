from aiglasses.guidance import GuidanceEngine, Observation


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
