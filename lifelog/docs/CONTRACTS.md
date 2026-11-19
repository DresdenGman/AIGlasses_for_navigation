# AIGlasses Lifelog — Frozen Contracts v1 (`aiglasses.lifelog.v1`)

| Artifact | Path in repo | Status |
|---|---|---|
| SQLite DDL | `lifelog/contracts/schema.sql` (byte-identical copy at `lifelog/server/aiglasses_lifelog/schema.sql`) | frozen |
| REST API | `lifelog/contracts/openapi.yaml` (OpenAPI 3.1, 42 paths / 51 operations, validated) | frozen |
| Sample-day manifest example | `lifelog/contracts/sample_day.manifest.example.json` | frozen |
| Design tokens | `lifelog/contracts/design-tokens.json` | frozen |

Conformance tests (WP-I) load these files; a package passes only if its outputs validate against them.

---

## 1. Global conventions

* **Time.** Instants are integer epoch **milliseconds UTC** (`*_ms`). Human-facing strings are ISO-8601 with the
  owner's offset (`*_local`, e.g. `2026-04-18T15:41:00-07:00`). `day` = `YYYY-MM-DD` in `settings.timezone` at
  capture time; written once, never recomputed if the timezone changes later.
* **IDs.** `<prefix>_<26 chars [0-9A-Z]>`; production ids are ULIDs (monotonic per process), fixture ids may be
  readable (`frm_01JRSAMPLE0000000000000042`). Validate with regex `^(dev|frm|aud|cap|det|spk|utt|plc|loc|seg|wli|job|pau|egr|prg|bkp)_[0-9A-Z]{26}$`, never by ULID-decoding.
  Summary item ids are `si_<n>`; golden QA ids `qa_<nn>`.
* **Scores** are floats in [0, 1], rounded to 2 decimals in API output. **`certainty`** ∈ `confident | uncertain`.
* **Languages.** UI locales `zh-CN` and `en`. Stored text keeps its original language; `lang` is BCP-47 short (`zh`, `en`).
* **Media paths.** Relative to `LIFELOG_DATA_DIR`: `media/YYYY/MM/DD/<id>.jpg`, thumbnails `media/YYYY/MM/DD/thumbs/<id>.webp`,
  audio `media/YYYY/MM/DD/audio/<id>.<ext>`. SQLite at `LIFELOG_DATA_DIR/lifelog.sqlite`.
* **JSON.** UTF-8, `snake_case`, no trailing commas, unknown request fields → 422 (`additionalProperties: false`
  where marked). Absent optional values are `null`, not omitted, in responses.
* **Base path** `/api/lifelog`. Deep links in the web app: `/day/{day}?t={ts_ms}&focus={evidence_id}`.

## 2. Storage

### 2.1 Schema
`schema.sql` is the DDL. Table ownership (who **writes**; everyone may read):

| Tables | Writer (package) |
|---|---|
| meta, settings, devices, device_clock, pause_intervals, purge_log, places, locations, frames, audio_chunks, jobs (enqueue + state) | WP-A core |
| captions, detections, frame_embeddings, speakers, utterances; `frames.analyzed/quality(refine)/faces_detected`, `audio_chunks.speech_ms/transcribed/path=NULL` | WP-B AI pipeline |
| watchlist, text_units (+fts_text via triggers), text_embeddings, segments, segment_speakers, summaries | WP-C Q&A/summary |
| egress_log | any package, **only** through `privacy.require_egress()` (WP-A) |
| backup_runs | WP-G backup |
| speakers.display_name/is_self, places.name, frames.place_id/segments.place_id (manual tagging) | WP-A core (owner edits via API) |

### 2.2 Connection
`aiglasses_lifelog.db.connect(path: str | Path | None = None) -> sqlite3.Connection` (WP-A): applies pragmas
(`journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000`, `synchronous=NORMAL`), `row_factory=sqlite3.Row`,
runs `schema.sql` idempotently, tries to load sqlite-vec (`db.VEC_AVAILABLE: bool`). Until WP-A lands, other
packages use the test helper pattern: `conn = sqlite3.connect(":memory:"); conn.executescript(SCHEMA_SQL)`.

