import type { AskRequest, AskResponse, Citation, FrameDetail, Locale, Utterance } from "@/lib/api/schemas";
import { FEATURED_DAY, formatClock, isInsidePause, midnightMs } from "@/lib/time";

/** Minimum share of question terms a record must match to be considered at all. */
export const EVIDENCE_FLOOR = 0.34;
/** Best evidence score a record must reach before the engine answers directly. */
export const ANSWER_GATE = 0.7;
/** How far either side of a time named in the question the search looks. */
const TIME_WINDOW_MS = 30 * 60_000;

export type PauseWindow = { start_ms: number; end_ms: number | null };

export type SearchDoc = {
  evidence_id: string;
  kind: Citation["kind"];
  text: string;
  day: string;
  ts_ms: number;
  ts_end_ms: number;
  ts_local: string;
  frame_id: string | null;
  score: number;
  certainty: "confident" | "uncertain";
  speaker: Citation["speaker"];
};

const EN_STOP = new Set([
  "i", "me", "my", "the", "a", "an", "was", "were", "did", "do", "does", "where", "what", "who",
  "when", "how", "is", "are", "on", "in", "at", "to", "of", "and", "it", "that", "this", "for",
  "with", "about", "during", "between", "there", "here", "put", "leave", "left", "say", "said",
  "have", "has", "had", "you", "your", "we", "they", "from", "not", "into", "or",
]);

const ZH_STOP = new Set([
  "的", "了", "在", "吗", "呢", "我", "你", "是", "哪", "什", "么", "怎", "谁", "那", "这", "有",
  "和", "与", "就", "也", "不", "把", "被", "到", "去", "来", "说", "过", "里", "个", "什么", "怎么",
]);

