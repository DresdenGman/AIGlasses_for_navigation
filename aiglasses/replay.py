from __future__ import annotations

import argparse
import json
from pathlib import Path

from .guidance import GuidanceEngine, Observation


def replay_events(path: Path, engine: GuidanceEngine | None = None) -> list[dict]:
    """Replay newline-delimited observations without any camera or hardware."""
    engine = engine or GuidanceEngine(cooldown_seconds=0)
    outputs: list[dict] = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            observation = Observation(**json.loads(line))
        except (TypeError, json.JSONDecodeError) as error:
            raise ValueError(f"Invalid event on line {number}") from error
        outputs.append({"line": number, **engine.assess(observation).__dict__})
    return outputs


def main() -> None:
    parser = argparse.ArgumentParser(description="Replay AI Glasses observations from JSONL.")
    parser.add_argument("events", type=Path, help="Path to a JSONL observation file")
    args = parser.parse_args()
    print(json.dumps(replay_events(args.events), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
