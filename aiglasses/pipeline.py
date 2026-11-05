"""Connect observations to GuidanceEngine and optional speech.

Selection prefers an actionable urgent result over a milder one. It does not
rewrite messages: low confidence, unknown signals, and green lights stay
whatever the engine already returns.
"""

from __future__ import annotations

from dataclasses import dataclass
from time import monotonic

from .guidance import Guidance, GuidanceEngine, Observation
from .speech import SilentSpeech, utterance_for

NO_OBSERVATION = Guidance(
    "status",
    "这一帧没有形成可用观察，请谨慎确认周围环境。",
    False,
)


@dataclass(frozen=True)
class FrameResult:
    guidance: Guidance
    observation: Observation | None
    observations: list[Observation]


def observation_to_dict(observation: Observation) -> dict:
    return {
        "kind": observation.kind,
        "confidence": observation.confidence,
        "distance_m": observation.distance_m,
        "light_state": observation.light_state,
        "label": observation.label,
    }


def select_guidance(
    engine: GuidanceEngine,
    observations: list[Observation],
    now: float | None = None,
) -> tuple[Guidance, Observation | None]:
    if not observations:
        return NO_OBSERVATION, None
    moment = monotonic() if now is None else now
    ranked = sorted(observations, key=lambda item: item.confidence, reverse=True)
    assessed = [(item, engine.assess(item, now=moment)) for item in ranked]

    def sort_key(pair: tuple[Observation, Guidance]) -> tuple[int, float]:
        item, guidance = pair
        if guidance.actionable and guidance.level == "urgent":
            band = 0
        elif guidance.actionable:
            band = 1
        else:
            band = 2
        return (band, -item.confidence)

    chosen, guidance = min(assessed, key=sort_key)
    return guidance, chosen


def analyze_frame(
    frame: bytes,
    engine: GuidanceEngine,
    *,
    detector: str = "heuristic",
    weights: str | None = None,
    now: float | None = None,
) -> FrameResult:
    from .vision import build_adapter

    observations = list(build_adapter(detector, weights).analyze(frame))
    guidance, chosen = select_guidance(engine, observations, now=now)
    return FrameResult(guidance, chosen, observations)


class FrameObservationSource:
    """Yield every observation from a sequence of decoded frames."""

    def __init__(self, frames, adapter) -> None:
        self.frames = frames
        self.adapter = adapter

    def observations(self):
        for frame in self.frames:
            yield from self.adapter.analyze_image(frame)


def iter_guidance(
    adapter,
    frames,
    *,
    engine: GuidanceEngine | None = None,
    speech=None,
    clock: list[float] | None = None,
    time_source=None,
    min_confidence: float = 0.70,
    cooldown_seconds: float = 3.0,
):
    """Assess each frame as it arrives and optionally speak the sentence.

    ``clock`` is a per-frame timestamp in the same units as the engine cooldown.
    The command-line tool passes wall-clock time. Tests pass an explicit clock.
    The same uncertainty sentence is not spoken again inside the cooldown;
    the engine's own repeat suppression is left unchanged.
    """
    engine = engine or GuidanceEngine(min_confidence=min_confidence, cooldown_seconds=cooldown_seconds)
    speech = speech if speech is not None else SilentSpeech()
    last_text: str | None = None
    last_at: float | None = None
    for index, frame in enumerate(frames):
        if clock is not None:
            now = float(clock[index])
        elif time_source is not None:
            now = float(time_source())
        else:
            now = float(index)
        observations = list(adapter.analyze_image(frame))
        guidance, _chosen = select_guidance(engine, observations, now=now)
        text = utterance_for(guidance)
        spoken = False
        if text is not None and getattr(speech, "enabled", True):
            repeat = last_text == text and last_at is not None and (now - last_at) < engine.cooldown_seconds
            if not repeat:
                speech.speak(text)
                spoken = True
                last_text = text
                last_at = now
        yield {
            "frame": index,
            "observations": [observation_to_dict(item) for item in observations],
            "level": guidance.level,
            "message": guidance.message,
            "actionable": guidance.actionable,
            "spoken": spoken,
        }


def run_frames(
    adapter,
    frames,
    *,
    engine: GuidanceEngine | None = None,
    speech=None,
    clock: list[float] | None = None,
    time_source=None,
    min_confidence: float = 0.70,
    cooldown_seconds: float = 3.0,
) -> list[dict]:
    return list(iter_guidance(
        adapter,
        frames,
        engine=engine,
        speech=speech,
        clock=clock,
        time_source=time_source,
        min_confidence=min_confidence,
        cooldown_seconds=cooldown_seconds,
    ))
