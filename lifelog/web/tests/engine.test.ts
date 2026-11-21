/**
 * Engine and data guards, modelled on the test list the AI Studio
 * build shipped with: citations must resolve, quotes must be verbatim,
 * the three answer states must keep their published distribution, the
 * privacy baseline must stay local-first, and the free-question search
 * must answer / abstain / refuse-for-pause correctly. Run with
 * `npm run test:unit`. If one of these fails after a data edit, the
 * edit changed a published fact — fix the data, not the test.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { showcase } from "../src/lib/api/showcase";
import { parseQuestionTime } from "../src/lib/search";
import { FEATURED_DAY, midnightMs } from "../src/lib/time";

const DATA_DIR = join(process.cwd(), "showcase-data");

function* jsonFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* jsonFiles(path);
    else if (entry.name.endsWith(".json")) yield path;
  }
}

/**
 * Every object with a string `id`, from every showcase data file.
 * Ids are shared across locales (the same caption id exists in the en
 * and zh-CN files), so each id maps to all of its records.
 */
const recordsById = new Map<string, unknown[]>();
for (const file of jsonFiles(DATA_DIR)) {
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
    } else if (node && typeof node === "object") {
      const record = node as Record<string, unknown>;
      if (typeof record.id === "string") {
        const list = recordsById.get(record.id) ?? [];
        list.push(record);
        recordsById.set(record.id, list);
      }
      for (const child of Object.values(record)) walk(child);
    }
  };
  walk(parsed);
}

test("prepared questions: 46 per locale, ids aligned across locales", () => {
  const en = showcase.preparedAsks("en");
  const zh = showcase.preparedAsks("zh-CN");
  assert.equal(en.length, 46);
  assert.equal(zh.length, 46);
  assert.deepEqual(
    zh.map((item) => item.id),
    en.map((item) => item.id),
  );
});

test("prepared questions: three-state distribution stays 23 / 12 / 11", () => {
  for (const locale of ["en", "zh-CN"] as const) {
    const counts = { answered: 0, uncertain: 0, not_found: 0 };
    for (const item of showcase.preparedAsks(locale)) counts[item.status] += 1;
    assert.deepEqual(counts, { answered: 23, uncertain: 12, not_found: 11 }, locale);
  }
});

test("prepared questions: not_found abstains, uncertain stays amber", () => {
  for (const item of showcase.preparedAsks("en")) {
    if (item.status === "not_found") assert.equal(item.citations.length, 0, item.id);
    if (item.status === "uncertain") assert.equal(item.ui_tone, "amber", item.id);
  }
});

test("prepared questions: every citation resolves to a real record", () => {
  for (const locale of ["en", "zh-CN"] as const) {
    for (const item of showcase.preparedAsks(locale)) {
      for (const citation of item.citations) {
        assert.ok(recordsById.has(citation.evidence_id), `${item.id} -> ${citation.evidence_id}`);
      }
    }
  }
});

test("prepared questions: every quote is verbatim in its source record", () => {
  for (const locale of ["en", "zh-CN"] as const) {
    for (const item of showcase.preparedAsks(locale)) {
      for (const citation of item.citations) {
        if (citation.quote === null) continue;
        const records = recordsById.get(citation.evidence_id);
        assert.ok(records && records.length > 0, `${item.id} -> ${citation.evidence_id}`);
        assert.ok(
          records.some((record) => JSON.stringify(record).includes(citation.quote ?? "")),
          `${item.id} quote not verbatim in ${citation.evidence_id}`,
        );
      }
    }
  }
});

test("summary citations resolve to real records too", () => {
  const summary = showcase.getSummary(FEATURED_DAY, "en");
  assert.ok(summary);
  const items = [...summary.places, ...summary.activities, ...summary.people, ...summary.quotes, ...summary.uncertain];
  assert.ok(items.length > 0);
  for (const item of items) {
    for (const citation of item.citations) {
      assert.ok(recordsById.has(citation.evidence_id), `${item.id} -> ${citation.evidence_id}`);
    }
  }
});

test("privacy baseline stays local-first with cloud paths off", () => {
  const privacy = showcase.getPrivacy();
  assert.equal(privacy.local_first, true);
  assert.equal(privacy.cloud_vision_enabled, false);
  assert.equal(privacy.keep_raw_audio, false);
  assert.equal(privacy.face_blur, true);
  assert.equal(privacy.retention_days, 365);
  assert.equal(showcase.getBackupConfig().target_type, "nas");
});

test("free question: a supported question is answered with an audit trail", () => {
  const r = showcase.ask({ question: "What did I do with the screws from the lamp?", locale: "en", day: FEATURED_DAY });
  assert.equal(r.provider, "extractive");
  assert.equal(r.status, "answered");
  assert.ok(r.citations.length >= 1);
  assert.equal(r.audit?.gate, 0.7);
  assert.ok((r.audit?.above_floor ?? 0) >= 1);
  assert.ok((r.audit?.matched ?? 0) >= (r.audit?.above_floor ?? 0));
});

test("free question: weak support stays uncertain, never a guess", () => {
  const r = showcase.ask({ question: "What did I have for breakfast?", locale: "en", day: FEATURED_DAY });
  assert.equal(r.status, "uncertain");
  assert.ok(r.validation.reasons.includes("below_answer_min"));
});

test("free question: a moment inside the pause is refused as paused", () => {
  const r = showcase.ask({ question: "What was I doing at 12:45?", locale: "en", day: FEATURED_DAY });
  assert.equal(r.status, "not_found");
  assert.deepEqual(r.validation.reasons, ["paused_window"]);
  assert.match(r.answer, /paused/i);
});

test("free question: the pause refusal works in Chinese too", () => {
  const r = showcase.ask({ question: "我12点45分在做什么？", locale: "zh-CN", day: FEATURED_DAY });
  assert.equal(r.status, "not_found");
  assert.deepEqual(r.validation.reasons, ["paused_window"]);
});

test("free question: Chinese retrieval answers from the record", () => {
  const r = showcase.ask({ question: "我把螺丝放在哪里了？", locale: "zh-CN", day: FEATURED_DAY });
  assert.equal(r.status, "answered");
  assert.ok(r.citations.length >= 1);
});

test("parseQuestionTime: colon, meridiem and Chinese forms; none when absent", () => {
  const midnight = midnightMs(FEATURED_DAY);
  assert.equal(parseQuestionTime("What was I doing at 12:45?", FEATURED_DAY), midnight + 12 * 3_600_000 + 45 * 60_000);
  assert.equal(parseQuestionTime("Did I leave at 3 pm?", FEATURED_DAY), midnight + 15 * 3_600_000);
  assert.equal(parseQuestionTime("我下午3点半在做什么？", FEATURED_DAY), midnight + 15 * 3_600_000 + 30 * 60_000);
  assert.equal(parseQuestionTime("What did I have for breakfast?", FEATURED_DAY), null);
});
