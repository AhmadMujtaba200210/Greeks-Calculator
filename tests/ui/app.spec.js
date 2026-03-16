const { test, expect } = require('@playwright/test');

test('navigation persists on refresh', async ({ page }) => {
  await page.goto('/');

  await page.click('.nav-btn[data-section="learn"]');
  await expect(page.locator('#learn')).toHaveClass(/active/);

  await page.reload();
  await expect(page.locator('#learn')).toHaveClass(/active/);
});

test('playground renders without hero and mounts the dashboard shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('body')).toHaveAttribute('data-active-section', 'playground');
  await expect(page.locator('#playground')).toHaveClass(/active/);
  await expect(page.locator('.workspace-hero')).toHaveCount(0);
  await expect(page.locator('#playground-app-root')).toBeVisible();
  await expect(page.getByTestId('playground-dashboard')).toBeVisible();
  await expect(page.getByTestId('playground-dashboard')).toHaveAttribute('data-density', 'compact');
  await expect(page.getByTestId('playground-workspace-header')).toBeVisible();
  await expect(page.getByTestId('playground-control-rail')).toBeVisible();
  await expect(page.getByTestId('playground-summary-hero-cell')).toBeVisible();
  await expect(page.getByTestId('playground-summary-mini-group')).toBeVisible();
  await expect(page.getByTestId('playground-greeks-strip')).toBeVisible();
  await expect(page.getByTestId('playground-viz-card')).toBeVisible();
  await expect(page.getByTestId('playground-insight-dock')).toBeVisible();
});

test('playground page scrolls and uses desktop-2col on standard desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(page.getByTestId('playground-dashboard')).toHaveAttribute('data-layout-mode', 'desktop-2col');

  const layout = await page.evaluate(() => {
    const viz = document.querySelector('[data-testid="playground-viz-card"]');
    const dock = document.querySelector('[data-testid="playground-below-chart-dock"]');
    const summary = document.querySelector('[data-testid="playground-summary-band"]');
    const hero = document.querySelector('[data-testid="metric-fair-value"]');
    const intrinsic = document.querySelector('[data-testid="metric-intrinsic"]');
    const greekStrip = document.querySelector('[data-testid="playground-greeks-strip"]');
    return {
      bodyOverflowY: window.getComputedStyle(document.body).overflowY,
      mainOverflow: window.getComputedStyle(document.querySelector('.main-content')).overflow,
      docHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      dockTop: dock?.getBoundingClientRect().top ?? 0,
      vizBottom: viz?.getBoundingClientRect().bottom ?? 0,
      summaryHeight: summary?.getBoundingClientRect().height ?? 0,
      heroHeight: hero?.getBoundingClientRect().height ?? 0,
      miniHeight: intrinsic?.getBoundingClientRect().height ?? 0,
      greekStripHeight: greekStrip?.getBoundingClientRect().height ?? 0,
      vizWidth: viz?.getBoundingClientRect().width ?? 0,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
    };
  });

  expect(layout.bodyOverflowY).not.toBe('hidden');
  expect(layout.mainOverflow).toBe('visible');
  expect(layout.docHeight).toBeGreaterThan(layout.viewportHeight);
  expect(layout.dockTop).toBeGreaterThan(layout.vizBottom);
  expect(layout.summaryHeight).toBeLessThan(300);
  expect(layout.heroHeight).toBeLessThan(190);
  expect(layout.heroHeight - layout.miniHeight).toBeLessThan(45);
  expect(layout.greekStripHeight).toBeLessThan(150);
  expect(layout.vizWidth).toBeGreaterThan(760);
  expect(layout.horizontalOverflow).toBe(false);

  await page.getByTestId('playground-insight-dock').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('playground-insight-dock')).toBeVisible();
});

test('playground stacked mode keeps metrics ahead of inputs', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/');

  await expect(page.getByTestId('playground-dashboard')).toHaveAttribute('data-layout-mode', 'stacked');
  await expect(page.getByTestId('playground-stacked-inputs')).toBeVisible();

  const layout = await page.evaluate(() => {
    const summary = document.querySelector('[data-testid="playground-summary-band"]');
    const viz = document.querySelector('[data-testid="playground-viz-card"]');
    const inputs = document.querySelector('[data-testid="playground-stacked-inputs"]');
    const dock = document.querySelector('[data-testid="playground-insight-dock"]');

    return {
      summaryTop: summary?.getBoundingClientRect().top ?? 0,
      vizTop: viz?.getBoundingClientRect().top ?? 0,
      vizBottom: viz?.getBoundingClientRect().bottom ?? 0,
      inputsTop: inputs?.getBoundingClientRect().top ?? 0,
      dockTop: dock?.getBoundingClientRect().top ?? 0,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
    };
  });

  expect(layout.summaryTop).toBeLessThan(layout.vizTop);
  expect(layout.vizBottom).toBeLessThan(layout.inputsTop);
  expect(layout.inputsTop).toBeLessThan(layout.dockTop);
  expect(layout.horizontalOverflow).toBe(false);
});

