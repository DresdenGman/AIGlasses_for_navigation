import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  ArchiveDay,
  AskRequest,
  AskResponse,
  BackupConfig,
  BackupStatus,
  Citation,
  DaySummary,
  Device,
  FrameDetail,
  GeneralSettings,
  Health,
  LastSeen,
  Locale,
  Place,
  PrivacySettings,
  Segment,
  Speaker,
  SpeakerDay,
  Timeline,
  Utterance,
  YearArchive,
} from "@/lib/api/schemas";
import { DaySummarySchema, ShowcaseAnswersFileSchema } from "@/lib/api/schemas";
import { ShowcaseNotFound } from "@/lib/api/load";
import { answerQuestion, documentsFromDay } from "@/lib/search";
import { FEATURED_DAY, TIMEZONE } from "@/lib/time";

const DATA = path.join(process.cwd(), "showcase-data");
const HERO = "hero-2026-04-18";

type RawFrame = {
  id: string;
  device_id: string;
  ts_ms: number;
  width: number;
  height: number;
  quality: FrameDetail["quality"];
  blurred: boolean;
  faces_detected: number;
  place_id: string | null;
  scene: string;
};

type RawUtterance = {
  id: string;
  audio_chunk_id: string;
  start_ms: number;
  end_ms: number;
  speaker_id: string;
  text: string;
  lang: string | null;
  score: number;
  certainty: "confident" | "uncertain";
};

type RawCaption = {
  id: string;
  frame_id: string;
  ts_ms: number;
  kind: "caption" | "dense_caption" | "ocr";
  text: string;
  model: string;
  score: number;
};

type RawDetection = {
  id: string;
  frame_id: string;
  ts_ms: number;
  watch_item_id: string | null;
  label: string;
  score: number;
  certainty: "confident" | "uncertain";
  bbox: { x: number; y: number; w: number; h: number };
};

type YearDay = {
  day: string;
  expires_on: string;
  status: "captured" | "paused" | "deleted";
  capture: { first_ms: number; last_ms: number; pause_minutes: number } | null;
  counts: { frames: number; utterances: number; audio_minutes: number; questions_asked: number; objects_found: number };
  uncertain: unknown[];
  highlight_frame_id: string | null;
};

const KNOWN_REASONS = [
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
] as const;

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(DATA, rel), "utf8")) as T;
}

const cache = new Map<string, unknown>();
function cached<T>(key: string, load: () => T): T {
  if (!cache.has(key)) cache.set(key, load());
  return cache.get(key) as T;
}

function localStamp(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const day = `${get("year")}-${get("month")}-${get("day")}`;
  const month = Number(get("month"));
  const date = Number(get("day"));
  const dst = month > 3 && month < 11 || (month === 3 && date >= 8) || (month === 11 && date < 1);
  return `${day}T${get("hour")}:${get("minute")}:${get("second")}${dst ? "-07:00" : "-08:00"}`;
}

function yearDays(): YearDay[] {
  return cached("year-days", () => readJson<YearDay[]>("year/days.json"));
}

function heroFrames(): RawFrame[] {
  return cached("frames", () => readJson<RawFrame[]>(`${HERO}/frames.json`));
}

function heroCaptions(locale: Locale): RawCaption[] {
  return cached(`cap-${locale}`, () => readJson<RawCaption[]>(`${HERO}/locales/${locale}/captions.json`));
}

function heroUtterances(locale: Locale): RawUtterance[] {
  return cached(`utt-${locale}`, () => readJson<RawUtterance[]>(`${HERO}/locales/${locale}/utterances.json`));
}

function heroDetections(): RawDetection[] {
  return cached("det", () => readJson<RawDetection[]>(`${HERO}/detections.json`));
}

function speakerTable(locale: Locale) {
  return cached(`spk-${locale}`, () => ({
    shared: readJson<Array<{ id: string; label: string; is_self: boolean }>>(`${HERO}/speakers.json`),
    names: readJson<Record<string, string | null>>(`${HERO}/locales/${locale}/speakers.json`),
  }));
}

