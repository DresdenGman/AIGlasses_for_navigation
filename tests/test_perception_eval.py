import csv
import json
import math
from copy import deepcopy

import pytest

from aiglasses.eval.harness import (
    SCHEMA_VERSION,
    format_report,
    load_manifest,
    packaged_fixture_path,
    run_eval,
    validate_manifest,
)
from aiglasses.guidance import GuidanceEngine
from tests.conftest import require_opencv


CLEAR_LAMP_CLIPS = ("red-lamp-center", "red-lamp-offset", "green-lamp", "conflicting-lamps")


def _frame(report, clip_id, index=0):
    clips = [clip for clip in report["clips"] if clip["id"] == clip_id]
    assert len(clips) == 1
    return clips[0]["frames"][index]


def _clip(report, clip_id):
    clips = [clip for clip in report["clips"] if clip["id"] == clip_id]
    assert len(clips) == 1
    return clips[0]


@pytest.fixture(scope="module")
def report():
    require_opencv()
    return run_eval()


def test_packaged_fixture_is_versioned_and_valid():
    manifest = load_manifest()
    validate_manifest(manifest)
    assert manifest["schema_version"] == SCHEMA_VERSION
    assert manifest["fixture_id"] == "perception_v1"
    assert manifest["min_confidence"] == 0.70
    assert manifest["cooldown_seconds"] == 3.0
    assert packaged_fixture_path().is_file()


def test_labels_reject_an_actionable_prompt_with_no_category():
    manifest = deepcopy(load_manifest())
    manifest["clips"][0]["frames"][0]["expect"] = {
        "category": None,
        "traffic_light_state": None,
        "actionable": True,
    }
    with pytest.raises(ValueError, match="actionable"):
        validate_manifest(manifest)


def test_labels_reject_a_clock_that_runs_backwards():
    manifest = deepcopy(load_manifest())
    clip = next(clip for clip in manifest["clips"] if clip["id"] == "red-repeat-cooldown")
    clip["frames"][2]["t_seconds"] = 0.5
    with pytest.raises(ValueError, match="backwards"):
        validate_manifest(manifest)


def test_locked_totals_match_the_fixture(report):
    assert report["lock"]["ok"], report["lock"]["mismatches"]
    summary = report["summary"]
    guidance = summary["guidance"]
    perception = summary["perception"]
    frequency = summary["message_frequency"]
    separation = summary["separation"]
    assert summary["clips"] == 11
    assert summary["frames"] == 14
    assert guidance["false_positives"] == 0
    assert guidance["misses"] == 0
    assert guidance["true_positives"] == 5
    assert guidance["true_negatives"] == 9
    assert guidance["suppression_failures"] == 0
    assert perception["false_positives"] == 0
    assert perception["misses"] == 0
    assert perception["matches"] == 9
    assert perception["true_negatives"] == 4
    assert perception["weak_spurious"] == 1
    assert frequency["actionable_messages"] == 5
    assert frequency["suppressed_repeats"] == 1
    assert frequency["other_non_actionable"] == 8
    assert sum(separation.values()) == summary["frames"]
    assert separation["perception_error"] == 0
    assert separation["guidance_rule_error"] == 0
    assert separation["both"] == 0


def test_clear_lamps_stay_near_the_recorded_score(report):
    for clip_id in CLEAR_LAMP_CLIPS:
        frame = _frame(report, clip_id)
        assert frame["confidence"] == pytest.approx(0.873, abs=0.03)
        assert frame["perception_outcome"] == "match"


def test_red_square_stays_a_weak_detection_blocked_by_the_rule(report):
    frame = _frame(report, "red-square")
    assert frame["perception_outcome"] == "weak_spurious"
    assert frame["guidance_outcome"] == "true_negative"
    assert frame["separation"] == "rule_blocked_weak"
    assert frame["confidence"] == pytest.approx(0.446, abs=0.05)
    assert frame["confidence"] < 0.70
    assert frame["guidance"]["actionable"] is False
    assert "请停下" not in frame["guidance"]["message"]


def test_green_lamp_is_seen_and_withheld_by_the_rule(report):
    frame = _frame(report, "green-lamp")
    assert frame["perception_outcome"] == "match"
    assert frame["chosen"]["light_state"] == "green"
    assert frame["guidance_outcome"] == "true_negative"
    assert frame["separation"] == "rule_withheld"
    assert frame["guidance"]["actionable"] is False
    assert "无法判断" in frame["guidance"]["message"]


