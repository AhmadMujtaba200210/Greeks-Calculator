const { test, expect } = require('@playwright/test');

test('navigation persists on refresh', async ({ page }) => {
  await page.goto('/');

  await page.click('.nav-btn[data-section="learn"]');
  await expect(page.locator('#learn')).toHaveClass(/active/);

  await page.reload();
  await expect(page.locator('#learn')).toHaveClass(/active/);
});

test('strategy library charts render and stay bounded', async ({ page }) => {
  await page.goto('/');
  await page.click('.nav-btn[data-section="learn"]');

  await page.click('.lesson-list li[data-lesson="7-1"]');
  const charts = page.locator('.lesson-payoff-chart');
  await expect(charts.first()).toBeVisible();

  const count = await charts.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < Math.min(count, 3); i++) {
    const box = await charts.nth(i).boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThan(120);
    expect(box.height).toBeLessThan(260);
  }
});

test('builder adds legs without shrinking and loads presets', async ({ page }) => {
  await page.goto('/');
  await page.click('.nav-btn[data-section="builder"]');

  const addBtn = page.locator('#addLegBtn');
  for (let i = 0; i < 5; i++) {
    await addBtn.click();
  }

  const legCards = page.locator('.leg-card');
  await expect(legCards).toHaveCount(6);
  const firstBox = await legCards.first().boundingBox();
  expect(firstBox).not.toBeNull();
  expect(firstBox.height).toBeGreaterThan(90);

  await page.selectOption('#presetSelect', 'bull_call_spread');
  await page.click('#loadPresetBtn');
  await expect(legCards).toHaveCount(2);

  const selects = page.locator('.leg-select');
  await expect(selects.nth(1)).toHaveValue('call');
});

test('strategy card can open builder', async ({ page }) => {
  await page.goto('/');
  await page.click('.nav-btn[data-section="learn"]');
  await page.click('.lesson-list li[data-lesson="7-1"]');

  const openBtn = page.locator('.preset-btn').first();
  await openBtn.click();

  await expect(page.locator('#builder')).toHaveClass(/active/);
  await expect(page.locator('.leg-card')).toHaveCount(2);
});
