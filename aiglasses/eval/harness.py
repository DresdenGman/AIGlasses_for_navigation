"""Score labeled synthetic frames with the production perception path.

Perception outcomes and guidance-rule outcomes are counted separately. A green
lamp that is seen and then withheld is a perception match and a guidance
true negative, not a miss. Distance is never filled in.
"""

from __future__ import annotations

import csv
import json
import platform
from importlib.metadata import PackageNotFoundError, version
from math import isfinite
from pathlib import Path
from time import perf_counter

from aiglasses.guidance import GuidanceEngine
from aiglasses.pipeline import observation_to_dict, select_guidance
from aiglasses.vision import LocalVisionAdapter, default_weights_path

LABELS_SCHEMA = "aiglasses.perception_eval.labels"
REPORT_SCHEMA = "aiglasses.perception_eval.report"
SCHEMA_VERSION = 1
FIXTURE_NAME = "perception_v1.json"

CATEGORIES = {None, "traffic_light", "obstacle", "crosswalk"}
LIGHT_STATES = {None, "red", "green", "unknown"}

LATENCY_METHOD = (
    "Per-frame wall time from time.perf_counter in this process, wrapping "
    "LocalVisionAdapter.analyze_image and pipeline.select_guidance only. "
    "Fixture drawing, report writing, camera capture, and speech are excluded. "
    "The number is host time, not camera-to-ear latency, and it is not a product pass/fail threshold."
)
HONESTY = (
    "Synthetic generated frames only. This is not street validation, not a "
    "measurement of recorded video, and not a certified navigation aid. "
    "Recorded-video evaluation is a separate local command. It scores a private "
    "clip only when that clip's labels attest consent and redaction, and this command does not run it."
)
FREQUENCY_NOTE = (
    "actionable_messages counts GuidanceEngine results with actionable=true. "
    "suppressed_repeats counts results whose message is the engine cooldown "
    "('相同提示已抑制'), using each clip's own clock. Clips do not share cooldown "
    "state. Speech de-duplication is not measured; TTS is off."
)

SUMMARY_KEYS = (
    "clips",
    "frames",
    "guidance_false_positives",
    "guidance_misses",
    "guidance_true_positives",
    "guidance_true_negatives",
    "suppressed_repeats",
    "suppression_failures",
    "actionable_messages",
    "other_non_actionable",
    "perception_false_positives",
    "perception_misses",
    "perception_matches",
    "perception_true_negatives",
    "perception_weak_spurious",
    "separation_aligned",
    "separation_rule_withheld",
    "separation_rule_blocked_weak",
    "separation_perception_error",
    "separation_guidance_rule_error",
    "separation_both",
)


def packaged_fixture_path() -> Path:
    return Path(__file__).resolve().parent / "fixtures" / FIXTURE_NAME


