import csv
import json
import math
import subprocess
from pathlib import Path

import numpy as np

import pytest

from aiglasses.eval.harness import SUMMARY_KEYS, load_manifest, validate_manifest
from aiglasses.eval.recorded import (
    DEFAULT_LABELS,
    LABELS_SCHEMA,
    SCHEMA_VERSION,
    assert_path_is_private,
    example_labels_path,
    first_index_in_range,
    format_recorded_report,
    index_containing_time,
    load_recorded_manifest,
    resolve_fps,
    run_recorded,
    runnable_problems,
    validate_recorded_manifest,
)
from aiglasses.guidance import GuidanceEngine
from tests.conftest import require_opencv

ROOT = Path(__file__).resolve().parents[1]
PURPOSE = "PURPOSE-SENTINEL local generated frames for a test. No participant, no place, not a street claim."


def _consent(**overrides):
    consent = {
        "informed": True,
        "purpose": PURPOSE,
        "risks_explained": True,
        "retention": "Pytest deletes this temporary directory with the test.",
        "access": "This test process only. The file is not uploaded.",
        "withdrawal": "Delete the temporary directory. No person was recorded.",
        "local_only": True,
        "participant_copy_offered": True,
    }
    consent.update(overrides)
    return consent


def _redaction(**overrides):
    redaction = {
        "faces": "absent",
        "license_plates": "absent",
        "screens": "absent",
        "identifiable_locations": "absent",
        "audio": "absent",
        "confirmed": True,
    }
    redaction.update(overrides)
    return redaction


def _expect(category, state, actionable, repeat=False):
    body = {
        "category": category,
        "traffic_light_state": state,
        "actionable": actionable,
    }
    if repeat:
        body["repeat_suppressed"] = True
    return body


def _manifest(clips, **extra):
    body = {
        "schema": LABELS_SCHEMA,
        "schema_version": SCHEMA_VERSION,
        "example_only": False,
        "session_id": "generated-frames",
        "description": "Generated drawings. No person and no place.",
        "detector": "heuristic",
        "min_confidence": 0.70,
        "cooldown_seconds": 3.0,
        "consent": _consent(),
        "redaction": _redaction(),
        "clips": clips,
    }
    body.update(extra)
    return body


def _write_labels(path: Path, manifest: dict) -> Path:
    path.write_text(json.dumps(manifest), encoding="utf-8")
    return path


def _png(path: Path, image) -> None:
    cv2 = require_opencv()
    path.parent.mkdir(parents=True, exist_ok=True)
    assert cv2.imwrite(str(path), image)


def _avi(path: Path, frames, fps=10) -> None:
    cv2 = require_opencv()
    path.parent.mkdir(parents=True, exist_ok=True)
    height, width = frames[0].shape[:2]
    writer = None
    for fourcc in ("png ", "FFV1", "HFYU", "MJPG"):
        candidate = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*fourcc), fps, (width, height))
        if candidate.isOpened():
            writer = candidate
            break
        candidate.release()
    assert writer is not None, "OpenCV could not open a video writer"
    for frame in frames:
        writer.write(frame)
    writer.release()


def _expected_suite():
    expected = {key: 0 for key in SUMMARY_KEYS}
    expected.update({
        "clips": 3,
        "frames": 7,
        "guidance_true_positives": 3,
        "guidance_true_negatives": 4,
        "suppressed_repeats": 1,
        "actionable_messages": 3,
        "other_non_actionable": 3,
        "perception_matches": 5,
        "perception_true_negatives": 1,
        "perception_weak_spurious": 1,
        "separation_aligned": 4,
        "separation_rule_withheld": 2,
        "separation_rule_blocked_weak": 1,
    })
    return expected


