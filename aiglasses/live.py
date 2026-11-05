"""Run a webcam, video file, still image, or built-in lamp sequence.

This is a research prototype. It is not a certified navigation aid.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from time import monotonic

from .config import load_settings
from .pipeline import iter_guidance
from .speech import SpeechDependencyError, resolve_speech

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def _require_cv2():
    from .vision import VisionDependencyError, _cv2

    try:
        return _cv2()
    except VisionDependencyError as error:
        raise RuntimeError(str(error)) from error


def iterate_source(source: str, *, stride: int = 1, max_frames: int = 0):
    if stride < 1:
        raise ValueError("stride must be at least 1")
    if source.isdigit():
        yield from _capture_frames(int(source), stride=stride, max_frames=max_frames)
        return
    path = Path(source)
    if not path.is_file():
        raise FileNotFoundError(
            f"No image or video at {source}. Use --synthetic, a webcam index such as 0, or a real file path."
        )
    if path.suffix.lower() in IMAGE_SUFFIXES:
        yield _read_image(path)
        return
    yield from _capture_frames(str(path), stride=stride, max_frames=max_frames)


def _read_image(path: Path):
    image = _require_cv2().imread(str(path))
    if image is None:
        raise RuntimeError(f"Could not read image {path}")
    return image


def _capture_frames(source, *, stride: int, max_frames: int):
    capture = _require_cv2().VideoCapture(source)
    if not capture.isOpened():
        capture.release()
        if isinstance(source, int):
            raise RuntimeError(
                f"Could not open camera {source}. Check that a webcam is connected, "
                "or run --synthetic or --source path/to/video.mp4."
            )
        raise RuntimeError(f"Could not read video {source}.")
    produced = 0
    index = 0
    try:
        while max_frames <= 0 or produced < max_frames:
            ok, frame = capture.read()
            if not ok:
                break
            if index % stride == 0:
                yield frame
                produced += 1
            index += 1
    finally:
        capture.release()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Read a laptop camera, video, or still image and print guidance. "
            "Research prototype only: not a certified navigation aid."
        )
    )
    parser.add_argument("--source", help="Webcam index (0), an image path, or a video path")
    parser.add_argument(
        "--synthetic",
        action="store_true",
        help="Run built-in lamp images instead of a camera. No weights required.",
    )
    parser.add_argument("--detector", choices=("heuristic", "yolox", "auto"))
    parser.add_argument("--weights", type=Path, help="Optional YOLOX ONNX file")
    parser.add_argument("--tts", choices=("none", "edge", "pyttsx3"))
    parser.add_argument("--voice", help="Voice name for edge-tts, such as zh-CN-XiaoxiaoNeural")
    parser.add_argument("--max-frames", type=int, default=0, help="Stop after this many processed frames. 0 runs until the source ends.")
    parser.add_argument("--stride", type=int, default=8, help="Process every Nth captured frame. Ignored for a still image.")
    parser.add_argument("--min-confidence", type=float, default=0.70)
    parser.add_argument("--cooldown", type=float, default=3.0)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.synthetic and not args.source:
        parser.error("Pass --source or --synthetic")
    try:
        settings = load_settings()
    except ValueError as error:
        print(error, file=sys.stderr)
        return 2
    detector = args.detector or settings.vision_detector
    tts_name = args.tts or settings.tts
    weights = args.weights or (Path(settings.vision_weights) if settings.vision_weights else None)
    try:
        speech = resolve_speech(tts_name, voice=args.voice)
    except (SpeechDependencyError, ValueError) as error:
        print(error, file=sys.stderr)
        return 2
    print(
        "Research prototype. Not a certified navigation aid. "
        "Low-confidence results stay non-actionable, and this path does not measure distance.",
        file=sys.stderr,
    )
    try:
        if args.synthetic:
            from .vision import LocalVisionAdapter, synthetic_demo_frames

            frames = synthetic_demo_frames()
            adapter = LocalVisionAdapter("heuristic")
        else:
            from .vision import LocalVisionAdapter

            frames = iterate_source(args.source, stride=args.stride, max_frames=args.max_frames)
            adapter = LocalVisionAdapter(detector, weights)
        rows = iter_guidance(
            adapter,
            frames,
            speech=speech,
            time_source=monotonic,
            min_confidence=args.min_confidence,
            cooldown_seconds=args.cooldown,
        )
        for row in rows:
            print(json.dumps(row, ensure_ascii=False), flush=True)
    except KeyboardInterrupt:
        return 0
    except (FileNotFoundError, RuntimeError, ValueError) as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