def load_manifest(path: Path | None = None) -> dict:
    fixture = Path(path) if path is not None else packaged_fixture_path()
    if not fixture.is_file():
        raise FileNotFoundError(f"Eval fixture not found: {fixture}")
    data = json.loads(fixture.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Eval fixture must be a JSON object")
    data["_source_path"] = str(fixture)
    return data


def validate_manifest(manifest: dict) -> None:
    if manifest.get("schema") != LABELS_SCHEMA or manifest.get("schema_version") != SCHEMA_VERSION:
        raise ValueError(
            f"Unsupported labels schema {manifest.get('schema')!r} "
            f"version {manifest.get('schema_version')!r}; expected {LABELS_SCHEMA} {SCHEMA_VERSION}"
        )
    if manifest.get("detector") != "heuristic":
        raise ValueError("v1 fixtures must set detector to 'heuristic'")
    _threshold(manifest.get("min_confidence"), "min_confidence", upper=1)
    _threshold(manifest.get("cooldown_seconds"), "cooldown_seconds", upper=None)
    clips = manifest.get("clips")
    if not isinstance(clips, list) or not clips:
        raise ValueError("clips must be a non-empty list")
    seen: set[str] = set()
    for clip in clips:
        if not isinstance(clip, dict):
            raise ValueError("each clip must be an object")
        clip_id = clip.get("id")
        if not isinstance(clip_id, str) or not clip_id or clip_id in seen:
            raise ValueError(f"clip id must be a unique non-empty string (got {clip_id!r})")
        seen.add(clip_id)
        frames = clip.get("frames")
        if not isinstance(frames, list) or not frames:
            raise ValueError(f"{clip_id}: frames must be a non-empty list")
        previous_t = None
        for index, frame in enumerate(frames):
            if not isinstance(frame, dict):
                raise ValueError(f"{clip_id} frame {index}: must be an object")
            t = frame.get("t_seconds")
            if isinstance(t, bool) or not isinstance(t, (int, float)) or not isfinite(float(t)):
                raise ValueError(f"{clip_id} frame {index}: t_seconds must be a finite number")
            if previous_t is not None and float(t) < previous_t:
                raise ValueError(f"{clip_id}: t_seconds must not go backwards")
            previous_t = float(t)
            if not isinstance(frame.get("generate"), dict):
                raise ValueError(f"{clip_id} frame {index}: generate must be an object")
            _validate_expect(clip_id, index, frame.get("expect"))
    expected = manifest.get("expected_summary")
    if expected is not None:
        if not isinstance(expected, dict):
            raise ValueError("expected_summary must be an object")
        missing = [key for key in SUMMARY_KEYS if key not in expected]
        if missing:
            raise ValueError(f"expected_summary is missing {', '.join(missing)}")
        for key in SUMMARY_KEYS:
            value = expected[key]
            if isinstance(value, bool) or not isinstance(value, int) or value < 0:
                raise ValueError(f"expected_summary.{key} must be a non-negative integer")


def run_eval(fixture: Path | None = None, manifest: dict | None = None) -> dict:
    """Run the packaged fixture, or a manifest that was already loaded."""
    if manifest is None:
        manifest = load_manifest(fixture)
    validate_manifest(manifest)
    from aiglasses.eval.scenes import render_frame

    min_confidence = float(manifest["min_confidence"])
    cooldown_seconds = float(manifest["cooldown_seconds"])
    adapter = LocalVisionAdapter("heuristic")
    clip_reports = []
    for clip in manifest["clips"]:
        clip_reports.append(_run_clip(
            clip,
            adapter,
            min_confidence=min_confidence,
            cooldown_seconds=cooldown_seconds,
            render_frame=render_frame,
        ))
    summary = _summarize(clip_reports)
    projected = project_summary(summary)
    mismatches = _lock_mismatches(manifest.get("expected_summary"), projected)
    return {
        "metadata": _metadata(manifest, min_confidence, cooldown_seconds),
        "summary": summary,
        "lock": {"ok": not mismatches, "mismatches": mismatches},
        "clips": clip_reports,
    }


def project_summary(summary: dict) -> dict:
    guidance = summary["guidance"]
    perception = summary["perception"]
    frequency = summary["message_frequency"]
    separation = summary["separation"]
    return {
        "clips": summary["clips"],
        "frames": summary["frames"],
        "guidance_false_positives": guidance["false_positives"],
        "guidance_misses": guidance["misses"],
        "guidance_true_positives": guidance["true_positives"],
        "guidance_true_negatives": guidance["true_negatives"],
        "suppressed_repeats": frequency["suppressed_repeats"],
        "suppression_failures": guidance["suppression_failures"],
        "actionable_messages": frequency["actionable_messages"],
        "other_non_actionable": frequency["other_non_actionable"],
        "perception_false_positives": perception["false_positives"],
        "perception_misses": perception["misses"],
        "perception_matches": perception["matches"],
        "perception_true_negatives": perception["true_negatives"],
        "perception_weak_spurious": perception["weak_spurious"],
        "separation_aligned": separation["aligned"],
        "separation_rule_withheld": separation["rule_withheld"],
        "separation_rule_blocked_weak": separation["rule_blocked_weak"],
        "separation_perception_error": separation["perception_error"],
        "separation_guidance_rule_error": separation["guidance_rule_error"],
        "separation_both": separation["both"],
    }


def write_json_report(report: dict, path: Path) -> None:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_csv_report(report: dict, path: Path) -> None:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "clip_id",
        "frame_index",
        "t_seconds",
        "perception_outcome",
        "guidance_outcome",
        "separation",
        "expected_category",
        "expected_traffic_light_state",
        "expected_actionable",
        "repeat_suppressed",
        "observed_category",
        "observed_traffic_light_state",
        "observed_confidence",
        "actionable",
        "level",
        "message",
        "latency_ms",
    ]
    with destination.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for clip in report["clips"]:
            for frame in clip["frames"]:
                chosen = frame["chosen"]
                expect = frame["expect"]
                writer.writerow({
                    "clip_id": clip["id"],
                    "frame_index": frame["index"],
                    "t_seconds": frame["t_seconds"],
                    "perception_outcome": frame["perception_outcome"],
                    "guidance_outcome": frame["guidance_outcome"],
                    "separation": frame["separation"],
                    "expected_category": expect["category"],
                    "expected_traffic_light_state": expect["traffic_light_state"],
                    "expected_actionable": expect["actionable"],
                    "repeat_suppressed": bool(expect.get("repeat_suppressed", False)),
                    "observed_category": None if chosen is None else chosen["kind"],
                    "observed_traffic_light_state": None if chosen is None else chosen["light_state"],
                    "observed_confidence": frame["confidence"],
                    "actionable": frame["guidance"]["actionable"],
                    "level": frame["guidance"]["level"],
                    "message": frame["guidance"]["message"],
                    "latency_ms": frame["latency_ms"],
                })


