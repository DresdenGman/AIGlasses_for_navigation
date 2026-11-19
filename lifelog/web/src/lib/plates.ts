import type { Locale } from "@/lib/api/schemas";

export type Plate = { src: string; alt: { en: string; "zh-CN": string } };

function plate(file: string, en: string, zh: string): Plate {
  return { src: `/showcase/photos/${file}`, alt: { en, "zh-CN": zh } };
}

/** Seasonal plates for the year. April is the hero-day workbench, not one of these. */
export const MONTH_PLATES: Record<string, Plate> = {
  "2025-11": plate("year-12-lecture-hall-study-session.jpg", "Lecture hall study session", "阶梯教室里的自习"),
  "2025-12": plate("year-03-rainy-night-bus-stop-reflections.jpg", "Rainy night bus stop reflections", "雨夜车站的倒影"),
  "2026-01": plate("year-02-steaming-dumplings-shared-at-dinner.jpg", "Steaming dumplings shared at dinner", "晚饭时分的热饺子"),
  "2026-02": plate("year-01-snowy-sidewalk-beside-a-warm-caf.jpg", "Snowy sidewalk beside a warm café", "雪后的人行道，暖色咖啡馆"),
  "2026-03": plate("year-05-cherry-blossom-crosswalk-corner.jpg", "Cherry blossom crosswalk corner", "樱花路口"),
  "2026-04": plate("pov-repair-cafe-workbench.jpg", "Repair café workbench with screws on a red toolbox", "修理小馆的工作台，螺丝在红色工具箱上"),
  "2026-05": plate("year-07-hands-planting-a-seedling-in-the-community-garden.jpg", "Hands planting a seedling in the community garden", "在社区园圃里栽下一棵苗"),
  "2026-06": plate("year-08-sunny-coastal-boardwalk-to-the-beach.jpg", "Sunny coastal boardwalk to the beach", "通向海滩的栈道"),
  "2026-07": plate("year-09-peach-slicing-in-a-sunlit-kitchen.jpg", "Peach slicing in a sunlit kitchen", "窗边切桃子"),
  "2026-08": plate("year-10-twilight-concert-under-string-lights.jpg", "Twilight concert under string lights", "串灯下的黄昏音乐会"),
  "2026-09": plate("year-16-twilight-rooftop-coffee-and-city-lights.jpg", "Twilight rooftop coffee and city lights", "屋顶的咖啡和城市灯火"),
  "2026-10": plate("year-11-golden-journey-through-the-station.jpg", "Golden light along a station platform", "车站月台上的金色光线"),
  "2026-11": plate("year-14-sunlit-entryway-with-everyday-essentials.jpg", "Sunlit entryway with a wallet on the shelf", "门口架子上的钱包"),
};

export const YEAR_HERO = plate("year-06-guide-dog-walk-by-the-lake.jpg", "Guide dog walk by the lake", "湖边的导盲犬");

/** Last-seen plates only where the photograph actually shows the thing. */
export const OBJECT_PLATES: Record<string, Plate> = {
  keys: plate("pov-desk-keys-under-papers.jpg", "Keys partly hidden under papers on a desk", "钥匙半藏在桌上的纸下面"),
  wallet: plate("year-14-sunlit-entryway-with-everyday-essentials.jpg", "Wallet on a sunlit entryway shelf", "门口架子上的钱包"),
  "desk lamp": plate("pov-repair-cafe-workbench.jpg", "Desk lamp over a repair café workbench", "修理台上的台灯"),
  "red toolbox": plate("pov-repair-cafe-workbench.jpg", "Red toolbox on a repair café workbench", "修理台上的红色工具箱"),
};

export function plateAlt(item: Plate, locale: Locale): string {
  return item.alt[locale];
}
