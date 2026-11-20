# Lifelog data boundaries

What the lifelog companion stores, where it lives, how long it is kept, and what can leave the owner's machine. This is the contract v1 privacy model for an experimental, opt-in research prototype. It is not legal advice, and it is not a certification of the software.

Lifelog is a separate subproject from the navigation prototype. The navigation service keeps the boundary in [Data boundaries](../../docs/DATA_BOUNDARIES.md): its event history does not store frames, audio, or location. Lifelog does not import that package, and it does not change navigation guidance.

## Defaults

The shipped defaults are the most private settings:

| Setting | Default |
|---|---|
| `local_first` | on |
| `audio_enabled` | off |
| `location_enabled` | off |
| `face_blur` | on |
| `keep_raw_audio` | off |
| `cloud_vision_enabled` | off |
| `retention_days` | 14 (allowed range 1–365) |
| backup | off |

Audio stays off until the owner sends an explicit consent acknowledgement. People who could be recorded need to be told. The architecture describes that consent step; this note does not interpret anyone's local law.

## What is stored

Storage happens only on a lifelog server the owner runs.

- **Frames.** JPEG captures from a paired device. When face blur is on, faces are blurred before the image is written. Thumbnails are always blurred. Frames classified as too dark or lens-covered are kept so the timeline shows coverage, and they are not analyzed or cited.
- **Audio.** Only when audio is enabled. Chunks are short recordings (AAC, WAV, or Opus). With the default `keep_raw_audio=false`, a successful transcription deletes the file and the database keeps the transcript with an empty path.
- **Derived text and search data.** Captions, OCR, watchlist object detections, anonymous per-day speaker labels (`Speaker A`, `Speaker B`, …), utterances, segments, a day summary, and embeddings used to search that day. The owner may type a display name for a speaker on that day, or mark their own voice. Names are never inferred. There is no face recognition and no voiceprint, and speaker embeddings are not saved.
- **Location.** Only when location is enabled: the coarse points a device chooses to upload.
- **Places.** Names the owner creates. These names survive a day purge.
- **Devices.** A display name, a kind, the token prefix, and a SHA-256 hash of the device token. The token is shown once at creation or rotation and is not stored in the clear.
- **Pause, jobs, and housekeeping.** Pause intervals, job status, and a purge log of counts. An egress log is written only when a call actually leaves the machine, and it records provider, purpose, host, byte count, and item counts — never the content.

Questions and answers are not stored. There is no ask log.

## Where

The data directory is `LIFELOG_DATA_DIR`, default `./lifelog-data`. That directory is gitignored, as are SQLite files, `.m4a` / `.aac` audio, and lifelog data directories.

- Database: `LIFELOG_DATA_DIR/lifelog.sqlite` (SQLite WAL)
- Frames: `media/YYYY/MM/DD/<id>.jpg`
- Thumbnails: `media/YYYY/MM/DD/thumbs/<id>.webp`
- Audio, when a file is still kept: `media/YYYY/MM/DD/audio/<id>.<ext>`

Paths in the database are relative to the data directory. The public repository does not contain an owner's media, database, or recordings. A synthetic sample day, when one is published for the demo, is fictional, watermarked, and separate from this directory.

The API binds to `127.0.0.1` by default. Reaching it from another machine requires TLS in front of that bind. Plaintext owner and device tokens are not written to logs, API responses (except the one-time creation or rotation response), or the web bundle.

## How long

A day `D` is deleted on the local date `D + retention_days`. The purge runs at 03:30 in the owner's timezone, again when the worker starts, and when the owner calls purge. Deleting a day removes that day's frames (and the captions, detections, and image embeddings that belong to them), audio and utterances, speakers, segments, summary, search rows, locations, and jobs, then deletes the day's media directory. The purge log stores counts only.

Lowering `retention_days` does not delete immediately. The owner can purge on purpose. Deleting one day uses the same removal path.

Backup, when the owner turns it on, syncs so that deletions propagate on the next run. Copies that leave the machine are rclone `crypt` remotes. A cloud provider can still keep a trash copy under that provider's own policy. Cloud remotes stay unavailable while local-first is on.

## What leaves the machine

While local-first is on:

- The language-model provider is the local extractive answerer, or Ollama on a loopback or private address. DeepSeek is refused.
- Backup targets are the owner's NAS remotes only. The contract treats rclone types `smb`, `webdav`, `sftp`, `ftp`, and `local` (plus `alias` or `union` that resolve to those) as NAS, and only when the remote itself is `crypt`. A cloud remote is refused.
- Model weights are not downloaded during a request. The only download path is an explicit models-fetch command the owner runs.
- The egress log stays empty. An outbound call in this mode is a failure of the privacy check.

Turning local-first off requires a second confirmation (`confirm_cloud`). After that:

- DeepSeek may be selected. It receives the evidence-pack text only: utterance text, captions, OCR, and segment titles. Real record ids are not sent. Frames are included only when cloud vision is also on, and then as a 512 px image. Cloud vision defaults off and is ignored while local-first is on.
- Cloud backup is allowed, still through a `crypt` remote.
- Each outbound call appends an egress-log row (provider, purpose, host, byte count, item counts, day). The row does not contain the text or the image.

Turning local-first back on applies to new requests immediately, and cloud jobs that are still running are cancelled. A NAS backup may still be recorded in the egress log, because a backup leaves the process even when the target is the owner's own network storage.

Ollama is a local provider. While local-first is on, its URL has to be a loopback or RFC1918 address.

## Pause

Pause is enforced on the server. While a pause interval is open, ingest stores nothing and returns HTTP 423. An item whose capture time falls inside any pause interval is rejected the same way, including a file a device uploads later from its own buffer. Devices are also told to stop capturing while paused. A timed pause closes itself when the interval ends.

## Demo and this repository

The public demo uses a synthetic sample day only: fictional people and places, illustrated frames, no owner account, and no secrets. Writes in that mode stay in the browser. Owner captures are not committed. Logs in the self-hosted server contain ids, counts, and error codes, and they omit transcript text, captions, questions, and answers. API keys and backup passwords stay in server environment or config files on the owner's machine.