def format_report(report: dict) -> str:
    meta = report["metadata"]
    summary = report["summary"]
    guidance = summary["guidance"]
    perception = summary["perception"]
    frequency = summary["message_frequency"]
    latency = summary["latency_ms"]
    lines = [
        (
            f"Perception eval  fixture={meta['fixture_id']}  detector={meta['detector']}  "
            f"min_confidence={meta['min_confidence']:.2f}  cooldown_s={meta['cooldown_seconds']:.1f}"
        ),
        (
            f"package={meta['package_version']}  design={meta['design_version']}  "
            f"labels_schema={meta['labels_schema_version']}"
        ),
        f"yolox: {meta['yolox']['note']}",
        "",
        f"{'clip':<24} {'n':>3}  {'perception':<22} {'guidance':<22} {'act':>3} {'sup':>3} {'mean_ms':>8}",
    ]
    for clip in report["clips"]:
        perception_cell = "/".join(_short_perception(frame["perception_outcome"]) for frame in clip["frames"])
        guidance_cell = "/".join(_short_guidance(frame["guidance_outcome"]) for frame in clip["frames"])
        lines.append(
            f"{clip['id']:<24} {clip['frame_count']:>3}  {perception_cell:<22} {guidance_cell:<22} "
            f"{clip['actionable_messages']:>3} {clip['suppressed_repeats']:>3} {clip['latency_ms']['mean']:>8.2f}"
        )
    lines.extend([
        "",
        (
            "guidance   "
            f"FP={guidance['false_positives']}  miss={guidance['misses']}  "
            f"TP={guidance['true_positives']}  TN={guidance['true_negatives']}  "
            f"suppression_failures={guidance['suppression_failures']}"
        ),
        (
            "perception "
            f"FP={perception['false_positives']}  miss={perception['misses']}  "
            f"match={perception['matches']}  TN={perception['true_negatives']}  "
            f"weak_spurious={perception['weak_spurious']}"
        ),
        (
            "frequency  "
            f"actionable_messages={frequency['actionable_messages']}  "
            f"suppressed_repeats={frequency['suppressed_repeats']}  "
            f"other_non_actionable={frequency['other_non_actionable']}  "
            f"frames={summary['frames']}"
        ),
        (
            "latency    "
            f"mean={latency['mean']:.2f} ms  max={latency['max']:.2f} ms  "
            f"frames={latency['frames']}"
        ),
        "           perf_counter around analyze_image + select_guidance; host time, not a pass/fail threshold.",
        f"lock       {'ok' if report['lock']['ok'] else 'MISMATCH'}",
    ])
    if report["lock"]["mismatches"]:
        lines.extend(f"           {item}" for item in report["lock"]["mismatches"])
    lines.append(HONESTY)
    return "\n".join(lines)