function speakerRecord(id: string, locale: Locale): Speaker {
  const { shared, names } = speakerTable(locale);
  const row = shared.find((speaker) => speaker.id === id);
  return {
    id,
    label: row?.label ?? "Speaker",
    display_name: names[id] ?? null,
    is_self: row?.is_self ?? false,
  };
}

function placeRecord(id: string | null, locale: Locale): Place | null {
  if (!id) return null;
  const shared = readJson<Array<{ id: string; kind: Place["kind"] }>>(`${HERO}/places.json`);
  const names = readJson<Record<string, string>>(`${HERO}/locales/${locale}/places.json`);
  const row = shared.find((place) => place.id === id);
  return { id, name: names[id] ?? id, kind: row?.kind ?? "manual" };
}

function nearestFrame(ms: number): RawFrame | null {
  let best: RawFrame | null = null;
  let dist = Number.POSITIVE_INFINITY;
  for (const frame of heroFrames()) {
    if (frame.quality !== "ok") continue;
    const gap = Math.abs(frame.ts_ms - ms);
    if (gap < dist) {
      dist = gap;
      best = frame;
    }
  }
  return best && dist <= 60_000 ? best : null;
}

function media(id: string, variant: "thumb" | "full"): string {
  return `/api/lifelog/media/frames/${id}?variant=${variant}`;
}

function openUrl(ms: number, evidenceId: string): string {
  return `/day/${FEATURED_DAY}?t=${ms}&focus=${evidenceId}`;
}

export function resolveEvidence(id: string, locale: Locale): Citation | null {
  const caption = heroCaptions(locale).find((row) => row.id === id);
  if (caption) {
    return {
      evidence_id: caption.id,
      kind: caption.kind === "dense_caption" ? "caption" : caption.kind,
      day: FEATURED_DAY,
      ts_ms: caption.ts_ms,
      ts_end_ms: caption.ts_ms,
      ts_local: localStamp(caption.ts_ms),
      frame_id: caption.frame_id,
      thumb_url: media(caption.frame_id, "thumb"),
      open_url: openUrl(caption.ts_ms, caption.id),
      quote: null,
      speaker: null,
      bbox: null,
      score: caption.score,
      certainty: caption.score >= 0.55 ? "confident" : "uncertain",
    };
  }
  const utterance = heroUtterances(locale).find((row) => row.id === id);
  if (utterance) {
    const frame = nearestFrame(utterance.start_ms);
    return {
      evidence_id: utterance.id,
      kind: "utterance",
      day: FEATURED_DAY,
      ts_ms: utterance.start_ms,
      ts_end_ms: utterance.end_ms,
      ts_local: localStamp(utterance.start_ms),
      frame_id: frame?.id ?? null,
      thumb_url: frame ? media(frame.id, "thumb") : null,
      open_url: openUrl(utterance.start_ms, utterance.id),
      quote: utterance.text,
      speaker: speakerRecord(utterance.speaker_id, locale),
      bbox: null,
      score: utterance.score,
      certainty: utterance.certainty,
    };
  }
  const detection = heroDetections().find((row) => row.id === id);
  if (detection) {
    return {
      evidence_id: detection.id,
      kind: "detection",
      day: FEATURED_DAY,
      ts_ms: detection.ts_ms,
      ts_end_ms: detection.ts_ms,
      ts_local: localStamp(detection.ts_ms),
      frame_id: detection.frame_id,
      thumb_url: media(detection.frame_id, "thumb"),
      open_url: openUrl(detection.ts_ms, detection.id),
      quote: null,
      speaker: null,
      bbox: detection.bbox,
      score: detection.score,
      certainty: detection.certainty,
    };
  }
  return null;
}

