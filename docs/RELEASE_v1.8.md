# Project release v1.8

This note records the first GitHub release of the **project as a whole**. v1.8 is a project-level label, chosen so the release can cover the software, the enclosure design, the community build kit and the feedback evidence together. It does not replace the labels inside the repository: the runnable package remains **0.1.0** in `pyproject.toml`, and the enclosure remains **Continuous Facets v0.4**. Nothing in this release is a certified assistive device.

## Included

- **Guidance software.** The FastAPI demo and its deterministic rules: a red light produces a stop-and-wait message, a green light is informational only and never authorises crossing, low-confidence observations are non-actionable, and invalid obstacle distances are rejected. Dashboard, REST and WebSocket interfaces, JSONL replay, and an authenticated, rate-limited device-observation gateway.
- **Laptop camera path.** A webcam, a video file or a still image can produce observations for the same rules, through an OpenCV lamp heuristic or an optional YOLOX detector restricted to a short COCO allowlist. The adapter attaches no distance, so a bounding box cannot become the nearby-obstacle warning. Guidance sentences can optionally be spoken (edge-tts, pyttsx3, or the browser's speech API). This path is a development and evaluation tool; its street accuracy has not been established.
- **Continuous Facets v0.4 enclosure design.** Editable Blender assembly, GLB preview, shell STL exports, geometry checks and render gallery, as published in September 2026 — a design study, not a validated product.
- **Bilingual community build kit.** Bill of materials, assembly card, troubleshooting sheet, safety note and visit materials in Chinese and English.
- **Participant feedback report.** 72 bilingual survey responses (August–November 2026) with the raw export, a machine-readable summary and a standard-library analysis script that recomputes every published number ([FEEDBACK.md](FEEDBACK.md)).

## Validation

- Local Python suite on the release commit: **85 passed**. CI runs the same suite on Python 3.10, 3.11 and 3.12.
- Every count in the feedback report is regenerated from the raw survey export by `data/feedback/analyze_feedback.py`, which also asserts that the published tables account for all 72 responses.
- Hardware costs are stated as creator reports and estimates (earlier China prototype under US$20; current US estimate under US$35), not supplier-verified quotations.

## Not established by this release

- Street-level accuracy of the camera path, or distance sensing of any kind.
- ESP32 wearable integration, or physical fit, fastening and fabrication readiness of the v0.4 enclosure.
- Measured mobility or safety outcomes. The survey reports what participants experienced; it is not an outcome study.
