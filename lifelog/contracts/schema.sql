-- AIGlasses Lifelog — SQLite schema, contract version 1 (FROZEN)
-- Source of truth: lifelog/contracts/schema.sql. The server package ships a byte-identical
-- copy at lifelog/server/aiglasses_lifelog/schema.sql (a test asserts they match).
-- Changes only through a contract-change request to the integrator; bump meta.schema_version.
--
-- Conventions
--   * All instants are INTEGER milliseconds since Unix epoch, UTC ("*_ms").
--   * `day` is TEXT 'YYYY-MM-DD' in the owner's configured timezone (settings.timezone)
--     at capture time. It is written once and never recomputed.
--   * IDs are TEXT '<prefix>_<26-char ULID>' (Crockford base32), e.g. frm_01JD3K8Z6Q4M2T7V9X0B1C2D3E.
--     Prefixes: dev frm aud cap det spk utt plc loc seg wli job pau egr prg bkp.
--     text_units uses INTEGER rowid because FTS5 external content needs it.
--   * Booleans are INTEGER 0/1.
--   * Scores are REAL in [0,1]. `certainty` is 'confident' | 'uncertain'.
--   * Media paths are RELATIVE to LIFELOG_DATA_DIR, e.g. 'media/2026/04/18/frm_....jpg'.
--   * Connection pragmas (set by db.connect()): journal_mode=WAL, foreign_keys=ON,
--     busy_timeout=5000, synchronous=NORMAL.

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO meta(key, value) VALUES ('schema_version', '1');
INSERT OR IGNORE INTO meta(key, value) VALUES ('contract', 'aiglasses.lifelog.v1');

-- Owner settings, one row per key, value is JSON. Keys and defaults are listed in CONTRACTS.md §2.3.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_ms INTEGER NOT NULL
);

-- ---------------------------------------------------------------- devices
CREATE TABLE IF NOT EXISTS devices (
  id               TEXT PRIMARY KEY,                       -- dev_...
  name             TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 64),
  kind             TEXT NOT NULL CHECK (kind IN ('esp32_glasses','apple_watch','iphone_relay','phone_web','shortcut')),
  token_prefix     TEXT NOT NULL UNIQUE,                   -- first 12 chars of the plaintext token, for lookup
  token_hash       TEXT NOT NULL,                          -- hex SHA-256 of the full plaintext token
  enabled          INTEGER NOT NULL DEFAULT 1,
  frame_interval_s INTEGER NOT NULL DEFAULT 30 CHECK (frame_interval_s BETWEEN 5 AND 3600),
  created_ms       INTEGER NOT NULL,
  last_seen_ms     INTEGER,
  last_status_json TEXT,                                   -- last heartbeat body (battery, queue, firmware)
  revoked_ms       INTEGER                                 -- non-NULL = token rejected forever
);

-- Per-boot clock offset for devices without NTP (clock_source='unsynced').
CREATE TABLE IF NOT EXISTS device_clock (
  device_id  TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  boot_id    TEXT NOT NULL,
  offset_ms  INTEGER NOT NULL,                             -- server_ms - device_uptime_ms
  updated_ms INTEGER NOT NULL,
  PRIMARY KEY (device_id, boot_id)
);

-- ---------------------------------------------------------------- privacy
CREATE TABLE IF NOT EXISTS pause_intervals (
  id       TEXT PRIMARY KEY,                               -- pau_...
  start_ms INTEGER NOT NULL,
  end_ms   INTEGER,                                        -- NULL = still paused
  source   TEXT NOT NULL,                                  -- 'owner' | 'device:<dev_id>' | 'schedule'
  reason   TEXT CHECK (reason IS NULL OR length(reason) <= 120)
);
CREATE INDEX IF NOT EXISTS ix_pause_open ON pause_intervals(end_ms);

-- Every outbound call to a third-party processor (LLM/vision API, cloud backup). Counts/ids only, never content.
CREATE TABLE IF NOT EXISTS egress_log (
  id        TEXT PRIMARY KEY,                              -- egr_...
  ts_ms     INTEGER NOT NULL,
  provider  TEXT NOT NULL,                                 -- 'deepseek' | 'rclone:<remote>' | ...
  purpose   TEXT NOT NULL CHECK (purpose IN ('ask','summary','caption','backup')),
  host      TEXT NOT NULL,
  bytes_out INTEGER NOT NULL DEFAULT 0,
  items_json TEXT NOT NULL DEFAULT '{}',                   -- e.g. {"utterances":12,"frames":0}
  day       TEXT
);
CREATE INDEX IF NOT EXISTS ix_egress_ts ON egress_log(ts_ms);

