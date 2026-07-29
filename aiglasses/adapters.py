"""Boundary contracts for future cameras and vision models.

The guidance layer deliberately receives plain observations rather than SDK
objects, so ESP32, a webcam, or an offline video replay can use the same rules.
"""

from __future__ import annotations

from collections.abc import Iterable
from typing import Protocol

from .guidance import Observation


class ObservationSource(Protocol):
    def observations(self) -> Iterable[Observation]:
        """Yield normalized observations in capture order."""


class VisionAdapter(Protocol):
    def analyze(self, frame: bytes) -> Iterable[Observation]:
        """Convert one camera frame into confidence-scored observations."""
