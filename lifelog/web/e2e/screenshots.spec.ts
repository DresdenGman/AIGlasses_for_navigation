import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const out = "/opt/cursor/artifacts/lifelog-web";
mkdirSync(out, { recursive: true });

const pages = [
  ["home", "/"],
  ["day", "/day/2026-04-18/summary"],
  ["timeline", "/day/2026-04-18?t=1776552060000"],
  ["ask", "/ask"],
  ["objects", "/objects"],
  ["privacy", "/privacy"],
  ["settings", "/settings"],
];

test("capture light and dark pages", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ask");
  await page.getByRole("button", { name: "English" }).click();
  for (const [name, path] of pages) {
    await page.goto(path);
    if (name === "ask") {
      await page.getByRole("button", { name: "Where did I put the screws?" }).click();
    }
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.screenshot({ path: `${out}/${name}-light.png`, fullPage: true });
  }
  await page.getByRole("button", { name: "Dark theme" }).click();
  for (const [name, path] of pages) {
    await page.goto(path);
    if (name === "ask") {
      await page.getByRole("button", { name: "Where did I put the screws?" }).click();
    }
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.screenshot({ path: `${out}/${name}-dark.png`, fullPage: true });
  }
});
