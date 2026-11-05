# Demo, replay, and local camera

This repository is a research prototype. It is not a certified navigation aid and it does not replace a white cane, a guide dog, professional mobility support, or the person's own judgment.

Requires Python 3.10 or newer (`requires-python` in `pyproject.toml`). Install the runtime package with `requirements.txt`. Tests need `requirements-dev.txt`.

## Browser demo

The classic demo does not need a camera, an ESP32, model weights, or a speech package.

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
python main.py
```

Open `http://127.0.0.1:8081/`. The scenario buttons send structured observations through `GuidanceEngine`. That path is unchanged.

## Laptop camera, video, or still image

Install the vision extra, then use either the dashboard or the command line:

```bash
python -m pip install -e '.[vision]'
python -m aiglasses.live --synthetic
python -m aiglasses.live --source 0
python -m aiglasses.live --source path/to/clip.mp4
python -m aiglasses.live --source path/to/frame.jpg
```

`--synthetic` runs four built-in pictures (a clear red lamp, a clear green lamp, a yellow disc, and a tiny red speck). It does not open a webcam and does not download weights. A webcam index such as `0` needs a connected camera. `--stride` skips frames so a live camera is not assessed at full frame rate. `--max-frames` stops a long video early. Press Ctrl-C to stop a camera.

On the dashboard, **使用摄像头拍一帧** grabs one frame in the browser, or **选择图片** sends a still. The picture is posted to `POST /api/vision/frame` and discarded after decoding. The event history stores the same metadata as the classic demo: no pixels.

Keep the default bind address `127.0.0.1`. The frame endpoint is unauthenticated, like the existing observation endpoint.

### What this perception path will and will not do

| Works in this milestone | Does not work |
|---|---|
| OpenCV color heuristic for a saturated, round red or green lamp | Recognition of small, dim, occluded, or ordinary street signals |
| Optional COCO YOLOX boxes for a short allowlist (person, bicycle, car, motorcycle, bus, train, truck, dog, stop sign, traffic light) | Crosswalk recognition, tactile-paving navigation, or object search |
| Guidance text from the existing engine, including uncertainty | A measured distance. Near-obstacle urgent warnings stay unavailable on this path because no range is invented |
| Optional spoken playback of that text | ESP32 capture, a wearable speaker, or an IMU |
| Classic scenario buttons with no extra packages | Any claim of safe street crossing or certification |

A strong red and a strong green in the same frame become an unknown signal, not a stop command and not permission to walk. Green remains informational and non-actionable. Scores below 0.70 remain non-actionable. Invalid detector scores are dropped to 0 rather than rounded up.

The optional weight file is [OpenCV Zoo YOLOX-S](https://github.com/opencv/opencv_zoo/tree/main/models/object_detection_yolox) (`object_detection_yolox_2022nov.onnx`, about 36 MB, Apache-2.0). The zoo's published COCO traffic-light average precision is modest, so many real lights stay under the command threshold. That is the safe failure mode. Tests do not download the file.

```bash
python scripts/download_vision_weights.py --accept-license
python -m aiglasses.live --source path/to/clip.mp4 --detector yolox
```

`AIGLASSES_VISION=auto` uses YOLOX only when that file is already present, and otherwise stays on the heuristic. The older ModelScope bundle in [MODEL_DOWNLOAD.md](MODEL_DOWNLOAD.md) is not loaded by this path.

## Optional speech

Text is always printed. Audio stays off unless you opt in, so the demo runs without speech dependencies.

```bash
python -m pip install -e '.[audio]'
python -m aiglasses.live --synthetic --tts edge
python -m aiglasses.live --synthetic --tts pyttsx3
```

- `AIGLASSES_TTS=none` (the default) prints text only.
- `edge` uses `edge-tts`. The guidance sentence, not the image, is sent to Microsoft's online speech service. Do not enable it if that sentence should stay on the machine. Playback uses `ffplay`, `mpv`, or `mpg123` when one of them is installed; otherwise the clip is written to `demo_output/last-guidance.mp3`.
- `pyttsx3` keeps synthesis local. On Linux it needs an operating-system voice such as espeak.
- The dashboard checkbox uses the browser's own speech API. It is off until the user turns it on, and it does not upload audio.

Repeated identical sentences and the engine's "相同提示已抑制" status are not spoken. Uncertainty is spoken, because "I don't know" is the message. It is not turned into a direction.

## Reproducible replay

```bash
python -m aiglasses.replay demo/events.jsonl
python -m aiglasses.replay demo/safety-regression.jsonl
```

`demo/events.jsonl` contains standardized observations. Replay sends them through the guidance rules without a camera.

## Synthetic perception eval

`python -m aiglasses.eval` scores generated lamps and a few object-absence frames through this same adapter and `GuidanceEngine`. It prints false prompts, misses, latency, and repeat suppression, and it can write JSON and CSV under `demo_output/`. Definitions, the label schema, and the limits are in [EVAL.md](EVAL.md). The command does not download weights. It is not a street test.

## Tests

CI installs the dev and vision extras, runs the suite, and runs `python -m aiglasses.eval` on Python 3.10, 3.11, and 3.12. It uses synthetic frames. It does not download weights or play audio.

`requirements-dev.txt` installs pytest and httpx. Camera tests also need the vision extra:

```bash
python -m pip install -r requirements-dev.txt
python -m pip install -e '.[vision]'
python -m pytest
```

The same install is `python -m pip install -e '.[dev,vision]'`.

## Recording a short demo clip

This repository does not ship a screen recording or a GIF of the dashboard. Capture one from a real run if you want it in a talk or a pull request:

1. Start `python main.py` and open the dashboard, or run `python -m aiglasses.live --synthetic` in a terminal.
2. Exercise a scenario button and, if the vision extra is installed, one camera frame or still image.
3. Record a short clip with the operating system, Peek, or `ffmpeg`. Keep it short.
4. Do not record people who have not agreed to appear, and do not present the clip as a certified navigation aid or as evidence of street performance.

Example, adjusted for the local display:

```bash
ffmpeg -f x11grab -video_size 1280x720 -i :0.0 -t 8 -vf fps=8 demo/dashboard-preview.gif
```

`demo_output/` is gitignored. Do not commit raw camera recordings.

## Hardware gateway

The laptop path does not use hardware mode and does not need an ESP32. The authenticated device gateway remains a separate, observation-only interface. See [HARDWARE_GATEWAY.md](HARDWARE_GATEWAY.md).