function frameDetails(locale: Locale): FrameDetail[] {
  return cached(`details-${locale}`, () => {
    const captions = heroCaptions(locale);
    const utterances = heroUtterances(locale);
    const detections = heroDetections();
    const segments = readJson<Segment[]>(`${HERO}/locales/${locale}/segments.json`);
    return heroFrames().map((frame) => {
      const caps = captions.filter((caption) => caption.frame_id === frame.id);
      const dets = detections.filter((detection) => detection.frame_id === frame.id);
      const segment = segments.find((item) => frame.ts_ms >= item.start_ms && frame.ts_ms < item.end_ms);
      const nearby = utterances
        .filter((utterance) => utterance.start_ms >= frame.ts_ms - 30_000 && utterance.start_ms <= frame.ts_ms + 30_000)
        .map((utterance) => toUtterance(utterance, locale));
      return {
        id: frame.id,
        ts_ms: frame.ts_ms,
        ts_local: localStamp(frame.ts_ms),
        device_id: frame.device_id,
        thumb_url: media(frame.id, "thumb"),
        full_url: media(frame.id, "full"),
        caption: caps.find((caption) => caption.kind === "caption")?.text ?? null,
        quality: frame.quality,
        detections: dets.length,
        segment_id: segment?.id ?? null,
        captions: caps.map((caption) => ({
          id: caption.id,
          kind: caption.kind,
          text: caption.text,
          model: caption.model,
          score: caption.score,
        })),
        detection_list: dets.map((detection) => ({
          id: detection.id,
          label: detection.label,
          watch_item_id: detection.watch_item_id,
          score: detection.score,
          certainty: detection.certainty,
          bbox: detection.bbox,
        })),
        nearby_utterances: nearby,
        place: placeRecord(frame.place_id, locale),
        blurred: frame.blurred,
        faces_detected: frame.faces_detected,
      };
    });
  });
}

function toUtterance(row: RawUtterance, locale: Locale): Utterance {
  return {
    id: row.id,
    audio_chunk_id: row.audio_chunk_id,
    start_ms: row.start_ms,
    end_ms: row.end_ms,
    ts_local: localStamp(row.start_ms),
    speaker: speakerRecord(row.speaker_id, locale),
    text: row.text,
    lang: row.lang,
    score: row.score,
    certainty: row.certainty,
    audio_url: null,
  };
}

function levelFor(frames: number): 0 | 1 | 2 | 3 | 4 {
  if (frames <= 0) return 0;
  if (frames < 40) return 1;
  if (frames < 100) return 2;
  if (frames < 150) return 3;
  return 4;
}

function archiveDays(): ArchiveDay[] {
  return yearDays().map((day) => {
    const first = day.capture?.first_ms ?? Date.parse(`${day.day}T12:00:00Z`);
    const last = day.capture?.last_ms ?? first;
    return {
      day: day.day,
      first_ms: first,
      last_ms: last,
      frames: day.counts.frames,
      audio_seconds: day.counts.audio_minutes * 60,
      utterances: day.counts.utterances,
      segments: day.status === "captured" ? 1 : 0,
      has_summary: day.day === FEATURED_DAY,
      expires_on: day.expires_on,
      cell_state: day.status === "captured" ? "recorded" : day.status,
      uncertain_items: day.uncertain?.length ?? 0,
      level: day.status === "captured" ? levelFor(day.counts.frames) : 0,
    };
  });
}

function answers(locale: Locale) {
  return cached(`answers-${locale}`, () => ShowcaseAnswersFileSchema.parse(readJson(`answers/${locale}.json`)));
}

