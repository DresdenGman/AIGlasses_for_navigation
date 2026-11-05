"""Boundary contracts between capture, perception, guidance, and speech.

The guidance layer receives plain observations rather than camera-SDK objects,
so a webcam, a video file, a replay log, or a future ESP32 can share one set
of rules. Concrete vision and speech implementations live in ``vision`` and
``speech``.
"""

from __future__ import annotations

from collections.abc import Iterable
from typing import Protocol, runtime_checkable

from .guidance import Observation


@runtime_checkable
class ObservationSource(Protocol):
    def observations(self) -> Iterable[Observation]:
        """Yield normalized observations in capture order."""


@runtime_checkable
class VisionAdapter(Protocol):
    def analyze(self, frame: bytes) -> Iterable[Observation]:
        """Convert one encoded camera frame into confidence-scored observations."""


@runtime_checkable
class SpeechSink(Protocol):
    def speak(self, text: str) -> None:
        """Speak one sentence the guidance engine already produced."""