### 2.3 Settings keys (`settings` table, `value_json`)
| key | type | default | changed via |
|---|---|---|---|
| `timezone` | IANA string | `America/Los_Angeles` (from `LIFELOG_TIMEZONE`) | PATCH /settings |
| `locale` | `zh-CN`/`en` | `zh-CN` | PATCH /settings |
| `summary_language` | `zh-CN`/`en` | `zh-CN` | PATCH /settings |
| `llm_provider` | `extractive`/`ollama`/`deepseek` | `extractive` | PATCH /settings (deepseek → 409 while local_first) |
| `ollama_url` | URL | `http://127.0.0.1:11434` | PATCH /settings (must be loopback or RFC1918 while local_first) |
| `ollama_model` | string | `qwen3:4b` | PATCH /settings |
| `summary_time_local` | `HH:MM` | `22:30` | PATCH /settings |
| `default_frame_interval_s` | int 5..3600 | `30` | PATCH /settings |
| `retention_days` | int 1..365 | `14` | PATCH /privacy |
| `local_first` | bool | `true` | PATCH /privacy |
| `audio_enabled` | bool | `false` | PATCH /privacy (+`audio_consent_ack`) |
| `audio_consent_ack_ms` | int/null | `null` | set by server when ack received |
| `keep_raw_audio` | bool | `false` | PATCH /privacy |
| `face_blur` | bool | `true` | PATCH /privacy |
| `location_enabled` | bool | `false` | PATCH /privacy |
| `cloud_vision_enabled` | bool | `false` | PATCH /privacy (ignored while local_first) |
| `backup` | BackupConfig JSON | `{"enabled":false,"target_type":null,"remote":null,"path":"aiglasses-lifelog","schedule":"nightly","include_raw_audio":false}` | PUT /backup/config |
| `config_version` | int | `1` | incremented by server on any device-visible change |

Pause state is **not** a setting: it is the open row in `pause_intervals` (`end_ms IS NULL` or `end_ms > now`).

### 2.4 Environment variables
| var | used by | default |
|---|---|---|
| `LIFELOG_DATA_DIR` | all | `./lifelog-data` (gitignored) |
| `LIFELOG_HOST` / `LIFELOG_PORT` | API | `127.0.0.1` / `8090` |
| `LIFELOG_OWNER_TOKEN_SHA256` | API | required in live mode; server refuses to start without it unless `--dev` (then prints a one-time token) |
| `LIFELOG_TIMEZONE` | first-run default | `America/Los_Angeles` |
| `LIFELOG_PUBLIC_ORIGIN` | API (cookie `Secure`, CORS allow-list) | `http://127.0.0.1:8090` |
| `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL` (`https://api.deepseek.com`), `DEEPSEEK_MODEL` (`deepseek-flash`) | QA providers | unset → provider unavailable |
| `LIFELOG_ASR_MODEL` (`small`), `LIFELOG_DEVICE` (`cpu`/`cuda`/`mps`), `HF_TOKEN` (pyannote, optional) | AI | — |
| `LIFELOG_AI_BACKEND` = `real` / `mock` | AI | `real` if extras installed else `mock` |
| `RCLONE_CONFIG`, `RCLONE_CONFIG_PASS` | backup | rclone defaults |
| Web: `LIFELOG_MODE` = `demo`/`live`, `LIFELOG_API_ORIGIN` (live; same-origin recommended), `NEXT_PUBLIC_SITE_URL` | web | `demo` |

### 2.5 Python extras (`lifelog/server/pyproject.toml`, created by WP-A exactly like this)
```toml
[project]
name = "aiglasses-lifelog"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = ["fastapi>=0.110,<1", "uvicorn[standard]>=0.27,<1", "python-dotenv>=1,<2",
                "numpy>=1.26,<3", "pillow>=10,<12", "jieba>=0.42,<0.43", "httpx>=0.27,<1",
                "python-multipart>=0.0.9,<1", "tzdata>=2024.1"]
[project.optional-dependencies]
dev       = ["pytest>=8,<10", "pytest-asyncio>=0.23,<2", "jsonschema>=4.21,<5", "pyyaml>=6,<7", "openapi-spec-validator>=0.7,<1"]
ai-audio  = ["faster-whisper>=1.0,<2", "pyannote.audio>=3.3,<5", "sherpa-onnx>=1.10,<2", "soundfile>=0.12,<1"]
ai-vision = ["transformers>=4.46,<6", "torch>=2.3,<3", "timm>=1.0,<2", "einops>=0.8,<1", "opencv-python-headless>=4.9,<5"]
ai-text   = ["sentence-transformers>=3.0,<6", "sqlite-vec>=0.1.6,<0.2"]
cloud     = []        # DeepSeek uses httpx (core dep); kept as an explicit opt-in marker
[project.scripts]
aiglasses-lifelog = "aiglasses_lifelog.__main__:main"
```
Packages needing another dependency send a contract-change request; they do not edit `pyproject.toml`.

## 3. REST API rules (details in `openapi.yaml`)

### 3.1 Auth
* Owner endpoints: cookie `ll_session` **or** `Authorization: Bearer llo_...`. Mutating owner requests with a cookie
  must carry `X-Requested-With: lifelog` (else 403 `csrf_required`).
* Device endpoints (`/devices/me/*`, `/ingest/*`): `Authorization: Bearer lld_...` + `X-Device-Id`. Lookup by
  `token_prefix = token[:12]`, verify `hmac.compare_digest(sha256_hex(token), row.token_hash)` and
  `row.id == X-Device-Id`, `revoked_ms IS NULL`, `enabled = 1`. Failures: 401 `invalid_token` (do not reveal which part failed),
  403 `device_disabled`.