def _suite(tmp_path: Path) -> Path:
    from aiglasses.vision import draw_lamp, red_square

    signals = tmp_path / "signals"
    _png(signals / "00.png", draw_lamp((0, 0, 220), radius=36))
    _png(signals / "01.png", draw_lamp((0, 200, 0), radius=36))
    blank = np.zeros((240, 320, 3), dtype=np.uint8)
    _png(signals / "02.png", blank)
    repeat = tmp_path / "repeat"
    for name in ("00.png", "01.png", "02.png"):
        _png(repeat / name, draw_lamp((0, 0, 220), radius=36))
    square = tmp_path / "square"
    _png(square / "00.png", red_square())
    red = _expect("traffic_light", "red", True)
    manifest = _manifest(
        [
            {
                "id": "signals",
                "description": "Generated lamps and an empty frame.",
                "media": {"kind": "stills", "path": "signals"},
                "samples": [
                    {"id": "red", "frame_index": 0, "expect": red},
                    {"id": "green", "frame_index": 1, "expect": _expect("traffic_light", "green", False)},
                    {
                        "id": "blank",
                        "frame_index": 2,
                        "expect": _expect(None, None, False),
                        "label_confidence": "uncertain",
                        "confidence_note": "Generated empty field. No person and no place.",
                    },
                ],
            },
            {
                "id": "red-repeat",
                "media": {"kind": "stills", "path": "repeat"},
                "samples": [
                    {"id": "first", "frame_index": 0, "clock_seconds": 0, "expect": red},
                    {
                        "id": "middle",
                        "frame_index": 1,
                        "clock_seconds": 1,
                        "expect": _expect("traffic_light", "red", False, repeat=True),
                    },
                    {"id": "again", "frame_index": 2, "clock_seconds": 3, "expect": red},
                ],
            },
            {
                "id": "red-square",
                "media": {"kind": "stills", "path": "square"},
                "samples": [
                    {"id": "square", "frame_index": 0, "expect": _expect(None, None, False)},
                ],
            },
        ],
        expected_summary=_expected_suite(),
    )
    return _write_labels(tmp_path / "labels.json", manifest)


def test_default_labels_path_is_the_gitignored_drop_zone():
    assert DEFAULT_LABELS == Path("data/private_eval/labels.json")
    assert SCHEMA_VERSION == 1
    assert LABELS_SCHEMA == "aiglasses.perception_eval.recorded_labels"


def test_private_media_is_gitignored_and_the_example_is_tracked():
    def ignored(relative: str) -> bool:
        completed = subprocess.run(
            ["git", "check-ignore", "-q", "--", relative],
            cwd=ROOT,
            capture_output=True,
            check=False,
        )
        return completed.returncode == 0

    assert ignored("data/private_eval/labels.json")
    assert ignored("data/private_eval/clip.mp4")
    assert ignored("data/private_eval/frames/00.png")
    assert ignored("data/private_eval/nested/clip.mov")
    assert not ignored("data/private_eval/README.md")
    assert not ignored("data/private_eval/.gitkeep")
    assert not ignored("aiglasses/eval/fixtures/recorded_labels.example.json")
    assert not ignored("docs/RECORDED_EVAL.md")


def test_ci_runs_the_skip_command_and_keeps_the_synthetic_lock():
    workflow = (ROOT / ".github/workflows/test.yml").read_text(encoding="utf-8")
    assert "python -m aiglasses.eval.recorded" in workflow
    assert "python -m aiglasses.eval --output" in workflow


def test_example_is_versioned_and_refuses_to_score():
    path = example_labels_path()
    manifest = load_recorded_manifest(path)
    validate_recorded_manifest(manifest)
    assert manifest["schema_version"] == 1
    assert manifest["example_only"] is True
    assert manifest["consent"]["informed"] is False
    assert manifest["redaction"]["confirmed"] is False
    assert any("example_only" in item for item in runnable_problems(manifest))
    with pytest.raises(ValueError, match="example_only"):
        run_recorded(path)


def test_synthetic_and_recorded_schemas_do_not_cross_load():
    recorded = load_recorded_manifest(example_labels_path())
    with pytest.raises(ValueError, match="Unsupported labels schema"):
        validate_manifest(recorded)
    with pytest.raises(ValueError, match="Unsupported recorded labels"):
        validate_recorded_manifest(load_manifest())


