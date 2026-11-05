"""Command line for the synthetic perception eval.

    python -m aiglasses.eval
    python -m aiglasses.eval --output demo_output/perception_eval.json --csv demo_output/perception_eval.csv
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from aiglasses.vision import VisionDependencyError

from .harness import format_report, load_manifest, run_eval, write_csv_report, write_json_report


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Score the lamp heuristic through GuidanceEngine on generated, labeled frames. "
            "Research prototype only: not a certified navigation aid and not street validation."
        )
    )
    parser.add_argument(
        "--fixture",
        type=Path,
        help="Labels JSON. Defaults to the packaged perception_v1 fixture.",
    )
    parser.add_argument("--output", type=Path, help="Write the JSON report to this path.")
    parser.add_argument("--csv", type=Path, help="Write one CSV row per frame to this path.")
    parser.add_argument(
        "--no-strict",
        action="store_true",
        help="Exit 0 even when the locked totals do not match. The default exit is 1 on a mismatch.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    print(
        "Research prototype. Not a certified navigation aid. "
        "Synthetic frames only; this command does not measure street performance.",
        file=sys.stderr,
    )
    try:
        manifest = load_manifest(args.fixture)
        report = run_eval(manifest=manifest)
    except VisionDependencyError as error:
        print(error, file=sys.stderr)
        return 2
    except (OSError, ValueError, FileNotFoundError) as error:
        print(error, file=sys.stderr)
        return 1
    print(format_report(report))
    if args.output is not None:
        write_json_report(report, args.output)
        print(f"wrote {args.output}", file=sys.stderr)
    if args.csv is not None:
        write_csv_report(report, args.csv)
        print(f"wrote {args.csv}", file=sys.stderr)
    if report["lock"]["ok"] or args.no_strict:
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