* Owner token creation: `python -m aiglasses_lifelog owner-token` prints a new `llo_` token once and the line to put
  in `.env` (`LIFELOG_OWNER_TOKEN_SHA256=...`).

### 3.2 Endpoint index
| Area | Endpoints | Package |
|---|---|---|
| meta | `GET /health`, `GET /time` | A |
| auth | `POST/DELETE /auth/session` | A |
| devices | `GET/POST /devices`, `PATCH/DELETE /devices/{id}`, `POST /devices/{id}/rotate-token`, `GET /devices/me/config`, `POST /devices/me/heartbeat`, `POST /devices/me/pause` | A |
| ingest | `POST /ingest/frame`, `POST /ingest/audio`, `POST /ingest/location` | A |
| timeline | `GET /days`, `GET /timeline/{day}`, `GET /frames`, `GET /frames/{id}`, `GET /media/frames/{id}`, `GET /media/audio/{id}`, `GET /utterances`, `GET /segments`, `GET /segments/{id}` | A (reads tables written by B/C) |
| people/places | `GET /speakers`, `PATCH /speakers/{id}`, `GET/POST /places`, `PATCH /places/{id}` | A |
| summary | `GET /summary/{day}`, `POST /summary/{day}/generate` | C |
| ask | `POST /ask` | C |
| objects | `GET/PUT /objects/watchlist`, `GET /objects/last-seen` | C |
| privacy | `GET/PATCH /privacy`, `POST /privacy/pause`, `POST /privacy/resume`, `POST /privacy/purge`, `GET /privacy/egress-log`, `GET /privacy/purge-log`, `DELETE /days` | A |
| backup | `GET/PUT /backup/config`, `GET /backup/remotes`, `GET /backup/status`, `POST /backup/run` | G |
| settings/jobs | `GET/PATCH /settings`, `GET /jobs` | A |

Router composition: `aiglasses_lifelog.app.create_app()` (WP-A) always includes `api.core.router`, and includes
`aiglasses_lifelog.qa.api.router` and `aiglasses_lifelog.backup.api.router` **if importable** (import errors are
logged, not fatal, so packages merge in any order). Each router is an `APIRouter()` without prefix; the app mounts
all under `/api/lifelog`. Shared dependencies exported by WP-A from `aiglasses_lifelog.auth`:
`require_owner`, `require_device` (returns `DeviceRow`), and from `aiglasses_lifelog.db`: `get_conn` (FastAPI dependency).
Route order: declare `/devices/me/*` before `/devices/{device_id}` (path ids are also regex-validated).
The static phone capture page `lifelog/capture/phone/` is mounted at `/capture` if the directory exists.

### 3.3 Ingest rules (frames and audio)
Order of checks (first failure wins): auth (401/403) → rate limit (429, `Retry-After`) → content-type (415) →
size (413) → headers (422 `invalid_headers`) → audio enabled (403 `audio_disabled`, audio only) → resolve capture
instant & clock correction → **pause check** (423 `capture_paused` if paused now **or** instant ∈ any pause interval)
→ dedupe (200 + `duplicate:true`) → decode/validate (422 `undecodable_media`) → face blur → write → insert → enqueue → 201.

Clock correction:
* `ntp`/`rtc`/`phone`: accept device time; if it differs from server receive time by more than 7 days in the
  future → 422 `clock_implausible`. If more than 10 minutes in the future → clamp to receive time and set `clock_corrected=1`.
* `unsynced`: requires `X-Uptime-Ms`; server stores `device_clock.offset_ms = received_ms - uptime_now` for
  `(device, boot_id)` on first contact and computes `captured_ms = offset_ms + X-Captured-At`; `clock_corrected=1`.

Quality classification (WP-A, cheap, Pillow): mean luma < 18 → `dark`; > 90 % of pixels within ±6 of the mean →
`lens_covered`; else `ok` (WP-B may later refine to `blurry`). Non-`ok` frames are stored (so the timeline shows
coverage) but never analyzed or cited.