def test_labels_reject_incomplete_consent_redaction_and_locators(tmp_path):
    clips = [{
        "id": "clip",
        "media": {"kind": "image", "path": "frame.png"},
        "samples": [{"id": "only", "expect": _expect(None, None, False)}],
    }]
    broken = _manifest(clips, consent=_consent(informed=False))
    validate_recorded_manifest(broken)
    assert any("consent.informed" in item for item in runnable_problems(broken))

    for field, value in (
        ("faces", "present"),
        ("audio", "unknown"),
        ("license_plates", None),
    ):
        candidate = _manifest(clips, redaction=_redaction(**{field: value}))
        with pytest.raises(ValueError, match=f"redaction.{field}"):
            validate_recorded_manifest(candidate)

    yolox = _manifest(clips, detector="yolox")
    with pytest.raises(ValueError, match="YOLOX"):
        validate_recorded_manifest(yolox)

    floated = _manifest(clips, schema_version=1.0)
    with pytest.raises(ValueError, match="version"):
        validate_recorded_manifest(floated)

    url = _manifest([{
        "id": "clip",
        "media": {"kind": "video", "path": "https://example.invalid/clip.mp4"},
        "samples": [{"id": "only", "frame_index": 0, "expect": _expect(None, None, False)}],
    }])
    with pytest.raises(ValueError, match="URL"):
        validate_recorded_manifest(url)

    uncertain = _manifest([{
        "id": "clip",
        "media": {"kind": "image", "path": "frame.png"},
        "samples": [{
            "id": "only",
            "expect": _expect("traffic_light", "red", True),
            "label_confidence": "uncertain",
        }],
    }])
    with pytest.raises(ValueError, match="confidence_note"):
        validate_recorded_manifest(uncertain)

    both = _manifest([{
        "id": "clip",
        "media": {"kind": "video", "path": "clip.avi"},
        "samples": [{
            "id": "only",
            "frame_index": 0,
            "t_seconds": 0.5,
            "expect": _expect(None, None, False),
        }],
    }])
    with pytest.raises(ValueError, match="only one locator"):
        validate_recorded_manifest(both)

    backwards = _manifest([{
        "id": "clip",
        "media": {"kind": "video", "path": "clip.avi"},
        "samples": [{
            "id": "only",
            "t_start_seconds": 1.0,
            "t_end_seconds": 0.2,
            "expect": _expect(None, None, False),
        }],
    }])
    with pytest.raises(ValueError, match="earlier"):
        validate_recorded_manifest(backwards)

    actionable = _manifest([{
        "id": "clip",
        "media": {"kind": "image", "path": "frame.png"},
        "samples": [{"id": "only", "expect": _expect(None, None, True)}],
    }])
    with pytest.raises(ValueError, match="actionable"):
        validate_recorded_manifest(actionable)


def test_time_math_picks_one_frame_and_does_not_trust_a_wild_fps():
    assert resolve_fps(10) == (10.0, "container")
    assert resolve_fps(0) == (30.0, "assumed_30")
    assert resolve_fps(float("nan"))[1] == "assumed_30"
    assert resolve_fps(1000)[1] == "assumed_30"
    assert index_containing_time(0.0, 10) == 0
    assert index_containing_time(0.15, 10) == 1
    assert first_index_in_range(0.1, 0.19, 10) == 1
    with pytest.raises(ValueError, match="time range"):
        first_index_in_range(0.15, 0.16, 10)


def test_consent_refusal_does_not_open_media(tmp_path, monkeypatch):
    def opened(*_args, **_kwargs):
        raise AssertionError("media was opened")

    monkeypatch.setattr("aiglasses.eval.recorded._load_clip_images", opened)
    path = _write_labels(tmp_path / "labels.json", _manifest(
        [{
            "id": "clip",
            "media": {"kind": "image", "path": "missing.png"},
            "samples": [{"id": "only", "expect": _expect(None, None, False)}],
        }],
        consent=_consent(informed=False, risks_explained=False),
    ))
    with pytest.raises(ValueError, match="consent.informed") as caught:
        run_recorded(path)
    assert "not found" not in str(caught.value).lower()


