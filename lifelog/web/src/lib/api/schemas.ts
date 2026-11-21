import { z } from "zod";

const id = (prefix: string) => z.string().regex(new RegExp(`^${prefix}_[0-9A-Z]{26}$`));

export const LocaleSchema = z.enum(["zh-CN", "en"]);
export const CertaintySchema = z.enum(["confident", "uncertain"]);

export const BBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

export const SpeakerSchema = z.object({
  id: id("spk"),
  label: z.string(),
  display_name: z.string().nullable(),
  is_self: z.boolean(),
});

export const PlaceSchema = z.object({
  id: id("plc"),
  name: z.string(),
  kind: z.enum(["manual", "location_cluster", "caption_guess"]),
});

export const CitationSchema = z.object({
  evidence_id: z.string().min(1),
  handle: z.string().optional(),
  kind: z.enum(["utterance", "caption", "ocr", "detection", "frame", "segment", "highlight", "sighting", "day"]),
  day: z.string(),
  ts_ms: z.number().int(),
  ts_end_ms: z.number().int(),
  ts_local: z.string(),
  frame_id: z.string().nullable(),
  thumb_url: z.string().nullable(),
  open_url: z.string(),
  quote: z.string().nullable(),
  speaker: SpeakerSchema.nullable(),
  bbox: BBoxSchema.nullable(),
  score: z.number(),
  certainty: CertaintySchema,
});

export const ValidationSchema = z.object({
  dropped_citations: z.number().int(),
  dropped_quotes: z.number().int(),
  forced_status: z.enum(["uncertain", "not_found"]).nullable(),
  reasons: z.array(
    z.enum([
      "no_evidence",
      "below_evidence_min",
      "below_answer_min",
      "unknown_citation",
      "no_valid_citation",
      "quote_mismatch",
      "model_uncertain",
      "model_not_found",
      "provider_error",
      "paused_window",
      "invalid_model_json",
    ]),
  ),
});

export const AuditSchema = z.object({
  scanned: z.number().int(),
  matched: z.number().int().nullable(),
  above_floor: z.number().int().nullable(),
  gate: z.number(),
});

export const AskResponseSchema = z.object({
  id: z.string().optional(),
  question: z.string(),
  status: z.enum(["answered", "uncertain", "not_found"]),
  answer: z.string(),
  score: z.number(),
  citations: z.array(CitationSchema),
  evidence_considered: z.number().int(),
  provider: z.enum(["deepseek", "ollama", "extractive", "precomputed"]),
  model: z.string().nullable(),
  local_first: z.boolean(),
  validation: ValidationSchema,
  audit: AuditSchema.optional(),
  latency_ms: z.number().int(),
  mode: z.enum(["hero", "year"]).optional(),
  ui_tone: z.enum(["neutral", "amber"]).optional(),
  reason_text: z.string().nullable().optional(),
});

export const ShowcaseEvidenceSchema = z.object({
  handle: z.string(),
  kind: z.enum(["utterance", "caption", "ocr", "detection", "frame", "segment", "highlight", "sighting", "day"]),
  id: z.string(),
  day: z.string(),
  ts: z.number().int(),
  ts_end: z.number().int(),
  ts_local: z.string(),
  label: z.string(),
  thumb_hint: z.string().nullable().optional(),
  frame_id: z.string().nullable(),
  source_conf: z.number().optional(),
  score: z.number(),
  certainty: CertaintySchema,
  quote: z.string().nullable(),
  open_url: z.string(),
});