Face blur (WP-A calls WP-B's function): `aiglasses_lifelog.ai.faces.blur_faces(img: PIL.Image) -> tuple[PIL.Image, int]`.
If WP-B is absent, WP-A uses its own fallback stub that returns `(img, 0)` **and** marks `blurred=0`; thumbnails are
then produced at 96 px wide with a heavy box blur (privacy-safe default until real blur exists).

### 3.4 Device protocol (all capture clients)
```
boot → boot_id = random 16 hex; seq = 0
loop:
  if local_pause_button: paused_local = true; send POST /devices/me/pause {paused:true} when online
  if online and (now - last_config >= 60 s or before each batch): GET /devices/me/config
  if config.paused or paused_local: do not capture; sleep; continue
  capture at frame_interval_s → write to SD ring (oldest dropped when full; dropped count reported in heartbeat)
  when online: upload ≤ max_batch oldest items:
     201/200 → delete item          423 → delete item (paused)      401/403 → stop uploads, LED error
     413/415/422 → delete item, count error                          429/5xx/timeout → exponential backoff 2 s..5 min, keep item
  heartbeat every 5 min while online
```
The phone page, iPhone relay and Shortcuts recipe follow the same response handling.

### 3.5 Privacy endpoint rules
* `PATCH /privacy {audio_enabled:true}` without `audio_consent_ack:true` → 422 `consent_required`.
* `PATCH /privacy {local_first:false}` without `confirm_cloud:true` → 422 `confirmation_required`.
* `PATCH /privacy {local_first:true}` → immediately: `llm_provider` deepseek → `extractive` (settings rewritten),
  backup to cloud target disabled (`backup.enabled=false` if target_type=cloud), running egress jobs cancelled.
* Lowering `retention_days` does **not** delete immediately; the response's `next_purge_ms` tells when. The UI
  offers "Purge now" (`POST /privacy/purge`).
* Every change bumps `config_version`.

### 3.6 Timeline aggregation (WP-A)
`GET /timeline/{day}?bucket_s=60`: buckets are aligned to local midnight; listed only if they contain a frame,
audio, or overlap a pause (sparse). `speech=true` if any utterance overlaps; `audio=true` if any audio chunk
overlaps; `detections` = count of `confident` detections; `cover_frame_id` = first `ok` frame in the bucket.
`segments` = brief list from `segments` table (empty until WP-C runs).

### 3.7 Speaker and place edits
Renaming sets `speakers.display_name` for that `(day,label)` only. Setting `is_self=true` clears it on other
speakers of the same day. Edits enqueue `day.index` (so names are searchable) but never re-run diarization.

### 3.8 Pagination
`page_token` (request) / `next_page_token` (response) is opaque base64url of `"<ts_ms>:<id>"`; results ordered `(ts_ms, id)` ascending.

### 3.9 Error codes
| HTTP | code | meaning |
|---|---|---|
| 400 | `bad_request` | malformed JSON |
| 401 | `invalid_token`, `not_authenticated` | device/owner auth failed |
| 403 | `device_disabled`, `audio_disabled`, `location_disabled`, `csrf_required`, `demo_read_only` | forbidden |
| 404 | `not_found`, `not_generated` | missing resource / summary not yet built |
| 409 | `local_first_blocks_provider`, `local_first_blocks_cloud`, `remote_not_crypt`, `remote_unknown`, `job_running` | state conflict |
| 410 | `raw_audio_dropped` | transcript kept, audio deleted |
| 413 | `too_large` | body over limit |
| 415 | `unsupported_media_type` | wrong content type |
| 422 | `invalid_headers`, `invalid_body`, `undecodable_media`, `clock_implausible`, `consent_required`, `confirmation_required` | validation |
| 423 | `capture_paused` | paused (drop, don't retry) |
| 429 | `rate_limited` | with `Retry-After` |
| 503 | `provider_unavailable`, `rclone_missing` | dependency down |

## 4. Internal Python interfaces (`aiglasses_lifelog`)

### 4.1 Jobs and handler registry (WP-A owns `jobs.py`, `worker.py`)
```python
# aiglasses_lifelog/jobs.py
JobKind = Literal["frame.analyze","audio.transcribe","day.index","day.segment","day.summarize","retention.purge","backup.sync"]
def enqueue(conn, kind: JobKind, ref_id: str, day: str | None, *, delay_s: int = 0) -> str: ...
    # UPSERT on (kind, ref_id): if existing status in (done, failed, skipped, queued) → status='queued', attempts=0,
    # not_before_ms=max(existing, now+delay); if 'running' → leave it and set a 'rerun' flag via not_before_ms (re-queued on finish).
@dataclass(frozen=True)
class Job: id: str; kind: JobKind; ref_id: str; day: str | None; attempts: int
@dataclass
class Context:
    conn: sqlite3.Connection; data_dir: Path; settings: SettingsView; now_ms: Callable[[], int]
    log: logging.Logger            # ids/counts only
Handler = Callable[[Context, Job], Literal["done","skipped"]]   # raise RetryableError / FatalError on failure
class RetryableError(Exception): ...   # backoff 30 s * 2**attempts, max 5 attempts → failed
class FatalError(Exception): ...       # → failed immediately; error column = "<code>: <short msg>"
```
Handlers are discovered from fixed modules, each exporting `HANDLERS: dict[str, Handler]`:
`aiglasses_lifelog.ai.handlers` (`frame.analyze`, `audio.transcribe`), `aiglasses_lifelog.qa.handlers`
(`day.index`, `day.segment`, `day.summarize`), `aiglasses_lifelog.retention` (`retention.purge`, WP-A),
`aiglasses_lifelog.backup.handlers` (`backup.sync`). A missing module ⇒ its jobs stay `queued` and `/jobs` shows them.

Job chaining (each producer enqueues the next): ingest frame → `frame.analyze`(ref=frm id) → `day.index`(ref=day,
delay 120 s). Ingest audio → `audio.transcribe` → `day.index`(delay 120 s). Scheduler at `summary_time_local` →
`day.segment`(ref=day) → on done `day.summarize`(ref=day). Owner `POST /summary/{day}/generate` → `day.segment`
then `day.summarize`. `day.index` is idempotent (rebuilds the day's text units).

### 4.2 AI worker protocols (WP-B, `aiglasses_lifelog/ai/`)
```python
class Captioner(Protocol):      # Florence-2
    model_id: str
    def caption(self, img: Image.Image) -> list[tuple[Literal["caption","dense_caption","ocr"], str, float]]: ...
class Detector(Protocol):       # OWLv2
    model_id: str
    def detect(self, img: Image.Image, labels: list[str]) -> list[tuple[str, float, tuple[float,float,float,float]]]: ...  # label, score, bbox xywh normalized
class ImageEmbedder(Protocol):  # SigLIP2, dim 768
    model_id: str; dim: int
    def embed_images(self, imgs: list[Image.Image]) -> np.ndarray: ...   # float32 (n, dim), L2-normalized
    def embed_texts(self, texts: list[str]) -> np.ndarray: ...           # same space, for text→frame search
class Transcriber(Protocol):    # faster-whisper
    model_id: str
    def transcribe(self, path: Path) -> list[AsrSegment]: ...            # start_s, end_s, text, lang, avg_logprob, no_speech_prob
class Diarizer(Protocol):
    model_id: str
    def diarize(self, path: Path) -> list[tuple[float, float, str]]: ...  # start_s, end_s, local speaker key
def blur_faces(img: Image.Image) -> tuple[Image.Image, int]: ...          # ai/faces.py, YuNet; returns (blurred, n_faces)
def get_backends(settings) -> Backends: ...  # real or mock per LIFELOG_AI_BACKEND; mocks are deterministic (hash of bytes)
```
Also in WP-B: `ai/models.py: fetch(names: list[str] | None, *, accept_licenses: bool) -> list[Path]` (called by WP-A's
`python -m aiglasses_lifelog models fetch` subcommand; the only code path that downloads weights). WP-A calls
`ai.faces.blur_faces` from ingest and `ai.models.fetch` from the CLI via guarded imports (fallbacks in §3.3).
QA uses `get_backends().image_embedder.embed_texts` for text→frame retrieval; it must work in mock mode.

Speaker labelling: per audio chunk, diarizer keys are mapped to day speakers by first-appearance order within the
day (`Speaker A`, `B`, ...). Cross-chunk continuity inside a day may use in-memory embedding similarity **only for the
duration of the job**; no speaker embedding is persisted.

### 4.3 LLM provider (WP-C, `aiglasses_lifelog/qa/providers/`)
```python
class LLMProvider(Protocol):
    name: Literal["extractive","ollama","deepseek"]
    model: str | None
    is_remote: bool
    def complete_json(self, *, system: str, user: str, json_schema: dict, purpose: Literal["ask","summary","segment"],
                      day: str | None, max_tokens: int = 1200, timeout_s: float = 60) -> dict: ...
        # raises ProviderUnavailable, LocalFirstViolation; must call privacy.require_egress() first if is_remote
def get_provider(settings, override: str | None = None) -> LLMProvider: ...
```
`extractive` never calls a model: it builds answers by templating the top evidence (deterministic; used in CI,
in demo free-text search parity, and whenever local-first is on without Ollama).

### 4.4 Egress guard (WP-A, `aiglasses_lifelog/privacy.py`)
```python
class LocalFirstViolation(RuntimeError): ...
def require_egress(conn, *, provider: str, purpose: Literal["ask","summary","caption","backup"], host: str,
                   bytes_out: int, items: dict[str, int], day: str | None, target_type: Literal["cloud","nas"] | None = None) -> None:
    # local_first=True: raise LocalFirstViolation unless purpose=="backup" and target_type=="nas"
    # else insert egress_log row (for NAS backup too) and return
```

## 5. Evidence, citations and confidence (feature 5, 6, 7)

### 5.1 Principle
The model may only **select and phrase** evidence the server retrieved. The server decides status, timestamps,
quotes and links. Anything the server cannot trace to a row is removed. Below-threshold evidence is shown as
`uncertain`, never as fact.

### 5.2 Source confidence (`source_conf`, written into each row's `score` by its producer)
| Evidence kind | `score` formula (producer) | `certainty` rule |
|---|---|---|
| utterance | `clamp(exp(avg_logprob), 0, 1) × (1 − no_speech_prob)` (WP-B); utterances with `no_speech_prob > 0.8` and < 3 words are not stored | `confident` iff score ≥ 0.55 |
| caption / dense_caption | `0.80` constant (model gives no score) (WP-B) | `confident` |
| ocr | `0.80` if ≥ 3 alphanumeric chars else `0.50` | `confident` iff ≥ 0.55 |
| detection | raw OWLv2 score; stored iff ≥ 0.30 (WP-B) | `confident` iff ≥ 0.45 |
| frame (embedding hit) | `0.75` constant | `confident` |
| segment | `mean(score of its evidence)`; provider `rules` titles `0.60` (WP-C) | `confident` iff ≥ 0.70 |

### 5.3 Ask pipeline and validation (WP-C)
1. **Scope**: `day` (default most recent), optional `from_ms/to_ms`, or `all_days`. If the scope window lies entirely
   inside pause intervals → `not_found` with reason `paused_window`.
2. **Object shortcut**: if the question mentions a watchlist label/display_name/alias (normalized substring), add the
   last-seen sightings (§5.4) for that item as evidence with `relevance = 1.0`.
3. **Retrieve** top 40 candidates: FTS5 BM25 over `text_tok` of the jieba-tokenized question (BM25 rank → `1/(1+rank_index)`),
   text vector cosine (bge-m3), and text→frame cosine (SigLIP2 `embed_texts`). Fuse with RRF (k=60), then
   `relevance = fused / fused_max_possible` ∈ [0,1] where `fused_max_possible = Σ_lists 1/(k+1)` over lists that returned
   anything. `evidence_score = relevance × source_conf`.
4. **Filter**: drop `evidence_score < EVIDENCE_MIN = 0.25`; keep top 12, ordered by time. None left → `not_found`
   (`no_evidence` or `below_evidence_min`), no provider call.
5. **Evidence pack** sent to the provider (the only content that may leave the box when remote):
   ```json
   {"question":"我螺丝放哪了？","locale":"zh-CN","day":"2026-04-18","timezone":"America/Los_Angeles",
    "evidence":[
      {"ref":"E1","kind":"detection","time":"15:41:00","label":"screw tray","place":"Workshop","score":0.62,
       "text":"screw tray detected (bbox left-lower) · caption: A red toolbox on a workbench with a small metal tray on its lid."},
      {"ref":"E2","kind":"utterance","time":"15:39:12–15:39:16","speaker":"You","score":0.81,
       "text":"I'll leave the screws on top of the red toolbox so I don't lose them."}]}
   ```
   Pack refs `E1..En` map to real ids server-side; real ids never go to the model.
6. **Provider output** (JSON mode; schema enforced):
   ```json
   {"status":"answered|uncertain|not_found","answer":"<= 400 chars, no timestamps needed",
    "citations":[{"ref":"E2","quote":"leave the screws on top of the red toolbox"}]}
   ```
7. **Validation** (deterministic, unit-tested):
   * citation `ref` not in the pack → dropped (`unknown_citation`).
   * `quote` present → must be a normalized substring of that evidence's original text (NFKC, casefold, collapse
     whitespace, strip punctuation incl. CJK punctuation); else quote set to `null` and reason `quote_mismatch`
     (citation kept, status capped at `uncertain`).
   * Non-JSON / schema-invalid output → one retry, then `extractive` fallback (reason `invalid_model_json`).
   * `answer_score = max(evidence_score of valid citations)` (0 if none).
   * Status:
     - no valid citation → `not_found` if the model said `not_found` or no evidence ≥ 0.25, else `uncertain`
       with answer replaced by the localized template "Possibly related records found, but none clearly answer this."
       and citations = top 3 evidence (reason `no_valid_citation`).
     - model said `not_found` with valid citations → `uncertain` (reason `model_not_found`).
     - model said `uncertain` → `uncertain` (`model_uncertain`).
     - `answer_score < ANSWER_MIN = 0.70` → `uncertain` (`below_answer_min`).
     - otherwise `answered`.
   * `not_found` answer text is the fixed localized sentence:
     en `I couldn't find this in the records for {day}.` / zh-CN `在 {day} 的记录里没有找到相关内容。`
   * Citation objects (timestamps, `open_url`, thumbnails, speaker) are built from the DB rows, never from model text.
8. **Never** persisted: questions and answers are not stored (no ask log). Only `egress_log` counts when remote.

`ANSWER_MIN = 0.70` intentionally mirrors the navigation prototype's 0.70 confidence gate: below it the system says
"uncertain" instead of asserting.

### 5.4 Object last-seen (WP-C, pure SQL)
For each enabled watch item: `last_confident` = latest detection with `watch_item_id = item AND certainty='confident'`
on frames with `quality='ok'`; `latest_any` = latest detection regardless of certainty.
* `status = seen` if `last_confident` exists; `newer_uncertain = latest_any` if `latest_any.ts_ms > last_confident.ts_ms` else `null`.
* `status = uncertain` if only uncertain detections exist; `last_confident = null`, `newer_uncertain = latest_any`.
* `status = not_seen` otherwise.
* `place` = `frames.place_id` → place; `caption` = the frame's `caption` row text.
* Searches all retained days; `searched_days` = count of distinct days with analyzed frames.

### 5.5 Day summary (WP-C)
Input: segments (with their evidence), speakers (+ display names), places, coverage stats, pause intervals.
Process: per segment a short note with evidence refs → day-level JSON from the provider (same pack/ref mechanism as
§5.3, ≤ 80 refs, chosen by segment coverage). Output schema `DaySummary` (openapi). Validation:
* every item (headline, narrative paragraph, place, activity, person, quote) needs ≥ 1 valid ref → else **dropped**
  (`validation.dropped_items++`). Uncited content is never shown, not even as uncertain.
* `quotes[].quote` must be a normalized substring of the referenced utterance; mismatched quotes are dropped.
* item `certainty = uncertain` if max cited evidence_score < 0.70 or the model flagged it; uncertain items are moved
  from their section into `uncertain[]` with `section` set to the original section (UI shows them under
  "Uncertain / 不确定", grouped by section). Exception: the headline is never moved; if uncertain it is set to `null`.
* `people[]` only from `speakers` rows of that day: label or owner-given display name; no names inferred from speech.
* `places[]` from `places` rows (manual or location clusters); a place guessed from captions is `kind=caption_guess`
  and always `uncertain`.
* `status = partial` if any segment had no evidence or a provider call failed for some segments.

### 5.6 UI rendering rules (WP-D)
* `uncertain` badge (tokens §8.4) on every uncertain answer/item/sighting; answer text for `uncertain` is prefixed by
  the badge, never styled like a confident answer.
* No answer text is rendered without at least one clickable citation chip, except `not_found`.
* Citation chip = time (mono) + kind icon + thumbnail; click → `open_url` (timeline jumps, item highlighted).
* Quotes render in quotation marks only when `quote != null`.

## 6. Jobs table semantics
See §4.1. `/jobs` reports counts per kind and status plus the last 20 failures (error codes, no content).
Worker loop: pick `status='queued' AND not_before_ms <= now` ordered by `created_ms`, set `running`, run, set `done`/
`skipped`/`failed`. Startup resets stale `running` (> 15 min) to `queued`.

## 7. Sample-day fixture format (`lifelog/sample_day/`, WP-E)

Manifest: see `sample_day.manifest.example.json`. All JSON files are arrays of objects unless noted. IDs/timestamps
are identical across locales; only text fields differ. All `ts_ms` lie in `[window.first_ms, window.last_ms]` and
never inside `pauses.json` intervals.

| File | Fields (all required; `null` allowed where noted) |
|---|---|
| `devices.json` | `id, name, kind` |
| `frames.json` | `id, device_id, ts_ms, file, thumb, width, height, quality, blurred, faces_detected, place_id\|null, scene` |
| `detections.json` | `id, frame_id, ts_ms, watch_item_id\|null, label, score, certainty, bbox{x,y,w,h}, model` (`model="fixture"`) |
| `watchlist.json` | `id, label, display_name{en,zh-CN}, aliases[], enabled` |
| `audio_chunks.json` | `id, device_id, started_ms, duration_ms, codec, file\|null` |
| `speakers.json` | `id, label, is_self` (display names are in locale files) |
| `pauses.json` | `id, start_ms, end_ms, source` |
| `places.json` | `id, kind` |
| `locales/{loc}/captions.json` | `id, frame_id, ts_ms, kind, text, lang, model, score` |
| `locales/{loc}/utterances.json` | `id, audio_chunk_id, start_ms, end_ms, speaker_id, text, lang, avg_logprob, no_speech_prob, score, certainty, model` |
| `locales/{loc}/segments.json` | `id, start_ms, end_ms, kind, title, summary, place_id\|null, cover_frame_id, speaker_ids[], score, certainty, provider="fixture"` |
| `locales/{loc}/places.json` | `{ "<place_id>": "name" }` (object) |
| `locales/{loc}/speakers.json` | `{ "<speaker_id>": "display name or null" }` (object; mostly `null` to show anonymous labels) |
| `locales/{loc}/summary.json` | one `DaySummary` object (provider `fixture`) whose citations reference fixture ids |
| `locales/{loc}/qa_golden.json` | `id, question, expected_status, must_cite_any[], must_not_cite[], answer_keywords[], trap\|null` |

Rules the validator (`tools/sample_day_gen/validate.py`) enforces and CI runs:
* `synthetic: true`; every text file contains no string from `tools/sample_day_gen/denylist.txt` (real names of
  contributors, real places, brand names) and no e-mail/phone/address patterns.
* Story requirements: ≥ 4 speakers incl. `is_self`; ≥ 2 places; 1 pause interval (12:30–13:00); ≥ 4 watch items with
  at least one `seen`, one `uncertain`-only and one `not_seen`; ≥ 2 deliberately low-confidence utterances (score <
  0.55); ≥ 24 golden questions per locale with ≥ 6 traps (`no_evidence`, `paused_window`, `low_confidence`,
  `ambiguous_speaker`, `object_uncertain`, `out_of_window`).
* Images: no human faces (people only from behind, hands, or silhouettes), visible watermark "SAMPLE · SYNTHETIC"
  bottom-right, total media ≤ 10 MB, `media/SHA256SUMS` matches.
* Loading: `python -m aiglasses_lifelog fixtures load lifelog/sample_day --locale en --db <path>` (WP-A) inserts
  rows exactly as given (captions/detections/utterances as if WP-B produced them, `model="fixture"`), copies media
  into the data dir, and enqueues `day.index`. Without real AI extras the whole pipeline (index → segment → summary → ask)
  runs on the fixture.

## 8. Web contract (`lifelog/web/`, WP-D)

### 8.1 Routes
| Route | Content |
|---|---|
| `/` | Landing: the sample day (demo) or the latest day (live) as an editorial cover; links into everything |
| `/day/[day]` | Timeline scrubber (vertical 24 h, Frigate-derived) + frame viewer + transcript rail + segment list; query `t`, `focus` |
| `/day/[day]/summary` | Editorial day summary (narrative, places, activities, people, quotes, uncertain) |
| `/day/[day]/people` | Speakers of the day; rename (owner) |
| `/ask` | Ask box, suggested questions, answer card with status badge and citation chips |
| `/objects` | Watchlist grid: last-seen frame with bbox overlay, time, place; manage watchlist |
| `/privacy` | Pause (big), retention slider, local-first switch, audio consent flow, face blur, egress log, purge log, delete day |
| `/settings` | Devices (pair via QR, rotate, revoke), backup target and status, LLM provider, jobs status, language |
| `/capture` | Live: link to `/capture` page served by API; demo: explanation |
| `/about` | Research-prototype framing, data boundaries, consent, credits (Frigate MIT notice) |

Global: header pause button (always visible in live; demo toggles local state), synthetic label in demo,
language switch (zh-CN / en), large-text toggle, light/dark.

### 8.2 Data layer
`src/lib/api/types.ts` generated from `openapi.yaml` with `openapi-typescript`; `src/lib/api/client.ts` exposes one
typed function per operation. `src/lib/api/adapter.ts` selects `LiveAdapter` (fetch to `LIFELOG_API_ORIGIN`, cookie
auth, `X-Requested-With: lifelog`) or `DemoAdapter` (reads `public/demo/` JSON built from `lifelog/sample_day` at
build time by `web/scripts/build-demo-data.ts`; precomputed asks from `lifelog/demo_snapshot/ask/{locale}/*.json`
if present). Both return the exact openapi response shapes.

### 8.3 Keyboard and accessibility
Timeline: `←/→` previous/next frame, `Shift+←/→` ±5 min, `Home/End`, `J/K` previous/next segment, `/` focus Ask,
`P` pause toggle (with confirm when resuming). Every frame has alt text from its caption (or "No description");
answers can be read aloud with the browser speech API (optional button). WCAG 2.2 AA minimum, AAA body contrast.

### 8.4 Design tokens
`design-tokens.json` is binding: paper/ink palette, single amber accent reserved for `uncertain`, serif for
summaries, sans for UI, mono for timestamps, motion ≤ 200 ms, `prefers-reduced-motion` respected, no parallax,
no autoplaying sound.

## 9. Backup layout (WP-G)
Remote (inside the crypt remote) path `<path>/`:
```
<path>/media/YYYY/MM/DD/...        rclone sync from LIFELOG_DATA_DIR/media (audio dirs excluded unless include_raw_audio)
<path>/db/lifelog-YYYYMMDD.sqlite  VACUUM INTO snapshot, last 7 kept
<path>/BACKUP_MANIFEST.json        {contract, created_ms, days[], files, bytes, app_version}
```
`rclone sync --checksum --fast-list --transfers 4 --bwlimit <optional>`; never `--backup-dir` (so retention
deletes propagate). Restore = `python -m aiglasses_lifelog backup restore --from <remote> --to <dir>`.
Remote classification: rclone types `smb, webdav, sftp, ftp, local` (and `alias`/`union` resolving to them) → `nas`;
everything else → `cloud`. A remote is accepted only if its type is `crypt`; `wraps` is the wrapped remote's type.

## 10. Evaluation contract (WP-I)
`python -m aiglasses_lifelog.eval qa --fixture lifelog/sample_day --locale en|zh-CN --provider extractive|ollama|deepseek`
prints JSON `{schema:"aiglasses.lifelog.qa_eval", version:1, n, status_accuracy, citation_hit_rate,
fabricated_citations, trap_pass_rate, answered_precision, by_trap{}}` where `fabricated_citations` (citations not in
the evidence pack) **must be 0** and is a CI gate with `extractive`. Other thresholds are reported, not gated, until
baselines exist.
