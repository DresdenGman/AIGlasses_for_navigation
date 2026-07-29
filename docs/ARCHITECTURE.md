# Architecture

The current deliverable is a small, hardware-free FastAPI prototype. It turns
structured observations into conservative spoken-style guidance and keeps a
privacy-safe, in-memory event history for the active process only.

```text
Demo scenarios / replay JSONL / protected device gateway
                         |
                         v
                  FastAPI service
                         |
                         v
         validation -> GuidanceEngine -> response/event log
                         |
                         v
           dashboard, REST API, or WebSocket client
```

## Components

- `aiglasses.guidance`: deterministic rules for traffic-light, obstacle, and
  crosswalk observations; low confidence produces no action.
- `aiglasses.service`: REST, WebSocket, static dashboard, and the optional
  protected device-ingest endpoint.
- `aiglasses.replay`: reads versioned JSONL demo observations for repeatable
  demonstrations.
- `aiglasses.telemetry`: process-local metadata history; it deliberately
  excludes raw audio, video, location, and device identifiers.
- `aiglasses.ratelimit`: in-memory per-device protection for the hardware
  gateway. Device IDs are used only for rate limiting and are not logged.

## Runtime modes

`AIGLASSES_MODE=demo` is the default and needs no camera, ESP32, model file,
or cloud key. `AIGLASSES_MODE=hardware` enables the authenticated observation
gateway, but it does not by itself connect any hardware or certify guidance for
real-world mobility use. See [the hardware gateway](HARDWARE_GATEWAY.md).

## Trust and safety boundary

The service accepts observations, not raw sensor streams. A future camera or
ESP32 integration must live behind an adapter, validate its output, and be
tested with recorded, consented data before it can influence guidance. The
prototype must remain an assistive research tool rather than an autonomous
navigation system.