export const ShowcaseAnswerSchema = z.object({
  id: z.string(),
  question: z.string(),
  locale: LocaleSchema,
  scope: z.object({
    all_days: z.boolean(),
    day: z.string().nullable(),
    from_ms: z.number().int().nullable(),
    to_ms: z.number().int().nullable(),
  }),
  status: z.enum(["answered", "uncertain", "not_found"]),
  ui_tone: z.enum(["neutral", "amber"]),
  answer: z.string(),
  sentences: z.array(z.object({
    text: z.string(),
    evidence: z.array(z.string()),
    quote: z.string().nullable().optional(),
  })),
  evidence: z.array(ShowcaseEvidenceSchema),
  evidence_considered: z.number().int(),
  score: z.number(),
  reason: z.string().nullable(),
  reasons: z.array(z.string()),
  reason_text: z.string().nullable(),
  note: z.string().nullable(),
  validation: z.object({
    dropped_citations: z.number().int(),
    dropped_quotes: z.number().int(),
    dropped_sentences: z.number().int().optional(),
    forced_status: z.enum(["uncertain", "not_found"]).nullable(),
  }),
  mode: z.enum(["hero", "year"]),
  provider: z.literal("precomputed"),
});

export const ShowcaseAnswersFileSchema = z.object({
  schema: z.string(),
  version: z.number(),
  locale: LocaleSchema,
  provider: z.literal("precomputed"),
  answers: z.array(ShowcaseAnswerSchema),
});

export const AskRequestSchema = z.object({
  question: z.string().min(1).max(500),
  day: z.string().optional(),
  from_ms: z.number().int().optional(),
  to_ms: z.number().int().optional(),
  all_days: z.boolean().optional(),
  locale: LocaleSchema.optional(),
  provider: z.enum(["deepseek", "ollama", "extractive"]).optional(),
});

export const SummaryItemSchema = z.object({
  id: z.string().regex(/^si_\d+$/),
  section: z.enum(["headline", "narrative", "places", "activities", "people", "quotes"]).nullable(),
  text: z.string().min(1),
  certainty: CertaintySchema,
  start_ms: z.number().int().nullable(),
  end_ms: z.number().int().nullable(),
  segment_ids: z.array(z.string()),
  citations: z.array(CitationSchema).min(1),
});

export const PlaceItemSchema = SummaryItemSchema.extend({
  place_id: z.string().nullable(),
});

export const PersonItemSchema = SummaryItemSchema.extend({
  speaker: SpeakerSchema,
  speech_ms: z.number().int(),
});

export const QuoteItemSchema = SummaryItemSchema.extend({
  quote: z.string(),
  utterance_id: z.string(),
  speaker: SpeakerSchema.nullable(),
});

export const DaySummarySchema = z.object({
  day: z.string(),
  timezone: z.string(),
  language: LocaleSchema,
  generated_ms: z.number().int(),
  provider: z.enum(["deepseek", "ollama", "extractive", "fixture"]),
  model: z.string().nullable(),
  status: z.enum(["ok", "partial", "failed"]),
  headline: SummaryItemSchema.nullable(),
  narrative: z.array(SummaryItemSchema).max(8),
  places: z.array(PlaceItemSchema),
  activities: z.array(SummaryItemSchema),
  people: z.array(PersonItemSchema),
  quotes: z.array(QuoteItemSchema),
  uncertain: z.array(SummaryItemSchema),
  coverage: z.object({
    frames: z.number().int(),
    audio_seconds: z.number().int(),
    paused_ms: z.number().int(),
    first_ms: z.number().int().nullable(),
    last_ms: z.number().int().nullable(),
  }),
  validation: z.object({
    dropped_items: z.number().int(),
    dropped_citations: z.number().int(),
    dropped_quotes: z.number().int(),
  }),
});

export const DayInfoSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  first_ms: z.number().int(),
  last_ms: z.number().int(),
  frames: z.number().int(),
  audio_seconds: z.number().int(),
  utterances: z.number().int(),
  segments: z.number().int(),
  has_summary: z.boolean(),
  expires_on: z.string(),
});

export const ArchiveDaySchema = DayInfoSchema.extend({
  cell_state: z.enum(["recorded", "paused", "deleted", "expired"]),
  uncertain_items: z.number().int(),
  level: z.number().int().min(0).max(4),
});

