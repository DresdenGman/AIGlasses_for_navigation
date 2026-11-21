import { readFileSync } from "node:fs";
import path from "node:path";
import { showcase } from "../src/lib/api/showcase";
import { ARCHIVE_TODAY, FEATURED_DAY } from "../src/lib/time";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function readData<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), "showcase-data", rel), "utf8")) as T;
}

const year = showcase.year();
assert(year.days.length === 365, "365 days");
assert(year.days.filter((day) => day.cell_state === "recorded").length === 312, "captured");
assert(year.days.filter((day) => day.cell_state === "paused").length === 41, "paused");
assert(year.days.filter((day) => day.cell_state === "deleted").length === 12, "deleted");
const summary = showcase.getSummary(FEATURED_DAY, "en");
assert(summary?.coverage.frames === 162, "162 frames");
assert(showcase.listFrames(FEATURED_DAY, "en").frames.length === 162, "frame list");
assert(showcase.listUtterances(FEATURED_DAY, "en").utterances.length === 214, "utterances");
assert(showcase.getSettings().default_frame_interval_s === 300, "5 minute capture");
const asks = showcase.preparedAsks("en");
const asksZh = showcase.preparedAsks("zh-CN");
assert(asks.length === 46, "46 prepared questions");
assert(asks.filter((item) => item.mode === "hero").length === 24, "24 hero questions");
assert(asks.filter((item) => item.mode === "year").length === 22, "22 year questions");
assert(asksZh.length === asks.length, "both locales list the same questions");
assert(asksZh.every((item, index) => item.id === asks[index]?.id), "locale files share ids");
assert(asks.every((item) => item.status === "not_found" ? item.citations.length === 0 : true), "not found abstains");
assert(asks.find((item) => item.id === "qa_03")?.citations.length, "screws cites");
assert(asks.some((item) => item.status === "uncertain" && item.ui_tone === "amber"), "uncertain stays amber");
assert(asks.every((item) => item.status !== "uncertain" || item.ui_tone === "amber"), "amber only marks uncertain");
assert(showcase.backupRuns().some((run) => run.state === "failed"), "failed backup kept");
assert(showcase.testimonials("en").some((item) => item.rating <= 2), "critical testimonial kept");
assert(showcase.getPrivacy().retention_days === 365, "retention 365");

// --- Calendar single-source-of-truth guards -------------------------------
// meta.json is the only place the archive's "today" and hero day are
// written down. If they (or stats, or any day link in the data) drift
// away from the year day list, the build fails here instead of
// shipping a page whose links land on the 404.
const dayIds = new Set(year.days.map((day) => day.day));
const meta = readData<{ today: string; hero_day: string }>("meta.json");
assert(meta.hero_day === FEATURED_DAY, "meta.hero_day matches FEATURED_DAY");
assert(dayIds.has(FEATURED_DAY), "featured day exists in the archive");
assert(meta.today === ARCHIVE_TODAY, "meta.today matches ARCHIVE_TODAY");
assert(dayIds.has(ARCHIVE_TODAY), "archive today exists in the archive");
const statsRaw = readData<{ first_day: string; last_day: string }>("year/stats.json");
assert(statsRaw.first_day === year.days[0]?.day, "stats.first_day matches the first archive day");
assert(statsRaw.last_day === year.days[year.days.length - 1]?.day, "stats.last_day matches the last archive day");
const settingsRaw = readData<{ audio_consent_ack_ms: number }>("settings.json");
const consentDay = new Date(settingsRaw.audio_consent_ack_ms).toISOString().slice(0, 10);
assert(consentDay >= statsRaw.first_day && consentDay <= statsRaw.last_day, "audio consent date falls inside the archive span");
for (const locale of ["en", "zh-CN"] as const) {
  for (const item of showcase.preparedAsks(locale)) {
    for (const citation of item.citations) {
      assert(dayIds.has(citation.day), `ask ${item.id} cites a day in the archive (${citation.day})`);
    }
  }
  for (const row of showcase.trackedObjects(locale)) {
    for (const sighting of [row.last_confident, row.newer_uncertain]) {
      if (sighting) assert(dayIds.has(sighting.day), `object ${row.id} sighting day in the archive (${sighting.day})`);
    }
  }
}
console.log("showcase data ok");