CREATE TABLE IF NOT EXISTS purge_log (
  id           TEXT PRIMARY KEY,                           -- prg_...
  ts_ms        INTEGER NOT NULL,
  trigger      TEXT NOT NULL CHECK (trigger IN ('retention','owner_day','owner_range','startup')),
  cutoff_day   TEXT,                                       -- days < cutoff_day were purged (retention)
  days_json    TEXT NOT NULL DEFAULT '[]',
  frames       INTEGER NOT NULL DEFAULT 0,
  audio_chunks INTEGER NOT NULL DEFAULT 0,
  utterances   INTEGER NOT NULL DEFAULT 0,
  bytes        INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------- places / location (opt-in)
CREATE TABLE IF NOT EXISTS places (
  id         TEXT PRIMARY KEY,                             -- plc_...
  name       TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  kind       TEXT NOT NULL CHECK (kind IN ('manual','location_cluster','caption_guess')),
  lat        REAL,
  lon        REAL,
  radius_m   REAL,
  created_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id         TEXT PRIMARY KEY,                             -- loc_...
  device_id  TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,
  ts_ms      INTEGER NOT NULL,
  lat        REAL NOT NULL,
  lon        REAL NOT NULL,
  accuracy_m REAL,
  place_id   TEXT REFERENCES places(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS ix_locations_day_ts ON locations(day, ts_ms);

-- ---------------------------------------------------------------- raw media
CREATE TABLE IF NOT EXISTS frames (
  id              TEXT PRIMARY KEY,                        -- frm_...
  device_id       TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  day             TEXT NOT NULL,
  captured_ms     INTEGER NOT NULL,
  received_ms     INTEGER NOT NULL,
  boot_id         TEXT NOT NULL,
  seq             INTEGER NOT NULL,
  clock_source    TEXT NOT NULL CHECK (clock_source IN ('ntp','rtc','phone','unsynced')),
  clock_corrected INTEGER NOT NULL DEFAULT 0,
  width           INTEGER,
  height          INTEGER,
  bytes           INTEGER NOT NULL,
  sha256          TEXT NOT NULL,
  path            TEXT NOT NULL,                           -- stored image (face-blurred if settings.face_blur)
  thumb_path      TEXT,                                    -- 320px wide, ALWAYS face-blurred
  blurred         INTEGER NOT NULL DEFAULT 0,              -- 1 = `path` image had faces blurred before write
  faces_detected  INTEGER NOT NULL DEFAULT 0,
  quality         TEXT NOT NULL DEFAULT 'unknown' CHECK (quality IN ('unknown','ok','dark','blurry','lens_covered')),
  place_id        TEXT REFERENCES places(id) ON DELETE SET NULL,
  analyzed        INTEGER NOT NULL DEFAULT 0,              -- 1 after frame.analyze job done
  UNIQUE (device_id, boot_id, seq)
);
CREATE INDEX IF NOT EXISTS ix_frames_day_ts ON frames(day, captured_ms);

CREATE TABLE IF NOT EXISTS audio_chunks (
  id          TEXT PRIMARY KEY,                            -- aud_...
  device_id   TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  day         TEXT NOT NULL,                               -- day of started_ms
  started_ms  INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL CHECK (duration_ms BETWEEN 1 AND 900000),
  ended_ms    INTEGER NOT NULL,                            -- started_ms + duration_ms
  received_ms INTEGER NOT NULL,
  boot_id     TEXT NOT NULL,
  seq         INTEGER NOT NULL,
  clock_source TEXT NOT NULL CHECK (clock_source IN ('ntp','rtc','phone','unsynced')),
  codec       TEXT NOT NULL CHECK (codec IN ('aac','wav','opus')),
  sample_rate INTEGER,
  bytes       INTEGER NOT NULL,
  sha256      TEXT NOT NULL,
  path        TEXT,                                        -- NULL after raw audio is dropped (settings.keep_raw_audio=false)
  speech_ms   INTEGER,                                     -- VAD speech duration, filled by ASR worker
  transcribed INTEGER NOT NULL DEFAULT 0,
  UNIQUE (device_id, boot_id, seq)
);
CREATE INDEX IF NOT EXISTS ix_audio_day_ts ON audio_chunks(day, started_ms);

-- ---------------------------------------------------------------- derived: vision
CREATE TABLE IF NOT EXISTS captions (
  id         TEXT PRIMARY KEY,                             -- cap_...
  frame_id   TEXT NOT NULL REFERENCES frames(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,
  ts_ms      INTEGER NOT NULL,                             -- = frames.captured_ms
  kind       TEXT NOT NULL CHECK (kind IN ('caption','dense_caption','ocr')),
  text       TEXT NOT NULL,
  lang       TEXT,
  model      TEXT NOT NULL,
  score      REAL NOT NULL CHECK (score BETWEEN 0 AND 1),  -- source confidence, see CONTRACTS §5.2
  created_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_captions_frame ON captions(frame_id);
CREATE INDEX IF NOT EXISTS ix_captions_day_ts ON captions(day, ts_ms);

CREATE TABLE IF NOT EXISTS watchlist (
  id           TEXT PRIMARY KEY,                           -- wli_...
  label        TEXT NOT NULL UNIQUE CHECK (length(label) BETWEEN 1 AND 40),  -- detector prompt, English, e.g. 'screwdriver'
  display_name TEXT NOT NULL,                              -- shown in UI, any language, e.g. '螺丝刀'
  aliases_json TEXT NOT NULL DEFAULT '[]',                 -- extra query words, e.g. ["螺丝","screws"]
  enabled      INTEGER NOT NULL DEFAULT 1,
  created_ms   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS detections (
  id            TEXT PRIMARY KEY,                          -- det_...
  frame_id      TEXT NOT NULL REFERENCES frames(id) ON DELETE CASCADE,
  day           TEXT NOT NULL,
  ts_ms         INTEGER NOT NULL,
  watch_item_id TEXT REFERENCES watchlist(id) ON DELETE SET NULL,
  label         TEXT NOT NULL,
  score         REAL NOT NULL CHECK (score BETWEEN 0 AND 1),   -- raw detector score; rows < 0.30 are never stored
  bbox_x REAL NOT NULL, bbox_y REAL NOT NULL, bbox_w REAL NOT NULL, bbox_h REAL NOT NULL,  -- normalized 0..1, top-left origin
  certainty     TEXT NOT NULL CHECK (certainty IN ('confident','uncertain')),   -- confident iff score >= 0.45
  model         TEXT NOT NULL,
  created_ms    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_det_label_ts ON detections(label, ts_ms DESC);
CREATE INDEX IF NOT EXISTS ix_det_day ON detections(day, ts_ms);

CREATE TABLE IF NOT EXISTS frame_embeddings (
  frame_id TEXT PRIMARY KEY REFERENCES frames(id) ON DELETE CASCADE,
  day      TEXT NOT NULL,
  model    TEXT NOT NULL,
  dim      INTEGER NOT NULL,
  vector   BLOB NOT NULL                                   -- little-endian float32[dim], L2-normalized
);
CREATE INDEX IF NOT EXISTS ix_frame_emb_day ON frame_embeddings(day);

-- ---------------------------------------------------------------- derived: audio
-- Speakers are anonymous and PER DAY. No voiceprint is stored or matched across days.
CREATE TABLE IF NOT EXISTS speakers (
  id           TEXT PRIMARY KEY,                           -- spk_...
  day          TEXT NOT NULL,
  label        TEXT NOT NULL,                              -- 'Speaker A', 'Speaker B', ... assigned in order of first speech
  display_name TEXT CHECK (display_name IS NULL OR length(display_name) BETWEEN 1 AND 40),  -- owner-entered only
  is_self      INTEGER NOT NULL DEFAULT 0,
  created_ms   INTEGER NOT NULL,
  UNIQUE (day, label)
);

CREATE TABLE IF NOT EXISTS utterances (
  id             TEXT PRIMARY KEY,                         -- utt_...
  audio_chunk_id TEXT NOT NULL REFERENCES audio_chunks(id) ON DELETE CASCADE,
  day            TEXT NOT NULL,
  start_ms       INTEGER NOT NULL,                         -- absolute, = chunk.started_ms + offset
  end_ms         INTEGER NOT NULL,
  speaker_id     TEXT REFERENCES speakers(id) ON DELETE SET NULL,
  text           TEXT NOT NULL,
  lang           TEXT,
  avg_logprob    REAL,
  no_speech_prob REAL,
  score          REAL NOT NULL CHECK (score BETWEEN 0 AND 1),
  certainty      TEXT NOT NULL CHECK (certainty IN ('confident','uncertain')),
  model          TEXT NOT NULL,
  created_ms     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_utt_day_ts ON utterances(day, start_ms);
CREATE INDEX IF NOT EXISTS ix_utt_chunk ON utterances(audio_chunk_id);

-- ---------------------------------------------------------------- derived: day structure
CREATE TABLE IF NOT EXISTS segments (
  id         TEXT PRIMARY KEY,                             -- seg_...
  day        TEXT NOT NULL,
  start_ms   INTEGER NOT NULL,
  end_ms     INTEGER NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('activity','conversation','transit','idle','paused')),
  title      TEXT NOT NULL,
  summary    TEXT,
  place_id   TEXT REFERENCES places(id) ON DELETE SET NULL,
  cover_frame_id TEXT REFERENCES frames(id) ON DELETE SET NULL,
  score      REAL NOT NULL CHECK (score BETWEEN 0 AND 1),
  certainty  TEXT NOT NULL CHECK (certainty IN ('confident','uncertain')),
  provider   TEXT NOT NULL,                                -- 'rules' | 'extractive' | 'ollama' | 'deepseek' | 'fixture'
  created_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_seg_day ON segments(day, start_ms);

CREATE TABLE IF NOT EXISTS segment_speakers (
  segment_id TEXT NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
  speaker_id TEXT NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
  PRIMARY KEY (segment_id, speaker_id)
);

CREATE TABLE IF NOT EXISTS summaries (
  day          TEXT PRIMARY KEY,
  generated_ms INTEGER NOT NULL,
  provider     TEXT NOT NULL,
  model        TEXT,
  language     TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('ok','partial','failed')),
  json         TEXT NOT NULL                               -- DaySummary JSON, CONTRACTS §5.5
);

-- ---------------------------------------------------------------- retrieval index (written only by the indexer)
CREATE TABLE IF NOT EXISTS text_units (
  id        INTEGER PRIMARY KEY,
  kind      TEXT NOT NULL CHECK (kind IN ('utterance','caption','ocr','segment')),
  ref_id    TEXT NOT NULL,                                 -- utt_ / cap_ / seg_ id
  day       TEXT NOT NULL,
  ts_ms     INTEGER NOT NULL,
  ts_end_ms INTEGER NOT NULL,
  text      TEXT NOT NULL,
  text_tok  TEXT NOT NULL,                                 -- space-joined tokens (jieba for CJK, lowercase words otherwise)
  UNIQUE (kind, ref_id)
);
CREATE INDEX IF NOT EXISTS ix_tu_day ON text_units(day, ts_ms);

CREATE VIRTUAL TABLE IF NOT EXISTS fts_text USING fts5(
  text_tok,
  content='text_units',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);
CREATE TRIGGER IF NOT EXISTS tu_ai AFTER INSERT ON text_units BEGIN
  INSERT INTO fts_text(rowid, text_tok) VALUES (new.id, new.text_tok);
END;
CREATE TRIGGER IF NOT EXISTS tu_ad AFTER DELETE ON text_units BEGIN
  INSERT INTO fts_text(fts_text, rowid, text_tok) VALUES ('delete', old.id, old.text_tok);
END;
CREATE TRIGGER IF NOT EXISTS tu_au AFTER UPDATE ON text_units BEGIN
  INSERT INTO fts_text(fts_text, rowid, text_tok) VALUES ('delete', old.id, old.text_tok);
  INSERT INTO fts_text(rowid, text_tok) VALUES (new.id, new.text_tok);
END;

CREATE TABLE IF NOT EXISTS text_embeddings (
  text_unit_id INTEGER PRIMARY KEY REFERENCES text_units(id) ON DELETE CASCADE,
  day          TEXT NOT NULL,
  model        TEXT NOT NULL,
  dim          INTEGER NOT NULL,
  vector       BLOB NOT NULL                               -- little-endian float32[dim], L2-normalized
);
CREATE INDEX IF NOT EXISTS ix_text_emb_day ON text_embeddings(day);
-- Optional accelerator: if the sqlite-vec extension loads, the indexer MAY mirror vectors into
-- vec0 virtual tables named vec_text / vec_frames. Canonical storage is always the BLOB tables above.

-- ---------------------------------------------------------------- jobs
CREATE TABLE IF NOT EXISTS jobs (
  id          TEXT PRIMARY KEY,                            -- job_...
  kind        TEXT NOT NULL CHECK (kind IN (
                'frame.analyze','audio.transcribe','day.index','day.segment',
                'day.summarize','retention.purge','backup.sync')),
  ref_id      TEXT NOT NULL,                               -- frm_/aud_ id; 'YYYY-MM-DD' for day.* jobs; 'global' for retention/backup
  day         TEXT,
  status      TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed','skipped')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  not_before_ms INTEGER NOT NULL DEFAULT 0,
  error       TEXT,                                        -- short code + message, no content
  created_ms  INTEGER NOT NULL,
  updated_ms  INTEGER NOT NULL,
  UNIQUE (kind, ref_id)        -- enqueue = UPSERT: re-queue unless status='running' (CONTRACTS §6.2)
);
CREATE INDEX IF NOT EXISTS ix_jobs_pick ON jobs(status, not_before_ms, created_ms);

-- ---------------------------------------------------------------- backup
CREATE TABLE IF NOT EXISTS backup_runs (
  id          TEXT PRIMARY KEY,                            -- bkp_...
  started_ms  INTEGER NOT NULL,
  finished_ms INTEGER,
  state       TEXT NOT NULL CHECK (state IN ('running','ok','failed','skipped_local_first','skipped_disabled')),
  remote      TEXT,
  target_type TEXT CHECK (target_type IN ('cloud','nas')),
  files       INTEGER NOT NULL DEFAULT 0,
  bytes       INTEGER NOT NULL DEFAULT 0,
  deleted     INTEGER NOT NULL DEFAULT 0,
  error       TEXT
);
