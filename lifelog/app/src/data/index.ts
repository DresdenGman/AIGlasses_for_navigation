import demo from "./demo.json";

export type Locale = "en" | "zh";
export interface LText { en: string; zh: string }

export interface Segment {
  id: string; startMs: number; endMs: number; start: string; end: string;
  certainty: string; photo: string;
  title: LText; summary: LText; place: LText;
}
export interface SummaryItem { text: string; certainty: string }
export interface DaySummary {
  headline: string; places: SummaryItem[]; activities: SummaryItem[];
  people: SummaryItem[]; quotes: SummaryItem[]; uncertain: SummaryItem[];
}
export interface Evidence { label: string; time: string; certainty: string; seg: number | null }
export interface Answer {
  id: string; q: string; a: string; status: string; uncertain: boolean; evidence: Evidence[];
}
export interface Sighting {
  day: string; time: string; place: string; score: number; certainty: string;
  bbox?: { x: number; y: number; w: number; h: number } | null; frame?: string;
}
export interface TrackedObject {
  key: string; name: LText; note: LText; aliases: string[]; status: string; photo: string;
  last: Sighting | null; newerUncertain: Sighting | null; sightings: (Sighting | null)[];
}
export interface GuideItem { time: string; text: string; certainty: string; score: number | null }

export const data = demo as unknown as {
  day: string; today: string; segments: Segment[];
  summary: Record<Locale, DaySummary>;
  answers: Record<Locale, Answer[]>;
  objects: TrackedObject[]; guideFeed: GuideItem[];
  backups: { started: string; state: string; target: string; files: number; bytes: number }[];
  egress: { ts: string; purpose: string; host: string; bytes: number; items: Record<string, number> }[];
  purges: { ts: string; trigger: string; days: string[]; frames: number; bytes: number }[];
  settings: {
    retention_days: number; local_first: boolean; audio_enabled: boolean; face_blur: boolean;
    location_enabled: boolean; cloud_vision_enabled: boolean; capture_paused: boolean;
    frame_interval_s: number;
    backup: { enabled: boolean; target_type: string; encrypted: boolean; schedule_local: string };
  };
  year: {
    days_total: number; days_captured: number; hours_captured: number; frames: number;
    questions_asked: number; objects_found: number; uncertain_items: number; days_with_uncertain: number;
    backups_ok_last_30: number; tracked_objects: number;
    top_places: { place: string; days: number }[];
  };
  framesTotal: number;
};

export const t = (locale: Locale, text: LText) => text[locale];

const UI = {
  appName: { en: "Lifelog", zh: "生活档案" },
  tagline: { en: "AI Glasses · Memory Archive", zh: "AI 眼镜 · 记忆档案" },
  demoBanner: {
    en: "Front-end demo — all records on this device are fictional showcase data (sample day 2026-04-18). No real capture is running.",
    zh: "前端演示版——本机所有记录均为虚构示例数据（示例日 2026-04-18），并未进行真实采集。",
  },
  nav: {
    today: { en: "Today", zh: "今日" }, timeline: { en: "Timeline", zh: "时间线" },
    summary: { en: "Summary", zh: "总结" }, ask: { en: "Ask", zh: "问答" },
    objects: { en: "Objects", zh: "物品" }, guide: { en: "Guide", zh: "导引" },
    backup: { en: "Backup", zh: "备份" }, privacy: { en: "Privacy", zh: "隐私" },
    settings: { en: "Settings", zh: "设置" },
  } as Record<string, LText>,
  more: { en: "More", zh: "更多" },
  uncertain: { en: "uncertain", zh: "不确定" },
  notFound: { en: "not in records", zh: "记录中未找到" },
  confident: { en: "confident", zh: "可信" },
} as const;

export type UIKey = keyof typeof UI;
export const ui = (locale: Locale, key: string): string => {
  const v = (UI as Record<string, unknown>)[key];
  if (typeof v === "object" && v !== null && "en" in v) return (v as LText)[locale];
  if (typeof v === "object" && v !== null) {
    const parts = key.split(".");
    let node: unknown = v;
    for (const p of parts.slice(1)) node = (node as Record<string, unknown>)?.[p];
    if (node && typeof node === "object" && "en" in (node as LText)) return (node as LText)[locale];
  }
  return key;
};
export const navLabel = (locale: Locale, key: string) => UI.nav[key][locale];
export const L = {
  appName: (l: Locale) => UI.appName[l], tagline: (l: Locale) => UI.tagline[l],
  demoBanner: (l: Locale) => UI.demoBanner[l], more: (l: Locale) => UI.more[l],
  uncertain: (l: Locale) => UI.uncertain[l], notFound: (l: Locale) => UI.notFound[l],
  confident: (l: Locale) => UI.confident[l],
};
