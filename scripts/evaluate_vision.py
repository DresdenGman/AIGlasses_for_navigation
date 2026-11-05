#!/usr/bin/env python3
"""Measure the laptop camera traffic-light path against labeled road frames.

Two fixed protocols, run exactly as written here. Nothing is tuned to the
data: the detector under test is the production heuristic adapter, used with
its default settings, and every labeled frame is scored.

Protocol A (full-frame, end to end): each frame runs through
``LocalVisionAdapter(detector="heuristic")``. The reference state of a frame
is the state of its largest labeled box. A frame whose labeled boxes do not
all agree on one state is "mixed": it is counted and its predictions are
listed, but it is excluded from headline accuracy. Frames with a red or green
reference are scored correct / wrong-state / abstained (no traffic-light
observation, or an observation whose state is unknown). Yellow and off
references are reported separately: the heuristic has no yellow state by
design, so an abstention is the expected outcome there.

Protocol B (crop classification): every labeled box at least 20x20 pixels is
cropped from its frame and passed to ``classify_lamp_colors``. Predictions
are tabulated against the box state in a confusion matrix over
{red, green, yellow} x {red, green, unknown}.

Usage:
    python scripts/evaluate_vision.py --data /path/to/bosch_additional \
        --out evaluation_results.json

The label parser below targets the Bosch Small Traffic Lights "additional"
annotation file (additional_train.yaml). It is the only dataset-specific
code in this script.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

import cv2

from aiglasses.vision import LocalVisionAdapter, classify_lamp_colors

MIN_CROP_SIDE = 20

_BOX_RE = re.compile(
    r"\{label:\s*'?([A-Za-z]+)'?,\s*occluded:\s*\w+,\s*"
    r"x_max:\s*(-?[\d.]+),\s*x_min:\s*(-?[\d.]+),\s*"
    r"y_max:\s*(-?[\d.]+),\s*y_min:\s*(-?[\d.]+)\}",
    re.DOTALL,
)
_PATH_RE = re.compile(r"path:\s*(\S+)")


def label_state(label: str) -> str:
    """Map a dataset label onto the state vocabulary used in the report."""
    if label.startswith("Red"):
        return "red"
    if label.startswith("Green"):
        return "green"
    if label.startswith("Yellow"):
        return "yellow"
    if label == "off":
        return "off"
    return "other"


def load_labeled_frames(data_dir: Path, label_file: Path) -> list[dict]:
    """Parse the Bosch additional-split YAML without a YAML dependency.

    The file is a flat list of records; each record has one ``path:`` line
    and zero or more flow-style box dicts. Returns one entry per record:
    ``{"path": Path, "boxes": [{"state", "x_min", "y_min", "x_max", "y_max"}]}``.
    """
    text = label_file.read_text(encoding="utf-8")
    frames: list[dict] = []
    for record in re.split(r"(?m)^- boxes", text)[1:]:
        path_match = _PATH_RE.search(record)
        if path_match is None:
            continue
        rel = path_match.group(1)
        if rel.startswith("./"):
            rel = rel[2:]
        boxes = []
        for m in _BOX_RE.finditer(record):
            label, x_max, x_min, y_max, y_min = m.groups()
            boxes.append(
                {
                    "label": label,
                    "state": label_state(label),
                    "x_min": float(x_min),
                    "y_min": float(y_min),
                    "x_max": float(x_max),
                    "y_max": float(y_max),
                }
            )
        frames.append({"path": data_dir / rel, "boxes": boxes})
    frames.sort(key=lambda f: str(f["path"]))
    return frames


def predicted_light_state(observations) -> str:
    """Reduce an observation list to one predicted state for protocol A."""
    state = "none"
    for obs in observations:
        if obs.kind == "traffic_light":
            state = obs.light_state or "unknown"
    return state


def run_protocol_a(adapter, frames, images) -> dict:
    red_green = {"n": 0, "correct": 0, "wrong_state": 0, "abstained": 0}
    per_class = {
        s: {"n": 0, "correct": 0, "wrong_state": 0, "abstained": 0}
        for s in ("red", "green")
    }
    separate: dict[str, Counter] = {
        name: Counter()
        for name in ("yellow", "off", "mixed", "no_labeled_light")
    }
    safety = {"red_frames_predicted_green": 0, "green_frames_predicted_red": 0}
    errors = 0

    for frame in frames:
        image = images.get(str(frame["path"]))
        if image is None:
            errors += 1
            continue
        try:
            prediction = predicted_light_state(adapter.analyze_image(image))
        except Exception:  # pipeline error on this frame; counted, not hidden
            errors += 1
            continue

        boxes = frame["boxes"]
        if not boxes:
            separate["no_labeled_light"][prediction] += 1
            continue
        states = {b["state"] for b in boxes}
        if len(states) > 1:
            separate["mixed"][prediction] += 1
            continue
        reference = next(iter(states))
        if reference in ("yellow", "off"):
            separate[reference][prediction] += 1
            continue
        if reference not in per_class:
            separate["mixed"][prediction] += 1
            continue

        bucket = per_class[reference]
        bucket["n"] += 1
        red_green["n"] += 1
        if prediction in ("none", "unknown"):
            bucket["abstained"] += 1
            red_green["abstained"] += 1
        elif prediction == reference:
            bucket["correct"] += 1
            red_green["correct"] += 1
        else:
            bucket["wrong_state"] += 1
            red_green["wrong_state"] += 1
            if reference == "red" and prediction == "green":
                safety["red_frames_predicted_green"] += 1
            if reference == "green" and prediction == "red":
                safety["green_frames_predicted_red"] += 1

    decided = red_green["correct"] + red_green["wrong_state"]
    result = {
        "reference_frames_red_green": red_green,
        "per_class": per_class,
        "coverage": (decided / red_green["n"]) if red_green["n"] else None,
        "accuracy_on_non_abstained": (
            red_green["correct"] / decided if decided else None
        ),
        "safety_critical": safety,
        "separate_groups": {
            name: {"frames": sum(counter.values()), "predictions": dict(counter)}
            for name, counter in separate.items()
        },
        "errors": errors,
    }
    return result


def run_protocol_b(frames, images) -> dict:
    confusion: dict[str, Counter] = {s: Counter() for s in ("red", "green", "yellow")}
    off_predictions: Counter = Counter()
    evaluated = 0
    skipped_small = 0
    errors = 0

    for frame in frames:
        image = images.get(str(frame["path"]))
        for box in frame["boxes"]:
            width = box["x_max"] - box["x_min"]
            height = box["y_max"] - box["y_min"]
            if width < MIN_CROP_SIDE or height < MIN_CROP_SIDE:
                skipped_small += 1
                continue
            if image is None:
                errors += 1
                continue
            x0 = max(0, int(box["x_min"]))
            y0 = max(0, int(box["y_min"]))
            x1 = min(image.shape[1], int(round(box["x_max"])))
            y1 = min(image.shape[0], int(round(box["y_max"])))
            crop = image[y0:y1, x0:x1]
            if crop.size == 0:
                errors += 1
                continue
            try:
                state, _confidence = classify_lamp_colors(crop)
            except Exception:  # classifier error on this crop; counted
                errors += 1
                continue
            predicted = state if state in ("red", "green") else "unknown"
            evaluated += 1
            if box["state"] in confusion:
                confusion[box["state"]][predicted] += 1
            elif box["state"] == "off":
                off_predictions[predicted] += 1

    matrix = {state: dict(counter) for state, counter in confusion.items()}
    per_class_accuracy = {}
    total_correct = 0
    total_rows = 0
    for state, counter in confusion.items():
        n = sum(counter.values())
        total_rows += n
        total_correct += counter.get(state, 0)
        per_class_accuracy[state] = (counter.get(state, 0) / n) if n else None
    return {
        "min_box_side_px": MIN_CROP_SIDE,
        "boxes_evaluated_red_green_yellow": total_rows,
        "confusion_matrix": matrix,
        "per_class_accuracy": per_class_accuracy,
        "overall_accuracy": (total_correct / total_rows) if total_rows else None,
        "off_state_boxes_evaluated": sum(off_predictions.values()),
        "off_state_predictions": dict(off_predictions),
        "boxes_skipped_smaller_than_min_side": skipped_small,
        "errors": errors,
        "_crops_seen": evaluated,
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", required=True, type=Path,
                        help="Dataset directory (contains the label file and rgb/)")
    parser.add_argument("--labels", type=Path, default=None,
                        help="Annotation file (default: <data>/additional_train.yaml)")
    parser.add_argument("--out", required=True, type=Path,
                        help="Where to write the results JSON")
    args = parser.parse_args(argv)

    label_file = args.labels or (args.data / "additional_train.yaml")
    frames = load_labeled_frames(args.data, label_file)

    images: dict[str, object] = {}
    unreadable = 0
    for frame in frames:
        image = cv2.imread(str(frame["path"]))
        if image is None:
            unreadable += 1
        images[str(frame["path"])] = image

    label_counts = Counter(
        box["label"] for frame in frames for box in frame["boxes"]
    )
    state_counts = Counter(
        box["state"] for frame in frames for box in frame["boxes"]
    )

    adapter = LocalVisionAdapter(detector="heuristic")
    protocol_a = run_protocol_a(adapter, frames, images)
    protocol_b = run_protocol_b(frames, images)
    protocol_b.pop("_crops_seen", None)

    results = {
        "dataset": {
            "name": "Bosch Small Traffic Lights Dataset, additional split",
            "label_file": label_file.name,
            "frames_labeled": len(frames),
            "frames_unreadable": unreadable,
            "boxes_total": sum(label_counts.values()),
            "box_label_counts": dict(label_counts),
            "box_state_counts": dict(state_counts),
        },
        "protocol_a_full_frame": protocol_a,
        "protocol_b_crop_classification": protocol_b,
    }
    args.out.write_text(json.dumps(results, indent=2, sort_keys=True) + "\n",
                        encoding="utf-8")

    a = protocol_a
    rg = a["reference_frames_red_green"]
    print(f"Frames scored: {len(frames)} ({unreadable} unreadable)")
    print(
        "Protocol A (red/green reference frames): "
        f"n={rg['n']} correct={rg['correct']} wrong_state={rg['wrong_state']} "
        f"abstained={rg['abstained']}"
    )
    print(
        f"  coverage={a['coverage']:.3f} "
        f"accuracy_on_non_abstained={a['accuracy_on_non_abstained']:.3f}"
    )
    print(
        "  safety-critical: "
        f"red->green={a['safety_critical']['red_frames_predicted_green']} "
        f"green->red={a['safety_critical']['green_frames_predicted_red']}"
    )
    b = protocol_b
    print(
        "Protocol B (crops >= "
        f"{b['min_box_side_px']}px): n={b['boxes_evaluated_red_green_yellow']} "
        f"overall_accuracy={b['overall_accuracy']:.3f} "
        f"per_class={ {k: (round(v, 3) if v is not None else None) for k, v in b['per_class_accuracy'].items()} }"
    )
    print(f"Wrote {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