const LocalizedSchema = z.object({
  en: z.string(),
  "zh-CN": z.string(),
});

export const YearArchiveSchema = z.object({
  schema: z.literal("aiglasses.lifelog.showcase.year"),
  version: z.literal(1),
  synthetic: z.literal(true),
  timezone: z.string(),
  from: z.string(),
  to: z.string(),
  featured_day: z.string(),
  retention_days: z.number().int(),
  stats: z.object({
    hours_captured: z.number(),
    questions_asked: z.number().int(),
    objects_found: z.number().int(),
    days_recorded: z.number().int(),
  }),
  days: z.array(ArchiveDaySchema).length(365),
  monthly_highlights: z.array(
    z.object({
      month: z.string(),
      slot: z.string().nullable(),
      label: LocalizedSchema.nullable(),
    }),
  ),
  questions_by_day: z.record(z.string(), z.number().int()),
  recurring: z.object({
    people: z.array(z.object({ label: LocalizedSchema, days: z.number().int(), named: z.boolean() })),
    places: z.array(z.object({ name: LocalizedSchema, days: z.number().int() })),
    objects: z.array(
      z.object({
        label: z.string(),
        display_name: LocalizedSchema,
        finds: z.number().int(),
        certainty: CertaintySchema,
      }),
    ),
  }),
  testimonials: z.array(
    z.object({
      id: z.string(),
      quote: LocalizedSchema,
      attribution: LocalizedSchema,
      note: LocalizedSchema,
    }),
  ),
});

export const TimelineSchema = z.object({
  day: z.string(),
  timezone: z.string(),
  start_ms: z.number().int(),
  end_ms: z.number().int(),
  bucket_s: z.number().int(),
  buckets: z.array(
    z.object({
      start_ms: z.number().int(),
      frames: z.number().int(),
      speech: z.boolean(),
      audio: z.boolean(),
      detections: z.number().int(),
      paused: z.boolean(),
      cover_frame_id: z.string().nullable(),
    }),
  ),
  pauses: z.array(
    z.object({
      start_ms: z.number().int(),
      end_ms: z.number().int().nullable(),
      source: z.string(),
    }),
  ),
  segments: z.array(
    z.object({
      id: z.string(),
      start_ms: z.number().int(),
      end_ms: z.number().int(),
      kind: z.string(),
      title: z.string(),
      certainty: CertaintySchema,
    }),
  ),
});

export const DetectionSchema = z.object({
  id: id("det"),
  label: z.string(),
  watch_item_id: z.string().nullable(),
  score: z.number(),
  certainty: CertaintySchema,
  bbox: BBoxSchema,
});

export const UtteranceSchema = z.object({
  id: id("utt"),
  audio_chunk_id: id("aud"),
  start_ms: z.number().int(),
  end_ms: z.number().int(),
  ts_local: z.string(),
  speaker: SpeakerSchema.nullable(),
  text: z.string(),
  lang: z.string().nullable(),
  score: z.number(),
  certainty: CertaintySchema,
  audio_url: z.string().nullable(),
});

export const FrameBriefSchema = z.object({
  id: id("frm"),
  ts_ms: z.number().int(),
  ts_local: z.string(),
  device_id: id("dev"),
  thumb_url: z.string(),
  full_url: z.string(),
  caption: z.string().nullable(),
  quality: z.enum(["unknown", "ok", "dark", "blurry", "lens_covered"]),
  detections: z.number().int(),
  segment_id: z.string().nullable(),
});

export const FrameDetailSchema = FrameBriefSchema.extend({
  captions: z.array(
    z.object({
      id: id("cap"),
      kind: z.enum(["caption", "dense_caption", "ocr"]),
      text: z.string(),
      model: z.string(),
      score: z.number(),
    }),
  ),
  detection_list: z.array(DetectionSchema),
  nearby_utterances: z.array(UtteranceSchema),
  place: PlaceSchema.nullable(),
  blurred: z.boolean(),
  faces_detected: z.number().int(),
});