function toAsk(item: ReturnType<typeof answers>["answers"][number]): AskResponse {
  const citations = item.status === "not_found" ? [] : item.evidence.map((row) => ({
    evidence_id: row.id,
    handle: row.handle,
    kind: row.kind,
    day: row.day,
    ts_ms: row.ts,
    ts_end_ms: row.ts_end,
    ts_local: row.ts_local,
    frame_id: row.frame_id,
    thumb_url: row.frame_id ? media(row.frame_id, "thumb") : null,
    open_url: row.open_url,
    quote: row.quote,
    speaker: null,
    bbox: null,
    score: row.score,
    certainty: row.certainty,
  }));
  return {
    id: item.id,
    question: item.question,
    status: item.status,
    answer: item.answer,
    score: item.score,
    citations,
    evidence_considered: item.evidence_considered,
    provider: "precomputed",
    model: null,
    local_first: true,
    validation: {
      dropped_citations: item.validation.dropped_citations,
      dropped_quotes: item.validation.dropped_quotes,
      forced_status: item.validation.forced_status,
      reasons: item.reasons.filter((reason): reason is (typeof KNOWN_REASONS)[number] =>
        (KNOWN_REASONS as readonly string[]).includes(reason),
      ),
    },
    latency_ms: 6,
    mode: item.mode,
    ui_tone: item.ui_tone,
    reason_text: item.reason_text,
  };
}

const settings = () => cached("settings", () => readJson<{
  timezone: string;
  retention_days: number;
  local_first: boolean;
  audio_enabled: boolean;
  audio_consent_ack_ms: number | null;
  keep_raw_audio: boolean;
  face_blur: boolean;
  location_enabled: boolean;
  cloud_vision_enabled: boolean;
  capture_paused: boolean;
  frame_interval_s: number;
  backup: { enabled: boolean; target_type: "nas" | "cloud"; encrypted: boolean; since_ms: number; schedule_local: string };
}>("settings.json"));

