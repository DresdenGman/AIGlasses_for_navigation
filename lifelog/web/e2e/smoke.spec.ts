import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pages = [
  { path: "/", name: /2026/ },
  { path: "/day/2026-04-18/summary", name: /2026/ },
  { path: "/day/2026-04-18", name: /2026/ },
  { path: "/ask", name: /询问记录|Ask the record/ },
  { path: "/objects", name: /最后一次看见|Last seen/ },
  { path: "/privacy", name: /隐私|Privacy/ },
  { path: "/settings", name: /设置|Settings/ },
];

async function expectClean(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const serious = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test.describe("showcase pages", () => {
  for (const entry of pages) {
    test(entry.path, async ({ page }) => {
      await page.goto(entry.path);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(entry.name);
      await expect(page.getByRole("link", { name: "Lifelog" })).toBeVisible();
      await expectClean(page);
    });
  }

  test("language, ask, timeline keys, and pause", async ({ page }) => {
    await page.goto("/day/2026-04-18/summary");
    await expect(page.getByText("不确定").first()).toBeVisible();
    await page.getByRole("button", { name: "English" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("2026");
    await page.getByRole("button", { name: /E\d/ }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.goto("/ask");
    await page.getByRole("button", { name: "Where did I put the screws?" }).click();
    await expect(page.getByText(/red toolbox/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /E1/ }).first()).toBeVisible();
    await page.getByLabel("Ask about this day").fill("Where is the moon passport?");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(page.getByText("not in records", { exact: true })).toBeVisible();

    await page.goto("/day/2026-04-18");
    const playhead = page.getByTestId("playhead");
    const before = await playhead.innerText();
    await page.keyboard.press("ArrowRight");
    await expect(playhead).not.toHaveText(before);

    await page.getByRole("button", { name: "Pause capture" }).click();
    await expect(page.getByRole("button", { name: /Paused/ })).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("img", { name: "Guide dog walk by the lake" })).toBeVisible();
    await expect(page.getByText("F-0418-0099")).toBeVisible();
    await page.getByRole("link", { name: /18 APR\. 2026/ }).first().click();
    await expect(page).toHaveURL(/\/day\/2026-04-18\/summary/);

    await page.goto("/objects");
    await expect(page.getByRole("img", { name: "Wallet on a sunlit entryway shelf" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Keys partly hidden under papers on a desk" })).toBeVisible();
    await expect(page.getByRole("img", { name: /pill|reading glasses|sunglasses/i })).toHaveCount(0);
  });
});