def test_tracked_media_is_refused_before_it_is_read(tmp_path, monkeypatch):
    def opened(*_args, **_kwargs):
        raise AssertionError("media was opened")

    monkeypatch.setattr("aiglasses.eval.recorded._load_clip_images", opened)
    tracked = ROOT / "aiglasses/eval/fixtures/perception_v1.json"
    path = _write_labels(tmp_path / "labels.json", _manifest([{
        "id": "clip",
        "media": {"kind": "image", "path": str(tracked)},
        "samples": [{"id": "only", "expect": _expect(None, None, False)}],
    }]))
    with pytest.raises(ValueError, match="gitignored"):
        run_recorded(path)


def test_gitignored_missing_clip_is_a_missing_file_not_a_pass(tmp_path):
    missing = ROOT / "data/private_eval/not-a-real-clip.mp4"
    path = _write_labels(tmp_path / "labels.json", _manifest([{
        "id": "clip",
        "media": {"kind": "video", "path": str(missing)},
        "samples": [{"id": "only", "frame_index": 0, "expect": _expect(None, None, False)}],
    }]))
    with pytest.raises(FileNotFoundError, match="not found") as caught:
        run_recorded(path)
    assert "gitignored" not in str(caught.value)


def test_paths_outside_the_repo_are_private_and_tracked_paths_are_not(tmp_path):
    assert_path_is_private(tmp_path / "clip.mp4", what="media")
    with pytest.raises(ValueError, match="gitignored"):
        assert_path_is_private(example_labels_path(), what="labels file")


def test_a_tracked_labels_path_is_refused_even_if_the_attestations_are_true(monkeypatch):
    manifest = load_recorded_manifest(example_labels_path())
    manifest["example_only"] = False
    manifest["consent"] = _consent()
    manifest["redaction"] = _redaction()

    def opened(*_args, **_kwargs):
        raise AssertionError("media was opened")

    monkeypatch.setattr("aiglasses.eval.recorded.load_recorded_manifest", lambda _path: manifest)
    monkeypatch.setattr("aiglasses.eval.recorded._load_clip_images", opened)
    with pytest.raises(ValueError, match="gitignored"):
        run_recorded(example_labels_path())


def test_generated_stills_reuse_the_synthetic_counters(tmp_path):
    report = run_recorded(_suite(tmp_path))
    blob = json.dumps(report)
    assert report["lock"]["ok"] is True
    assert report["lock"]["mode"] == "locked"
    assert report["lock"]["mismatches"] == []
    assert report["metadata"]["status"] == "scored"
    assert report["metadata"]["schema_version"] == 1
    assert report["metadata"]["detector"] == "heuristic"
    assert report["metadata"]["yolox"]["scored"] is False
    assert report["metadata"]["yolox"]["loaded"] is False
    assert "download" in report["metadata"]["yolox"]["note"].lower()
    defaults = GuidanceEngine()
    assert report["metadata"]["thresholds_match_engine_defaults"] is True
    assert report["metadata"]["min_confidence"] == defaults.min_confidence
    assert report["metadata"]["package_version"] == "0.1.0"
    assert report["metadata"]["design_version"] == "0.4.0"
    assert "street" in report["metadata"]["honesty"].lower()
    assert "does not detect faces" in report["metadata"]["honesty"]
    assert PURPOSE not in blob
    assert str(tmp_path) not in blob
    assert "ndarray" not in blob
    summary = report["summary"]
    assert summary["frames"] == 7
    assert summary["uncertain_labels"] == 1
    assert summary["guidance"]["false_positives"] == 0
    assert summary["guidance"]["misses"] == 0
    assert summary["perception"]["misses"] == 0
    signals = report["clips"][0]
    assert signals["media_name"] == "signals"
    assert signals["time_base"] == "frame_index_seconds"
    assert [frame["source_name"] for frame in signals["frames"]] == ["00.png", "01.png", "02.png"]
    assert signals["frames"][0]["confidence"] == pytest.approx(0.873, abs=0.03)
    assert signals["frames"][0]["guidance_outcome"] == "true_positive"
    assert "红灯" in signals["frames"][0]["guidance"]["message"]
    assert signals["frames"][1]["separation"] == "rule_withheld"
    assert "无法判断" in signals["frames"][1]["guidance"]["message"]
    assert signals["frames"][2]["perception_outcome"] == "true_negative"
    assert signals["frames"][2]["label_confidence"] == "uncertain"
    repeat = report["clips"][1]
    assert [frame["guidance_outcome"] for frame in repeat["frames"]] == [
        "true_positive", "suppressed_repeat", "true_positive",
    ]
    assert "抑制" in repeat["frames"][1]["guidance"]["message"]
    square = report["clips"][2]["frames"][0]
    assert square["perception_outcome"] == "weak_spurious"
    assert square["separation"] == "rule_blocked_weak"
    assert square["confidence"] == pytest.approx(0.446, abs=0.05)
    assert square["confidence"] < 0.70
    for clip in report["clips"]:
        for frame in clip["frames"]:
            assert math.isfinite(frame["latency_ms"]) and frame["latency_ms"] >= 0
            for observation in frame["observations"]:
                assert observation["distance_m"] is None
            if frame["chosen"] is not None:
                assert frame["chosen"]["distance_m"] is None
    assert report["summary"]["latency_ms"]["max"] < 5000
    text = format_recorded_report(report)
    assert "status=scored" in text
    assert "lock       locked" in text
    assert "MISMATCH" not in text
    assert "Exit 0 means the command ran" in text