def score_labeled_frame(
    *,
    index: int,
    t_seconds: float,
    expect: dict,
    observations,
    guidance,
    chosen,
    min_confidence: float,
    latency_ms: float,
) -> dict:
    """Score one labeled frame. Distance is whatever the adapter already set, which is empty here.

    The recorded-video command uses this same function. It does not keep a second copy of the rules.
    """
    perception_outcome = _perception_outcome(observations, expect, min_confidence)
    guidance_outcome = _guidance_outcome(
        guidance,
        chosen,
        expect,
        perception_matched=perception_outcome == "match",
    )
    return {
        "index": index,
        "t_seconds": float(t_seconds),
        "expect": expect,
        "observations": [observation_to_dict(item) for item in observations],
        "chosen": None if chosen is None else observation_to_dict(chosen),
        "confidence": None if chosen is None else chosen.confidence,
        "guidance": {
            "level": guidance.level,
            "message": guidance.message,
            "actionable": guidance.actionable,
        },
        "perception_outcome": perception_outcome,
        "guidance_outcome": guidance_outcome,
        "separation": _separation(perception_outcome, guidance_outcome),
        "latency_ms": round(float(latency_ms), 3),
    }


def _run_clip(clip, adapter, *, min_confidence, cooldown_seconds, render_frame) -> dict:
    engine = GuidanceEngine(min_confidence=min_confidence, cooldown_seconds=cooldown_seconds)
    frames = []
    for index, spec in enumerate(clip["frames"]):
        try:
            image = render_frame(spec["generate"])
        except ValueError as error:
            raise ValueError(f"{clip['id']} frame {index}: {error}") from error
        started = perf_counter()
        observations = list(adapter.analyze_image(image))
        guidance, chosen = select_guidance(engine, observations, now=float(spec["t_seconds"]))
        latency_ms = (perf_counter() - started) * 1000
        scored = score_labeled_frame(
            index=index,
            t_seconds=float(spec["t_seconds"]),
            expect=spec["expect"],
            observations=observations,
            guidance=guidance,
            chosen=chosen,
            min_confidence=min_confidence,
            latency_ms=latency_ms,
        )
        scored["generate"] = spec["generate"]
        frames.append(scored)
    actionable = sum(frame["guidance"]["actionable"] for frame in frames)
    suppressed = sum(frame["guidance_outcome"] == "suppressed_repeat" for frame in frames)
    latencies = [frame["latency_ms"] for frame in frames]
    return {
        "id": clip["id"],
        "description": clip.get("description", ""),
        "frame_count": len(frames),
        "actionable_messages": actionable,
        "suppressed_repeats": suppressed,
        "latency_ms": {
            "mean": round(sum(latencies) / len(latencies), 3),
            "max": round(max(latencies), 3),
        },
        "frames": frames,
    }


def _perception_outcome(observations, expect, min_confidence: float) -> str:
    category = expect["category"]
    confident = [item for item in observations if item.confidence >= min_confidence]
    if category is None:
        if any(item.kind == "obstacle" for item in observations):
            return "false_positive"
        if confident:
            return "false_positive"
        if observations:
            return "weak_spurious"
        return "true_negative"
    matched = [item for item in confident if _matches(item, expect)]
    wrong = [item for item in confident if not _matches(item, expect)]
    if matched and wrong:
        return "match_and_false_positive"
    if matched:
        return "match"
    if wrong:
        return "miss_and_false_positive"
    return "miss"


def _matches(observation, expect) -> bool:
    if observation.kind != expect["category"]:
        return False
    if expect["category"] == "traffic_light":
        return observation.light_state == expect["traffic_light_state"]
    return True


def _guidance_outcome(guidance, chosen, expect, *, perception_matched: bool) -> str:
    if expect.get("repeat_suppressed"):
        if guidance.actionable:
            return "false_positive"
        if "抑制" in guidance.message:
            return "suppressed_repeat"
        if perception_matched:
            return "suppression_failure"
        return "true_negative"
    if expect["actionable"]:
        if guidance.actionable and _guidance_category_ok(chosen, expect):
            return "true_positive"
        if guidance.actionable:
            return "miss_and_false_positive"
        return "miss"
    if guidance.actionable:
        return "false_positive"
    return "true_negative"


def _guidance_category_ok(chosen, expect) -> bool:
    if chosen is None or chosen.kind != expect["category"]:
        return False
    if expect["category"] == "traffic_light":
        return chosen.light_state == expect["traffic_light_state"]
    return True


def _separation(perception_outcome: str, guidance_outcome: str) -> str:
    perception_bad = perception_outcome in {
        "false_positive", "miss", "miss_and_false_positive", "match_and_false_positive",
    }
    guidance_bad = guidance_outcome in {
        "false_positive", "miss", "miss_and_false_positive", "suppression_failure",
    }
    if perception_bad and guidance_bad:
        return "both"
    if perception_bad:
        return "perception_error"
    if guidance_bad:
        return "guidance_rule_error"
    if perception_outcome == "weak_spurious" and guidance_outcome == "true_negative":
        return "rule_blocked_weak"
    if perception_outcome == "match" and guidance_outcome in {"true_negative", "suppressed_repeat"}:
        return "rule_withheld"
    return "aligned"