export const showcase = {
  ui(locale: Locale) {
    return readJson<{ year_line: string; retention_line: string; egress_empty: string; uncertain_reasons: Record<string, string> }>(`locales/${locale}/ui.json`);
  },
  stats() {
    return readJson<{
      hours_captured: number;
      frames: number;
      questions_asked: number;
      objects_found: number;
      days_captured: number;
      audio_hours: number;
      top_places: Array<{ place: string; days: number }>;
    }>("year/stats.json");
  },
  months() {
    return readJson<Array<{ month: string; day: string; frame_id: string; frame_label: string; ts_local: string; place: string }>>("year/months.json");
  },
  entities(locale: Locale) {
    const rows = readJson<Array<{ id: string; key: string; kind: "person" | "place" | "object"; appearances_days: number; user_named: boolean }>>("entities.json");
    const names = readJson<Record<string, { name: string; note?: string }>>(`locales/${locale}/entities.json`);
    return rows.map((row) => ({ ...row, name: names[row.id]?.name ?? row.key, note: names[row.id]?.note ?? "" }));
  },
  testimonials(locale: Locale) {
    return readJson<Array<{ id: string; name: string; role: string; rating: number; title: string; quote: string; date: string }>>(`locales/${locale}/testimonials.json`);
  },
  egress() {
    return readJson<Array<{ id: string; ts_local: string; provider_type: string; purpose: string; bytes_out: number; day: string | null }>>("egress_log.json");
  },
  purges() {
    return readJson<Array<{ id: string; ts_local: string; trigger: string; days: string[]; frames: number }>>("purge_log.json");
  },
  backupRuns() {
    return readJson<Array<{ id: string; started_local: string; finished_ms: number | null; state: string; target_type: string; files: number; bytes: number; deleted: number; error: string | null }>>("backup_runs.json");
  },
  trackedObjects(locale: Locale) {
    const rows = readJson<Array<{
      id: string;
      key: string;
      label: string;
      status: "seen" | "uncertain" | "not_seen";
      last_confident: null | { day: string; ts_ms: number; ts_local: string; frame_id: string; frame_label: string; place: string; score: number; certainty: "confident" | "uncertain"; bbox: { x: number; y: number; w: number; h: number } };
      newer_uncertain: null | { day: string; ts_ms: number; ts_local: string; frame_id: string; frame_label: string; place: string; score: number; certainty: "confident" | "uncertain"; bbox: { x: number; y: number; w: number; h: number } };
    }>>("objects.json");
    const names = readJson<Record<string, { display_name: string; note?: string }>>(`locales/${locale}/objects.json`);
    return rows.map((row) => ({ ...row, display_name: names[row.key]?.display_name ?? row.label, note: names[row.key]?.note ?? "" }));
  },
  year(): YearArchive {
    const days = archiveDays();
    const stats = this.stats();
    const first = days[0]?.day ?? FEATURED_DAY;
    const last = days[days.length - 1]?.day ?? FEATURED_DAY;
    return {
      schema: "aiglasses.lifelog.showcase.year",
      version: 1,
      synthetic: true,
      timezone: TIMEZONE,
      from: first,
      to: last,
      featured_day: FEATURED_DAY,
      retention_days: settings().retention_days,
      stats: {
        hours_captured: stats.hours_captured,
        questions_asked: stats.questions_asked,
        objects_found: stats.objects_found,
        days_recorded: stats.days_captured,
      },
      days,
      monthly_highlights: this.months().map((month) => ({ month: month.month, slot: null, label: null })),
      questions_by_day: Object.fromEntries(yearDays().map((day) => [day.day, day.counts.questions_asked])),
      recurring: { people: [], places: [], objects: [] },
      testimonials: [],
    };
  },
  health(): Health {
    const current = settings();
    return {
      status: "ok",
      version: "0.1.0",
      contract: "aiglasses.lifelog.v1",
      mode: "demo",
      research_prototype: true,
      certified_aid: false,
      capture_paused: current.capture_paused,
      local_first: current.local_first,
      audio_enabled: current.audio_enabled,
    };
  },
  listDays() {
    return { days: [...archiveDays()].reverse() };
  },
  hasDay(day: string) {
    return yearDays().some((row) => row.day === day);
  },
  getTimeline(day: string, locale: Locale): Timeline {
    if (!this.hasDay(day)) throw new ShowcaseNotFound(day);
    if (day !== FEATURED_DAY) {
      const info = archiveDays().find((row) => row.day === day);
      return { day, timezone: TIMEZONE, start_ms: info?.first_ms ?? 0, end_ms: info?.last_ms ?? 0, bucket_s: 300, buckets: [], pauses: [], segments: [] };
    }
    const pauses = readJson<Array<{ start_ms: number; end_ms: number; source: string }>>(`${HERO}/pauses.json`);
    const segments = readJson<Array<{ id: string; start_ms: number; end_ms: number; kind: string; title: string; certainty: "confident" | "uncertain" }>>(`${HERO}/locales/${locale}/segments.json`);
    const utterances = heroUtterances(locale);
    const detections = heroDetections();
    const midnight = Date.parse(`${day}T00:00:00-07:00`);
    const buckets = new Map<number, Timeline["buckets"][number]>();
    const ensure = (start: number) => {
      const existing = buckets.get(start);
      if (existing) return existing;
      const created = { start_ms: start, frames: 0, speech: false, audio: false, detections: 0, paused: false, cover_frame_id: null as string | null };
      buckets.set(start, created);
      return created;
    };
    for (const frame of heroFrames()) {
      const start = midnight + Math.floor((frame.ts_ms - midnight) / 300_000) * 300_000;
      const bucket = ensure(start);
      bucket.frames += 1;
      if (!bucket.cover_frame_id && frame.quality === "ok") bucket.cover_frame_id = frame.id;
      bucket.detections += detections.filter((detection) => detection.frame_id === frame.id && detection.certainty === "confident").length;
    }
    for (const utterance of utterances) {
      const start = midnight + Math.floor((utterance.start_ms - midnight) / 300_000) * 300_000;
      const bucket = ensure(start);
      bucket.speech = true;
      bucket.audio = true;
    }
    for (const pause of pauses) {
      for (let ms = pause.start_ms; ms < pause.end_ms; ms += 300_000) ensure(ms).paused = true;
    }
    const first = heroFrames()[0]?.ts_ms ?? 0;
    const last = heroFrames()[heroFrames().length - 1]?.ts_ms ?? 0;
    return {
      day,
      timezone: TIMEZONE,
      start_ms: first,
      end_ms: last,
      bucket_s: 300,
      buckets: [...buckets.values()].sort((a, b) => a.start_ms - b.start_ms),
      pauses,
      segments: segments.map((segment) => ({
        id: segment.id,
        start_ms: segment.start_ms,
        end_ms: segment.end_ms,
        kind: segment.kind,
        title: segment.title,
        certainty: segment.certainty,
      })),
    };
  },
  listFrames(day: string, locale: Locale) {
    if (!this.hasDay(day)) throw new ShowcaseNotFound(day);
    if (day !== FEATURED_DAY) return { frames: [], next_page_token: null };
    return { frames: frameDetails(locale), next_page_token: null };
  },
  listUtterances(day: string, locale: Locale) {
    if (!this.hasDay(day)) throw new ShowcaseNotFound(day);
    if (day !== FEATURED_DAY) return { utterances: [] };
    return { utterances: heroUtterances(locale).map((row) => toUtterance(row, locale)) };
  },
  listSegments(day: string, locale: Locale) {
    if (!this.hasDay(day)) throw new ShowcaseNotFound(day);
    if (day !== FEATURED_DAY) return { segments: [] };
    const rows = readJson<Array<Omit<Segment, "day" | "place"> & { place_id: string | null }>>(`${HERO}/locales/${locale}/segments.json`);
    return {
      segments: rows.map((row) => ({
        ...row,
        day,
        summary: row.summary ?? null,
        place: placeRecord(row.place_id, locale),
      })),
    };
  },
  listSpeakers(day: string, locale: Locale): { speakers: SpeakerDay[] } {
    if (!this.hasDay(day)) throw new ShowcaseNotFound(day);
    if (day !== FEATURED_DAY) return { speakers: [] };
    const shared = readJson<Array<{ id: string; label: string; is_self: boolean }>>(`${HERO}/speakers.json`);
    const utterances = heroUtterances(locale);
    return {
      speakers: shared.map((speaker) => {
        const rows = utterances.filter((utterance) => utterance.speaker_id === speaker.id);
        const speech = rows.reduce((sum, row) => sum + (row.end_ms - row.start_ms), 0);
        return {
          ...speakerRecord(speaker.id, locale),
          speech_ms: speech,
          first_ms: rows[0]?.start_ms ?? 0,
          last_ms: rows[rows.length - 1]?.end_ms ?? 0,
          sample_utterance_id: rows[0]?.id ?? null,
        };
      }),
    };
  },
  getSummary(day: string, locale: Locale): DaySummary | null {
    if (!this.hasDay(day)) throw new ShowcaseNotFound(day);
    if (day !== FEATURED_DAY) return null;
    const raw = readJson<unknown>(`${HERO}/locales/${locale}/summary.json`);
    const parsed = DaySummarySchema.safeParse(raw);
    if (!parsed.success) {
      const detail = parsed.error.issues.slice(0, 6).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
      throw new Error(`Hero summary failed validation: ${detail}`);
    }
    return parsed.data;
  },
  getPlaces(locale: Locale) {
    const shared = readJson<Array<{ id: string; kind: Place["kind"] }>>(`${HERO}/places.json`);
    return { places: shared.map((place) => placeRecord(place.id, locale)).filter((place): place is Place => place !== null) };
  },
  getWatchlist() {
    return { items: [] };
  },
  getLastSeen(locale: Locale): { items: LastSeen[]; searched_days: number } {
    const items = this.trackedObjects(locale).map((row): LastSeen => {
      const sight = (value: NonNullable<typeof row.last_confident> | null, certainty: "confident" | "uncertain") => {
        if (!value) return null;
        return {
          detection_id: `det_${row.id.slice(4)}`,
          frame_id: value.frame_id,
          day: value.day,
          ts_ms: value.ts_ms,
          ts_local: value.ts_local,
          score: value.score,
          certainty,
          bbox: value.bbox,
          thumb_url: media(value.frame_id, "thumb"),
          full_url: media(value.frame_id, "full"),
          open_url: `/day/${value.day}?t=${value.ts_ms}&focus=${value.frame_id}`,
          place: { id: "plc_01JRQ4H8ZE0000000000HOME01", name: value.place, kind: "manual" as const },
          caption: row.note || null,
        };
      };
      return {
        watch_item: {
          id: row.id,
          label: row.label,
          display_name: row.display_name,
          aliases: [],
          enabled: true,
        },
        status: row.status,
        last_confident: sight(row.last_confident, "confident"),
        newer_uncertain: sight(row.newer_uncertain, "uncertain"),
      };
    });
    return { items, searched_days: this.stats().days_captured };
  },
  getPrivacy(): PrivacySettings {
    const current = settings();
    return {
      capture_paused: current.capture_paused,
      paused_until_ms: null,
      open_pause_id: null,
      retention_days: current.retention_days,
      local_first: current.local_first,
      audio_enabled: current.audio_enabled,
      audio_consent_ack_ms: current.audio_consent_ack_ms,
      keep_raw_audio: current.keep_raw_audio,
      face_blur: current.face_blur,
      location_enabled: current.location_enabled,
      cloud_vision_enabled: current.cloud_vision_enabled,
      next_purge_ms: Date.parse("2026-11-19T03:30:00-08:00"),
    };
  },
  getSettings(): GeneralSettings {
    const current = settings();
    return {
      timezone: current.timezone,
      locale: "zh-CN",
      summary_language: "zh-CN",
      llm_provider: "extractive",
      ollama_url: "http://127.0.0.1:11434",
      ollama_model: "qwen3:4b",
      summary_time_local: "22:30",
      default_frame_interval_s: current.frame_interval_s,
    };
  },
  listDevices(): { devices: Device[] } {
    const raw = readJson<Array<{ id: string; name: string; kind: Device["kind"] }>>(`${HERO}/devices.json`);
    const last = heroFrames()[heroFrames().length - 1]?.ts_ms ?? null;
    return {
      devices: raw.map((device) => ({
        id: device.id,
        name: device.name,
        kind: device.kind,
        enabled: true,
        frame_interval_s: settings().frame_interval_s,
        created_ms: settings().audio_consent_ack_ms ?? 0,
        last_seen_ms: last,
        status: { battery_pct: null, free_storage_mb: null, queued_items: 0, firmware: null, uptime_ms: null, boot_id: null },
        revoked: false,
      })),
    };
  },
  getBackupConfig(): BackupConfig {
    const backup = settings().backup;
    return {
      enabled: backup.enabled,
      target_type: backup.target_type,
      remote: "home-nas",
      path: "aiglasses-lifelog",
      schedule: "nightly",
      include_raw_audio: false,
    };
  },
  getBackupStatus(): BackupStatus {
    const runs = this.backupRuns();
    const last = runs[runs.length - 1];
    return {
      state: last?.state === "failed" ? "failed" : "ok",
      last_run: last
        ? {
            id: last.id,
            started_ms: Date.parse(last.started_local),
            finished_ms: last.finished_ms,
            state: last.state === "failed" ? "failed" : "ok",
            remote: "home-nas",
            target_type: last.target_type,
            files: last.files,
            bytes: last.bytes,
            deleted: last.deleted,
            error: last.error,
          }
        : null,
      next_run_ms: null,
    };
  },
  preparedAsks(locale: Locale): AskResponse[] {
    return answers(locale).answers.map((item) => toAsk(item));
  },
  ask(request: AskRequest): AskResponse {
    const locale: Locale = request.locale === "en" ? "en" : "zh-CN";
    const day = request.day ?? FEATURED_DAY;
    if (!this.hasDay(day)) throw new ShowcaseNotFound(day);
    const prepared = day === FEATURED_DAY ? this.preparedAsks(locale) : [];
    const frames = day === FEATURED_DAY ? frameDetails(locale) : [];
    const utterances = day === FEATURED_DAY ? this.listUtterances(day, locale).utterances : [];
    return answerQuestion(request, prepared, documentsFromDay(day, frames, utterances));
  },
};

export type ShowcaseClient = typeof showcase;