def test_recorded_run_does_not_construct_yolox(tmp_path, monkeypatch):
    def explode(self, *_args, **_kwargs):
        raise AssertionError("YOLOX was constructed")

    monkeypatch.setattr("aiglasses.vision.YoloXDetector.__init__", explode)
    report = run_recorded(_suite(tmp_path))
    assert report["metadata"]["yolox"]["loaded"] is False


def test_stills_are_sorted_by_filename(tmp_path):
    from aiglasses.vision import draw_lamp

    folder = tmp_path / "order"
    blank = np.zeros((240, 320, 3), dtype=np.uint8)
    _png(folder / "b-red.png", draw_lamp((0, 0, 220), radius=36))
    _png(folder / "a-blank.png", blank)
    path = _write_labels(tmp_path / "labels.json", _manifest([{
        "id": "order",
        "media": {"kind": "stills", "path": "order"},
        "samples": [
            {"id": "first", "frame_index": 0, "expect": _expect(None, None, False)},
            {"id": "second", "frame_index": 1, "expect": _expect("traffic_light", "red", True)},
        ],
    }]))
    report = run_recorded(path)
    frames = report["clips"][0]["frames"]
    assert [frame["source_name"] for frame in frames] == ["a-blank.png", "b-red.png"]
    assert frames[0]["perception_outcome"] == "true_negative"
    assert frames[1]["guidance_outcome"] == "true_positive"


def test_one_image_can_be_scored_twice_on_the_guidance_clock(tmp_path):
    from aiglasses.vision import draw_lamp

    _png(tmp_path / "lamp.png", draw_lamp((0, 0, 220), radius=36))
    path = _write_labels(tmp_path / "labels.json", _manifest([{
        "id": "same-picture",
        "media": {"kind": "image", "path": "lamp.png"},
        "samples": [
            {"id": "at-zero", "clock_seconds": 0, "expect": _expect("traffic_light", "red", True)},
            {
                "id": "at-one",
                "clock_seconds": 1,
                "expect": _expect("traffic_light", "red", False, repeat=True),
            },
        ],
    }]))
    report = run_recorded(path)
    assert report["lock"]["mode"] == "unlocked"
    assert [frame["guidance_outcome"] for frame in report["clips"][0]["frames"]] == [
        "true_positive", "suppressed_repeat",
    ]
    assert report["clips"][0]["time_base"] == "single_image"


