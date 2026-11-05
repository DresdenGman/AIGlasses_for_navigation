from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import Settings
from .guidance import GuidanceEngine, Observation
from .pipeline import analyze_frame, observation_to_dict
from .telemetry import EventLog
from .ratelimit import SlidingWindowRateLimiter
from .vision import VisionDependencyError, default_weights_path, opencv_available

MAX_FRAME_BYTES = 5_000_000
FRAME_TYPES = {"image/jpeg", "image/png", "image/webp", "application/octet-stream"}


class ObservationPayload(BaseModel):
    kind: str = Field(pattern="^(traffic_light|obstacle|crosswalk)$")
    confidence: float = Field(ge=0, le=1)
    distance_m: float | None = Field(default=None, ge=0)
    light_state: str | None = Field(default=None, pattern="^(red|green|unknown)$")
    label: str | None = Field(default=None, max_length=80)


def create_app(settings: Settings) -> FastAPI:
    app = FastAPI(title="AI Glasses Prototype", version="0.1.0")
    engine = GuidanceEngine()
    events = EventLog()
    device_limiter = SlidingWindowRateLimiter(settings.device_max_requests_per_minute)
    static_dir = Path(__file__).resolve().parent.parent / "static"
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/", include_in_schema=False)
    def root() -> FileResponse:
        return FileResponse(static_dir / "index.html")

    @app.get("/api/health")
    def health() -> dict:
        weights = Path(settings.vision_weights) if settings.vision_weights else default_weights_path()
        return {
            "status": "ok",
            "mode": settings.mode,
            "cloud_voice_enabled": settings.cloud_voice_enabled,
            "hardware_required": settings.mode == "hardware",
            "vision_backend": "opencv" if opencv_available() else "unavailable",
            "vision_detector": settings.vision_detector,
            "vision_weights_present": weights.is_file(),
            "tts": settings.tts,
            "certified_navigation_aid": False,
        }

    @app.get("/api/demo/scenarios")
    def demo_scenarios() -> list[dict]:
        return [
            {"kind": "traffic_light", "confidence": 0.96, "light_state": "red"},
            {"kind": "obstacle", "confidence": 0.89, "distance_m": 1.1, "label": "路障"},
            {"kind": "crosswalk", "confidence": 0.85},
        ]

    @app.post("/api/vision/frame")
    async def vision_frame(request: Request) -> dict:
        content_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
        if content_type not in FRAME_TYPES:
            raise HTTPException(status_code=415, detail="Send one image/jpeg or image/png frame")
        payload = await request.body()
        if not payload:
            raise HTTPException(status_code=400, detail="Empty frame")
        if len(payload) > MAX_FRAME_BYTES:
            raise HTTPException(status_code=413, detail="Frame exceeds 5 MB")
        try:
            result = analyze_frame(
                payload,
                engine,
                detector=settings.vision_detector,
                weights=settings.vision_weights,
            )
        except VisionDependencyError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        event = None
        if result.observation is not None:
            event = events.record(result.observation, result.guidance).__dict__
        return {
            "level": result.guidance.level,
            "message": result.guidance.message,
            "actionable": result.guidance.actionable,
            "observations": [observation_to_dict(item) for item in result.observations],
            "event": event,
            "notice": "研究原型，不是经过认证的导航辅助。低置信度不会变成行动指令。",
        }

    @app.post("/api/observations")
    def observe(payload: ObservationPayload) -> dict:
        observation = Observation(**payload.model_dump())
        guidance = engine.assess(observation)
        return {**guidance.__dict__, "event": events.record(observation, guidance).__dict__}

    @app.post("/api/device/observations")
    def device_observe(
        payload: ObservationPayload,
        x_device_token: str | None = Header(default=None),
        x_device_id: str | None = Header(default=None, min_length=3, max_length=64),
    ) -> dict:
        if settings.mode != "hardware":
            raise HTTPException(status_code=403, detail="Device ingestion is disabled in demo mode")
        if not settings.device_ingest_token or x_device_token != settings.device_ingest_token:
            raise HTTPException(status_code=401, detail="Invalid device token")
        if not x_device_id:
            raise HTTPException(status_code=400, detail="Missing device identifier")
        if not device_limiter.allow(x_device_id):
            raise HTTPException(status_code=429, detail="Device observation rate limit exceeded")
        observation = Observation(**payload.model_dump())
        guidance = engine.assess(observation)
        return {**guidance.__dict__, "event": events.record(observation, guidance).__dict__}

    @app.get("/api/events")
    def recent_events(limit: int = Query(default=20, ge=1, le=100)) -> list[dict]:
        return events.recent(limit)

    @app.websocket("/ws/observations")
    async def observation_socket(ws: WebSocket) -> None:
        await ws.accept()
        try:
            while True:
                payload = ObservationPayload.model_validate(await ws.receive_json())
                observation = Observation(**payload.model_dump())
                guidance = engine.assess(observation)
                await ws.send_json({**guidance.__dict__, "event": events.record(observation, guidance).__dict__})
        except WebSocketDisconnect:
            return

    return app
