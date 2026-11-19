/**
 * Map hero-day scenes onto photographs.
 * Frames without a photograph get a neutral plate.
 * Answers live in showcase-data/answers and are not rewritten here.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = path.join(root, "showcase-data");
const hero = path.join(data, "hero-2026-04-18");

const PHOTO = {
  "home-kitchen-breakfast": ["pov-kitchen-breakfast.jpg", "Breakfast and coffee by the kitchen window", "厨房窗边的早餐和咖啡"],
  "home-desk-packing": ["hero/hero-01-home-desk-packing-1448.jpg", "Hands wrapping a worn metal desk lamp in a towel beside an open canvas tote, with a red toolbox and a tray of screwdrivers on the desk", "双手用毛巾包住一只旧台灯，旁边是帆布袋、红色工具箱和一盒螺丝刀"],
  "home-hallway-leaving": ["hero/hero-02-home-hallway-leaving-1448.jpg", "A hand holding a closed umbrella in a hallway, with coats on hooks, keys by the open front door, and daylight outside", "手握一把收起的伞，门厅里挂着外套，敞开的门外是日光，钥匙挂在门边"],
  "street-walk-to-tram": ["hero/hero-03-street-walk-to-tram-1448.jpg", "A sidewalk under cherry blossoms leading to a tram shelter and the tracks", "樱花树下的人行道，通向电车站和轨道"],
  "tram-line4-morning": ["pov-tram-window.jpg", "Sunlit tram ride through the city", "阳光里的电车，穿过城市"],
  "cafe-entrance-signin": ["hero/hero-04-cafe-entrance-signin-1448.jpg", "Signing in at a clipboard beside a sign that reads Fernhollow Repair Cafe, Saturdays, with the workshop through the open door", "在写着「Fernhollow Repair Cafe — Saturdays」的牌子旁签到，门内是修理工坊"],
  "cafe-lamp-diagnosis": ["hero/hero-05-cafe-lamp-diagnosis-1448.jpg", "Two people at a workbench with the lamp base open, a multimeter, and a few screws in a small dish", "工作台上灯座已经打开，旁边有万用表和小碟里的几颗螺丝"],
  "cafe-continuity-test": ["hero/hero-06-cafe-continuity-test-1448.jpg", "Hands testing a lamp plug with a multimeter that reads 0.8, the lamp and a coil of solder on the bench", "双手用万用表测灯的插头，读数是 0.8，台上有台灯和一卷焊锡"],
  "cafe-coffee-corner": ["hero/hero-07-cafe-coffee-corner-1448.jpg", "A coffee urn, stacked cups, and a tin of cookies on a side table, with people at the workshop benches beyond", "侧桌上的咖啡壶、纸杯和饼干盒，远处是工位上的人"],
  "cafe-parts-bin": ["hero/hero-08-cafe-parts-bin-1448.jpg", "Hands choosing a replacement switch from a parts bin, the open lamp and red toolbox on the bench", "从零件盒里挑选开关，台上是打开的台灯和红色工具箱"],
  "cafe-switch-order": ["pov-repair-cafe-workbench.jpg", "Repair cafe workbench with screws on a red toolbox", "修理小馆的工作台"],
  "cafe-rewiring-base": ["hero/hero-09-cafe-rewiring-base-1448.jpg", "Hands tying a new wire into the open lamp base, with solder, pliers, and a lit work lamp nearby", "双手把新线接到打开的灯座上，旁边有焊锡、钳子和一盏亮着的工作灯"],
  "repair-bench-afternoon": ["pov-repair-cafe-workbench.jpg", "Repair cafe workbench with screws on a red toolbox", "修理小馆的工作台"],
  "cafe-shelf-packup": ["hero/hero-10-cafe-shelf-packup-1448.jpg", "The desk lamp on a wooden shelf under a label that reads waiting for parts, with a tag on the cord", "台灯放在木架上，架子标着 waiting for parts，电线上挂着标签"],
  "library-holds-desk": ["hero/hero-11-library-holds-desk-1448.jpg", "A library holds desk with a stack of reserved books, a library card, and a staff member at the keyboard", "图书馆预约台，桌上是一叠预约的书和借书卡，馆员在键盘前"],
  "library-reading-room": ["pov-library-aisle.jpg", "Library aisle toward daylight", "图书馆过道，通向日光"],
  "tram-line4-evening": ["hero/hero-12-tram-line4-evening-1448.jpg", "An evening tram seat with a bakery bag on the lap and rain on the window", "傍晚的电车座位，膝上是面包纸袋，窗外在下雨"],
  "home-kitchen-dinner": ["hero/hero-13-home-kitchen-dinner-1448.jpg", "Dinner at the kitchen table: soup, sliced bread, and a roll under a warm lamp", "厨房餐桌上的晚饭：汤、切片面包和一只卷饼，台灯暖黄"],
  "home-desk-evening": ["hero/hero-14-home-desk-evening-1448.jpg", "An evening desk with a notebook, a pencil, a mug, and a small lamp switched on", "晚上的书桌，笔记本和铅笔、一只杯子，小台灯开着"],
  "street-walk-to-bakery": ["pov-evening-park-walk.jpg", "A walk along a park path", "沿公园小路走"],
  "street-walk-to-library": ["pov-evening-park-walk.jpg", "A walk along a park path", "沿公园小路走"],
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
    const thumb = src.includes("-1448.jpg") ? src.replace("-1448.jpg", "-720.jpg") : src;
    slots[scene] = {
      kind: "photo",
      file: photo[0].split("/").pop(),
      src,
      thumb,
      width: src.includes("-1448.jpg") ? 1448 : 1536,
      height: src.includes("-1448.jpg") ? 1086 : 1024,
      alt: { en: photo[1], "zh-CN": photo[2] },
      ...(thumb === src ? {} : { srcSet: `${thumb} 720w, ${src} 1448w` }),
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

console.log(JSON.stringify({ scenes: scenes.length, photos: Object.values(slots).filter((slot) => slot.kind === "photo").length, placeholders: Object.values(slots).filter((slot) => slot.kind === "placeholder").length, frames: frames.length }, null, 2));
