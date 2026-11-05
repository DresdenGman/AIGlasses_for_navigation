import json

import pytest

from aiglasses.guidance import Guidance, GuidanceEngine, Observation
from aiglasses.live import iterate_source, main
from aiglasses.pipeline import run_frames, select_guidance
from aiglasses.speech import utterance_for


class ScriptedAdapter:
    def __init__(self, batches):
        self.batches = list(batches)

    def analyze(self, frame: bytes):
        return self.analyze_image(frame)

    def analyze_image(self, _frame):
        return self.batches.pop(0)


class CollectingSpeech:
    enabled = True

    def __init__(self):
        self.lines = []

    def speak(self, text: str) -> None:
        self.lines.append(text)


def test_selection_prefers_a_red_light_over_a_higher_confidence_obstacle():
    observations = [
        Observation("obstacle", 0.99, label="行人"),
        Observation("traffic_light", 0.80, light_state="red"),
    ]
    guidance, chosen = select_guidance(GuidanceEngine(), observations, now=0)
    assert chosen.kind == "traffic_light"
    assert guidance.actionable
    assert "红灯" in guidance.message


def test_low_confidence_with_a_tiny_distance_is_still_not_a_command():
    guidance, _chosen = select_guidance(
        GuidanceEngine(),
        [Observation("obstacle", 0.20, distance_m=0.2, label="不明物体")],
        now=0,
    )
    assert not guidance.actionable
    assert "不确定" in guidance.message
    assert "近距离" not in guidance.message


def test_an_empty_frame_is_non_actionable_status():
    guidance, chosen = select_guidance(GuidanceEngine(), [], now=0)
    assert chosen is None
    assert not guidance.actionable
    assert "没有形成可用观察" in guidance.message


def test_uncertainty_is_spoken_but_not_repeated_inside_the_cooldown():
    low = [Observation("crosswalk", 0.20)]
    speech = CollectingSpeech()
    rows = run_frames(
        ScriptedAdapter([low, low, low]),
        frames=[0, 1, 2],
        speech=speech,
        clock=[0, 1, 4],
    )
    assert [row["actionable"] for row in rows] == [False, False, False]
    assert [row["spoken"] for row in rows] == [True, False, True]
    assert speech.lines == [rows[0]["message"], rows[2]["message"]]
    assert "不确定" in speech.lines[0]
    assert "向左" not in speech.lines[0]


def test_repeat_suppression_is_printed_and_not_spoken():
    red = [Observation("traffic_light", 0.95, light_state="red")]
    speech = CollectingSpeech()
    rows = run_frames(ScriptedAdapter([red, red]), frames=[0, 1], speech=speech, clock=[0, 1])
    assert rows[0]["actionable"] is True
    assert rows[0]["spoken"] is True
    assert rows[1]["actionable"] is False
    assert "抑制" in rows[1]["message"]
    assert rows[1]["spoken"] is False
    assert speech.lines == [rows[0]["message"]]


def test_suppressed_text_is_not_an_utterance():
    assert utterance_for(Guidance("status", "相同提示已抑制。", False)) is None


def test_text_only_runner_does_not_mark_rows_as_spoken():
    red = [Observation("traffic_light", 0.95, light_state="red")]
    rows = run_frames(ScriptedAdapter([red]), frames=[0], clock=[0])
    assert rows[0]["spoken"] is False
    assert rows[0]["actionable"] is True


def test_missing_media_path_is_reported_before_opening_a_camera(tmp_path):
    missing = tmp_path / "missing.mp4"
    with pytest.raises(FileNotFoundError, match="missing.mp4"):
        list(iterate_source(str(missing)))


def test_camera_open_failure_names_the_synthetic_fallback(monkeypatch):
    class FakeCapture:
        def isOpened(self):
            return False

        def release(self):
            return None

    class FakeCv:
        def VideoCapture(self, source):
            assert source == 0
            return FakeCapture()

    monkeypatch.setattr("aiglasses.live._require_cv2", lambda: FakeCv())
    with pytest.raises(RuntimeError, match="synthetic"):
        list(iterate_source("0"))


def test_stride_limits_how_many_camera_frames_are_yielded(monkeypatch):
    frames = [object() for _ in range(5)]

    class FakeCapture:
        def isOpened(self):
            return True

        def read(self):
            if not frames:
                return False, None
            return True, frames.pop(0)

        def release(self):
            self.released = True

    capture = FakeCapture()

    class FakeCv:
        def VideoCapture(self, _source):
            return capture

    monkeypatch.setattr("aiglasses.live._require_cv2", lambda: FakeCv())
    produced = list(iterate_source("0", stride=2, max_frames=2))
    assert len(produced) == 2
    assert capture.released


def test_still_image_source_uses_imread(tmp_path, monkeypatch):
    image = tmp_path / "lamp.jpg"
    image.write_bytes(b"placeholder")
    sentinel = object()

    class FakeCv:
        def imread(self, name):
            assert name == str(image)
            return sentinel

    monkeypatch.setattr("aiglasses.live._require_cv2", lambda: FakeCv())
    assert list(iterate_source(str(image))) == [sentinel]


def test_cli_requires_a_source():
    with pytest.raises(SystemExit):
        main([])


def test_synthetic_cli_prints_one_actionable_red_and_no_other_commands(capsys):
    from tests.conftest import require_opencv

    require_opencv()
    assert main(["--synthetic", "--detector", "heuristic", "--tts", "none"]) == 0
    captured = capsys.readouterr()
    assert "not a certified navigation aid" in captured.err.lower()
    rows = [json.loads(line) for line in captured.out.splitlines() if line.startswith("{")]
    assert rows[0]["actionable"] is True
    assert "红灯" in rows[0]["message"]
    assert all(row["actionable"] is False for row in rows[1:])
    assert all(row["spoken"] is False for row in rows)
    assert all(item["distance_m"] is None for row in rows for item in row["observations"])
