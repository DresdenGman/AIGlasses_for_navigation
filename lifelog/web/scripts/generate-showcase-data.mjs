/**
 * Placeholder showcase dataset for the Lifelog year archive.
 * Shapes match the frozen API responses. Replace the JSON and the
 * image files later; keep the same keys.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(root, "showcase-data");
const photoDir = "/showcase/photos";

const DAY = "2026-04-18";
const TZ = "America/Los_Angeles";
const YEAR_FROM = "2025-04-19";
const YEAR_TO = "2026-04-18";

function nid(prefix, n) {
  const body = String(n).padStart(26, "0");
  if (!/^[0-9A-Z]{26}$/.test(body)) throw new Error(`bad id body ${body}`);
  return `${prefix}_${body}`;
}

function addDays(day, n) {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function nthSunday(year, monthIndex, n) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const delta = (7 - first.getUTCDay()) % 7;
  return 1 + delta + (n - 1) * 7;
}

function offsetFor(day) {
  const [y, m, d] = day.split("-").map(Number);
  const start = nthSunday(y, 2, 2);
  const end = nthSunday(y, 10, 1);
  const key = m * 100 + d;
  const dst = key >= 300 + start && key < 1100 + end;
  return dst ? "-07:00" : "-08:00";
}

function atOn(day, hhmm, ss = 0) {
  const [h, m] = hhmm.split(":").map(Number);
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const sec = String(ss).padStart(2, "0");
  return Date.parse(`${day}T${hh}:${mm}:${sec}${offsetFor(day)}`);
}

function at(hhmm) {
  return atOn(DAY, hhmm);
}

function tsLocal(ms) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";
  const day = `${get("year")}-${get("month")}-${get("day")}`;
  return `${day}T${get("hour")}:${get("minute")}:${get("second")}${offsetFor(day)}`;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function writeJson(rel, value) {
  const file = path.join(dataRoot, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

if (Date.parse("2026-04-18T07:00:00-07:00") !== 1776520800000) {
  throw new Error("anchor timestamp drifted");
}
if (offsetFor(DAY) !== "-07:00") throw new Error("featured day should be PDT");
if (at("07:00") !== 1776520800000) throw new Error("at() anchor");

const places = {
  home: { kind: "manual", en: "Home (sample)", "zh-CN": "家（示例）" },
  cafe: { kind: "manual", en: "Fernhollow Repair Cafe", "zh-CN": "蕨谷修理小馆" },
  tram: { kind: "manual", en: "Tram line 4", "zh-CN": "4 路有轨电车" },
  bakery: { kind: "manual", en: "Quill Street Bakery", "zh-CN": "羽笔街面包房" },
  library: { kind: "manual", en: "Larkspur Community Library", "zh-CN": "云雀社区图书馆" },
};

const speakers = {
  self: { label: "Speaker A", is_self: true, en: null, "zh-CN": null },
  bench: { label: "Speaker B", is_self: false, en: "Bench partner", "zh-CN": "台面搭档" },
  tram: { label: "Speaker C", is_self: false, en: null, "zh-CN": null },
  counter: { label: "Speaker D", is_self: false, en: "Counter", "zh-CN": "柜台" },
};

const watch = [
  { key: "screw", label: "screw tray", en: "Screw tray", "zh-CN": "螺丝盒", aliases: ["screws", "螺丝"] },
  { key: "keys", label: "keys", en: "Keys", "zh-CN": "钥匙", aliases: ["key"] },
  { key: "lamp", label: "desk lamp", en: "Desk lamp", "zh-CN": "台灯", aliases: ["lamp"] },
  { key: "tote", label: "canvas tote", en: "Canvas tote", "zh-CN": "帆布袋", aliases: ["tote"] },
  { key: "receipt", label: "receipt", en: "Receipt", "zh-CN": "收据", aliases: ["slip"] },
  { key: "passport", label: "passport", en: "Passport", "zh-CN": "护照", aliases: [] },
  { key: "wallet", label: "wallet", en: "Wallet", "zh-CN": "钱包", aliases: [] },
];

const placeId = {};
Object.keys(places).forEach((key, i) => {
  placeId[key] = nid("plc", i + 1);
});
const speakerId = {};
Object.keys(speakers).forEach((key, i) => {
  speakerId[key] = nid("spk", i + 1);
});
const watchId = {};
watch.forEach((item, i) => {
  watchId[item.key] = nid("wli", i + 1);
});
const deviceGlasses = nid("dev", 1);
const deviceWatch = nid("dev", 2);

const frameDefs = [
  ["07:00", "kitchen-breakfast", "home", "ok", "Breakfast and coffee on a wooden table by the kitchen window.", "厨房窗边的木桌上，早餐和咖啡。"],
  ["07:20", "kitchen-breakfast", "home", "ok", "The same breakfast table, flowers in a jar, light across the wood.", "还是那张早餐桌，瓶里的花，光落在木头上。"],
  ["07:40", "desk-keys", "home", "ok", "Keys partly hidden under papers on a desk.", "钥匙半藏在桌上的纸下面。", [{ item: "keys", score: 0.38, bbox: { x: 0.4, y: 0.46, w: 0.24, h: 0.3 } }]],
  ["08:10", "tram-window", "tram", "ok", "From a tram seat, a sunlit street of bicycles and stone facades.", "从电车座位看出去，阳光里的自行车和石砌门面。"],
  ["08:30", "tram-window", "tram", "ok", "The tram window again, trees and shopfronts along the rails.", "还是电车窗，铁轨边的树和店面。"],
  ["08:50", "tram-window", "tram", "ok", "The street sliding past the tram glass.", "街景从电车玻璃边滑过。"],
  ["09:05", "repair-workbench", "cafe", "ok", "A repair cafe workbench: a red toolbox, a tray of screws, and a lamp.", "修理小馆的工作台：红色工具箱、一盘螺丝，和一盏灯。", [{ item: "lamp", score: 0.74, bbox: { x: 0.22, y: 0.02, w: 0.34, h: 0.42 } }]],
  ["09:40", "repair-workbench", "cafe", "ok", "The workbench in the repair cafe, tools laid out under the lamp.", "修理小馆的工作台，工具摊在灯下。"],
  ["10:20", "cafe-hands", "cafe", "ok", "Across a table, hands around a cup of coffee. The face is out of frame.", "桌子对面，手握着一杯咖啡。脸不在画面里。"],
  ["10:50", null, "cafe", "lens_covered", null, null],
  ["11:00", "repair-workbench", "cafe", "ok", "The red toolbox on the left of the bench, screws in a clear tray on its lid.", "工作台左侧的红色工具箱，盖上的透明盘里是螺丝。"],
  ["11:20", "repair-workbench", "cafe", "ok", "Screws in a small tray sitting on the red toolbox.", "小盘子里的螺丝，放在红色工具箱上。", [{ item: "screw", score: 0.58, bbox: { x: 0.1, y: 0.36, w: 0.2, h: 0.16 } }]],
  ["12:10", "repair-workbench", "cafe", "ok", "The bench before the pause. The toolbox has not moved.", "暂停前的工作台。工具箱没有挪动。"],
  ["13:10", "bakery-counter", "bakery", "ok", "A bakery display: loaves, croissants, and scones behind glass.", "面包柜台：玻璃后面的面包、可颂和司康。"],
  ["13:30", "bakery-counter", "bakery", "ok", "The same bakery case, seen a little closer.", "同一个面包柜，稍近一些。"],
  ["14:10", "repair-workbench", "cafe", "ok", "Back at the bench. The lamp is on over the red toolbox.", "回到工作台。灯照着红色工具箱。", [{ item: "lamp", score: 0.77, bbox: { x: 0.22, y: 0.02, w: 0.34, h: 0.42 } }]],
  ["14:50", "repair-workbench", "cafe", "ok", "Screwdrivers and a bit set beside the toolbox.", "工具箱旁边的螺丝刀和批头。"],
  ["15:20", "repair-workbench", "cafe", "ok", "The desk lamp and the red toolbox share the bench.", "台灯和红色工具箱一起在台面上。", [{ item: "lamp", score: 0.71, bbox: { x: 0.22, y: 0.02, w: 0.34, h: 0.42 } }]],
  ["15:41", "repair-workbench", "cafe", "ok", "A red toolbox on a workbench with a small tray of screws on its lid.", "工作台上的红色工具箱，盖子上有一小盘螺丝。", [{ item: "screw", score: 0.62, bbox: { x: 0.08, y: 0.35, w: 0.24, h: 0.2 } }]],
  ["16:10", "tram-window", "tram", "ok", "The tram window on the way toward the library.", "去图书馆的路上，电车窗外。"],
  ["16:40", "library-aisle", "library", "ok", "A library aisle toward a window of daylight.", "图书馆的过道，通向一扇有日光的窗。"],
  ["17:00", "library-aisle", "library", "ok", "Shelves on both sides of the aisle, the window still ahead.", "过道两边是书架，窗户还在前面。"],
  ["17:30", "library-aisle", "library", "ok", "The long aisle, pendant lights, daylight at the far end.", "长过道，吊灯，远处是日光。"],
  ["18:10", "library-aisle", "library", "ok", "Leaving the aisle. The window is brighter than the shelves.", "离开过道。窗比书架更亮。"],
  ["18:40", "evening-park", null, "ok", "An evening park path, lamps lit, the sun going down beyond the trees.", "傍晚的公园小路，路灯亮了，太阳落到树后。"],
  ["19:20", "evening-park", null, "ok", "The same park path, longer shadows, the skyline in the last light.", "同一条公园路，影子更长，天际线留着最后的光。"],
  ["20:10", null, null, "dark", null, null],
  ["20:40", "evening-park", null, "ok", "The park path after sunset, lamps along the trees.", "日落后的公园路，灯沿着树排开。"],
];

const utteranceDefs = [
  ["07:12", "07:18", "self", 0.86, "I will wear them from the tram through the library, and take them off at home.", "我从电车戴到图书馆，回到家再摘下来。"],
  ["07:42", "07:46", "self", 0.74, "The keys might be on the sideboard. I am not sure.", "钥匙也许在餐边柜上。我不确定。"],
  ["08:22", "08:26", "tram", 0.81, "Next stop is Quill Street.", "下一站是羽笔街。"],
  ["08:34", "08:38", "self", 0.88, "Fernhollow first. The lamp is still in pieces.", "先去蕨谷。灯还是拆开的。"],
  ["09:18", "09:26", "bench", 0.84, "The socket looks heat-marked. We should replace the switch, not just the cord.", "插座上有热痕。该换的是开关，不只是电线。"],
  ["11:02", "11:08", "self", 0.9, "I will leave the screws on top of the red toolbox so I do not lose them.", "我把螺丝放在红色工具箱上面，免得弄丢。"],
  ["11:46", "11:52", "bench", 0.84, "The replacement switch should arrive Tuesday. I will text you the tracking number.", "替换的开关星期二到。我把运单号发给你。"],
  ["12:18", "12:22", "self", 0.8, "Pausing at half past twelve. Lunch is off the record.", "十二点半暂停。午饭不记录。"],
  ["13:18", "13:24", "counter", 0.77, "Rye today, and the oat roll if you want something for the library.", "今天有黑麦，去图书馆的话可以带燕麦卷。"],
  ["13:32", "13:36", "counter", 0.42, "The slip, I think it said, the bag is yours.", "那张纸条，我想是，袋子是你的。"],
  ["15:36", "15:40", "self", 0.87, "The screws are still on the toolbox lid, where I left them.", "螺丝还在工具箱盖上，我放的地方。"],
  ["15:48", "15:52", "bench", 0.8, "Good. Leave the tray there until the switch arrives.", "好。开关到之前，盘子就留在那儿。"],
  ["16:22", "16:26", "tram", 0.72, "Library stop is the one after the park.", "图书馆是公园后的那一站。"],
  ["17:12", "17:18", "self", 0.83, "The aisle runs toward the window. I will read at the far table.", "过道通向窗户。我到最里面的桌子去看会儿书。"],
  ["19:30", "19:36", "self", 0.85, "Home. The lamp can wait until Tuesday.", "到家了。灯可以等到星期二。"],
  ["20:22", "20:28", "self", 0.48, "Did I, the keys, maybe the sideboard.", "我是不是，钥匙，也许在餐边柜。"],
];

const segmentDefs = [
  ["07:00", "08:00", "activity", "home", "Morning at the table", "窗边的早晨", 0.82],
  ["08:00", "09:00", "transit", "tram", "Tram line 4, inbound", "4 路电车，去程", 0.8],
  ["09:00", "12:30", "activity", "cafe", "The lamp in pieces", "拆开的灯", 0.84],
  ["12:30", "13:00", "paused", null, "Paused for lunch", "午饭暂停", 1],
  ["13:00", "14:00", "activity", "bakery", "Rye and an oat roll", "黑麦和燕麦卷", 0.74],
  ["14:00", "16:05", "activity", "cafe", "Screws on the toolbox", "工具箱上的螺丝", 0.86],
  ["16:05", "16:50", "transit", "tram", "Toward the library", "去图书馆", 0.76],
  ["16:50", "18:25", "activity", "library", "An hour among the shelves", "书架间的一小时", 0.81],
  ["18:25", "21:00", "transit", null, "Evening park walk", "傍晚走过公园", 0.6],
];

function speakerObj(key, locale) {
  const spec = speakers[key];
  return {
    id: speakerId[key],
    label: spec.label,
    display_name: spec[locale],
    is_self: spec.is_self,
  };
}

function placeObj(key, locale) {
  if (!key) return null;
  return { id: placeId[key], name: places[key][locale], kind: places[key].kind };
}

const builtFrames = frameDefs.map((row, index) => {
  const [time, scene, place, quality, en, zh, detections] = row;
  const id = nid("frm", index + 1);
  const ts = at(time);
  return {
    n: index + 1,
    id,
    time,
    scene,
    place,
    quality,
    ts_ms: ts,
    caption: { en, "zh-CN": zh },
    detections: detections ?? [],
  };
});

const builtUtts = utteranceDefs.map((row, index) => {
  const [start, end, speaker, score, en, zh] = row;
  const certainty = score >= 0.55 ? "confident" : "uncertain";
  return {
    n: index + 1,
    id: nid("utt", index + 1),
    start,
    end,
    speaker,
    score: round2(score),
    certainty,
    start_ms: at(start),
    end_ms: at(end),
    text: { en, "zh-CN": zh },
  };
});

const chunks = [];
for (const utt of builtUtts) {
  const last = chunks[chunks.length - 1];
  if (!last || utt.start_ms >= last.started_ms + last.duration_ms) {
    chunks.push({
      id: nid("aud", chunks.length + 1),
      device_id: deviceWatch,
      started_ms: utt.start_ms,
      duration_ms: 300000,
      codec: "aac",
      file: null,
      utteranceIds: [utt.id],
    });
  } else {
    last.utteranceIds.push(utt.id);
  }
}
const chunkByUtt = new Map();
for (const chunk of chunks) {
  for (const id of chunk.utteranceIds) chunkByUtt.set(id, chunk.id);
}

const builtSegs = segmentDefs.map((row, index) => {
  const [start, end, kind, place, en, zh, score] = row;
  const start_ms = at(start);
  const end_ms = at(end);
  const frames = builtFrames.filter((f) => f.ts_ms >= start_ms && f.ts_ms < end_ms && f.quality === "ok");
  const utts = builtUtts.filter((u) => u.start_ms >= start_ms && u.start_ms < end_ms);
  const speaker_ids = [...new Set(utts.map((u) => speakerId[u.speaker]))];
  return {
    id: nid("seg", index + 1),
    start,
    end,
    kind,
    place,
    title: { en, "zh-CN": zh },
    start_ms,
    end_ms,
    score: round2(score),
    certainty: score >= 0.7 ? "confident" : "uncertain",
    cover_frame_id: frames[0]?.id ?? null,
    speaker_ids,
  };
});

function segmentFor(ms) {
  return builtSegs.find((s) => ms >= s.start_ms && ms < s.end_ms) ?? null;
}

let detCounter = 1;
let capCounter = 1;
const detections = [];

function mediaUrl(id, variant) {
  return `/api/lifelog/media/frames/${id}?variant=${variant}`;
}

function openUrl(ms, evidenceId) {
  return `/day/${DAY}?t=${ms}&focus=${evidenceId}`;
}

function nearestOkFrame(ms) {
  let best = null;
  let dist = Infinity;
  for (const frame of builtFrames) {
    if (frame.quality !== "ok") continue;
    const d = Math.abs(frame.ts_ms - ms);
    if (d < dist) {
      dist = d;
      best = frame;
    }
  }
  if (!best || dist > 60000) return null;
  return best;
}

function frameDetail(frame, locale, recordDetections) {
  const seg = segmentFor(frame.ts_ms);
  const captionText = frame.caption[locale];
  const captions = [];
  if (captionText && frame.quality === "ok") {
    captions.push({
      id: nid("cap", capCounter++),
      kind: "caption",
      text: captionText,
      model: "fixture",
      score: 0.8,
    });
  }
  const detection_list = frame.detections.map((det) => {
    const id = nid("det", detCounter++);
    const item = watch.find((w) => w.key === det.item);
    const row = {
      id,
      frame_id: frame.id,
      ts_ms: frame.ts_ms,
      label: item.label,
      watch_item_id: watchId[item.key],
      score: round2(det.score),
      certainty: det.score >= 0.45 ? "confident" : "uncertain",
      bbox: det.bbox,
    };
    if (recordDetections) detections.push(row);
    return {
      id: row.id,
      label: row.label,
      watch_item_id: row.watch_item_id,
      score: row.score,
      certainty: row.certainty,
      bbox: row.bbox,
    };
  });
  const nearby = builtUtts
    .filter((u) => u.start_ms >= frame.ts_ms - 30000 && u.start_ms <= frame.ts_ms + 30000)
    .map((u) => utteranceApi(u, locale));
  return {
    id: frame.id,
    ts_ms: frame.ts_ms,
    ts_local: tsLocal(frame.ts_ms),
    device_id: deviceGlasses,
    thumb_url: mediaUrl(frame.id, "thumb"),
    full_url: mediaUrl(frame.id, "full"),
    caption: captionText && frame.quality === "ok" ? captionText : null,
    quality: frame.quality,
    detections: detection_list.length,
    segment_id: seg ? seg.id : null,
    captions,
    detection_list,
    nearby_utterances: nearby,
    place: placeObj(frame.place, locale),
    blurred: true,
    faces_detected: 0,
  };
}

function utteranceApi(utt, locale) {
  return {
    id: utt.id,
    audio_chunk_id: chunkByUtt.get(utt.id),
    start_ms: utt.start_ms,
    end_ms: utt.end_ms,
    ts_local: tsLocal(utt.start_ms),
    speaker: speakerObj(utt.speaker, locale),
    text: utt.text[locale],
    lang: locale === "zh-CN" ? "zh" : "en",
    score: utt.score,
    certainty: utt.certainty,
    audio_url: null,
  };
}

function citeUtterance(utt, locale) {
  const frame = nearestOkFrame(utt.start_ms);
  return {
    evidence_id: utt.id,
    kind: "utterance",
    day: DAY,
    ts_ms: utt.start_ms,
    ts_end_ms: utt.end_ms,
    ts_local: tsLocal(utt.start_ms),
    frame_id: frame ? frame.id : null,
    thumb_url: frame ? mediaUrl(frame.id, "thumb") : null,
    open_url: openUrl(utt.start_ms, utt.id),
    quote: utt.text[locale],
    speaker: speakerObj(utt.speaker, locale),
    bbox: null,
    score: utt.score,
    certainty: utt.certainty,
  };
}

function citeDetection(det, locale) {
  const frame = builtFrames.find((f) => f.id === det.frame_id);
  return {
    evidence_id: det.id,
    kind: "detection",
    day: DAY,
    ts_ms: det.ts_ms,
    ts_end_ms: det.ts_ms,
    ts_local: tsLocal(det.ts_ms),
    frame_id: det.frame_id,
    thumb_url: mediaUrl(det.frame_id, "thumb"),
    open_url: openUrl(det.ts_ms, det.id),
    quote: null,
    speaker: null,
    bbox: det.bbox,
    score: det.score,
    certainty: det.certainty,
    locale_unused: locale,
  };
}

function citeCaption(frame, locale) {
  const detail = frameDetailCache[locale].get(frame.id);
  const cap = detail.captions.find((c) => c.kind === "caption");
  if (!cap) throw new Error(`no caption for ${frame.time}`);
  return {
    evidence_id: cap.id,
    kind: "caption",
    day: DAY,
    ts_ms: frame.ts_ms,
    ts_end_ms: frame.ts_ms,
    ts_local: tsLocal(frame.ts_ms),
    frame_id: frame.id,
    thumb_url: mediaUrl(frame.id, "thumb"),
    open_url: openUrl(frame.ts_ms, cap.id),
    quote: null,
    speaker: null,
    bbox: null,
    score: cap.score,
    certainty: "confident",
  };
}

function citeSegment(seg, locale) {
  const frame = builtFrames.find((f) => f.id === seg.cover_frame_id);
  return {
    evidence_id: seg.id,
    kind: "segment",
    day: DAY,
    ts_ms: seg.start_ms,
    ts_end_ms: seg.end_ms,
    ts_local: tsLocal(seg.start_ms),
    frame_id: frame ? frame.id : null,
    thumb_url: frame ? mediaUrl(frame.id, "thumb") : null,
    open_url: openUrl(seg.start_ms, seg.id),
    quote: null,
    speaker: null,
    bbox: null,
    score: seg.score,
    certainty: seg.certainty,
    locale_unused: locale,
  };
}

const frameDetailCache = { en: new Map(), "zh-CN": new Map() };
for (const locale of ["en", "zh-CN"]) {
  detCounter = 1;
  capCounter = locale === "en" ? 1 : 1000;
  for (const frame of builtFrames) {
    const detail = frameDetail(frame, locale, locale === "en");
    frameDetailCache[locale].set(frame.id, detail);
  }
}

function stripLocaleUnused(citation) {
  const copy = { ...citation };
  delete copy.locale_unused;
  return copy;
}

const detByTime = new Map();
for (const det of detections) {
  const frame = builtFrames.find((f) => f.id === det.frame_id);
  detByTime.set(`${frame.time}:${det.label}`, det);
}

function utt(n) {
  return builtUtts[n - 1];
}
function frameAt(time) {
  const found = builtFrames.find((f) => f.time === time);
  if (!found) throw new Error(`missing frame ${time}`);
  return found;
}
function seg(n) {
  return builtSegs[n - 1];
}

function speechMs(key) {
  return builtUtts.filter((u) => u.speaker === key).reduce((sum, u) => sum + (u.end_ms - u.start_ms), 0);
}

function summaryFor(locale) {
  const L = locale;
  const text = (en, zh) => (L === "zh-CN" ? zh : en);
  const cits = (...items) => items.map(stripLocaleUnused);
  let n = 1;
  const item = (value) => ({ id: `si_${n++}`, ...value });
  const screwDet = detByTime.get("15:41:screw tray");
  const keysDet = detByTime.get("07:40:keys");
  const walk = frameAt("18:40");
  const headline = item({
    section: "headline",
    text: text(
      "A Saturday of a lamp in pieces, a rye roll, and a quiet hour with the shelves.",
      "一个星期六：灯拆开了，一只黑麦卷，还有书架前安静的一小时。",
    ),
    certainty: "confident",
    start_ms: at("07:00"),
    end_ms: at("20:40"),
    segment_ids: [seg(3).id, seg(8).id],
    citations: cits(citeSegment(seg(3), L), citeSegment(seg(8), L)),
  });
  const narrative = [
    item({
      section: "narrative",
      text: text(
        "You left home by the window and said you would wear the glasses from the tram through the library, then take them off at home.",
        "你从窗边的家里出门，说要从电车戴到图书馆，回到家再摘下来。",
      ),
      certainty: "confident",
      start_ms: utt(1).start_ms,
      end_ms: utt(1).end_ms,
      segment_ids: [seg(1).id],
      citations: cits(citeUtterance(utt(1), L), citeCaption(frameAt("07:00"), L)),
    }),
    item({
      section: "narrative",
      text: text(
        "At the repair cafe you left the screws on the red toolbox, in a small metal tray, so they would not get lost.",
        "在修理小馆，你把螺丝留在红色工具箱上的小金属盘里，免得弄丢。",
      ),
      certainty: "confident",
      start_ms: utt(6).start_ms,
      end_ms: screwDet.ts_ms,
      segment_ids: [seg(3).id, seg(6).id],
      citations: cits(citeUtterance(utt(6), L), citeDetection(screwDet, L)),
    }),
    item({
      section: "narrative",
      text: text(
        "The bakery case was full of loaves and pastries. Later you walked a library aisle toward the daylight.",
        "面包柜里是面包和点心。之后你走过图书馆的过道，朝向日光。",
      ),
      certainty: "confident",
      start_ms: utt(9).start_ms,
      end_ms: utt(14).end_ms,
      segment_ids: [seg(5).id, seg(8).id],
      citations: cits(citeUtterance(utt(9), L), citeCaption(frameAt("17:30"), L)),
    }),
  ];
  const placeItems = [
    ["home", seg(1), frameAt("07:00"), "Home in the morning and again after dark.", "早晨在家，天黑后又回到家。"],
    ["tram", seg(2), frameAt("08:10"), "Two rides on tram line 4.", "4 路电车坐了两程。"],
    ["cafe", seg(3), frameAt("15:41"), "Most of the day was the repair bench.", "这一天的大部分在修理台。"],
    ["bakery", seg(5), frameAt("13:10"), "A short stop for bread.", "短暂停留买面包。"],
    ["library", seg(8), frameAt("17:30"), "A quiet hour with the shelves.", "在书架前安静的一小时。"],
  ].map(([key, segment, frame, en, zh]) =>
    item({
      section: "places",
      text: text(en, zh),
      certainty: "confident",
      start_ms: segment.start_ms,
      end_ms: segment.end_ms,
      segment_ids: [segment.id],
      citations: cits(citeCaption(frame, L), citeSegment(segment, L)),
      place_id: placeId[key],
    }),
  );
  const activities = [
    item({
      section: "activities",
      text: text("Taking the desk lamp apart and leaving the screws in the tray.", "拆台灯，并把螺丝留在盘子里。"),
      certainty: "confident",
      start_ms: seg(3).start_ms,
      end_ms: seg(6).end_ms,
      segment_ids: [seg(3).id, seg(6).id],
      citations: cits(citeUtterance(utt(5), L), citeDetection(screwDet, L)),
    }),
    item({
      section: "activities",
      text: text("Riding tram line 4, there and back.", "乘坐 4 路电车，一去一回。"),
      certainty: "confident",
      start_ms: seg(2).start_ms,
      end_ms: seg(7).end_ms,
      segment_ids: [seg(2).id, seg(7).id],
      citations: cits(citeUtterance(utt(3), L)),
    }),
    item({
      section: "activities",
      text: text("Walking the library aisle toward the window.", "走过图书馆过道，朝向窗户。"),
      certainty: "confident",
      start_ms: seg(8).start_ms,
      end_ms: seg(8).end_ms,
      segment_ids: [seg(8).id],
      citations: cits(citeCaption(frameAt("18:10"), L)),
    }),
  ];
  const people = [
    ["self", "You kept the glasses on from morning until the case was closed at home.", "你从早晨戴到家里把眼镜盒合上。", utt(1)],
    ["bench", "The bench partner said the socket was heat-marked and the switch would arrive Tuesday.", "台面搭档说插座有热痕，开关星期二到。", utt(5)],
    ["tram", "An unnamed voice on the tram called the Quill Street stop and the library stop.", "电车上一个未命名的声音报了羽笔街和图书馆。", utt(3)],
    ["counter", "The person at the counter mentioned rye and an oat roll.", "柜台的人提到黑麦和燕麦卷。", utt(9)],
  ].map(([key, en, zh, source]) =>
    item({
      section: "people",
      text: text(en, zh),
      certainty: "confident",
      start_ms: source.start_ms,
      end_ms: source.end_ms,
      segment_ids: [segmentFor(source.start_ms).id],
      citations: cits(citeUtterance(source, L)),
      speaker: speakerObj(key, L),
      speech_ms: speechMs(key),
    }),
  );
  const quotes = [utt(6), utt(7)].map((source) =>
    item({
      section: "quotes",
      text: source.text[L],
      certainty: "confident",
      start_ms: source.start_ms,
      end_ms: source.end_ms,
      segment_ids: [segmentFor(source.start_ms).id],
      citations: cits(citeUtterance(source, L)),
      quote: source.text[L],
      utterance_id: source.id,
      speaker: speakerObj(source.speaker, L),
    }),
  );
  const uncertain = [
    item({
      section: "activities",
      text: text(
        "Keys may have been on the sideboard in the morning. The sighting is below the confidence floor.",
        "早晨钥匙也许在餐边柜上。这次看见低于置信下限。",
      ),
      certainty: "uncertain",
      start_ms: keysDet.ts_ms,
      end_ms: keysDet.ts_ms,
      segment_ids: [seg(1).id],
      citations: cits(citeDetection(keysDet, L)),
    }),
    item({
      section: "quotes",
      text: text(
        "A muffled line at the bakery is below the confidence floor. It is not treated as fact.",
        "面包店里有一句含糊的话，低于置信下限，不当作事实。",
      ),
      certainty: "uncertain",
      start_ms: utt(10).start_ms,
      end_ms: utt(10).end_ms,
      segment_ids: [seg(5).id],
      citations: cits(citeUtterance(utt(10), L)),
    }),
    item({
      section: "places",
      text: text(
        "The evening path looks like a park, but no place name was confirmed.",
        "傍晚的路看起来像公园，但没有确认的地名。",
      ),
      certainty: "uncertain",
      start_ms: walk.ts_ms,
      end_ms: walk.ts_ms,
      segment_ids: [seg(9).id],
      citations: cits(citeCaption(walk, L)),
    }),
  ];
  const audioSeconds = Math.round(chunks.reduce((sum, chunk) => sum + chunk.duration_ms, 0) / 1000);
  return {
    day: DAY,
    timezone: TZ,
    language: L,
    generated_ms: at("22:30"),
    provider: "fixture",
    model: null,
    status: "ok",
    headline,
    narrative,
    places: placeItems,
    activities,
    people,
    quotes,
    uncertain,
    coverage: {
      frames: builtFrames.length,
      audio_seconds: audioSeconds,
      paused_ms: 30 * 60 * 1000,
      first_ms: builtFrames[0].ts_ms,
      last_ms: builtFrames[builtFrames.length - 1].ts_ms,
    },
    validation: { dropped_items: 2, dropped_citations: 0, dropped_quotes: 0 },
  };
}

function timelineFor(locale) {
  const midnight = at("00:00");
  const bucketSet = new Map();
  const ensure = (start) => {
    if (!bucketSet.has(start)) {
      bucketSet.set(start, {
        start_ms: start,
        frames: 0,
        speech: false,
        audio: false,
        detections: 0,
        paused: false,
        cover_frame_id: null,
      });
    }
    return bucketSet.get(start);
  };
  for (const frame of builtFrames) {
    const start = midnight + Math.floor((frame.ts_ms - midnight) / 60000) * 60000;
    const bucket = ensure(start);
    bucket.frames += 1;
    if (!bucket.cover_frame_id && frame.quality === "ok") bucket.cover_frame_id = frame.id;
    const dets = detections.filter((d) => d.frame_id === frame.id && d.certainty === "confident");
    bucket.detections += dets.length;
  }
  for (const uttRow of builtUtts) {
    const start = midnight + Math.floor((uttRow.start_ms - midnight) / 60000) * 60000;
    const bucket = ensure(start);
    bucket.speech = true;
    bucket.audio = true;
  }
  const pauseStart = at("12:30");
  const pauseEnd = at("13:00");
  for (let ms = pauseStart; ms < pauseEnd; ms += 60000) ensure(ms).paused = true;
  return {
    day: DAY,
    timezone: TZ,
    start_ms: builtFrames[0].ts_ms,
    end_ms: builtFrames[builtFrames.length - 1].ts_ms,
    bucket_s: 60,
    buckets: [...bucketSet.values()].sort((a, b) => a.start_ms - b.start_ms),
    pauses: [{ start_ms: pauseStart, end_ms: pauseEnd, source: "owner" }],
    segments: builtSegs.map((s) => ({
      id: s.id,
      start_ms: s.start_ms,
      end_ms: s.end_ms,
      kind: s.kind,
      title: s.title[locale],
      certainty: s.certainty,
    })),
  };
}

function segmentsFor(locale) {
  return {
    segments: builtSegs.map((s) => ({
      id: s.id,
      day: DAY,
      start_ms: s.start_ms,
      end_ms: s.end_ms,
      kind: s.kind,
      title: s.title[locale],
      summary: null,
      place: placeObj(s.place, locale),
      cover_frame_id: s.cover_frame_id,
      speaker_ids: s.speaker_ids,
      score: s.score,
      certainty: s.certainty,
      provider: "fixture",
    })),
  };
}

function speakersFor(locale) {
  return {
    speakers: Object.keys(speakers).map((key) => {
      const rows = builtUtts.filter((u) => u.speaker === key);
      return {
        ...speakerObj(key, locale),
        speech_ms: speechMs(key),
        first_ms: rows[0].start_ms,
        last_ms: rows[rows.length - 1].end_ms,
        sample_utterance_id: rows[0].id,
      };
    }),
  };
}

function validation(reasons, forced) {
  return { dropped_citations: 0, dropped_quotes: 0, forced_status: forced, reasons };
}

function ask(locale, question, status, answer, score, citations, evidence, reasons, forced) {
  return {
    question,
    status,
    answer,
    score: round2(score),
    citations: citations.map(stripLocaleUnused),
    evidence_considered: evidence,
    provider: "precomputed",
    model: null,
    local_first: true,
    validation: validation(reasons, forced),
    latency_ms: 8,
  };
}

function asksFor(locale) {
  const L = locale;
  const screwDet = detByTime.get("15:41:screw tray");
  const keysDet = detByTime.get("07:40:keys");
  const notFound = L === "zh-CN"
    ? `在 ${DAY} 的记录里没有找到相关内容。`
    : `I couldn't find this in the records for ${DAY}.`;
  const items = [
    ask(
      L,
      L === "zh-CN" ? "我螺丝放哪了？" : "Where did I put the screws?",
      "answered",
      L === "zh-CN"
        ? "螺丝在红色工具箱盖上的小金属盘里。你说过要放在那儿。"
        : "The screws are in the small metal tray on the red toolbox. You said you would leave them there.",
      0.81,
      [citeUtterance(utt(6), L), citeDetection(screwDet, L)],
      9,
      [],
      null,
    ),
    ask(
      L,
      L === "zh-CN" ? "台面那边的人怎么说开关？" : "What did the person at the bench say about the switch?",
      "answered",
      L === "zh-CN"
        ? "台面搭档说替换的开关星期二到，并把运单号发给你。"
        : "The bench partner said the replacement switch should arrive Tuesday, and that they would text the tracking number.",
      0.84,
      [citeUtterance(utt(7), L)],
      6,
      [],
      null,
    ),
    ask(
      L,
      L === "zh-CN" ? "钥匙在哪？" : "Where are my keys?",
      "uncertain",
      L === "zh-CN"
        ? "早晨有一次低于置信下限的看见，位置像是家里的餐边柜。"
        : "A morning sighting below the confidence floor looks like the sideboard at home.",
      0.38,
      [citeDetection(keysDet, L)],
      4,
      ["below_answer_min"],
      "uncertain",
    ),
    ask(
      L,
      L === "zh-CN" ? "面包店的人怎么说我的护照？" : "What did the bakery cashier say about my passport?",
      "not_found",
      notFound,
      0,
      [],
      0,
      ["no_evidence"],
      "not_found",
    ),
    ask(
      L,
      L === "zh-CN" ? "午饭那半小时说了什么？" : "What was said during the lunch half hour?",
      "not_found",
      notFound,
      0,
      [],
      0,
      ["paused_window"],
      "not_found",
    ),
    ask(
      L,
      L === "zh-CN" ? "电车上是谁在说话？" : "Who was speaking on the tram?",
      "uncertain",
      L === "zh-CN"
        ? "说话人 C 没有被命名。这个声音说下一站是羽笔街。记录里没有姓名。"
        : "Speaker C has no typed name. That voice said the next stop was Quill Street. The record does not identify them.",
      0.81,
      [citeUtterance(utt(3), L)],
      5,
      ["model_uncertain"],
      "uncertain",
    ),
  ];
  return { items };
}

function watchItems(locale) {
  return watch.map((item) => ({
    id: watchId[item.key],
    label: item.label,
    display_name: item[locale],
    aliases: item.aliases,
    enabled: true,
  }));
}

function sighting(det, locale) {
  const frame = builtFrames.find((f) => f.id === det.frame_id);
  const detail = frameDetailCache[locale].get(frame.id);
  return {
    detection_id: det.id,
    frame_id: frame.id,
    day: DAY,
    ts_ms: det.ts_ms,
    ts_local: tsLocal(det.ts_ms),
    score: det.score,
    certainty: det.certainty,
    bbox: det.bbox,
    thumb_url: mediaUrl(frame.id, "thumb"),
    full_url: mediaUrl(frame.id, "full"),
    open_url: openUrl(det.ts_ms, det.id),
    place: detail.place,
    caption: detail.caption,
  };
}

function lastSeen(locale) {
  const byLabel = new Map();
  for (const det of detections) {
    const list = byLabel.get(det.label) ?? [];
    list.push(det);
    byLabel.set(det.label, list);
  }
  const items = watch.map((item) => {
    const rows = (byLabel.get(item.label) ?? []).slice().sort((a, b) => a.ts_ms - b.ts_ms);
    const confident = rows.filter((d) => d.certainty === "confident");
    const lastConfident = confident.length ? confident[confident.length - 1] : null;
    const latest = rows.length ? rows[rows.length - 1] : null;
    let status = "not_seen";
    let last_confident = null;
    let newer_uncertain = null;
    if (lastConfident) {
      status = "seen";
      last_confident = sighting(lastConfident, locale);
      if (latest && latest.ts_ms > lastConfident.ts_ms && latest.certainty === "uncertain") {
        newer_uncertain = sighting(latest, locale);
      }
    } else if (latest) {
      status = "uncertain";
      newer_uncertain = sighting(latest, locale);
    }
    return {
      watch_item: watchItems(locale).find((w) => w.id === watchId[item.key]),
      status,
      last_confident,
      newer_uncertain,
    };
  });
  return { items, searched_days: 365 };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260418);
const yearDays = [];
let cursor = YEAR_FROM;
while (cursor <= YEAR_TO) {
  yearDays.push(cursor);
  cursor = addDays(cursor, 1);
}
if (yearDays.length !== 365) throw new Error(`expected 365 days, got ${yearDays.length}`);

const questionsByDay = {};
const dayInfos = yearDays.map((day) => {
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
  const weekend = dow === 0 || dow === 6;
  const hours = weekend ? 4 + rand() * 5 : 1.2 + rand() * 3.6;
  const startHour = 7 + Math.floor(rand() * 2);
  const startMin = Math.floor(rand() * 4) * 15;
  const first = atOn(day, `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`);
  const last = first + Math.round(hours * 3600000);
  const questions = Math.floor(rand() * (weekend ? 7 : 4));
  questionsByDay[day] = questions;
  return {
    day,
    first_ms: first,
    last_ms: last,
    frames: Math.max(8, Math.round(hours * 11)),
    audio_seconds: Math.round(hours * 3600 * 0.45),
    utterances: Math.max(4, Math.round(hours * 3.2)),
    segments: Math.max(2, Math.round(hours / 1.6)),
    has_summary: false,
    expires_on: addDays(day, 365),
  };
});

const featuredInfo = dayInfos.find((d) => d.day === DAY);
const audioSeconds = Math.round(chunks.reduce((sum, chunk) => sum + chunk.duration_ms, 0) / 1000);
featuredInfo.first_ms = builtFrames[0].ts_ms;
featuredInfo.last_ms = builtFrames[builtFrames.length - 1].ts_ms;
featuredInfo.frames = builtFrames.length;
featuredInfo.audio_seconds = audioSeconds;
featuredInfo.utterances = builtUtts.length;
featuredInfo.segments = builtSegs.length;
featuredInfo.has_summary = true;
questionsByDay[DAY] = 6;

const cellRand = mulberry32(20260419);
function takeDays(n) {
  const pool = dayInfos.filter((day) => day.day !== DAY && day.cell_state === "recorded");
  const chosen = [];
  while (chosen.length < n && pool.length > 0) {
    const index = Math.floor(cellRand() * pool.length);
    chosen.push(pool.splice(index, 1)[0]);
  }
  return chosen;
}
function blankDay(day) {
  day.frames = 0;
  day.audio_seconds = 0;
  day.utterances = 0;
  day.segments = 0;
  day.has_summary = false;
  day.first_ms = day.last_ms;
  day.level = 0;
  day.uncertain_items = 0;
}
for (const day of dayInfos) {
  day.cell_state = "recorded";
  day.uncertain_items = 0;
  day.level = 1;
}
for (const day of takeDays(12)) {
  day.cell_state = "deleted";
  blankDay(day);
}
for (const day of takeDays(41)) {
  day.cell_state = "paused";
  blankDay(day);
}
for (const day of takeDays(8)) {
  day.cell_state = "expired";
  blankDay(day);
}
for (const day of dayInfos) {
  if (day.cell_state !== "recorded") continue;
  const hours = (day.last_ms - day.first_ms) / 3600000;
  day.level = hours < 2 ? 1 : hours < 4 ? 2 : hours < 7 ? 3 : 4;
  if (day.day !== DAY && cellRand() < 0.3) day.uncertain_items = 1 + Math.floor(cellRand() * 3);
}
featuredInfo.cell_state = "recorded";
featuredInfo.uncertain_items = 3;
featuredInfo.level = 4;

const hoursCaptured = Math.round((dayInfos.reduce((sum, d) => sum + (d.last_ms - d.first_ms), 0) / 3600000) * 10) / 10;
const questionsAsked = Object.values(questionsByDay).reduce((sum, n) => sum + n, 0);

const recurring = {
  people: [
    { label: { en: "You", "zh-CN": "你" }, days: 365, named: true },
    { label: { en: "Bench partner", "zh-CN": "台面搭档" }, days: 86, named: true },
    { label: { en: "Speaker C", "zh-CN": "说话人 C" }, days: 140, named: false },
    { label: { en: "Counter", "zh-CN": "柜台" }, days: 40, named: true },
  ],
  places: [
    { name: { en: "Home (sample)", "zh-CN": "家（示例）" }, days: 340 },
    { name: { en: "Tram line 4", "zh-CN": "4 路有轨电车" }, days: 200 },
    { name: { en: "Fernhollow Repair Cafe", "zh-CN": "蕨谷修理小馆" }, days: 120 },
    { name: { en: "Larkspur Community Library", "zh-CN": "云雀社区图书馆" }, days: 90 },
    { name: { en: "Quill Street Bakery", "zh-CN": "羽笔街面包房" }, days: 80 },
  ],
  objects: [
    { label: "desk lamp", display_name: { en: "Desk lamp", "zh-CN": "台灯" }, finds: 64, certainty: "confident" },
    { label: "screw tray", display_name: { en: "Screw tray", "zh-CN": "螺丝盒" }, finds: 22, certainty: "confident" },
    { label: "keys", display_name: { en: "Keys", "zh-CN": "钥匙" }, finds: 15, certainty: "uncertain" },
  ],
};
const objectsFound = recurring.objects.filter((o) => o.certainty === "confident").reduce((sum, o) => sum + o.finds, 0);

const year = {
  schema: "aiglasses.lifelog.showcase.year",
  version: 1,
  synthetic: true,
  timezone: TZ,
  from: YEAR_FROM,
  to: YEAR_TO,
  featured_day: DAY,
  retention_days: 365,
  stats: {
    hours_captured: hoursCaptured,
    questions_asked: questionsAsked,
    objects_found: objectsFound,
    days_recorded: dayInfos.filter((day) => day.cell_state === "recorded").length,
  },
  monthly_highlights: [...new Set(dayInfos.map((day) => day.day.slice(0, 7)))].map((month) =>
    month === "2026-04"
      ? { month, slot: "repair-workbench", label: { en: "18 Apr · repair bench", "zh-CN": "4月18日 · 修理台" } }
      : { month, slot: null, label: null },
  ),
  days: dayInfos,
  questions_by_day: questionsByDay,
  recurring,
  testimonials: [
    {
      id: "t1",
      quote: {
        en: "I ask where the tray went. It answers with a time I can open, or it says the record is not there.",
        "zh-CN": "我问盘子在哪。它给我一个可以打开的时间，或者说记录里没有。",
      },
      attribution: {
        en: "Composite voice, low-vision reader",
        "zh-CN": "合成声音，低视力读者",
      },
      note: {
        en: "Written for the showcase. Not a real person.",
        "zh-CN": "为展示而写。并非真人。",
      },
    },
    {
      id: "t2",
      quote: {
        en: "Pause is the first thing on the page. When it is on, the day shows a gap instead of a guess.",
        "zh-CN": "暂停是页面上第一件东西。打开之后，这一天留下一段空白，而不是一段猜测。",
      },
      attribution: {
        en: "Composite voice, workshop volunteer",
        "zh-CN": "合成声音，工坊志愿者",
      },
      note: {
        en: "Written for the showcase. Not a real person.",
        "zh-CN": "为展示而写。并非真人。",
      },
    },
    {
      id: "t3",
      quote: {
        en: "The type can grow. The pictures have descriptions. I can move through the day from the keyboard.",
        "zh-CN": "字可以变大。图片有说明。我可以用键盘走过这一天。",
      },
      attribution: {
        en: "Composite voice, screen-reader user",
        "zh-CN": "合成声音，屏幕阅读器使用者",
      },
      note: {
        en: "Written for the showcase. Not a real person.",
        "zh-CN": "为展示而写。并非真人。",
      },
    },
  ],
};

const slotMeta = {
  "kitchen-breakfast": ["pov-kitchen-breakfast.jpg", "Breakfast and coffee by the kitchen window", "厨房窗边的早餐和咖啡"],
  "desk-keys": ["pov-desk-keys-under-papers.jpg", "Keys partly hidden under papers on a desk", "钥匙半藏在桌上的纸下面"],
  "tram-window": ["pov-tram-window.jpg", "Sunlit tram ride through the city", "阳光里的电车，穿过城市"],
  "repair-workbench": ["pov-repair-cafe-workbench.jpg", "Repair cafe workbench with screws on a red toolbox", "修理小馆的工作台，螺丝在红色工具箱上"],
  "cafe-hands": ["pov-cafe-friend-hands.jpg", "Coffee with a friend, hands only", "和人喝咖啡，画面里只有手"],
  "bakery-counter": ["pov-bakery-counter.jpg", "Bakery display counter", "面包柜台"],
  "library-aisle": ["pov-library-aisle.jpg", "Library aisle toward daylight", "图书馆过道，通向日光"],
  "evening-park": ["pov-evening-park-walk.jpg", "Evening walk in the park at sunset", "日落时分在公园走路"],
};

const slots = {};
for (const [slug, [file, en, zh]] of Object.entries(slotMeta)) {
  const src = `${photoDir}/${file}`;
  slots[slug] = {
    kind: "photo",
    file,
    src,
    thumb: src,
    width: 1536,
    height: 1024,
    alt: { en, "zh-CN": zh },
  };
}

const frameSlots = {};
for (const frame of builtFrames) {
  frameSlots[frame.id] = frame.scene;
}

writeJson("image-registry.json", {
  schema: "aiglasses.lifelog.showcase.images",
  version: 1,
  slots,
  frames: frameSlots,
  highlights: Object.keys(slotMeta),
});

const lastMs = builtFrames[builtFrames.length - 1].ts_ms;
writeJson("health.json", {
  status: "ok",
  version: "0.1.0",
  contract: "aiglasses.lifelog.v1",
  mode: "demo",
  research_prototype: true,
  certified_aid: false,
  capture_paused: false,
  local_first: true,
  audio_enabled: true,
});
writeJson("settings.json", {
  timezone: TZ,
  locale: "zh-CN",
  summary_language: "zh-CN",
  llm_provider: "extractive",
  ollama_url: "http://127.0.0.1:11434",
  ollama_model: "qwen3:4b",
  summary_time_local: "22:30",
  default_frame_interval_s: 300,
});
writeJson("privacy.json", {
  capture_paused: false,
  paused_until_ms: null,
  open_pause_id: null,
  retention_days: 365,
  local_first: true,
  audio_enabled: true,
  audio_consent_ack_ms: atOn(YEAR_FROM, "07:00"),
  keep_raw_audio: false,
  face_blur: true,
  location_enabled: false,
  cloud_vision_enabled: false,
  next_purge_ms: atOn("2026-04-19", "03:30"),
});
writeJson("devices.json", {
  devices: [
    {
      id: deviceGlasses,
      name: "Glasses",
      kind: "esp32_glasses",
      enabled: true,
      frame_interval_s: 300,
      created_ms: atOn(YEAR_FROM, "07:00"),
      last_seen_ms: lastMs,
      status: {
        battery_pct: 72,
        free_storage_mb: 1140,
        queued_items: 0,
        firmware: "0.1.0",
        uptime_ms: 13 * 3600 * 1000,
        boot_id: "a1b2c3d4e5f60718",
      },
      revoked: false,
    },
    {
      id: deviceWatch,
      name: "Watch",
      kind: "apple_watch",
      enabled: true,
      frame_interval_s: 300,
      created_ms: atOn(YEAR_FROM, "07:05"),
      last_seen_ms: builtUtts[builtUtts.length - 1].end_ms,
      status: {
        battery_pct: 41,
        free_storage_mb: 800,
        queued_items: 0,
        firmware: "0.1.0",
        uptime_ms: 13 * 3600 * 1000,
        boot_id: "b2c3d4e5f6071821",
      },
      revoked: false,
    },
  ],
});
writeJson("backup-config.json", {
  enabled: true,
  target_type: "nas",
  remote: "shelf-crypt",
  path: "aiglasses-lifelog",
  schedule: "nightly",
  include_raw_audio: false,
});
writeJson("backup-status.json", {
  state: "ok",
  last_run: {
    id: nid("bkp", 1),
    started_ms: atOn(DAY, "03:10"),
    finished_ms: atOn(DAY, "03:18"),
    state: "ok",
    remote: "shelf-crypt",
    target_type: "nas",
    files: 4820,
    bytes: 1260044800,
    deleted: 18,
    error: null,
  },
  next_run_ms: atOn("2026-04-19", "03:10"),
});
writeJson("year.json", year);

for (const locale of ["en", "zh-CN"]) {
  const frames = builtFrames.map((frame) => frameDetailCache[locale].get(frame.id));
  writeJson(`days/${DAY}/frames.${locale}.json`, { frames, next_page_token: null });
  writeJson(`days/${DAY}/utterances.${locale}.json`, {
    utterances: builtUtts.map((u) => utteranceApi(u, locale)),
  });
  writeJson(`days/${DAY}/segments.${locale}.json`, segmentsFor(locale));
  writeJson(`days/${DAY}/speakers.${locale}.json`, speakersFor(locale));
  writeJson(`days/${DAY}/summary.${locale}.json`, summaryFor(locale));
  writeJson(`days/${DAY}/timeline.${locale}.json`, timelineFor(locale));
  writeJson(`days/${DAY}/asks.${locale}.json`, asksFor(locale));
  writeJson(`places.${locale}.json`, {
    places: Object.keys(places).map((key) => placeObj(key, locale)),
  });
  writeJson(`watchlist.${locale}.json`, { items: watchItems(locale) });
  writeJson(`last-seen.${locale}.json`, lastSeen(locale));
}

const low = builtUtts.filter((u) => u.score < 0.55);
if (low.length < 2) throw new Error("need two low-confidence utterances");
const pauseStart = at("12:30");
const pauseEnd = at("13:00");
for (const u of builtUtts) {
  if (u.start_ms >= pauseStart && u.start_ms < pauseEnd) throw new Error("speech inside pause");
}
for (const summary of ["en", "zh-CN"]) {
  const doc = summaryFor(summary);
  const pool = [doc.headline, ...doc.narrative, ...doc.places, ...doc.activities, ...doc.people, ...doc.quotes, ...doc.uncertain];
  for (const entry of pool) {
    if (!entry.citations?.length) throw new Error(`uncited ${entry.id}`);
  }
}

console.log(
  JSON.stringify(
    {
      days: yearDays.length,
      frames: builtFrames.length,
      utterances: builtUtts.length,
      segments: builtSegs.length,
      detections: detections.length,
      hours_captured: hoursCaptured,
      questions_asked: questionsAsked,
      objects_found: objectsFound,
    },
    null,
    2,
  ),
);
