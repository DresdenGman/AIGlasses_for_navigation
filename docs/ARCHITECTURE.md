# Architecture

The default deliverable is a small FastAPI prototype that turns structured
observations into conservative guidance and keeps a privacy-safe, in-memory
event history for the active process only. An optional local path can create
those observations from a laptop webcam, a video file, or a still image. No
ESP32 is required for that path, and it does not certify the prototype as a
navigation aid.

```text
Demo scenarios / replay JSONL / protected device gateway
                         |
Laptop webcam, video, or still image
                         |
                         v
              Local vision adapter (optional)
                         |
                         v
                  FastAPI service or CLI
                         |
                         v
         validation -> GuidanceEngine -> response/event log
                         |
                         v
      dashboard, REST, WebSocket, CLI text, optional speech
```

## Components

- `aiglasses.guidance`: deterministic rules for traffic-light, obstacle, and
  crosswalk observations. Low confidence produces no action. The camera path
  does not change these rules.
- `aiglasses.service`: REST, WebSocket, static dashboard, the optional frame
  endpoint, and the protected device-ingest endpoint.
- `aiglasses.vision`: `LocalVisionAdapter`. The default detector is an OpenCV
  color heuristic for saturated round lamps. Optional OpenCV Zoo YOLOX weights
  map a short COCO allowlist onto the same observation types. Obstacle
  observations from this adapter omit distance, so a bounding box cannot
  become a near-field urgent warning.
- `aiglasses.pipeline`: chooses one engine result when a frame contains
  several observations, preferring an actionable urgent result, and applies
  optional speech de-duplication without rewriting the engine's text.
- `aiglasses.speech`: silent by default. `edge-tts` and `pyttsx3` are explicit
  opt-ins.
- `aiglasses.live`: command-line runner for `--synthetic`, a webcam index, a
  video file, or a still image.
- `aiglasses.eval`: scores generated, labeled frames through that adapter and
  `GuidanceEngine`. See [EVAL.md](EVAL.md). It does not add a second set of
  guidance rules and it does not measure street video.
- `aiglasses.replay`: reads versioned JSONL demo observations for repeatable
  demonstrations.
- `aiglasses.telemetry`: process-local metadata history. It stores no raw
  audio, video, location, or device identifiers.
- `aiglasses.ratelimit`: in-memory per-device protection for the hardware
  gateway. Device IDs are used only for rate limiting and are not logged.
- `aiglasses.adapters`: the `ObservationSource`, `VisionAdapter`, and
  `SpeechSink` protocols those implementations satisfy.

## Runtime modes

The package requires Python 3.10 or newer (`requires-python` in `pyproject.toml`). That is the version CI tests (3.10, 3.11, and 3.12).

`AIGLASSES_MODE=demo` is the default and needs no camera, ESP32, model file,
or cloud key. The vision and audio extras are optional installs on top of
that mode.

`AIGLASSES_MODE=hardware` enables the authenticated observation gateway. It
does not by itself connect any hardware or certify guidance for real-world
mobility use. See [the hardware gateway](HARDWARE_GATEWAY.md).

`AIGLASSES_VISION` selects `heuristic` (default), `yolox`, or `auto`.
`AIGLASSES_TTS` selects `none` (default), `edge`, or `pyttsx3`.

## Trust and safety boundary

The service accepts observations, not a promise that the scene was understood.
The local adapter is still only a producer of observations: low confidence,
unknown signal colors, conflicting lamps, and green lights stay non-actionable
under the existing rules. A future ESP32 integration should use the same
observation contract and should be tested with recorded, consented data before
anyone relies on it. The prototype remains an assistive research tool rather
than an autonomous navigation system.

Frames posted to `/api/vision/frame` are decoded in memory and are not written
into the event log. See [data boundaries](DATA_BOUNDARIES.md) for the speech
services that leave the machine when explicitly enabled.
