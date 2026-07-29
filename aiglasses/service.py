from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import Settings
from .guidance import GuidanceEngine, Observation
from .telemetry import EventLog


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
    static_dir = Path(__file__).resolve().parent.parent / "static"
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/", include_in_schema=False)
    def root() -> FileResponse:
        return FileResponse(static_dir / "index.html")

    @app.get("/api/health")
    def health() -> dict:
        return {
            "status": "ok",
            "mode": settings.mode,
            "cloud_voice_enabled": settings.cloud_voice_enabled,
            "hardware_required": settings.mode == "hardware",
        }

    @app.get("/api/demo/scenarios")
    def demo_scenarios() -> list[dict]:
        return [
            {"kind": "traffic_light", "confidence": 0.96, "light_state": "red"},
            {"kind": "obstacle", "confidence": 0.89, "distance_m": 1.1, "label": "路障"},
            {"kind": "crosswalk", "confidence": 0.85},
        ]

    @app.post("/api/observations")
    def observe(payload: ObservationPayload) -> dict:
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
