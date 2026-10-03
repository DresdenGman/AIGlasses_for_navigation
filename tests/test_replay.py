from pathlib import Path

import pytest

from aiglasses.replay import replay_events


def test_replay_returns_a_result_for_each_demo_event():
    path = Path(__file__).resolve().parents[1] / "demo" / "events.jsonl"
    results = replay_events(path)
    assert len(results) == 4
    assert results[0]["level"] == "urgent"
    assert results[-1]["actionable"] is False


def test_replay_rejects_invalid_jsonl(tmp_path):
    events = tmp_path / "broken.jsonl"
    events.write_text("not json\n", encoding="utf-8")
    with pytest.raises(ValueError, match="line 1"):
        replay_events(events)


def test_safety_regression_replay_separates_information_from_actions():
    path = Path(__file__).resolve().parents[1] / "demo" / "safety-regression.jsonl"
    results = replay_events(path)
    assert [row["actionable"] for row in results] == [False, False, False, False, False, True, True]
    assert all(row["level"] == "status" for row in results[:5])