def test_video_locators_score_one_frame_each(tmp_path):
    from aiglasses.vision import draw_lamp

    blank = np.zeros((240, 320, 3), dtype=np.uint8)
    red = draw_lamp((0, 0, 220), radius=36)
    green = draw_lamp((0, 200, 0), radius=36)
    _avi(tmp_path / "clip.avi", [blank, red, green], fps=10)
    path = _write_labels(tmp_path / "labels.json", _manifest([{
        "id": "clip",
        "media": {"kind": "video", "path": "clip.avi"},
        "samples": [
            {"id": "start", "t_seconds": 0.0, "expect": _expect(None, None, False)},
            {
                "id": "red-window",
                "t_start_seconds": 0.1,
                "t_end_seconds": 0.19,
                "expect": _expect("traffic_light", "red", True),
            },
            {
                "id": "green-frame",
                "frame_index": 2,
                "clock_seconds": 4,
                "expect": _expect("traffic_light", "green", False),
            },
        ],
    }]))
    report = run_recorded(path)
    clip = report["clips"][0]
    assert clip["fps_source"] == "container"
    assert clip["fps"] == pytest.approx(10.0)
    assert [frame["media_frame_index"] for frame in clip["frames"]] == [0, 1, 2]
    assert [frame["perception_outcome"] for frame in clip["frames"]] == [
        "true_negative", "match", "match",
    ]
    assert clip["frames"][1]["guidance_outcome"] == "true_positive"
    assert clip["frames"][2]["separation"] == "rule_withheld"
    assert clip["frames"][2]["t_seconds"] == 4
    for frame in clip["frames"]:
        for observation in frame["observations"]:
            assert observation["distance_m"] is None

    missing_range = _manifest([{
        "id": "clip",
        "media": {"kind": "video", "path": "clip.avi"},
        "samples": [{
            "id": "gap",
            "t_start_seconds": 0.15,
            "t_end_seconds": 0.16,
            "expect": _expect(None, None, False),
        }],
    }])
    with pytest.raises(ValueError, match="time range"):
        run_recorded(_write_labels(tmp_path / "gap.json", missing_range))

    too_far = _manifest([{
        "id": "clip",
        "media": {"kind": "video", "path": "clip.avi"},
        "samples": [{
            "id": "late",
            "frame_index": 600,
            "expect": _expect(None, None, False),
        }],
    }])
    with pytest.raises(ValueError, match="short-clip"):
        run_recorded(_write_labels(tmp_path / "late.json", too_far))


def test_clock_and_placeholder_and_oversize_labels_fail_closed(tmp_path):
    from aiglasses.vision import draw_lamp

    folder = tmp_path / "two"
    _png(folder / "00.png", draw_lamp((0, 0, 220), radius=36))
    _png(folder / "01.png", draw_lamp((0, 0, 220), radius=36))
    backwards = _manifest([{
        "id": "two",
        "media": {"kind": "stills", "path": "two"},
        "samples": [
            {"id": "later", "frame_index": 0, "clock_seconds": 2, "expect": _expect("traffic_light", "red", True)},
            {"id": "earlier", "frame_index": 1, "clock_seconds": 0, "expect": _expect("traffic_light", "red", True)},
        ],
    }])
    with pytest.raises(ValueError, match="backwards"):
        run_recorded(_write_labels(tmp_path / "back.json", backwards))

    placeholder = _manifest([{
        "id": "clip",
        "media": {"kind": "video", "path": "REPLACE_WITH_PRIVATE_CLIP"},
        "samples": [{"id": "only", "frame_index": 0, "expect": _expect(None, None, False)}],
    }])
    with pytest.raises(ValueError, match="REPLACE_WITH_PRIVATE_CLIP"):
        run_recorded(_write_labels(tmp_path / "placeholder.json", placeholder))

    huge = tmp_path / "huge.json"
    huge.write_bytes(b"{" + b" " * 1_000_001)
    with pytest.raises(ValueError, match="1 MB"):
        load_recorded_manifest(huge)

    home = _manifest([{
        "id": "clip",
        "media": {"kind": "image", "path": "~/secret.png"},
        "samples": [{"id": "only", "expect": _expect(None, None, False)}],
    }])
    with pytest.raises(ValueError, match="home"):
        run_recorded(_write_labels(tmp_path / "home.json", home))