def test_repeat_cooldown_suppresses_only_the_middle_frame(report):
    clip = _clip(report, "red-repeat-cooldown")
    assert [frame["perception_outcome"] for frame in clip["frames"]] == ["match", "match", "match"]
    assert [frame["guidance_outcome"] for frame in clip["frames"]] == [
        "true_positive", "suppressed_repeat", "true_positive",
    ]
    assert clip["actionable_messages"] == 2
    assert clip["suppressed_repeats"] == 1
    assert "红灯" in clip["frames"][0]["guidance"]["message"]
    assert "抑制" in clip["frames"][1]["guidance"]["message"]
    assert clip["frames"][2]["guidance"]["actionable"] is True


def test_green_cooldown_does_not_suppress_a_later_red(report):
    clip = _clip(report, "green-then-red")
    assert clip["frames"][0]["separation"] == "rule_withheld"
    assert clip["frames"][1]["guidance_outcome"] == "true_positive"
    assert clip["frames"][1]["guidance"]["actionable"] is True
    assert "红灯" in clip["frames"][1]["guidance"]["message"]


def test_object_absence_frames_invent_nothing(report):
    for clip_id in ("blank-field", "gray-column", "yellow-disc", "red-speck"):
        frame = _frame(report, clip_id)
        assert frame["observations"] == []
        assert frame["perception_outcome"] == "true_negative"
        assert frame["guidance_outcome"] == "true_negative"
        assert frame["separation"] == "aligned"
        assert frame["guidance"]["actionable"] is False


def test_no_frame_invents_a_distance(report):
    for clip in report["clips"]:
        for frame in clip["frames"]:
            for observation in frame["observations"]:
                assert observation["distance_m"] is None
            if frame["chosen"] is not None:
                assert frame["chosen"]["distance_m"] is None


def test_report_metadata_records_thresholds_and_versions(report):
    meta = report["metadata"]
    defaults = GuidanceEngine()
    assert meta["schema_version"] == 1
    assert meta["min_confidence"] == defaults.min_confidence == 0.70
    assert meta["cooldown_seconds"] == defaults.cooldown_seconds == 3.0
    assert meta["thresholds_match_engine_defaults"] is True
    assert meta["package_version"] == "0.1.0"
    assert meta["design_version"] == "0.4.0"
    assert meta["detector"] == "heuristic"
    assert meta["yolox"]["scored"] is False
    assert "download" in meta["yolox"]["note"].lower()
    assert "street" in meta["honesty"].lower()
    assert "this command does not run it" in meta["honesty"].lower()
    assert "perf_counter" in meta["latency_method"]
    assert "select_guidance" in meta["latency_method"]


def test_latency_is_finite_host_time_without_a_product_threshold(report):
    samples = [frame["latency_ms"] for clip in report["clips"] for frame in clip["frames"]]
    assert len(samples) == 14
    assert all(math.isfinite(sample) and sample >= 0 for sample in samples)
    assert report["summary"]["latency_ms"]["mean"] > 0
    assert report["summary"]["latency_ms"]["max"] < 5000
    assert report["summary"]["latency_ms"]["max"] == max(samples)


def test_cli_prints_the_table_and_writes_reports(tmp_path, capsys):
    require_opencv()
    from aiglasses.eval.__main__ import main

    json_path = tmp_path / "nested" / "perception_eval.json"
    csv_path = tmp_path / "nested" / "perception_eval.csv"
    assert main(["--output", str(json_path), "--csv", str(csv_path)]) == 0
    captured = capsys.readouterr()
    assert "not a certified navigation aid" in captured.err.lower()
    assert "guidance" in captured.out
    assert "FP=0" in captured.out
    assert "lock       ok" in captured.out
    written = json.loads(json_path.read_text(encoding="utf-8"))
    assert written["lock"]["ok"] is True
    assert written["summary"]["guidance"]["false_positives"] == 0
    with csv_path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 14
    assert rows[0]["clip_id"] == "red-lamp-center"
    assert rows[0]["observed_traffic_light_state"] == "red"


def test_cli_exits_nonzero_when_the_lock_does_not_match(tmp_path, capsys):
    require_opencv()
    from aiglasses.eval.__main__ import main

    manifest = load_manifest()
    manifest.pop("_source_path", None)
    manifest["expected_summary"]["guidance_false_positives"] = 9
    fixture = tmp_path / "broken.json"
    fixture.write_text(json.dumps(manifest), encoding="utf-8")
    assert main(["--fixture", str(fixture)]) == 1
    captured = capsys.readouterr()
    assert "MISMATCH" in captured.out
    assert main(["--fixture", str(fixture), "--no-strict"]) == 0


def test_printed_report_names_every_clip(report):
    text = format_report(report)
    for clip in report["clips"]:
        assert clip["id"] in text
