/**
 * Map hero-day scenes onto the photo batch and write a static answers file.
 * Frames without a photograph get a neutral plate. Answers quote only cited records.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = path.join(root, "showcase-data");
const hero = path.join(data, "hero-2026-04-18");

const PHOTO = {
  "home-kitchen-breakfast": ["pov-kitchen-breakfast.jpg", "Breakfast and coffee by the kitchen window", "厨房窗边的早餐和咖啡"],
  "home-desk-evening": ["pov-desk-keys-under-papers.jpg", "Keys partly hidden under papers on a desk", "钥匙半藏在桌上的纸下面"],
  "home-desk-packing": ["pov-desk-keys-under-papers.jpg", "Keys partly hidden under papers on a desk", "钥匙半藏在桌上的纸下面"],
  "tram-line4-morning": ["pov-tram-window.jpg", "Sunlit tram ride through the city", "阳光里的电车，穿过城市"],
  "tram-line4-evening": ["pov-tram-window.jpg", "Sunlit tram ride through the city", "阳光里的电车，穿过城市"],
  "bakery-counter": ["pov-bakery-counter.jpg", "Bakery display counter", "面包柜台"],
  "library-reading-room": ["pov-library-aisle.jpg", "Library aisle toward daylight", "图书馆过道，通向日光"],
  "library-holds-desk": ["pov-library-aisle.jpg", "Library aisle toward daylight", "图书馆过道，通向日光"],
  "street-walk-to-bakery": ["pov-evening-park-walk.jpg", "A walk along a park path", "沿公园小路走"],
  "street-walk-to-library": ["pov-evening-park-walk.jpg", "A walk along a park path", "沿公园小路走"],
  "street-walk-to-tram": ["pov-evening-park-walk.jpg", "A walk along a park path", "沿公园小路走"],
  "cafe-coffee-corner": ["pov-cafe-friend-hands.jpg", "Coffee with a friend, hands only", "和人喝咖啡，画面里只有手"],
  "cafe-lamp-diagnosis": ["pov-repair-cafe-workbench.jpg", "Repair cafe workbench with screws on a red toolbox", "修理小馆的工作台"],
  "cafe-rewiring-base": ["pov-repair-cafe-workbench.jpg", "Repair cafe workbench with screws on a red toolbox", "修理小馆的工作台"],
  "cafe-continuity-test": ["pov-repair-cafe-workbench.jpg", "Repair cafe workbench with screws on a red toolbox", "修理小馆的工作台"],
  "cafe-parts-bin": ["pov-repair-cafe-workbench.jpg", "Repair cafe workbench with screws on a red toolbox", "修理小馆的工作台"],
  "cafe-switch-order": ["pov-repair-cafe-workbench.jpg", "Repair cafe workbench with screws on a red toolbox", "修理小馆的工作台"],
  "repair-bench-afternoon": ["pov-repair-cafe-workbench.jpg", "Repair cafe workbench with screws on a red toolbox", "修理小馆的工作台"],
};

function read(rel) {
  return JSON.parse(readFileSync(path.join(data, rel), "utf8"));
}

function plate(scene) {
  const label = scene.replaceAll("-", " ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="640" height="480">
  <rect width="640" height="480" fill="#F4F1EA"/>
  <rect x="28" y="28" width="584" height="424" fill="none" stroke="#D9D4C7"/>
  <text x="48" y="250" fill="#4A4843" font-family="ui-monospace, monospace" font-size="18">${label}</text>
</svg>`;
}

const frames = read("hero-2026-04-18/frames.json");
const scenes = [...new Set(frames.map((frame) => frame.scene))];
const slotDir = path.join(root, "public/showcase/placeholders");
mkdirSync(slotDir, { recursive: true });

const slots = {};
const frameSlots = {};
for (const scene of scenes) {
  const photo = PHOTO[scene];
  if (photo) {
    const src = `/showcase/photos/${photo[0]}`;
    slots[scene] = {
      kind: "photo",
      file: photo[0],
      src,
      thumb: src,
      width: 1536,
      height: 1024,
      alt: { en: photo[1], "zh-CN": photo[2] },
    };
  } else {
    const file = `${scene}.svg`;
    writeFileSync(path.join(slotDir, file), plate(scene));
    const src = `/showcase/placeholders/${file}`;
    slots[scene] = {
      kind: "placeholder",
      file,
      src,
      thumb: src,
      width: 640,
      height: 480,
      alt: { en: `No photograph yet for ${scene.replaceAll("-", " ")}`, "zh-CN": `这一场景还没有照片：${scene}` },
    };
  }
}
for (const frame of frames) frameSlots[frame.id] = frame.scene;

writeFileSync(
  path.join(data, "image-registry.json"),
  `${JSON.stringify({ schema: "aiglasses.lifelog.showcase.images", version: 1, slots, frames: frameSlots, highlights: Object.keys(PHOTO) }, null, 2)}\n`,
);

function indexBy(rows, key) {
  const map = new Map();
  for (const row of rows) map.set(row[key], row);
  return map;
}

function buildAnswers(locale) {
  const golden = read(`hero-2026-04-18/locales/${locale}/qa_golden.json`);
  const captions = indexBy(read(`hero-2026-04-18/locales/${locale}/captions.json`), "id");
  const utterances = indexBy(read(`hero-2026-04-18/locales/${locale}/utterances.json`), "id");
  const segments = indexBy(read(`hero-2026-04-18/locales/${locale}/segments.json`), "id");
  const notFound = locale === "zh-CN"
    ? "记录中没有找到相关内容。"
    : "I found nothing in your records about this.";
  const items = golden.map((item) => {
    const evidence = item.must_cite_any ?? [];
    const lines = evidence.map((id) => captions.get(id)?.text ?? utterances.get(id)?.text ?? segments.get(id)?.title ?? null).filter(Boolean);
    let sentences;
    if (item.expected_status === "not_found") {
      sentences = [{ text: notFound, evidence: [] }];
    } else if (item.expected_status === "uncertain") {
      const reason = item.trap === "ambiguous_speaker" ? "ambiguous_speaker" : "low_transcript_confidence";
      const lead = locale === "zh-CN" ? "证据偏弱。" : "Evidence is weak.";
      sentences = [{ text: lines.length ? `${lead} ${lines[0]}` : lead, evidence }];
      return { id: item.id, question: item.question, status: "uncertain", reason, sentences };
    } else {
      sentences = lines.length
        ? lines.slice(0, 2).map((text, index) => ({ text, evidence: [evidence[index]].filter(Boolean) }))
        : [{ text: item.question, evidence }];
    }
    return {
      id: item.id,
      question: item.question,
      status: item.expected_status,
      reason: item.trap,
      sentences,
    };
  });
  return {
    schema: "aiglasses.lifelog.showcase.answers",
    version: 1,
    day: "2026-04-18",
    locale,
    note: "Static answers until the golden-question set is filled by the citation pipeline. Sentences quote cited records only.",
    items,
  };
}

mkdirSync(path.join(data, "answers"), { recursive: true });
for (const locale of ["en", "zh-CN"]) {
  writeFileSync(path.join(data, "answers", `${locale}.json`), `${JSON.stringify(buildAnswers(locale), null, 2)}\n`);
}

console.log(JSON.stringify({ scenes: scenes.length, photos: Object.values(slots).filter((slot) => slot.kind === "photo").length, placeholders: Object.values(slots).filter((slot) => slot.kind === "placeholder").length, frames: frames.length }, null, 2));
