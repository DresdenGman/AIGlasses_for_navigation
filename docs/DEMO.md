# Demo and replay

## Browser demo

Run `python main.py` and open `http://127.0.0.1:8081/`. Dashboard actions use the service's guidance engine. No camera, ESP32 or model weights are required.

## Reproducible replay

```bash
python -m aiglasses.replay demo/events.jsonl
```

`demo/events.jsonl` contains standardized observations. Replay sends these observations through the guidance rules, allowing individual decisions to be reproduced without hardware.

## Hardware integration

The `aiglasses.adapters.VisionAdapter` interface converts an image frame into an `Observation`. Adapters supply observations with confidence values; `GuidanceEngine` applies the guidance rules. Live camera perception and audio output remain separate integration work.