export function normalizeQuestion(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensOf(input: string): string[] {
  const norm = normalizeQuestion(input);
  if (/[\u3400-\u9fff]/.test(norm)) {
    // Chinese has no word spaces: match on single characters plus the
    // two-character bigrams between them. Bigrams keep a shared character
    // in an unrelated word from counting as a match on its own.
    const chars = [...norm.replace(/\s/g, "")];
    const out = new Set<string>();
    for (const ch of chars) {
      if (ch.trim() && !ZH_STOP.has(ch)) out.add(ch);
    }
    for (let i = 0; i + 1 < chars.length; i++) {
      const a = chars[i] ?? "";
      const b = chars[i + 1] ?? "";
      if (a && b && !ZH_STOP.has(a) && !ZH_STOP.has(b)) out.add(a + b);
    }
    return [...out];
  }
  return norm.split(" ").filter((word) => word.length > 1 && !EN_STOP.has(word));
}

/**
 * Resolve a time of day named in the question ("12:45", "3 pm",
 * "下午3点半") to an epoch ms inside `day`, or null when the question
 * names no time. Deliberately small: one clock time, read literally.
 */
export function parseQuestionTime(question: string, day: string): number | null {
  const raw = question.toLowerCase();
  const pm = /(pm|下午|晚上|中午)/.test(raw);
  const am = /(am|上午|早上|凌晨)/.test(raw);
  const adjust = (hour: number) => {
    if (pm && hour < 12) return hour + 12;
    if (am && hour === 12) return 0;
    return hour;
  };
  const at = (hour: number, minute: number) => {
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return midnightMs(day) + hour * 3_600_000 + minute * 60_000;
  };
  const colon = raw.match(/(\d{1,2}):(\d{2})/);
  if (colon) return at(adjust(Number(colon[1])), Number(colon[2]));
  const dotted = raw.match(/(?:^|\D)(\d{1,2})\s*(?:点|时)(?:\s*(\d{1,2})\s*分|\s*(半))?/);
  if (dotted) {
    const minute = dotted[2] ? Number(dotted[2]) : dotted[3] ? 30 : 0;
    return at(adjust(Number(dotted[1])), minute);
  }
  const meridiem = raw.match(/(\d{1,2})\s*(?:am|pm)\b/);
  if (meridiem) return at(adjust(Number(meridiem[1])), 0);
  return null;
}

function pausedAnswer(day: string, ms: number, locale: Locale): string {
  const clock = formatClock(ms, locale);
  if (locale === "zh-CN") return `${clock} 采集处于暂停。那段时间没有存下任何东西，无从查找。`;
  return `Capture was paused at ${clock} on ${day}. Nothing was stored then, so there is nothing to find.`;
}

export function notFoundAnswer(day: string, locale: Locale): string {
  if (locale === "zh-CN") return `在 ${day} 的记录里没有找到相关内容。`;
  return `I couldn't find this in the records for ${day}.`;
}

function uncertainAnswer(locale: Locale): string {
  if (locale === "zh-CN") return "找到了可能相关的记录，但没有一条清楚地回答这个问题。";
  return "Possibly related records found, but none clearly answer this.";
}

function nearestFrame(frames: FrameDetail[], ms: number): FrameDetail | null {
  let best: FrameDetail | null = null;
  let dist = Number.POSITIVE_INFINITY;
  for (const frame of frames) {
    if (frame.quality !== "ok") continue;
    const gap = Math.abs(frame.ts_ms - ms);
    if (gap < dist) {
      dist = gap;
      best = frame;
    }
  }
  if (!best || dist > 60_000) return null;
  return best;
}

export function documentsFromDay(day: string, frames: FrameDetail[], utterances: Utterance[]): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const utterance of utterances) {
    const frame = nearestFrame(frames, utterance.start_ms);
    docs.push({
      evidence_id: utterance.id,
      kind: "utterance",
      text: utterance.text,
      day,
      ts_ms: utterance.start_ms,
      ts_end_ms: utterance.end_ms,
      ts_local: utterance.ts_local,
      frame_id: frame?.id ?? null,
      score: utterance.score,
      certainty: utterance.certainty,
      speaker: utterance.speaker,
    });
  }
  for (const frame of frames) {
    for (const caption of frame.captions) {
      docs.push({
        evidence_id: caption.id,
        kind: caption.kind === "ocr" ? "ocr" : "caption",
        text: caption.text,
        day,
        ts_ms: frame.ts_ms,
        ts_end_ms: frame.ts_ms,
        ts_local: frame.ts_local,
        frame_id: frame.id,
        score: caption.score,
        certainty: caption.score >= 0.55 ? "confident" : "uncertain",
        speaker: null,
      });
    }
  }
  return docs;
}

function toCitation(doc: SearchDoc): Citation {
  const frameId = doc.frame_id;
  return {
    evidence_id: doc.evidence_id,
    kind: doc.kind,
    day: doc.day,
    ts_ms: doc.ts_ms,
    ts_end_ms: doc.ts_end_ms,
    ts_local: doc.ts_local,
    frame_id: frameId,
    thumb_url: frameId ? `/api/lifelog/media/frames/${frameId}?variant=thumb` : null,
    open_url: `/day/${doc.day}?t=${doc.ts_ms}&focus=${doc.evidence_id}`,
    quote: doc.kind === "utterance" || doc.kind === "ocr" ? doc.text : null,
    speaker: doc.speaker,
    bbox: null,
    score: Math.round(doc.score * 100) / 100,
    certainty: doc.certainty,
  };
}

function base(question: string): Pick<AskResponse, "question" | "model" | "local_first" | "latency_ms"> {
  return {
    question,
    model: null,
    local_first: true,
    latency_ms: 4,
  };
}

