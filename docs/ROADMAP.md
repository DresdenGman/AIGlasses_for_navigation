# Roadmap

## Available

- Hardware-free FastAPI demo service.
- Guidance rules for traffic lights, nearby obstacles, crosswalks, low confidence and repeated-message suppression.
- Optional laptop webcam, video, and still-image input through an OpenCV lamp heuristic, plus an optional downloaded YOLOX file for a short object allowlist. This path does not measure distance.
- Optional spoken playback of guidance text (`edge-tts` or `pyttsx3`) and a browser-speech checkbox on the demo page.
- Environment-based configuration and credential separation.
- Authenticated device-observation endpoint for controlled development networks.
- Editable v0.4 enclosure, source-assembly reference and Blender renders.
- Participant feedback report with raw data and a reproducible analysis: 72 bilingual survey responses, published in full including unfavourable results ([FEEDBACK.md](FEEDBACK.md)).
- Synthetic perception evaluation (`python -m aiglasses.eval`) on generated lamp and object-absence frames. It reports false prompts, misses, per-frame wall time, and repeat suppression, with perception errors separated from guidance-rule outcomes. It does not measure street performance. See [EVAL.md](EVAL.md).

## Integration work

- Recorded-video evaluation of latency, false positives, missed detections and message frequency on consented, redacted footage. The synthetic harness above is not this measurement.
- ESP32 capture, wearable audio, and IMU integration behind the same observation contracts.

## Validation work

- Scenario replay with recorded model versions, thresholds, devices and test dates.
- Evaluation of message uncertainty and user interpretation in controlled settings.
- Perception-accuracy evaluation on recorded video — false prompts and missed objects counted separately. This is the top problem (51% of users) and the top improvement priority (25 of 72 respondents) in the 2026 participant survey, and it gates any stronger field claim. The synthetic fixture eval does not lift this gate.
- Battery-endurance measurement under continuous use, after survey respondents reported the battery not lasting long enough (38% of users; one report of under one hour).
- Audio-clarity checks in noisy rooms, after 30% of users reported unclear audio or instructions.
- Calibration of model units and measurement of physical components.
- Verification of fastening, assembly paths, manufacturing tolerances and physical fit.

The current release does not establish safe road crossing, physical assembly readiness or measured mobility outcomes.