export const FramesResponseSchema = z.object({
  frames: z.array(FrameDetailSchema),
  next_page_token: z.string().nullable(),
});

export const UtterancesResponseSchema = z.object({
  utterances: z.array(UtteranceSchema),
});

export const SegmentSchema = z.object({
  id: id("seg"),
  day: z.string(),
  start_ms: z.number().int(),
  end_ms: z.number().int(),
  kind: z.enum(["activity", "conversation", "transit", "idle", "paused"]),
  title: z.string(),
  summary: z.string().nullable(),
  place: PlaceSchema.nullable(),
  cover_frame_id: z.string().nullable(),
  speaker_ids: z.array(z.string()),
  score: z.number(),
  certainty: CertaintySchema,
  provider: z.string(),
});

export const SegmentsResponseSchema = z.object({
  segments: z.array(SegmentSchema),
});

export const SpeakerDaySchema = SpeakerSchema.extend({
  speech_ms: z.number().int(),
  first_ms: z.number().int(),
  last_ms: z.number().int(),
  sample_utterance_id: z.string().nullable(),
});

export const SpeakersResponseSchema = z.object({
  speakers: z.array(SpeakerDaySchema),
});

export const WatchItemSchema = z.object({
  id: id("wli"),
  label: z.string(),
  display_name: z.string(),
  aliases: z.array(z.string()),
  enabled: z.boolean(),
});

export const SightingSchema = z.object({
  detection_id: id("det"),
  frame_id: id("frm"),
  day: z.string(),
  ts_ms: z.number().int(),
  ts_local: z.string(),
  score: z.number(),
  certainty: CertaintySchema,
  bbox: BBoxSchema,
  thumb_url: z.string(),
  full_url: z.string(),
  open_url: z.string(),
  place: PlaceSchema.nullable(),
  caption: z.string().nullable(),
});

export const LastSeenSchema = z.object({
  watch_item: WatchItemSchema,
  status: z.enum(["seen", "uncertain", "not_seen"]),
  last_confident: SightingSchema.nullable(),
  newer_uncertain: SightingSchema.nullable(),
});

export const LastSeenResponseSchema = z.object({
  items: z.array(LastSeenSchema),
  searched_days: z.number().int(),
});

export const HealthSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
  contract: z.literal("aiglasses.lifelog.v1"),
  mode: z.enum(["live", "demo"]),
  research_prototype: z.literal(true),
  certified_aid: z.literal(false),
  capture_paused: z.boolean(),
  local_first: z.boolean(),
  audio_enabled: z.boolean(),
});

export const PrivacySettingsSchema = z.object({
  capture_paused: z.boolean(),
  paused_until_ms: z.number().int().nullable(),
  open_pause_id: z.string().nullable(),
  retention_days: z.number().int().min(1).max(365),
  local_first: z.boolean(),
  audio_enabled: z.boolean(),
  audio_consent_ack_ms: z.number().int().nullable(),
  keep_raw_audio: z.boolean(),
  face_blur: z.boolean(),
  location_enabled: z.boolean(),
  cloud_vision_enabled: z.boolean(),
  next_purge_ms: z.number().int(),
});

export const GeneralSettingsSchema = z.object({
  timezone: z.string(),
  locale: LocaleSchema,
  summary_language: LocaleSchema,
  llm_provider: z.enum(["deepseek", "ollama", "extractive"]),
  ollama_url: z.string(),
  ollama_model: z.string(),
  summary_time_local: z.string(),
  default_frame_interval_s: z.number().int(),
});

export const HeartbeatSchema = z.object({
  battery_pct: z.number().int().nullable(),
  free_storage_mb: z.number().int().nullable(),
  queued_items: z.number().int().nullable(),
  firmware: z.string().nullable(),
  uptime_ms: z.number().int().nullable(),
  boot_id: z.string().nullable(),
});

