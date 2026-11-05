# Data boundaries and event history

By default, the demo service keeps the latest 100 guidance events in process memory: timestamp, observation category, confidence, severity and message text.

- Event history does not store raw video frames, audio, location, account identifiers or unique device identifiers.
- `POST /api/vision/frame` decodes one image in memory to produce observations. The frame is not written into the event history or to disk.
- Restarting the service clears the history.
- Recording real-world scenarios is outside this demo's data flow. A separate consent, retention, access, and deletion checklist is required before a short clip is scored, and the raw file stays on the operator's machine. The synthetic perception eval draws its own frames and does not read those recordings. The recorded-video command (`python -m aiglasses.eval.recorded`) reads a local clip only when a gitignored labels file attests that checklist, skips when the file is absent, and does not upload pixels. See [EVAL.md](EVAL.md) and [RECORDED_EVAL.md](RECORDED_EVAL.md).
- Speech is off by default. `edge-tts` sends the guidance sentence, not the image, to Microsoft's online speech service. `pyttsx3` keeps synthesis on the machine. The dashboard checkbox uses the browser's speech API and does not upload audio.
- Other cloud model integrations are outside the current demo. Their data flows require separate review. Service credentials belong in server-side environment variables.