test('playground uses desktop-3col on ultra-wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1728, height: 1117 });
  await page.goto('/');

  await expect(page.getByTestId('playground-dashboard')).toHaveAttribute('data-layout-mode', 'desktop-3col');
  await expect(page.getByTestId('playground-right-pane')).toBeVisible();

  const layout = await page.evaluate(() => {
    const control = document.querySelector('[data-testid="playground-control-rail"]');
    const viz = document.querySelector('[data-testid="playground-viz-card"]');
    const dock = document.querySelector('[data-testid="playground-right-pane"]');
    return {
      controlLeft: control?.getBoundingClientRect().left ?? 0,
      vizLeft: viz?.getBoundingClientRect().left ?? 0,
      dockLeft: dock?.getBoundingClientRect().left ?? 0
    };
  });

  expect(layout.controlLeft).toBeLessThan(layout.vizLeft);
  expect(layout.vizLeft).toBeLessThan(layout.dockLeft);
});

test('playground shell mode is isolated to the active section', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-active-section', 'playground');

  await page.click('.nav-btn[data-section="learn"]');
  await expect(page.locator('body')).toHaveAttribute('data-active-section', 'learn');
  await expect(page.locator('#playground')).not.toHaveClass(/active/);

  await page.click('.nav-btn[data-section="playground"]');
  await expect(page.locator('body')).toHaveAttribute('data-active-section', 'playground');
  await expect(page.getByTestId('playground-workspace-header')).toBeVisible();
});

test('playground presets and controls update pricing metrics', async ({ page }) => {
  await page.goto('/');

  const fairValue = page.getByTestId('metric-fair-value');
  const vega = page.getByTestId('metric-vega');

  const fairBefore = await fairValue.textContent();
  const vegaBefore = await vega.textContent();

  await page.getByTestId('playground-preset-menu').click();
  await page.getByText('High Vol').click();
  await expect(page.getByTestId('input-volatility')).toHaveValue('60');
  await page.getByTestId('input-spot').fill('120');
  await expect.poll(async () => await fairValue.textContent()).not.toBe(fairBefore);

  await page.getByTestId('input-volatility').fill('40');
  await expect.poll(async () => await vega.textContent()).not.toBe(vegaBefore);
});

test('playground visualization tabs switch correctly', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('tab', { name: 'Greeks' }).click();
  await expect(page.getByTestId('chart-summary-headline')).toHaveText('Greek Response');

  await page.getByRole('tab', { name: 'Surface' }).click();
  await expect(page.getByTestId('chart-summary-headline')).toHaveText('Volatility Surface Slice');

  await page.getByRole('tab', { name: 'Time' }).click();
  await expect(page.getByTestId('chart-summary-headline')).toHaveText('Time Decay');

  await page.getByRole('tab', { name: 'Cross-Model' }).click();
  await expect(page.getByTestId('chart-summary-headline')).toHaveText('Cross-Model View');

  await page.getByRole('tab', { name: 'Convergence' }).click();
  await expect(page.getByTestId('chart-summary-headline')).toHaveText('Convergence View');

  await page.getByRole('tab', { name: '3D' }).click();
  await expect(page.getByTestId('playground-surface3d')).toBeVisible();

  await page.getByRole('tab', { name: 'Diagnostics' }).click();
  await expect(page.getByTestId('playground-diagnostics')).toBeVisible();
});

test('playground model picker and insight dock work', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('playground-model-picker').click();
  await page.locator('[cmdk-item]').filter({ hasText: 'Monte Carlo' }).first().click();
  await expect(page.getByTestId('playground-workspace-header')).toContainText('Monte Carlo');

  await page.getByRole('tab', { name: 'Validation' }).click();
  await expect(page.getByTestId('playground-validation-card')).toBeVisible();
  const validationRows = await page.locator('[data-testid="playground-validation-card"] tbody tr').count();
  expect(validationRows).toBeGreaterThan(1);

  await page.getByRole('tab', { name: 'Reference' }).click();
  await expect(page.getByTestId('playground-references-card')).toContainText('Monte Carlo');

  await page.getByRole('tab', { name: 'Math' }).click();
  await expect(page.getByTestId('playground-insight-dock')).toContainText('Mathematical Derivations');
});

test('playground uses a controls sheet on mobile without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const layout = await page.evaluate(() => {
    const trigger = document.querySelector('[data-testid="playground-controls-sheet-trigger"]');
    const summary = document.querySelector('[data-testid="playground-summary-band"]');
    const viz = document.querySelector('[data-testid="playground-viz-card"]');

    return {
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      summaryBottom: summary?.getBoundingClientRect().bottom ?? 0,
      triggerTop: trigger?.getBoundingClientRect().top ?? 0,
      vizTop: viz?.getBoundingClientRect().top ?? 0
    };
  });

  expect(layout.horizontalOverflow).toBe(false);
  expect(layout.summaryBottom).toBeLessThan(layout.vizTop);
  expect(layout.triggerTop).toBeLessThan(layout.vizTop);

  await page.getByTestId('playground-controls-sheet-trigger').click();
  await expect(page.getByTestId('playground-control-rail')).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('tab', { name: 'Reference' }).click();
  await expect(page.getByTestId('playground-references-card')).toBeVisible();
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