def test_unlocked_miss_still_exits_zero_and_names_the_miss(tmp_path, capsys):
    from aiglasses.eval.recorded import main

    blank = np.zeros((240, 320, 3), dtype=np.uint8)
    _png(tmp_path / "blank.png", blank)
    path = _write_labels(tmp_path / "labels.json", _manifest([{
        "id": "wrong",
        "media": {"kind": "image", "path": "blank.png"},
        "samples": [{
            "id": "not-red",
            "expect": _expect("traffic_light", "red", True),
            "confidence_note": "The frame is empty on purpose.",
        }],
    }]))
    assert main(["--labels", str(path)]) == 0
    captured = capsys.readouterr()
    assert "not a certified navigation aid" in captured.err.lower()
    assert "Exit 0 means the command ran" in captured.out
    assert "lock       unlocked" in captured.out
    assert "miss=1" in captured.out


def test_cli_writes_reports_and_a_lock_mismatch_exits_nonzero(tmp_path, capsys):
    from aiglasses.eval.recorded import main

    labels = _suite(tmp_path)
    json_path = tmp_path / "out" / "recorded.json"
    csv_path = tmp_path / "out" / "recorded.csv"
    assert main(["--labels", str(labels), "--output", str(json_path), "--csv", str(csv_path)]) == 0
    captured = capsys.readouterr()
    assert "status=scored" in captured.out
    assert "FP=0" in captured.out
    written = json.loads(json_path.read_text(encoding="utf-8"))
    assert written["lock"]["ok"] is True
    assert written["summary"]["uncertain_labels"] == 1
    with csv_path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 7
    assert rows[0]["sample_id"] == "red"
    assert rows[0]["observed_traffic_light_state"] == "red"
    middle = next(row for row in rows if row["sample_id"] == "middle")
    assert middle["repeat_suppressed"] == "True"
    assert middle["guidance_outcome"] == "suppressed_repeat"
    assert "ndarray" not in json_path.read_text(encoding="utf-8")

    manifest = json.loads(labels.read_text(encoding="utf-8"))
    manifest["expected_summary"]["guidance_false_positives"] = 9
    broken = _write_labels(tmp_path / "broken.json", manifest)
    assert main(["--labels", str(broken)]) == 1
    assert "MISMATCH" in capsys.readouterr().out
    assert main(["--labels", str(broken), "--no-strict"]) == 0


def test_missing_default_skips_without_constructing_an_adapter(tmp_path, monkeypatch, capsys):
    from aiglasses.eval.recorded import main

    def explode(*_args, **_kwargs):
        raise AssertionError("adapter was constructed")

    monkeypatch.setattr("aiglasses.vision.LocalVisionAdapter", explode)
    monkeypatch.setattr("aiglasses.eval.recorded.DEFAULT_LABELS", tmp_path / "absent.json")
    json_path = tmp_path / "skip.json"
    assert main(["--output", str(json_path)]) == 0
    captured = capsys.readouterr()
    assert "status=skipped" in captured.out
    assert "FP=" not in captured.out
    assert "scored=no" in captured.out
    report = json.loads(json_path.read_text(encoding="utf-8"))
    assert report["metadata"]["status"] == "skipped"
    assert report["metadata"]["scored"] is False
    assert report["summary"] is None
    assert report["lock"]["mode"] == "skipped"
    assert report["clips"] == []


def test_explicit_missing_labels_exit_nonzero(tmp_path, capsys):
    from aiglasses.eval.recorded import main

    assert main(["--labels", str(tmp_path / "missing.json")]) == 1
    assert "not found" in capsys.readouterr().err.lower()


def test_eval_module_dispatches_the_recorded_command(tmp_path, monkeypatch, capsys):
    from aiglasses.eval.__main__ import main as eval_main

    monkeypatch.setattr("aiglasses.eval.recorded.DEFAULT_LABELS", tmp_path / "absent.json")
    assert eval_main(["recorded"]) == 0
    captured = capsys.readouterr()
    assert "status=skipped" in captured.out
    assert "Synthetic frames only" not in captured.err