export function answerQuestion(
  request: AskRequest,
  precomputed: AskResponse[],
  docs: SearchDoc[],
  pauses: PauseWindow[] = [],
): AskResponse {
  const locale: Locale = request.locale === "en" ? "en" : "zh-CN";
  const day = request.day ?? FEATURED_DAY;
  const norm = normalizeQuestion(request.question);
  const match = precomputed.find((item) => normalizeQuestion(item.question) === norm);
  if (match) {
    return { ...match, question: request.question };
  }

  const audit = (matched: number, aboveFloor: number) => ({
    scanned: docs.length,
    matched,
    above_floor: aboveFloor,
    gate: ANSWER_GATE,
  });

  // A question that names a moment inside a paused interval is answered
  // by the pause itself: nothing was stored then, so there is nothing
  // to search. This is decided before any record is ranked.
  const askedMs = parseQuestionTime(request.question, day);
  if (askedMs !== null && isInsidePause(askedMs, pauses)) {
    return {
      ...base(request.question),
      status: "not_found",
      answer: pausedAnswer(day, askedMs, locale),
      score: 0,
      citations: [],
      evidence_considered: docs.length,
      provider: "extractive",
      validation: {
        dropped_citations: 0,
        dropped_quotes: 0,
        forced_status: "not_found",
        reasons: ["paused_window"],
      },
      audit: audit(0, 0),
    };
  }

  // A question that names a moment is about that moment: only records
  // near it are ranked. Questions without a time search the whole day.
  const pool =
    askedMs === null
      ? docs
      : docs.filter((doc) => doc.ts_end_ms >= askedMs - TIME_WINDOW_MS && doc.ts_ms <= askedMs + TIME_WINDOW_MS);

  // The digits of a named time are not search terms; drop them so they
  // cannot dilute the match against record text.
  const wanted = tokensOf(request.question).filter((token) => askedMs === null || !/\d/.test(token));
  const empty: AskResponse = {
    ...base(request.question),
    status: "not_found",
    answer: notFoundAnswer(day, locale),
    score: 0,
    citations: [],
    evidence_considered: docs.length,
    provider: "extractive",
    validation: {
      dropped_citations: 0,
      dropped_quotes: 0,
      forced_status: "not_found",
      reasons: ["no_evidence"],
    },
    audit: audit(0, 0),
  };
  if (wanted.length === 0) return empty;

  const ranked = pool
    .map((doc) => {
      const hay = new Set(tokensOf(doc.text));
      const matched = wanted.filter((token) => hay.has(token));
      const overlap = matched.length / wanted.length;
      return { doc, overlap, matched: matched.length, evidence: overlap * doc.score };
    })
    .filter((row) => row.matched > 0)
    .sort((a, b) => b.evidence - a.evidence || a.doc.ts_ms - b.doc.ts_ms);

  const aboveFloor = ranked.filter((row) => row.overlap >= EVIDENCE_FLOOR).length;
  if (ranked.length === 0 || (ranked[0]?.overlap ?? 0) < EVIDENCE_FLOOR) {
    return { ...empty, audit: audit(ranked.length, aboveFloor) };
  }

  const top = ranked.slice(0, 3);
  const best = top[0];
  if (!best) return empty;
  const citations = top.map((row) => toCitation(row.doc));
  const strong =
    best.overlap >= 0.6 &&
    best.matched >= 2 &&
    best.doc.certainty === "confident" &&
    best.evidence >= ANSWER_GATE;

  if (strong) {
    return {
      ...base(request.question),
      status: "answered",
      answer: best.doc.text,
      score: Math.round(best.evidence * 100) / 100,
      citations: citations.slice(0, 1),
      evidence_considered: docs.length,
      provider: "extractive",
      validation: { dropped_citations: 0, dropped_quotes: 0, forced_status: null, reasons: [] },
      audit: audit(ranked.length, aboveFloor),
    };
  }

  return {
    ...base(request.question),
    status: "uncertain",
    answer: uncertainAnswer(locale),
    score: Math.round(best.evidence * 100) / 100,
    citations,
    evidence_considered: docs.length,
    provider: "extractive",
    validation: {
      dropped_citations: 0,
      dropped_quotes: 0,
      forced_status: "uncertain",
      reasons: ["below_answer_min"],
    },
    audit: audit(ranked.length, aboveFloor),
  };
}