export const DeviceSchema = z.object({
  id: id("dev"),
  name: z.string(),
  kind: z.enum(["esp32_glasses", "apple_watch", "iphone_relay", "phone_web", "shortcut"]),
  enabled: z.boolean(),
  frame_interval_s: z.number().int(),
  created_ms: z.number().int(),
  last_seen_ms: z.number().int().nullable(),
  status: HeartbeatSchema.nullable(),
  revoked: z.boolean(),
});

export const DevicesResponseSchema = z.object({
  devices: z.array(DeviceSchema),
});

export const BackupConfigSchema = z.object({
  enabled: z.boolean(),
  target_type: z.enum(["cloud", "nas"]).nullable(),
  remote: z.string().nullable(),
  path: z.string(),
  schedule: z.enum(["nightly", "hourly", "manual"]),
  include_raw_audio: z.boolean(),
});

export const BackupRunSchema = z.object({
  id: id("bkp"),
  started_ms: z.number().int(),
  finished_ms: z.number().int().nullable(),
  state: z.enum(["running", "ok", "failed", "skipped_local_first", "skipped_disabled"]),
  remote: z.string().nullable(),
  target_type: z.string().nullable(),
  files: z.number().int(),
  bytes: z.number().int(),
  deleted: z.number().int(),
  error: z.string().nullable(),
});

export const BackupStatusSchema = z.object({
  state: z.enum(["disabled", "idle", "running", "ok", "failed", "blocked_local_first", "rclone_missing"]),
  last_run: BackupRunSchema.nullable(),
  next_run_ms: z.number().int().nullable(),
});

export const PlacesResponseSchema = z.object({
  places: z.array(PlaceSchema),
});

export const WatchlistResponseSchema = z.object({
  items: z.array(WatchItemSchema),
});

export const AsksFileSchema = z.object({
  items: z.array(AskResponseSchema),
});

export const ImageRegistrySchema = z.record(
  z.string(),
  z.object({
    scene: z.string(),
    src: z.string(),
    thumb: z.string(),
    width: z.number().int(),
    height: z.number().int(),
  }),
);

export type Locale = z.infer<typeof LocaleSchema>;
export type Certainty = z.infer<typeof CertaintySchema>;
export type Speaker = z.infer<typeof SpeakerSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type AskResponse = z.infer<typeof AskResponseSchema>;
export type AskRequest = z.infer<typeof AskRequestSchema>;
export type SummaryItem = z.infer<typeof SummaryItemSchema>;
export type PlaceItem = z.infer<typeof PlaceItemSchema>;
export type PersonItem = z.infer<typeof PersonItemSchema>;
export type QuoteItem = z.infer<typeof QuoteItemSchema>;
export type DaySummary = z.infer<typeof DaySummarySchema>;
export type DayInfo = z.infer<typeof DayInfoSchema>;
export type ArchiveDay = z.infer<typeof ArchiveDaySchema>;
export type YearArchive = z.infer<typeof YearArchiveSchema>;
export type Timeline = z.infer<typeof TimelineSchema>;
export type FrameDetail = z.infer<typeof FrameDetailSchema>;
export type Utterance = z.infer<typeof UtteranceSchema>;
export type Segment = z.infer<typeof SegmentSchema>;
export type SpeakerDay = z.infer<typeof SpeakerDaySchema>;
export type WatchItem = z.infer<typeof WatchItemSchema>;
export type LastSeen = z.infer<typeof LastSeenSchema>;
export type Health = z.infer<typeof HealthSchema>;
export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;
export type GeneralSettings = z.infer<typeof GeneralSettingsSchema>;
export type Device = z.infer<typeof DeviceSchema>;
export type BackupConfig = z.infer<typeof BackupConfigSchema>;
export type BackupStatus = z.infer<typeof BackupStatusSchema>;
export type BBox = z.infer<typeof BBoxSchema>;
