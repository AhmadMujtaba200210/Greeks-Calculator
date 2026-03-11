const { test, expect } = require('@playwright/test');

test('navigation persists on refresh', async ({ page }) => {
  await page.goto('/');

  await page.click('.nav-btn[data-section="learn"]');
  await expect(page.locator('#learn')).toHaveClass(/active/);

  await page.reload();
  await expect(page.locator('#learn')).toHaveClass(/active/);
});

test('builder stays hidden outside its tab and uses the full desktop width', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(page.locator('#builder')).not.toHaveClass(/active/);
  await expect(page.locator('#builder')).toHaveCSS('display', 'none');

  await page.click('.nav-btn[data-section="builder"]');
  await expect(page.locator('#builder')).toHaveClass(/active/);

  const desktopState = await page.evaluate(() => ({
    bodyBuilderActive: document.body.classList.contains('builder-active'),
    bodyOverflowY: window.getComputedStyle(document.body).overflowY,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    builderWidth: document.getElementById('builder')?.getBoundingClientRect().width ?? 0,
    viewportWidth: window.innerWidth,
    utilityTabsVisible: !!document.querySelector('#builderUtilityTabs'),
    workspaceVisible: !!document.querySelector('.builder-workspace')
  }));

  expect(desktopState.bodyBuilderActive).toBe(true);
  expect(desktopState.bodyOverflowY).not.toBe('hidden');
  expect(desktopState.horizontalOverflow).toBe(false);
  expect(desktopState.builderWidth).toBeGreaterThan(desktopState.viewportWidth - 8);
  expect(desktopState.utilityTabsVisible).toBe(true);
  expect(desktopState.workspaceVisible).toBe(true);

  await page.click('.nav-btn[data-section="practice"]');
  await expect(page.locator('#builder')).not.toHaveClass(/active/);
  await expect(page.locator('#builder')).toHaveCSS('display', 'none');
});

test('builder reflows for small laptop viewports without shrinking into overlap', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.click('.nav-btn[data-section="builder"]');

  const laptopState = await page.evaluate(() => {
    const splitTracks = (value) => value.split(/\s+/).filter(Boolean).length;
    const workspace = document.querySelector('.builder-workspace');
    const contextBar = document.querySelector('#builder .strategy-context-bar');
    const kpiStrip = document.querySelector('.builder-kpi-strip');
    const thesisCard = document.querySelector('.builder-thesis-card');
    const chartCard = document.querySelector('.builder-chart-card');
    const chartSurface = document.querySelector('.builder-chart-card .chart-pl');

    return {
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      workspaceColumns: splitTracks(window.getComputedStyle(workspace).gridTemplateColumns),
      contextColumns: splitTracks(window.getComputedStyle(contextBar).gridTemplateColumns),
      kpiColumns: splitTracks(window.getComputedStyle(kpiStrip).gridTemplateColumns),
      thesisWidth: thesisCard?.getBoundingClientRect().width ?? 0,
      chartWidth: chartCard?.getBoundingClientRect().width ?? 0,
      chartHeight: chartSurface?.getBoundingClientRect().height ?? 0,
      bodyOverflowY: window.getComputedStyle(document.body).overflowY
    };
  });

  expect(laptopState.horizontalOverflow).toBe(false);
  expect(laptopState.workspaceColumns).toBe(2);
  expect(laptopState.contextColumns).toBe(2);
  expect(laptopState.kpiColumns).toBe(3);
  expect(laptopState.thesisWidth).toBeGreaterThan(300);
  expect(laptopState.chartWidth).toBeGreaterThan(560);
  expect(laptopState.chartHeight).toBeGreaterThan(400);
  expect(laptopState.bodyOverflowY).not.toBe('hidden');
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

test('trade thesis wizard suggests and loads a matching strategy', async ({ page }) => {
  await page.goto('/');
  await page.click('.nav-btn[data-section="builder"]');

  await page.fill('#thesisCatalystInput', 'Earnings tonight with implied move expanding.');
  await page.click('.thesis-tag[data-tag="Earnings"]');
  await page.click('.thesis-choice[data-field="priceView"][data-value="move_big"]');
  await page.click('.thesis-choice[data-field="volatilityView"][data-value="increase"]');
  await page.click('.thesis-choice[data-field="timeframe"][data-value="weeks"]');
  await page.click('.thesis-choice[data-field="objective"][data-value="event"]');
  await page.click('.thesis-choice[data-field="volRegime"][data-value="cheap"]');

  await expect(page.locator('#thesisSummaryLine')).toContainText('MOVE BIG');
  await expect(page.locator('#thesisResearchLine')).toContainText('Objective: Event / Vol');
  await expect(page.locator('.thesis-suggestion-card')).toHaveCount(4);
  await expect(page.locator('.thesis-confidence-badge').first()).toContainText('confidence');
  const straddleSuggestion = page.locator('.thesis-suggestion-card').filter({ hasText: 'Long Straddle' });
  await expect(straddleSuggestion).toHaveCount(1);
  await expect(page.locator('#thesisContracts')).not.toHaveText('--');

  await straddleSuggestion.locator('.thesis-load-btn').click();
  await expect(page.locator('.leg-card')).toHaveCount(2);
  await expect(page.locator('#thesisMaxLossPerContract')).not.toHaveText('--');
});

test('builder utility tabs switch and playbook still loads presets', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.click('.nav-btn[data-section="builder"]');

  await page.click('.builder-utility-tab[data-pane="journal"]');
  await expect(page.locator('#positionJournalPane')).toHaveClass(/active/);

  await page.click('.builder-utility-tab[data-pane="scenarios"]');
  await expect(page.locator('#savedScenariosPane')).toHaveClass(/active/);

  await page.click('.builder-utility-tab[data-pane="playbook"]');
  await expect(page.locator('#strategyPlaybookPane')).toHaveClass(/active/);

  await page.click('#strategyPlaybookPane .scenario-btn[data-scenario="volatile"]');
  await expect(page.locator('#strategyPlaybookPane .playbook-strategy-card').first()).toBeVisible();
  await expect(page.locator('#strategyPlaybookPane .playbook-strategy-card')).toHaveCount(4);
  await page.click('#strategyPlaybookPane .btn-playbook-load');

  await expect(page.locator('.leg-card')).toHaveCount(2);
  await expect(page.locator('#positionStrategyName')).toContainText('Long Straddle');
});

