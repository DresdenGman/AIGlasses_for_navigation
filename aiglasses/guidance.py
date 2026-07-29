from __future__ import annotations

from dataclasses import dataclass
from time import monotonic


@dataclass(frozen=True)
class Observation:
    kind: str
    confidence: float
    distance_m: float | None = None
    light_state: str | None = None
    label: str | None = None


@dataclass(frozen=True)
class Guidance:
    level: str
    message: str
    actionable: bool


class GuidanceEngine:
    """Conservative rules for the prototype. It never treats weak vision as fact."""

    def __init__(self, min_confidence: float = 0.70, cooldown_seconds: float = 3.0) -> None:
        self.min_confidence = min_confidence
        self.cooldown_seconds = cooldown_seconds
        self._last_spoken: dict[str, float] = {}

    def assess(self, observation: Observation, now: float | None = None) -> Guidance:
        now = monotonic() if now is None else now
        if not 0 <= observation.confidence <= 1:
            return Guidance("status", "识别结果无效，已忽略。", False)
        if observation.confidence < self.min_confidence:
            return Guidance("status", "前方情况不确定，请谨慎确认。", False)

        if observation.kind == "traffic_light":
            if observation.light_state == "red":
                return self._emit("traffic_red", "urgent", "红灯，请停下等待。", now)
            if observation.light_state == "green":
                return self._emit("traffic_green", "navigation", "检测到绿灯，请先确认周围车辆后通行。", now)
            return Guidance("status", "红绿灯状态不确定，请等待确认。", False)

        if observation.kind == "obstacle":
            if observation.distance_m is not None and observation.distance_m <= 1.5:
                name = observation.label or "障碍物"
                return self._emit("near_obstacle", "urgent", f"前方近距离有{name}，请减速并注意避让。", now)
            return self._emit("far_obstacle", "navigation", "前方检测到障碍物，请留意道路。", now)

        if observation.kind == "crosswalk":
            return self._emit("crosswalk", "navigation", "检测到人行横道，请保持方向并确认信号灯。", now)
        return Guidance("status", "已收到观察结果，但尚未配置对应的安全提示。", False)

    def _emit(self, key: str, level: str, message: str, now: float) -> Guidance:
        previous = self._last_spoken.get(key)
        if previous is not None and now - previous < self.cooldown_seconds:
            return Guidance("status", "相同提示已抑制。", False)
        self._last_spoken[key] = now
        return Guidance(level, message, True)