def _summarize(clips: list[dict]) -> dict:
    guidance = {
        "false_positives": 0,
        "misses": 0,
        "true_positives": 0,
        "true_negatives": 0,
        "suppression_failures": 0,
    }
    perception = {
        "false_positives": 0,
        "misses": 0,
        "matches": 0,
        "true_negatives": 0,
        "weak_spurious": 0,
    }
    separation = {
        "aligned": 0,
        "rule_withheld": 0,
        "rule_blocked_weak": 0,
        "perception_error": 0,
        "guidance_rule_error": 0,
        "both": 0,
    }
    latencies: list[float] = []
    frames = 0
    actionable = 0
    suppressed = 0
    for clip in clips:
        frames += clip["frame_count"]
        actionable += clip["actionable_messages"]
        suppressed += clip["suppressed_repeats"]
        for frame in clip["frames"]:
            latencies.append(frame["latency_ms"])
            _count_guidance(guidance, frame["guidance_outcome"])
            _count_perception(perception, frame["perception_outcome"])
            separation[frame["separation"]] += 1
    other_non_actionable = frames - actionable - suppressed
    return {
        "clips": len(clips),
        "frames": frames,
        "guidance": guidance,
        "perception": perception,
        "separation": separation,
        "message_frequency": {
            "actionable_messages": actionable,
            "suppressed_repeats": suppressed,
            "other_non_actionable": other_non_actionable,
            "note": FREQUENCY_NOTE,
        },
        "latency_ms": {
            "frames": len(latencies),
            "mean": round(sum(latencies) / len(latencies), 3) if latencies else 0.0,
            "max": round(max(latencies), 3) if latencies else 0.0,
            "method": LATENCY_METHOD,
        },
    }


def _count_guidance(counts: dict, outcome: str) -> None:
    if outcome == "true_positive":
        counts["true_positives"] += 1
    elif outcome in {"true_negative", "suppressed_repeat"}:
        counts["true_negatives"] += 1
    elif outcome == "false_positive":
        counts["false_positives"] += 1
    elif outcome == "miss":
        counts["misses"] += 1
    elif outcome == "miss_and_false_positive":
        counts["misses"] += 1
        counts["false_positives"] += 1
    elif outcome == "suppression_failure":
        counts["suppression_failures"] += 1
    else:
        raise ValueError(f"unknown guidance outcome {outcome}")


def _count_perception(counts: dict, outcome: str) -> None:
    if outcome == "match":
        counts["matches"] += 1
    elif outcome == "true_negative":
        counts["true_negatives"] += 1
    elif outcome == "weak_spurious":
        counts["weak_spurious"] += 1
    elif outcome == "false_positive":
        counts["false_positives"] += 1
    elif outcome == "miss":
        counts["misses"] += 1
    elif outcome == "match_and_false_positive":
        counts["matches"] += 1
        counts["false_positives"] += 1
    elif outcome == "miss_and_false_positive":
        counts["misses"] += 1
        counts["false_positives"] += 1
    else:
        raise ValueError(f"unknown perception outcome {outcome}")


def _metadata(manifest: dict, min_confidence: float, cooldown_seconds: float) -> dict:
    defaults = GuidanceEngine()
    weights = default_weights_path()
    weights_present = weights.is_file()
    if weights_present:
        yolox_note = (
            "Skipped. A weights file is present, but this fixture pack has no YOLOX labels "
            "and the file was not loaded. CI does not download weights."
        )
    else:
        yolox_note = (
            "Skipped. No YOLOX weights file is present. CI stays offline and does not "
            "download weights. This report scores the lamp heuristic only."
        )
    opencv_version = None
    try:
        import cv2
        opencv_version = cv2.__version__
    except ImportError:
        opencv_version = None
    return {
        "schema": REPORT_SCHEMA,
        "schema_version": SCHEMA_VERSION,
        "labels_schema": LABELS_SCHEMA,
        "labels_schema_version": manifest["schema_version"],
        "fixture_id": manifest.get("fixture_id"),
        "fixture_path": manifest.get("_source_path"),
        "package_name": "ai-glasses-navigation-prototype",
        "package_version": _package_version(),
        "design_version": _design_version(),
        "python": platform.python_version(),
        "opencv": opencv_version,
        "detector": manifest["detector"],
        "min_confidence": min_confidence,
        "cooldown_seconds": cooldown_seconds,
        "guidance_engine_defaults": {
            "min_confidence": defaults.min_confidence,
            "cooldown_seconds": defaults.cooldown_seconds,
        },
        "thresholds_match_engine_defaults": (
            min_confidence == defaults.min_confidence and cooldown_seconds == defaults.cooldown_seconds
        ),
        "latency_method": LATENCY_METHOD,
        "yolox": {"scored": False, "weights_present": weights_present, "note": yolox_note},
        "honesty": HONESTY,
    }


