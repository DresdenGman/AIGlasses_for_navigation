import type { Locale } from "@/lib/api/schemas";
import metaJson from "../../showcase-data/meta.json";

export const TIMEZONE = "America/Los_Angeles";

/**
 * The archive's calendar anchors live in exactly one place:
 * showcase-data/meta.json ("today" = the archive's present day,
 * "hero_day" = the featured day with full detail). Everything else —
 * routes, links, the hero data directory — derives from these, and
 * scripts/validate-showcase.ts fails the build if they ever drift out
 * of the archive's day list.
 */
export const FEATURED_DAY = metaJson.hero_day;
export const ARCHIVE_TODAY = metaJson.today;

function nthSunday(year: number, monthIndex: number, n: number): number {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const delta = (7 - first.getUTCDay()) % 7;
  return 1 + delta + (n - 1) * 7;
}

export function offsetFor(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const year = y ?? 2026;
  const month = m ?? 1;
  const date = d ?? 1;
  const start = nthSunday(year, 2, 2);
  const end = nthSunday(year, 10, 1);
  const key = month * 100 + date;
  const dst = key >= 300 + start && key < 1100 + end;
  return dst ? "-07:00" : "-08:00";
}

export function midnightMs(day: string): number {
  return Date.parse(`${day}T00:00:00${offsetFor(day)}`);
}

export function hoursBetween(firstMs: number, lastMs: number): number {
  return (lastMs - firstMs) / 3_600_000;
}

export function captureLevel(hours: number): 1 | 2 | 3 | 4 {
  if (hours < 2) return 1;
  if (hours < 4) return 2;
  if (hours < 7) return 3;
  return 4;
}

const intlLocale = (locale: Locale) => (locale === "zh-CN" ? "zh-CN" : "en-GB");

export function formatClock(ms: number, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(ms);
}

export function formatKawara(day: string, locale: Locale): string {
  const [y, m, d] = day.split("-").map(Number);
  const year = y ?? 2026;
  const month = m ?? 1;
  const date = d ?? 1;
  if (locale === "zh-CN") {
    const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "long", timeZone: "UTC" }).format(
      new Date(Date.UTC(year, month - 1, date)),
    );
    return `${year}年${month}月${date}日 ${weekday}`;
  }
  const weekday = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][
    new Date(Date.UTC(year, month - 1, date)).getUTCDay()
  ];
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${weekday}. ${date} ${months[month - 1]}. ${year}`;
}

export function formatDate(day: string, locale: Locale): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1));
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTime(ms: number, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(ms);
}

export function formatSpan(seconds: number, locale: Locale): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (locale === "zh-CN") {
    return hours > 0 ? `${hours} 小时 ${minutes} 分` : `${minutes} 分`;
  }
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

export function formatNumber(value: number, locale: Locale, digits = 0): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function isInsidePause(
  ms: number,
  pauses: { start_ms: number; end_ms: number | null }[],
): boolean {
  return pauses.some((pause) => ms >= pause.start_ms && (pause.end_ms === null || ms < pause.end_ms));
}
