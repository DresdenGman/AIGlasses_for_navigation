from __future__ import annotations

import os
from dataclasses import dataclass

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - dependency is declared, but keep imports safe.
    load_dotenv = None


@dataclass(frozen=True)
class Settings:
    mode: str = "demo"
    host: str = "127.0.0.1"
    port: int = 8081
    dashscope_api_key: str | None = None
    device_ingest_token: str | None = None

    @property
    def cloud_voice_enabled(self) -> bool:
        return bool(self.dashscope_api_key)


def load_settings() -> Settings:
    if load_dotenv:
        load_dotenv()
    mode = os.getenv("AIGLASSES_MODE", "demo").strip().lower()
    if mode not in {"demo", "hardware"}:
        raise ValueError("AIGLASSES_MODE must be 'demo' or 'hardware'")
    return Settings(
        mode=mode,
        host=os.getenv("AIGLASSES_HOST", "127.0.0.1"),
        port=int(os.getenv("AIGLASSES_PORT", "8081")),
        dashscope_api_key=os.getenv("DASHSCOPE_API_KEY") or None,
        device_ingest_token=os.getenv("DEVICE_INGEST_TOKEN") or None,
    )
