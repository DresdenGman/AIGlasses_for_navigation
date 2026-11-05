# Model downloads (legacy)

The current demo does not download or load the older ModelScope weights. `python main.py` runs from structured observations only. `model/` is an empty placeholder (`model/.gitkeep`).

The optional laptop camera path uses a separate YOLOX file, and its default detector needs no weights. `python -m aiglasses.live --synthetic` does not load either bundle.

```bash
python scripts/download_vision_weights.py --accept-license
```

An older guide described YOLO segmentation, YOLO-E, a shopping detector, a traffic-light detector, and a MediaPipe hand-landmarker file, and told readers to pull them from ModelScope. Nothing in `aiglasses/` loads those files. The guide is kept at [docs/archive/MODEL_DOWNLOAD.md](archive/MODEL_DOWNLOAD.md).

Do not follow the archived guide as setup instructions for this repository. The laptop path is described in [DEMO.md](DEMO.md) and [ROADMAP.md](ROADMAP.md).
