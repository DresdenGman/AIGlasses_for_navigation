# Roadmap

## Available

- Hardware-free FastAPI demo service.
- Guidance rules for traffic lights, nearby obstacles, crosswalks, low confidence and repeated-message suppression.
- Optional laptop webcam, video, and still-image input through an OpenCV lamp heuristic, plus an optional downloaded YOLOX file for a short object allowlist. This path does not measure distance.
- Optional spoken playback of guidance text (`edge-tts` or `pyttsx3`) and a browser-speech checkbox on the demo page.
- Environment-based configuration and credential separation.
- Authenticated device-observation endpoint for controlled development networks.
- Editable v0.4 enclosure, source-assembly reference and Blender renders.
- Participant feedback report with raw data and a reproducible analysis: 85 bilingual survey responses, published in full including unfavourable results ([FEEDBACK.md](FEEDBACK.md)).
- Synthetic perception evaluation (`python -m aiglasses.eval`) on generated lamp and object-absence frames. It reports false prompts, misses, per-frame wall time, and repeat suppression, with perception errors separated from guidance-rule outcomes. It does not measure street performance. See [EVAL.md](EVAL.md).
- A local recorded-video command (`python -m aiglasses.eval.recorded`) that scores a short private clip through the same counters when the operator's labels attest consent and redaction. It skips when no private labels file is present, so CI does not need a recording. It does not ship footage and it does not claim street performance. See [RECORDED_EVAL.md](RECORDED_EVAL.md).

## Integration work

- Consented field collection for recorded-video evaluation of latency, false positives, missed detections and message frequency. The local command above is the scoring tool. It is not that collection, and the synthetic harness is not this measurement either.
- ESP32 capture, wearable audio, and IMU integration behind the same observation contracts.

## Validation work

- Scenario replay with recorded model versions, thresholds, devices and test dates.
- Evaluation of message uncertainty and user interpretation in controlled settings.
- Perception-accuracy evaluation on recorded video — false prompts and missed objects counted separately. This is the top problem (48% of users) and the top improvement priority (29 of 85 respondents) in the 2026 participant survey, and it gates any stronger field claim. The synthetic fixture eval does not lift this gate. The local recorded-video command does not lift it either: no consented field set has been collected or reported here.
- A first measurement on labeled real frames now exists: [EVALUATION.md](EVALUATION.md) scores the camera path on 215 Bosch benchmark frames (coverage 4 of 61 single-state red/green frames; one red frame read as green). Those are distant vehicle-mounted lights, not consented near-field footage, so the recorded-video item above remains open.
- Battery-endurance measurement under continuous use, after survey respondents reported the battery not lasting long enough (38% of users; one report of under one hour).
- Audio-clarity checks in noisy rooms, after 30% of users reported unclear audio or instructions.
- Calibration of model units and measurement of physical components.
- Verification of fastening, assembly paths, manufacturing tolerances and physical fit.

The current release does not establish safe road crossing, physical assembly readiness or measured mobility outcomes.

The winter iteration priorities derived from these measurements — in order, each with its evidence, proposed change and acceptance test — are in [V2_PRIORITIES.md](V2_PRIORITIES.md).