def _package_version() -> str:
    try:
        return version("ai-glasses-navigation-prototype")
    except PackageNotFoundError:
        return "0.1.0"


def _design_version() -> str:
    candidates = [
        Path.cwd() / "design" / "LATEST.json",
        Path(__file__).resolve().parents[2] / "design" / "LATEST.json",
    ]
    for path in candidates:
        if path.is_file():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            value = data.get("design_version")
            if isinstance(value, str) and value:
                return value
    return "unresolved"


def _lock_mismatches(expected, projected: dict) -> list[str]:
    if not isinstance(expected, dict):
        return ["expected_summary is missing; the packaged fixture must lock its totals"]
    mismatches = []
    for key in SUMMARY_KEYS:
        if projected[key] != expected[key]:
            mismatches.append(f"{key}: expected {expected[key]}, got {projected[key]}")
    return mismatches


def _threshold(value, name: str, *, upper: float | None) -> None:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not isfinite(float(value)):
        raise ValueError(f"{name} must be a finite number")
    if float(value) < 0 or (upper is not None and float(value) > upper):
        raise ValueError(f"{name} is out of range")


def _validate_expect(clip_id: str, index: int, expect) -> None:
    where = f"{clip_id} frame {index}"
    if not isinstance(expect, dict):
        raise ValueError(f"{where}: expect must be an object")
    category = expect.get("category", "missing")
    state = expect.get("traffic_light_state", "missing")
    actionable = expect.get("actionable", "missing")
    if "category" not in expect or "traffic_light_state" not in expect or "actionable" not in expect:
        raise ValueError(f"{where}: expect needs category, traffic_light_state, and actionable")
    if category not in CATEGORIES:
        raise ValueError(f"{where}: category must be null, traffic_light, obstacle, or crosswalk")
    if state not in LIGHT_STATES:
        raise ValueError(f"{where}: traffic_light_state must be null, red, green, or unknown")
    if not isinstance(actionable, bool):
        raise ValueError(f"{where}: actionable must be true or false")
    repeat = expect.get("repeat_suppressed", False)
    if not isinstance(repeat, bool):
        raise ValueError(f"{where}: repeat_suppressed must be a boolean")
    if category is None:
        if state is not None or actionable or repeat:
            raise ValueError(f"{where}: an empty scene cannot expect a state, an actionable prompt, or suppression")
    elif category == "traffic_light":
        if state not in {"red", "green", "unknown"}:
            raise ValueError(f"{where}: a traffic_light frame needs a red, green, or unknown state")
    elif state is not None:
        raise ValueError(f"{where}: only traffic_light frames carry traffic_light_state")
    if actionable and category is None:
        raise ValueError(f"{where}: actionable guidance needs a category")
    if repeat and actionable:
        raise ValueError(f"{where}: a suppressed repeat is not actionable")
    if repeat and category is None:
        raise ValueError(f"{where}: suppression requires a category to recognize")


def _short_perception(outcome: str) -> str:
    return {
        "match": "match",
        "true_negative": "TN",
        "weak_spurious": "weak",
        "false_positive": "FP",
        "miss": "miss",
        "match_and_false_positive": "match+FP",
        "miss_and_false_positive": "miss+FP",
    }.get(outcome, outcome)


def _short_guidance(outcome: str) -> str:
    return {
        "true_positive": "TP",
        "true_negative": "TN",
        "false_positive": "FP",
        "miss": "miss",
        "miss_and_false_positive": "miss+FP",
        "suppressed_repeat": "sup",
        "suppression_failure": "sup-fail",
    }.get(outcome, outcome)