test('position management trims and previews a roll', async ({ page }) => {
  await page.goto('/');
  await page.click('.nav-btn[data-section="builder"]');

  await page.selectOption('#presetSelect', 'long_straddle');
  await page.click('#loadPresetBtn');

  await expect(page.locator('#positionStrategyName')).toContainText('Long Straddle');
  await page.fill('#positionEntryQty', '2');
  await expect(page.locator('#positionStatusBadge')).toContainText('2 unit');

  await page.click('#positionTrimBtn');
  await page.selectOption('#positionTrimTargetQty', '1');
  await page.click('#positionTrimConfirmBtn');

  await expect(page.locator('#positionStatusBadge')).toContainText('1 unit');
  await expect(page.locator('#positionActionResult')).toContainText('Trim executed');
  await expect(page.locator('#positionJournalBody')).toContainText('Trim');

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 45);

  await page.click('#positionRollBtn');
  await page.fill('#positionRollStrike', '105');
  await page.fill('#positionRollExpiry', futureDate.toISOString().split('T')[0]);

  await expect(page.locator('#positionRollMetrics')).not.toContainText('Enter a strike and expiry');
  await expect(page.locator('#positionRollChartWrap')).toBeVisible();
});

test('payoff chart shows metrics and toggles probability overlay', async ({ page }) => {
  await page.goto('/');
  await page.click('.nav-btn[data-section="builder"]');

  await page.selectOption('#presetSelect', 'long_straddle');
  await page.click('#loadPresetBtn');

  await expect(page.locator('#chartBreakEvenMove')).not.toHaveText('--');
  await expect(page.locator('#chartProbabilityOfProfit')).toContainText('%');

  const toggle = page.locator('#probabilityOverlayToggle');
  await toggle.click();
  await expect(toggle).toContainText('On');

  const chartInfo = await page.evaluate(() => {
    const chart = window.Chart.getChart(document.getElementById('strategyChart'));
    return {
      xType: chart.options.scales.x.type,
      overlayEnabled: chart.options.plugins.strategyPayoffOverlay.showProbabilityOverlay,
      datasetCount: chart.data.datasets.length
    };
  });

  expect(chartInfo.xType).toBe('linear');
  expect(chartInfo.overlayEnabled).toBe(true);
  expect(chartInfo.datasetCount).toBeGreaterThan(5);
});

test('strategy comparison saves snapshots and renders meeting view', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.click('.nav-btn[data-section="builder"]');

  await page.selectOption('#presetSelect', 'long_straddle');
  await page.click('#loadPresetBtn');
  await page.click('#saveStrategyBtn');

  await page.selectOption('#presetSelect', 'iron_condor');
  await page.click('#loadPresetBtn');
  await page.click('#saveStrategyBtn');

  await expect(page.locator('#compareStrategiesBtn')).toContainText('Compare (2)');

  await page.click('#compareStrategiesBtn');
  await expect(page.locator('#compareStrategiesPane')).toHaveClass(/active/);
  await expect(page.locator('.builder-utility-tab[data-pane="compare"]')).toHaveClass(/active/);
  await expect(page.locator('#compareContextSummary')).toContainText('Spot $100.00');
  await expect(page.locator('#compareTableBody')).toContainText('Win Probability');
  await expect(page.locator('#compareTableBody')).toContainText('Long Straddle');
  await expect(page.locator('#compareTableBody')).toContainText('Iron Condor');
  await expect(page.locator('#compareRecommendationText')).not.toContainText('Save at least two snapshots');

  const chartInfo = await page.evaluate(() => {
    const chart = window.Chart.getChart(document.getElementById('compareExpiryChart'));
    return {
      datasetCount: chart.data.datasets.length,
      xType: chart.options.scales.x.type
    };
  });

  expect(chartInfo.datasetCount).toBeGreaterThanOrEqual(3);
  expect(chartInfo.xType).toBe('linear');
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

test('liquidity lab computes metrics', async ({ page }) => {
  await page.goto('/');
  await page.click('.nav-btn[data-section="practice"]');
  await page.click('.exercise-card[data-exercise="liquidity-lab"] .start-btn');

  const mid = page.locator('#liqMid');
  await expect(mid).toHaveText(/\$/);

  await page.fill('#liqBid', '1.00');
  await page.fill('#liqAsk', '1.20');
  await page.fill('#liqVolume', '500');
  await page.fill('#liqOI', '1500');
  await page.fill('#liqSize', '5');

  await expect(page.locator('#liqSpread')).toHaveText('$0.20');
  await expect(page.locator('#liqFillPrice')).toHaveText(/\$/);
});
