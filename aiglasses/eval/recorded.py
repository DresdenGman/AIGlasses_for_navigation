"""Score a private local clip with the same perception and guidance counters.

This is not a mode of the synthetic fixture pack. Those fixtures are generated
drawings with a regression lock, and they must not point at a file. Recorded
video has its own labels schema (version 1), its own command, and it refuses
to score unless the labels attest consent and redaction.

The command never opens a webcam, never downloads weights, and never writes
the pixels into the report. With no private labels file it skips and exits 0
so CI stays green.

    python -m aiglasses.eval.recorded
    python -m aiglasses.eval recorded --labels data/private_eval/labels.json
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import platform
import subprocess
import sys
from pathlib import Path
from time import perf_counter

from aiglasses.guidance import GuidanceEngine
from aiglasses.pipeline import select_guidance

from .harness import (
    _design_version,
    _lock_mismatches,
    _package_version,
    _short_guidance,
    _short_perception,
    _summarize,
    _threshold,
    _validate_expect,
    project_summary,
    score_labeled_frame,
    write_json_report,
)

LABELS_SCHEMA = "aiglasses.perception_eval.recorded_labels"
REPORT_SCHEMA = "aiglasses.perception_eval.recorded_report"
SCHEMA_VERSION = 1
EXAMPLE_NAME = "recorded_labels.example.json"
DEFAULT_LABELS = Path("data/private_eval/labels.json")
PLACEHOLDER_MEDIA = "REPLACE_WITH_PRIVATE_CLIP"
MAX_LABEL_BYTES = 1_000_000
MAX_DECODED_FRAMES = 600
MAX_DURATION_SECONDS = 90.0
MEASURED_FPS_MIN = 1.0
MEASURED_FPS_MAX = 240.0
ASSUMED_FPS = 30.0
TEXT_LIMIT = 500
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

CONSENT_AFFIRMATIONS = (
    "informed",
    "risks_explained",
    "local_only",
    "participant_copy_offered",
)
CONSENT_TEXT = ("purpose", "retention", "access", "withdrawal")
REDACTION_ITEMS = (
    "faces",
    "license_plates",
    "screens",
    "identifiable_locations",
    "audio",
)
REDACTION_VALUES = {"absent", "redacted"}
LABEL_CONFIDENCE = {"sure", "uncertain"}

RECORDED_HONESTY = (
    "Local recorded-video evaluation of frames the operator already has. "
    "This is not street validation, not a certified navigation aid, and not a completed field study. "
    "Raw clips stay on this machine. This command does not upload them, does not commit them, "
    "and does not download model weights. A skip means no private clip was scored. "
    "Redaction and consent are operator attestations in the labels file; "
    "this command does not detect faces, plates, screens, or places."
)
RECORDED_LATENCY = (
    "Per-sample wall time from time.perf_counter in this process, wrapping "
    "LocalVisionAdapter.analyze_image and pipeline.select_guidance only. "
    "Opening the clip and writing the report are outside the timer. "
    "The number is host time, not camera-to-ear latency, and it is not a product pass/fail threshold."
)
BANNER = (
    "Research prototype. Not a certified navigation aid. "
    "This command scores a private local clip only. It does not measure street performance. "
    "No clip is uploaded. CI does not need a recording."
)


def example_labels_path() -> Path:
    return Path(__file__).resolve().parent / "fixtures" / EXAMPLE_NAME


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m aiglasses.eval.recorded",
        description=(
            "Score a local video or still sequence through LocalVisionAdapter and GuidanceEngine. "
            "Requires a labels file that attests consent and redaction. "
            "Skips when data/private_eval/labels.json is absent. "
            "Research prototype only: not a certified navigation aid and not street validation."
        ),
    )
    parser.add_argument(
        "--labels",
        type=Path,
        help=(
            "Recorded-labels JSON. Defaults to data/private_eval/labels.json, "
            "which is gitignored. A missing default skips; a missing explicit path fails."
        ),
    )
    parser.add_argument("--output", type=Path, help="Write the JSON report to this path.")
    parser.add_argument("--csv", type=Path, help="Write one CSV row per labeled sample to this path.")
    parser.add_argument(
        "--no-strict",
        action="store_true",
        help="Exit 0 even when expected_summary does not match. Ignored when the run skips.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    print(BANNER, file=sys.stderr)
    from aiglasses.vision import VisionDependencyError

    try:
        if args.labels is None and not DEFAULT_LABELS.is_file():
            report = skipped_report(DEFAULT_LABELS)
            code = 0
        else:
            path = DEFAULT_LABELS if args.labels is None else Path(args.labels)
            report = run_recorded(path)
            code = 0 if report["lock"]["ok"] or args.no_strict else 1
    except VisionDependencyError as error:
        print(error, file=sys.stderr)
        return 2
    except (OSError, ValueError, FileNotFoundError) as error:
        print(error, file=sys.stderr)
        return 1
    print(format_recorded_report(report))
    if args.output is not None:
        write_json_report(report, args.output)
        print(f"wrote {args.output}", file=sys.stderr)
    if args.csv is not None:
        write_csv_report(report, args.csv)
        print(f"wrote {args.csv}", file=sys.stderr)
    return code


def skipped_report(labels_path: Path) -> dict:
    reason = (
        f"No private labels file at {labels_path.as_posix()}. "
        "Nothing was scored. Copy the schema example to that path only after the "
        "consent and redaction checklists, and keep the clip out of git. "
        "Synthetic eval is a different command: python -m aiglasses.eval."
    )
    return {
        "metadata": _base_metadata(status="skipped", reason=reason),
        "summary": None,
        "lock": {"ok": None, "mode": "skipped", "mismatches": []},
        "clips": [],
    }


def run_recorded(labels: Path) -> dict:
    """Score one labels file. Raises ValueError or FileNotFoundError and writes nothing.

    Consent and redaction are checked before any media file is opened.
    """
    manifest = load_recorded_manifest(labels)
    validate_recorded_manifest(manifest)
    refusal = runnable_problems(manifest)
    if refusal:
        raise ValueError("Refusing to score. " + "; ".join(refusal))
    assert_path_is_private(Path(labels), what="labels file")
    from aiglasses.vision import LocalVisionAdapter

    min_confidence = float(manifest["min_confidence"])
    cooldown_seconds = float(manifest["cooldown_seconds"])
    adapter = LocalVisionAdapter("heuristic")
    if adapter.detector_name != "heuristic":
        raise ValueError("Recorded-video eval scores the lamp heuristic only and does not load YOLOX")
    clip_reports = [
        _score_clip(
            clip,
            adapter,
            labels_path=Path(labels),
            min_confidence=min_confidence,
            cooldown_seconds=cooldown_seconds,
        )
        for clip in manifest["clips"]
    ]
    summary = _summarize(clip_reports)
    summary["uncertain_labels"] = sum(
        frame["label_confidence"] == "uncertain"
        for clip in clip_reports
        for frame in clip["frames"]
    )
    expected = manifest.get("expected_summary")
    if expected is None:
        lock = {"ok": True, "mode": "unlocked", "mismatches": []}
    else:
        mismatches = _lock_mismatches(expected, project_summary(summary))
        lock = {"ok": not mismatches, "mode": "locked", "mismatches": mismatches}
    metadata = _base_metadata(status="scored", reason="")
    metadata.update(_scored_metadata(manifest, min_confidence, cooldown_seconds, labels))
    return {
        "metadata": metadata,
        "summary": summary,
        "lock": lock,
        "clips": clip_reports,
    }


def load_recorded_manifest(path: Path) -> dict:
    fixture = Path(path)
    if not fixture.is_file():
        raise FileNotFoundError(f"Recorded labels file not found: {fixture.name}")
    if fixture.stat().st_size > MAX_LABEL_BYTES:
        raise ValueError("Labels file is larger than 1 MB. It should be JSON, not a video.")
    try:
        data = json.loads(fixture.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError(f"Labels file is not valid JSON: {error}") from error
    if not isinstance(data, dict):
        raise ValueError("Recorded labels must be a JSON object")
    data["_source_name"] = fixture.name
    return data


def validate_recorded_manifest(manifest: dict) -> None:
    version = manifest.get("schema_version")
    if manifest.get("schema") != LABELS_SCHEMA or type(version) is not int or version != SCHEMA_VERSION:
        raise ValueError(
            f"Unsupported recorded labels schema {manifest.get('schema')!r} "
            f"version {version!r}; expected {LABELS_SCHEMA} {SCHEMA_VERSION}"
        )
    if manifest.get("detector") != "heuristic":
        raise ValueError("Recorded labels must set detector to 'heuristic'. This command does not load YOLOX.")
    example_only = manifest.get("example_only", False)
    if not isinstance(example_only, bool):
        raise ValueError("example_only must be true or false")
    _bounded_text(manifest.get("session_id"), "session_id", required=True, limit=120)
    _optional_text(manifest.get("description", ""), "description")
    _threshold(manifest.get("min_confidence"), "min_confidence", upper=1)
    _threshold(manifest.get("cooldown_seconds"), "cooldown_seconds", upper=None)
    _validate_consent_shape(manifest.get("consent"))
    _validate_redaction_shape(manifest.get("redaction"))
    clips = manifest.get("clips")
    if not isinstance(clips, list) or not clips:
        raise ValueError("clips must be a non-empty list")
    seen: set[str] = set()
    for clip in clips:
        if not isinstance(clip, dict):
            raise ValueError("each clip must be an object")
        clip_id = clip.get("id")
        if not isinstance(clip_id, str) or not clip_id.strip() or "\n" in clip_id or "\r" in clip_id:
            raise ValueError(f"clip id must be a single-line non-empty string (got {clip_id!r})")
        if len(clip_id) > 80 or clip_id in seen:
            raise ValueError(f"clip id must be unique and at most 80 characters (got {clip_id!r})")
        seen.add(clip_id)
        _optional_text(clip.get("description", ""), f"{clip_id} description")
        media = clip.get("media")
        if not isinstance(media, dict):
            raise ValueError(f"{clip_id}: media must be an object")
        kind = media.get("kind")
        if kind not in {"video", "stills", "image"}:
            raise ValueError(f"{clip_id}: media.kind must be video, stills, or image")
        raw_path = media.get("path")
        if not isinstance(raw_path, str) or not raw_path.strip() or "\n" in raw_path or "\r" in raw_path:
            raise ValueError(f"{clip_id}: media.path must be a single-line local path")
        if "://" in raw_path:
            raise ValueError(f"{clip_id}: media.path must be a local filesystem path, not a URL")
        samples = clip.get("samples")
        if not isinstance(samples, list) or not samples:
            raise ValueError(f"{clip_id}: samples must be a non-empty list")
        sample_ids: set[str] = set()
        for index, sample in enumerate(samples):
            _validate_sample(clip_id, kind, index, sample, sample_ids)
    expected = manifest.get("expected_summary", None)
    if expected is not None:
        _validate_expected_summary(expected)


def runnable_problems(manifest: dict) -> list[str]:
    """Attestations that must already be true before any pixel is read."""
    problems: list[str] = []
    if manifest.get("example_only", False):
        problems.append(
            "example_only is true. Copy the schema example to data/private_eval/labels.json "
            "and set example_only to false only after the consent and redaction checklists"
        )
    consent = manifest.get("consent")
    if isinstance(consent, dict):
        for key in CONSENT_AFFIRMATIONS:
            if consent.get(key) is not True:
                problems.append(f"consent.{key} is not true")
    redaction = manifest.get("redaction")
    if not isinstance(redaction, dict) or redaction.get("confirmed") is not True:
        problems.append("redaction.confirmed is not true")
    return problems


def assert_path_is_private(path: Path, *, what: str) -> None:
    """Refuse a repo path that git would be willing to commit.

    Paths outside the repository are the operator's own disk. Paths inside it
    must be gitignored. A missing git command fails closed for repo paths.
    """
    text = str(path)
    if "://" in text:
        raise ValueError(f"{what} must be a local filesystem path, not a URL")
    root = _repo_root()
    if root is None:
        return
    resolved = path.resolve()
    try:
        resolved.relative_to(root)
    except ValueError:
        return
    if _is_gitignored(resolved, root):
        return
    raise ValueError(
        f"{what} '{path.name}' is inside the repository and is not gitignored. "
        "Put private clips and labels under data/private_eval/. Do not commit them."
    )


def resolve_fps(raw: float) -> tuple[float, str]:
    """Use a container frame rate only when it is a plausible finite number."""
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        return ASSUMED_FPS, "assumed_30"
    value = float(raw)
    if math.isfinite(value) and MEASURED_FPS_MIN <= value <= MEASURED_FPS_MAX:
        return value, "container"
    return ASSUMED_FPS, "assumed_30"


def index_containing_time(t_seconds: float, fps: float) -> int:
    """Frame whose half-open interval [index/fps, (index+1)/fps) contains t_seconds."""
    index = math.floor((t_seconds * fps) + 1e-6)
    if index < 0:
        raise ValueError("t_seconds must fall on a frame at or after 0")
    return index


def first_index_in_range(start: float, end: float, fps: float) -> int:
    """First frame whose own timestamp falls inside the closed range.

    One sample scores one frame. The other frames in the range are not checked.
    """
    index = math.ceil((start * fps) - 1e-6)
    if index < 0:
        index = 0
    if (index / fps) > end + 1e-6:
        raise ValueError("no frame timestamp falls inside the labeled time range")
    return index


def format_recorded_report(report: dict) -> str:
    meta = report["metadata"]
    if meta["status"] == "skipped":
        return "\n".join([
            "Recorded-video eval  status=skipped  scored=no",
            meta["reason"],
            "lock       skipped",
            RECORDED_HONESTY,
        ])
    summary = report["summary"]
    guidance = summary["guidance"]
    perception = summary["perception"]
    frequency = summary["message_frequency"]
    latency = summary["latency_ms"]
    lines = [
        (
            f"Recorded-video eval  session={meta['session_id']}  detector={meta['detector']}  "
            f"min_confidence={meta['min_confidence']:.2f}  cooldown_s={meta['cooldown_seconds']:.1f}"
        ),
        (
            f"package={meta['package_version']}  design={meta['design_version']}  "
            f"labels_schema={meta['labels_schema_version']}  status=scored"
        ),
        f"yolox: {meta['yolox']['note']}",
        "Exit 0 means the command ran. It does not mean the prototype passed a street test.",
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
            f"frames={summary['frames']}  uncertain_labels={summary['uncertain_labels']}"
        ),
        (
            "latency    "
            f"mean={latency['mean']:.2f} ms  max={latency['max']:.2f} ms  "
            f"frames={latency['frames']}"
        ),
        "           perf_counter around analyze_image + select_guidance; host time, not a pass/fail threshold.",
        f"lock       {report['lock']['mode']}" + ("" if report["lock"]["ok"] else " MISMATCH"),
    ])
    if report["lock"]["mismatches"]:
        lines.extend(f"           {item}" for item in report["lock"]["mismatches"])
    lines.append(RECORDED_HONESTY)
    return "\n".join(lines)


def write_csv_report(report: dict, path: Path) -> None:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "clip_id",
        "sample_id",
        "source_name",
        "media_frame_index",
        "media_t_seconds",
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
        "label_confidence",
        "confidence_note",
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
                    "sample_id": frame["sample_id"],
                    "source_name": frame["source_name"],
                    "media_frame_index": frame["media_frame_index"],
                    "media_t_seconds": frame["media_t_seconds"],
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
                    "label_confidence": frame["label_confidence"],
                    "confidence_note": frame["confidence_note"],
                })


def _score_clip(clip, adapter, *, labels_path: Path, min_confidence: float, cooldown_seconds: float) -> dict:
    kind = clip["media"]["kind"]
    media_path = _resolve_media_path(labels_path, clip["media"]["path"])
    assert_path_is_private(media_path, what=f"{clip['id']} media")
    if media_path.name == PLACEHOLDER_MEDIA or media_path.name == f"{PLACEHOLDER_MEDIA}.mp4":
        raise ValueError(
            f"{clip['id']}: replace {PLACEHOLDER_MEDIA} with a local private clip before scoring"
        )
    loaded = _load_clip_images(clip["id"], kind, media_path, clip["samples"])
    _assert_clock_order(clip["id"], loaded)
    engine = GuidanceEngine(min_confidence=min_confidence, cooldown_seconds=cooldown_seconds)
    frames = []
    time_base = loaded[0]["time_base"]
    fps = loaded[0]["fps"]
    fps_source = loaded[0]["fps_source"]
    for index, item in enumerate(loaded):
        image = item.pop("image")
        started = perf_counter()
        observations = list(adapter.analyze_image(image))
        guidance, chosen = select_guidance(engine, observations, now=item["clock"])
        latency_ms = (perf_counter() - started) * 1000
        del image
        scored = score_labeled_frame(
            index=index,
            t_seconds=item["clock"],
            expect=item["expect"],
            observations=observations,
            guidance=guidance,
            chosen=chosen,
            min_confidence=min_confidence,
            latency_ms=latency_ms,
        )
        scored["sample_id"] = item["sample_id"]
        scored["media_frame_index"] = item["media_frame_index"]
        scored["media_t_seconds"] = item["media_t_seconds"]
        scored["source_name"] = item["source_name"]
        scored["label_confidence"] = item["label_confidence"]
        scored["confidence_note"] = item["confidence_note"]
        scored["locator"] = item["locator"]
        frames.append(scored)
    actionable = sum(frame["guidance"]["actionable"] for frame in frames)
    suppressed = sum(frame["guidance_outcome"] == "suppressed_repeat" for frame in frames)
    latencies = [frame["latency_ms"] for frame in frames]
    return {
        "id": clip["id"],
        "description": clip.get("description", ""),
        "media_kind": kind,
        "media_name": media_path.name,
        "time_base": time_base,
        "fps": fps,
        "fps_source": fps_source,
        "frame_count": len(frames),
        "actionable_messages": actionable,
        "suppressed_repeats": suppressed,
        "latency_ms": {
            "mean": round(sum(latencies) / len(latencies), 3),
            "max": round(max(latencies), 3),
        },
        "frames": frames,
    }


def _load_clip_images(clip_id: str, kind: str, path: Path, samples: list[dict]) -> list[dict]:
    if kind == "stills":
        return _load_stills(clip_id, path, samples)
    if kind == "image":
        return _load_image(clip_id, path, samples)
    if kind == "video":
        return _load_video(clip_id, path, samples)
    raise ValueError(f"{clip_id}: unsupported media kind {kind!r}")


def _load_stills(clip_id: str, path: Path, samples: list[dict]) -> list[dict]:
    if not path.is_dir():
        raise FileNotFoundError(f"{clip_id}: still directory not found ({path.name})")
    files = _list_stills(path)
    if not files:
        raise ValueError(f"{clip_id}: no still images in {path.name}")
    loaded = []
    for sample in samples:
        index = int(sample["frame_index"])
        _guard_short_clip(clip_id, sample["id"], index, fps=1.0)
        if index >= len(files):
            raise ValueError(
                f"{clip_id} sample {sample['id']}: frame_index {index} is outside "
                f"the {len(files)} stills in {path.name}"
            )
        image_path = files[index]
        loaded.append(_sample_payload(
            sample,
            image=_read_image(clip_id, image_path),
            media_frame_index=index,
            media_t_seconds=float(index),
            source_name=image_path.name,
            time_base="frame_index_seconds",
            fps=None,
            fps_source="not_a_video",
        ))
    return loaded


def _load_image(clip_id: str, path: Path, samples: list[dict]) -> list[dict]:
    if not path.is_file():
        raise FileNotFoundError(f"{clip_id}: image not found ({path.name})")
    image = _read_image(clip_id, path)
    loaded = []
    for sample in samples:
        loaded.append(_sample_payload(
            sample,
            image=image,
            media_frame_index=0,
            media_t_seconds=0.0,
            source_name=path.name,
            time_base="single_image",
            fps=None,
            fps_source="not_a_video",
        ))
    return loaded


def _load_video(clip_id: str, path: Path, samples: list[dict]) -> list[dict]:
    if not path.is_file():
        raise FileNotFoundError(f"{clip_id}: video not found ({path.name})")
    from aiglasses.vision import _cv2

    cv2 = _cv2()
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        capture.release()
        raise ValueError(f"{clip_id}: could not read video {path.name}")
    try:
        fps, fps_source = resolve_fps(capture.get(cv2.CAP_PROP_FPS))
        requests = []
        for sample in samples:
            index = _video_index(clip_id, sample, fps)
            _guard_short_clip(clip_id, sample["id"], index, fps=fps)
            requests.append((sample, index))
        needed = {index for _sample, index in requests}
        last = max(needed)
        found: dict[int, object] = {}
        cursor = 0
        while cursor <= last:
            ok, frame = capture.read()
            if not ok:
                break
            if cursor in needed:
                found[cursor] = frame
            cursor += 1
        missing = sorted(needed.difference(found))
        if missing:
            raise ValueError(f"{clip_id}: video {path.name} ended before frame {missing[0]}")
        return [
            _sample_payload(
                sample,
                image=found[index],
                media_frame_index=index,
                media_t_seconds=round(index / fps, 6),
                source_name=path.name,
                time_base="frame_index_over_fps",
                fps=fps,
                fps_source=fps_source,
            )
            for sample, index in requests
        ]
    finally:
        capture.release()


def _video_index(clip_id: str, sample: dict, fps: float) -> int:
    try:
        if sample.get("frame_index") is not None:
            return int(sample["frame_index"])
        if sample.get("t_seconds") is not None:
            return index_containing_time(float(sample["t_seconds"]), fps)
        return first_index_in_range(
            float(sample["t_start_seconds"]),
            float(sample["t_end_seconds"]),
            fps,
        )
    except ValueError as error:
        raise ValueError(f"{clip_id} sample {sample['id']}: {error}") from error


def _sample_payload(
    sample: dict,
    *,
    image,
    media_frame_index: int,
    media_t_seconds: float,
    source_name: str,
    time_base: str,
    fps: float | None,
    fps_source: str,
) -> dict:
    clock = media_t_seconds if sample.get("clock_seconds") is None else float(sample["clock_seconds"])
    return {
        "image": image,
        "sample_id": sample["id"],
        "expect": sample["expect"],
        "clock": clock,
        "media_frame_index": media_frame_index,
        "media_t_seconds": media_t_seconds,
        "source_name": source_name,
        "label_confidence": sample.get("label_confidence", "sure"),
        "confidence_note": sample.get("confidence_note", ""),
        "locator": _locator_echo(sample),
        "time_base": time_base,
        "fps": fps,
        "fps_source": fps_source,
    }


def _locator_echo(sample: dict) -> dict:
    if sample.get("frame_index") is not None:
        return {"frame_index": int(sample["frame_index"])}
    if sample.get("t_seconds") is not None:
        return {"t_seconds": float(sample["t_seconds"])}
    if sample.get("t_start_seconds") is not None:
        return {
            "t_start_seconds": float(sample["t_start_seconds"]),
            "t_end_seconds": float(sample["t_end_seconds"]),
        }
    return {"frame_index": 0}


def _list_stills(directory: Path) -> list[Path]:
    return sorted(
        (
            item for item in directory.iterdir()
            if item.is_file()
            and not item.name.startswith(".")
            and item.suffix.lower() in IMAGE_SUFFIXES
        ),
        key=lambda item: item.name,
    )


def _read_image(clip_id: str, path: Path):
    from aiglasses.vision import _cv2

    image = _cv2().imread(str(path))
    if image is None:
        raise ValueError(f"{clip_id}: could not read image {path.name}")
    return image


def _guard_short_clip(clip_id: str, sample_id: str, index: int, *, fps: float) -> None:
    if index >= MAX_DECODED_FRAMES or (index / fps) > MAX_DURATION_SECONDS + 1e-6:
        raise ValueError(
            f"{clip_id} sample {sample_id}: frame {index} is past the short-clip limit "
            f"of {MAX_DECODED_FRAMES} frames or {MAX_DURATION_SECONDS:.0f} seconds. Trim the clip."
        )


def _assert_clock_order(clip_id: str, loaded: list[dict]) -> None:
    previous = None
    for item in loaded:
        clock = float(item["clock"])
        if previous is not None and clock < previous:
            raise ValueError(
                f"{clip_id}: guidance clock goes backwards at sample {item['sample_id']}. "
                "List samples in time order."
            )
        previous = clock


def _resolve_media_path(labels_path: Path, raw: str) -> Path:
    if raw.strip().startswith("~"):
        raise ValueError("media.path must not use a home shortcut. Use a relative or absolute local path.")
    candidate = Path(raw)
    if candidate.is_absolute():
        return candidate
    return labels_path.parent / candidate


def _validate_sample(clip_id: str, kind: str, index: int, sample, seen: set[str]) -> None:
    where = f"{clip_id} sample {index}"
    if not isinstance(sample, dict):
        raise ValueError(f"{where}: must be an object")
    sample_id = sample.get("id")
    if not isinstance(sample_id, str) or not sample_id.strip() or "\n" in sample_id or "\r" in sample_id:
        raise ValueError(f"{where}: id must be a single-line non-empty string")
    if len(sample_id) > 80 or sample_id in seen:
        raise ValueError(f"{where}: id must be unique in the clip and at most 80 characters")
    seen.add(sample_id)
    where = f"{clip_id} sample {sample_id}"
    locator = _classify_locator(where, sample)
    if kind == "image":
        if locator not in {None, "frame_index"}:
            raise ValueError(f"{where}: a single image does not seek by time. Use clock_seconds for the guidance clock.")
        if locator == "frame_index" and sample["frame_index"] != 0:
            raise ValueError(f"{where}: a single image only has frame_index 0")
    elif kind == "stills":
        if locator != "frame_index":
            raise ValueError(f"{where}: a still sequence is addressed by frame_index")
    elif locator is None:
        raise ValueError(f"{where}: a video sample needs frame_index, t_seconds, or a time range")
    if sample.get("clock_seconds") is not None:
        _finite_number(sample["clock_seconds"], f"{where} clock_seconds", minimum=0)
    label_confidence = sample.get("label_confidence", "sure")
    if label_confidence not in LABEL_CONFIDENCE:
        raise ValueError(f"{where}: label_confidence must be sure or uncertain")
    note = sample.get("confidence_note", "")
    if not isinstance(note, str) or "\n" in note or "\r" in note or len(note) > TEXT_LIMIT:
        raise ValueError(f"{where}: confidence_note must be a single line of at most {TEXT_LIMIT} characters")
    if label_confidence == "uncertain" and not note.strip():
        raise ValueError(f"{where}: an uncertain label needs a confidence_note")
    _validate_expect(where, 0, sample.get("expect"))


def _classify_locator(where: str, sample: dict) -> str | None:
    index_set = sample.get("frame_index") is not None
    time_set = sample.get("t_seconds") is not None
    start_set = sample.get("t_start_seconds") is not None
    end_set = sample.get("t_end_seconds") is not None
    if start_set != end_set:
        raise ValueError(f"{where}: a time range needs both t_start_seconds and t_end_seconds")
    if index_set:
        _whole_number(sample["frame_index"], f"{where} frame_index")
    if time_set:
        _finite_number(sample["t_seconds"], f"{where} t_seconds", minimum=0)
    if start_set:
        _finite_number(sample["t_start_seconds"], f"{where} t_start_seconds", minimum=0)
        _finite_number(sample["t_end_seconds"], f"{where} t_end_seconds", minimum=0)
        if float(sample["t_end_seconds"]) < float(sample["t_start_seconds"]):
            raise ValueError(f"{where}: t_end_seconds is earlier than t_start_seconds")
    chosen = [
        name for name, flag in (
            ("frame_index", index_set),
            ("t_seconds", time_set),
            ("range", start_set),
        ) if flag
    ]
    if len(chosen) > 1:
        raise ValueError(f"{where}: use only one locator (frame_index, t_seconds, or a time range)")
    if not chosen:
        return None
    return chosen[0]


def _validate_consent_shape(consent) -> None:
    if not isinstance(consent, dict):
        raise ValueError("consent must be an object")
    for key in CONSENT_AFFIRMATIONS:
        if not isinstance(consent.get(key), bool):
            raise ValueError(f"consent.{key} must be true or false")
    for key in CONSENT_TEXT:
        _bounded_text(consent.get(key), f"consent.{key}", required=True, limit=TEXT_LIMIT)


def _validate_redaction_shape(redaction) -> None:
    if not isinstance(redaction, dict):
        raise ValueError("redaction must be an object")
    if not isinstance(redaction.get("confirmed"), bool):
        raise ValueError("redaction.confirmed must be true or false")
    for key in REDACTION_ITEMS:
        value = redaction.get(key)
        if value not in REDACTION_VALUES:
            raise ValueError(
                f"redaction.{key} must be 'absent' or 'redacted'. "
                "An unknown or present item is not scored."
            )


def _validate_expected_summary(expected) -> None:
    from .harness import SUMMARY_KEYS

    if not isinstance(expected, dict):
        raise ValueError("expected_summary must be an object")
    missing = [key for key in SUMMARY_KEYS if key not in expected]
    if missing:
        raise ValueError("expected_summary is missing " + ", ".join(missing))
    for key in SUMMARY_KEYS:
        value = expected[key]
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise ValueError(f"expected_summary.{key} must be a non-negative integer")


def _base_metadata(*, status: str, reason: str) -> dict:
    return {
        "schema": REPORT_SCHEMA,
        "schema_version": SCHEMA_VERSION,
        "labels_schema": LABELS_SCHEMA,
        "labels_schema_version": SCHEMA_VERSION,
        "status": status,
        "scored": status == "scored",
        "reason": reason,
        "command": "python -m aiglasses.eval.recorded",
        "honesty": RECORDED_HONESTY,
        "package_name": "ai-glasses-navigation-prototype",
        "package_version": _package_version(),
        "design_version": _design_version(),
        "python": platform.python_version(),
    }


def _scored_metadata(manifest: dict, min_confidence: float, cooldown_seconds: float, labels: Path) -> dict:
    from aiglasses.vision import default_weights_path

    defaults = GuidanceEngine()
    weights = default_weights_path()
    weights_present = weights.is_file()
    if weights_present:
        yolox_note = (
            "Skipped. A weights file is present, but recorded-video eval does not load it "
            "and has no YOLOX labels. CI does not download weights."
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
        "session_id": manifest["session_id"],
        "labels_name": Path(labels).name,
        "detector": "heuristic",
        "min_confidence": min_confidence,
        "cooldown_seconds": cooldown_seconds,
        "guidance_engine_defaults": {
            "min_confidence": defaults.min_confidence,
            "cooldown_seconds": defaults.cooldown_seconds,
        },
        "thresholds_match_engine_defaults": (
            min_confidence == defaults.min_confidence and cooldown_seconds == defaults.cooldown_seconds
        ),
        "latency_method": RECORDED_LATENCY,
        "consent_attested": {key: manifest["consent"][key] is True for key in CONSENT_AFFIRMATIONS},
        "redaction_attested": {key: manifest["redaction"][key] for key in (*REDACTION_ITEMS, "confirmed")},
        "opencv": opencv_version,
        "yolox": {"scored": False, "weights_present": weights_present, "loaded": False, "note": yolox_note},
        "distance": "not invented; obstacle distance_m stays empty on this path",
    }


def _repo_root() -> Path | None:
    start = Path(__file__).resolve()
    for candidate in (start, *start.parents):
        if (candidate / ".git").exists():
            return candidate
    return None


def _is_gitignored(path: Path, root: Path) -> bool:
    completed = subprocess.run(
        ["git", "check-ignore", "-q", "--", str(path)],
        cwd=root,
        capture_output=True,
        check=False,
    )
    return completed.returncode == 0


def _bounded_text(value, name: str, *, required: bool, limit: int) -> None:
    if not isinstance(value, str) or "\n" in value or "\r" in value or len(value) > limit:
        raise ValueError(f"{name} must be a single line of at most {limit} characters")
    if required and not value.strip():
        raise ValueError(f"{name} must not be empty")


def _optional_text(value, name: str) -> None:
    if value is None:
        return
    if not isinstance(value, str) or "\n" in value or "\r" in value or len(value) > TEXT_LIMIT:
        raise ValueError(f"{name} must be a single line of at most {TEXT_LIMIT} characters")


def _finite_number(value, name: str, *, minimum: float) -> None:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(float(value)):
        raise ValueError(f"{name} must be a finite number")
    if float(value) < minimum:
        raise ValueError(f"{name} is out of range")


def _whole_number(value, name: str) -> None:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(f"{name} must be a non-negative integer")


if __name__ == "__main__":
    raise SystemExit(main())
