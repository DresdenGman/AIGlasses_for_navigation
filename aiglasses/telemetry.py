from __future__ import annotations

from collections import deque
from dataclasses import asdict, dataclass
from datetime import UTC, datetime

from .guidance import Guidance, Observation


@dataclass(frozen=True)
class GuidanceEvent:
    timestamp: str
    kind: str
    confidence: float
    level: str
    actionable: bool
    message: str


class EventLog:
    """Bounded, in-memory audit log. Deliberately stores no frames or audio."""

    def __init__(self, max_events: int = 100) -> None:
        self._events: deque[GuidanceEvent] = deque(maxlen=max_events)

    def record(self, observation: Observation, guidance: Guidance) -> GuidanceEvent:
        event = GuidanceEvent(
            timestamp=datetime.now(UTC).isoformat(),
            kind=observation.kind,
            confidence=observation.confidence,
            level=guidance.level,
            actionable=guidance.actionable,
            message=guidance.message,
        )
        self._events.append(event)
        return event

    def recent(self, limit: int = 20) -> list[dict]:
        return [asdict(event) for event in list(self._events)[-limit:]][::-1]
