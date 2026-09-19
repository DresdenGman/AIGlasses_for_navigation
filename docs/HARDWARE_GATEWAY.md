# Device observation gateway

Cameras, ESP32 devices and perception adapters send standardized observations to the service. `GuidanceEngine` handles guidance decisions; the gateway does not directly control speech or navigation.

## Configuration

Set the following in the server's `.env` for a controlled development network:

```ini
AIGLASSES_MODE=hardware
DEVICE_INGEST_TOKEN=replace-with-a-long-random-secret
```

Device request:

```http
POST /api/device/observations
X-Device-Token: <DEVICE_INGEST_TOKEN>
X-Device-Id: <short-development-device-id>
Content-Type: application/json

{"kind":"traffic_light","confidence":0.96,"light_state":"red"}
```

## Interface constraints

- Demo mode rejects device ingestion.
- Hardware mode requires a matching device token.
- The default limit is 120 observations per minute per device. The endpoint is intended for state changes or low-frequency updates, not per-frame uploads.
- Device IDs are used only for in-memory rate limiting and are excluded from event history.
- Tokens must remain outside public firmware repositories, browser code, logs and screenshots.
- The endpoint does not accept raw video, audio or location. Media processing belongs on the device or in a separately controlled pipeline.
- The current interface is limited to controlled development networks. Production deployment requires TLS, token rotation and network access controls.
