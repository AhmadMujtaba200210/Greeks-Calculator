const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const shotsDir = path.join(__dirname, "..", "docs", "screenshots");

test("capture README screenshots", async ({ page }) => {
  fs.mkdirSync(shotsDir, { recursive: true });

  await page.goto("/");
  await expect(page.getByTestId("playground-dashboard")).toBeVisible();
  await page.screenshot({
    path: path.join(shotsDir, "playground-overview.png"),
    fullPage: false,
  });

  await page.getByRole("tab", { name: "Diagnostics" }).click();
  await expect(page.getByTestId("playground-diagnostics")).toBeVisible();
  await page.screenshot({
    path: path.join(shotsDir, "playground-diagnostics.png"),
    fullPage: false,
  });

  await page.getByRole("button", { name: "Builder" }).click();
  await expect(page.locator("#builder")).toBeVisible();
  await page.screenshot({
    path: path.join(shotsDir, "builder-overview.png"),
    fullPage: false,
  });
});
