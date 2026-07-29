from __future__ import annotations

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from .config import Settings
from .guidance import GuidanceEngine, Observation


class ObservationPayload(BaseModel):
    kind: str = Field(pattern="^(traffic_light|obstacle|crosswalk)$")
    confidence: float = Field(ge=0, le=1)
    distance_m: float | None = Field(default=None, ge=0)
    light_state: str | None = Field(default=None, pattern="^(red|green|unknown)$")
    label: str | None = Field(default=None, max_length=80)


def create_app(settings: Settings) -> FastAPI:
    app = FastAPI(title="AI Glasses Prototype", version="0.1.0")
    engine = GuidanceEngine()

    @app.get("/", response_class=HTMLResponse)
    def root() -> str:
        return "<h1>AI Glasses Prototype</h1><p>Use <code>/docs</code> or <code>/api/health</code>.</p>"

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
        guidance = engine.assess(Observation(**payload.model_dump()))
        return guidance.__dict__

    @app.websocket("/ws/observations")
    async def observation_socket(ws: WebSocket) -> None:
        await ws.accept()
        try:
            while True:
                payload = ObservationPayload.model_validate(await ws.receive_json())
                guidance = engine.assess(Observation(**payload.model_dump()))
                await ws.send_json(guidance.__dict__)
        except WebSocketDisconnect:
            return

    return app
