// Main Application Logic

// State management
const state = {
    optionType: 'call',
    spot: 100,
    strike: 100,
    maturity: 1.0,
    volatility: 0.25,
    rate: 0.05,
    dividend: 0.0,
    pricingModel: 'black_scholes',
    currentViz: 'price',
    currentChart: null,
    wasmLoaded: false
};

// Import WASM module and UI utilities
import init, { calculate_greeks_wasm, calculate_binomial_wasm, calculate_mc_wasm } from '../pkg/greeks_calculator.js';
import { addLeg, initPositionManagement, initStrategyChartControls, initTradeThesisPanel, initStrategyGuide, initStrategyPresets, initStrategyContextBar, initScenarioSandbox, initStrategyComparison, initStrategyPlaybook, refreshBuilderViewport } from './strategy.js';
import { customTooltip } from './ui_utils.js';

import { guardedPrice, renderWarnings } from './numericalGuards.js';
import { runCrossModelComparison, renderValidationPanel, runHealthCheck, renderHealthCheckDashboard } from './validation.js';
import { validateSurrogate, renderSurrogateBadge } from './surrogateGuard.js';
import { renderDerivationPanels, renderMiniDerivation } from './derivations.js';
import { CITATIONS, renderCitationIcon } from './citations.js';
import { computeConvergenceDiagnostics, renderConvergenceChart, renderMCQualityPanel } from './mcDiagnostics.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    const reactPlaygroundMounted = Boolean(document.getElementById('playground-app-root'));

    if (!reactPlaygroundMounted) {
        try {
            await init();
            state.wasmLoaded = true;
            console.log('🚀 WASM Backend Initialized');
        } catch (e) {
            console.error('Failed to load WASM backend:', e);
        }
    }

    initializeNavigation();

    if (!reactPlaygroundMounted) {
        initializeControls();
        initializeVisualization();
        updateCalculations();
    }

    const safeInit = (label, fn) => {
        try {
            fn();
        } catch (error) {
            console.error(`Failed to initialize ${label}:`, error);
        }
    };

    // Initialize Strategy Builder
    const addLegBtn = document.getElementById('addLegBtn');
    if (addLegBtn) {
        safeInit('strategy context bar', initStrategyContextBar);
        safeInit('scenario sandbox', initScenarioSandbox);
        safeInit('strategy chart controls', initStrategyChartControls);
        safeInit('position management', initPositionManagement);
        safeInit('strategy comparison', initStrategyComparison);
        safeInit('strategy playbook', initStrategyPlaybook);
        safeInit('trade thesis panel', initTradeThesisPanel);
        addLegBtn.addEventListener('click', () => addLeg());
        safeInit('default strategy leg', () => addLeg({ type: 'call', action: 'buy', strike: 100 }));
        safeInit('strategy guide', initStrategyGuide);
        safeInit('strategy presets', initStrategyPresets);

        window.requestAnimationFrame(() => {
            const presetSelect = document.getElementById('presetSelect');
            const hasLegCards = document.querySelectorAll('#legsContainer .leg-card').length > 0;
            const hasPresetOptions = presetSelect && presetSelect.options.length > 1;
            const hasPlaybookCards = document.querySelectorAll('#strategyPlaybookPane .playbook-strategy-card').length > 0;

            if (!hasLegCards) {
                safeInit('fallback default strategy leg', () => addLeg({ type: 'call', action: 'buy', strike: 100 }));
            }

            if (!hasPresetOptions) {
                safeInit('fallback strategy presets', initStrategyPresets);
            }

            if (!hasPlaybookCards) {
                safeInit('fallback strategy playbook', initStrategyPlaybook);
            }

            safeInit('fallback trade thesis panel', initTradeThesisPanel);
        });
    }

    if (!reactPlaygroundMounted) {
        // Bloomberg Terminal: Derivations Toggle
        const toggleDeriv = document.getElementById('toggleDerivations');
        const derivCont = document.getElementById('derivationsContainer');
        if (toggleDeriv && derivCont) {
            renderDerivationPanels(derivCont);
            toggleDeriv.addEventListener('click', (e) => {
                e.preventDefault();
                const isHidden = derivCont.style.display === 'none';
                derivCont.style.display = isHidden ? 'block' : 'none';
                toggleDeriv.textContent = isHidden ? 'HIDE MATHEMATICAL DERIVATIONS ▲' : 'SHOW MATHEMATICAL DERIVATIONS ▼';
            });
        }

        renderCitationIcon(state.pricingModel, document.getElementById('modelCitationIcon'));
        renderCitationIcon(state.pricingModel, document.getElementById('titleCitationIcon'));

        const healthCheckBtn = document.getElementById('runHealthCheckBtn');
        if (healthCheckBtn) {
            healthCheckBtn.addEventListener('click', async () => {
                const dashboard = document.getElementById('healthCheckDashboard');
                dashboard.innerHTML = "<div class='info-message' style='padding:15px;text-align:center;'>Loading benchmark data...</div>";
                try {
                    // Fetch from the root depending on hosting, try /benchmarks.json or locally
                    let response = await fetch('../data/benchmark.json').catch(() => fetch('data/benchmark.json')).catch(() => fetch('/benchmarks.json'));
                    if (!response || !response.ok) throw new Error("Could not load benchmarks.json");
                    const benchmarkData = await response.json();
                    const results = runHealthCheck(benchmarkData);
                    renderHealthCheckDashboard(results, dashboard);
                } catch (err) {
                    console.error("Health check error", err);
                    dashboard.innerHTML = `<div style='color:#ef4444;padding:15px;'>Health check failed to execute. Ensure benchmark.json is accessible. Error: ${err.message}</div>`;
                }
            });
        }
    }
});

// Initialize control panel
function initializeControls() {
    // Option type
    document.getElementById('optionType').addEventListener('change', (e) => {
        state.optionType = e.target.value;
        updateCalculations();
    });

    // Pricing Model
    document.getElementById('pricingModel').addEventListener('change', (e) => {
        state.pricingModel = e.target.value;
        renderCitationIcon(state.pricingModel, document.getElementById('modelCitationIcon'));
        renderCitationIcon(state.pricingModel, document.getElementById('titleCitationIcon'));
        updateCalculations();
    });

    // Sliders
    const sliders = [
        { id: 'spot', key: 'spot', display: 'spotValue', format: (v) => v },
        { id: 'strike', key: 'strike', display: 'strikeValue', format: (v) => v },
        { id: 'maturity', key: 'maturity', display: 'maturityValue', format: (v) => v.toFixed(1) },
        { id: 'volatility', key: 'volatility', display: 'volatilityValue', format: (v) => v },
        { id: 'rate', key: 'rate', display: 'rateValue', format: (v) => v.toFixed(1) },
        { id: 'dividend', key: 'dividend', display: 'dividendValue', format: (v) => v.toFixed(1) }
    ];

    sliders.forEach(({ id, key, display, format }) => {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(display);

        slider.addEventListener('input', (e) => {
            let value = parseFloat(e.target.value);

            // Convert percentage inputs
            if (key === 'volatility' || key === 'rate' || key === 'dividend') {
                state[key] = value / 100;
            } else {
                state[key] = value;
            }

            valueDisplay.textContent = format(value);
            updateCalculations();
        });
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetToDefaults);
}

// Reset to default values
function resetToDefaults() {
    state.spot = 100;
    state.strike = 100;
    state.maturity = 1.0;
    state.volatility = 0.25;
    state.rate = 0.05;
    state.dividend = 0.0;

    document.getElementById('spot').value = 100;
    document.getElementById('strike').value = 100;
    document.getElementById('maturity').value = 1.0;
    document.getElementById('volatility').value = 25;
    document.getElementById('rate').value = 5;
    document.getElementById('dividend').value = 0;

    document.getElementById('spotValue').textContent = '100';
    document.getElementById('strikeValue').textContent = '100';
    document.getElementById('maturityValue').textContent = '1.0';
    document.getElementById('volatilityValue').textContent = '25';
    document.getElementById('rateValue').textContent = '5.0';
    document.getElementById('dividendValue').textContent = '0.0';

    updateCalculations();
}

// Initialize navigation
function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.section');
    const navbar = document.querySelector('.navbar');

    const syncNavHeight = () => {
        const navHeight = navbar?.offsetHeight || 88;
        document.documentElement.style.setProperty('--app-nav-height', `${navHeight}px`);
    };

    function setActiveSection(targetSection) {
        if (!targetSection) return;

        navButtons.forEach(b => b.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));

        const activeBtns = document.querySelectorAll(`.nav-btn[data-section="${targetSection}"]`);
        const activeSection = document.getElementById(targetSection);

        if (!activeSection) return;

        activeBtns.forEach(btn => btn.classList.add('active'));
        activeSection.classList.add('active');
        document.body.dataset.activeSection = targetSection;
        document.body.classList.toggle('builder-active', targetSection === 'builder');

        localStorage.setItem('activeSection', targetSection);
        history.replaceState(null, '', `#${targetSection}`);

        if (targetSection === 'builder') {
            window.requestAnimationFrame(() => {
                syncNavHeight();
                refreshBuilderViewport();
            });
        }
    }

    syncNavHeight();
    const initialSection = window.location.hash?.replace('#', '') || localStorage.getItem('activeSection') || 'playground';
    setActiveSection(initialSection);

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetSection = btn.dataset.section;
            setActiveSection(targetSection);
        });
    });

    window.addEventListener('hashchange', () => {
        const hashSection = window.location.hash.replace('#', '');
        if (hashSection) setActiveSection(hashSection);
    });

    window.addEventListener('resize', () => {
        syncNavHeight();
        if (document.body.classList.contains('builder-active')) {
            refreshBuilderViewport();
        }
    });
}

// Initialize visualization tabs
function initializeVisualization() {
    const vizTabs = document.querySelectorAll('.viz-tab');

    vizTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            vizTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            state.currentViz = tab.dataset.viz;
            updateChart();
        });
    });
}

// Update all calculations and display
function updateCalculations() {
    const { spot, strike, maturity, volatility, rate, dividend, optionType, pricingModel, wasmLoaded } = state;
    const isCall = optionType === 'call';
    let greeks;

    // Show loading state if monte carlo is chosen (can take a second in unoptimized WASM)
    if (pricingModel === 'monte_carlo') {
        document.body.style.cursor = 'wait';
    }

    const priceParams = { S: spot, K: strike, T: maturity, sigma: volatility, r: rate, q: dividend, isCall };

    const pricingFn = (p) => {
        if (!wasmLoaded) return calculator.calculateGreeks(p.S, p.K, p.T, p.sigma, p.r, p.q, p.isCall);

        if (pricingModel === 'ai_surrogate' && window.aiSurrogate && window.aiSurrogate.ready) {
            return window.aiSurrogate.predictGreeks(p.S, p.K, p.T, p.sigma, p.r, p.q, p.isCall);
        } else if (pricingModel === 'binomial') {
            return calculate_binomial_wasm(p.S, p.K, p.T, p.sigma, p.r, p.q, p.isCall, 500);
        } else if (pricingModel === 'monte_carlo') {
            return calculate_mc_wasm(p.S, p.K, p.T, p.sigma, p.r, p.q, p.isCall, 50000);
        } else {
            return calculate_greeks_wasm(p.S, p.K, p.T, p.sigma, p.r, p.q, p.isCall);
        }
    };

    const guarded = guardedPrice(priceParams, pricingFn);
    greeks = guarded.result;

    // Render any edge-case warnings
    const warningsBanner = document.getElementById('warningsBanner');
    if (warningsBanner) renderWarnings(guarded.warnings, warningsBanner);

    // AI Surrogate Badge Validations
    const aiBadgeEl = document.getElementById('aiBadge');
    if (aiBadgeEl) {
        if (pricingModel === 'ai_surrogate' && window.aiSurrogate && window.aiSurrogate.ready) {
            const validation = validateSurrogate(priceParams, greeks);
            aiBadgeEl.style.display = 'inline-block';
            renderSurrogateBadge(validation, aiBadgeEl);
        } else {
            aiBadgeEl.style.display = 'none';
            aiBadgeEl.innerHTML = '';
        }
    }

    document.body.style.cursor = 'default';

    // Update display
    document.getElementById('priceResult').textContent = `$${greeks.price.toFixed(4)}`;
    document.getElementById('deltaResult').textContent = greeks.delta.toFixed(4);
    document.getElementById('gammaResult').textContent = greeks.gamma.toFixed(4);
    document.getElementById('vegaResult').textContent = greeks.vega.toFixed(4);
    document.getElementById('thetaResult').textContent = greeks.theta.toFixed(4);
    document.getElementById('rhoResult').textContent = greeks.rho.toFixed(4);

    // BEYOND GREEKS: Price breakdown
    let intrinsicValue = 0;
    if (isCall) {
        intrinsicValue = Math.max(0, spot - strike);
    } else {
        intrinsicValue = Math.max(0, strike - spot);
    }
    const extrinsicValue = greeks.price - intrinsicValue;
    const moneynessPct = (spot / strike) * 100;

    document.getElementById('intrinsicValue').textContent = `$${intrinsicValue.toFixed(2)}`;
    document.getElementById('timeValue').textContent = `$${extrinsicValue.toFixed(2)}`;
    document.getElementById('moneynessPct').textContent = `${moneynessPct.toFixed(1)}%`;

    const modelLabelElement = document.getElementById('modelLabel');
    if (modelLabelElement) {
        const modelNames = {
            'black_scholes': 'Black-Scholes',
            'binomial': 'Binomial (CRR)',
            'monte_carlo': 'Monte Carlo',
            'ai_surrogate': 'AI Surrogate'
        };
        modelLabelElement.textContent = modelNames[pricingModel] || pricingModel;
    }

    // CROSS-MODEL VALIDATION TABLE
    updateValidationTable(priceParams);

    // Update insights
    updateInsights(greeks);

    // Update moneyness indicator
    updateMoneyness();

    // Update chart
    updateChart();
}

function updateValidationTable(params) {
    const tableBody = document.getElementById('validationTableBody');
    if (!tableBody) return;

    const comparison = runCrossModelComparison(params);
    const reference = comparison?.reference;

    if (!reference) {
        tableBody.innerHTML = "<tr><td colspan='3' style='padding: 8px; color: var(--accent-red);'>Validation unavailable</td></tr>";
        return;
    }

    let html = '';
    html += `<tr>
        <td style="padding: 2px; color: var(--text-secondary);">BS-Analytical</td>
        <td style="padding: 2px; font-family: var(--font-mono);">$${reference.price.toFixed(2)}</td>
        <td style="padding: 2px; color: var(--text-muted);">---</td>
    </tr>`;

    comparison.models.forEach((modelBlock) => {
        const priceError = modelBlock?.errors?.price;
        const relativeErrorPct = Number.isFinite(priceError?.relative) ? priceError.relative * 100 : NaN;
        const color = !Number.isFinite(relativeErrorPct)
            ? 'var(--text-muted)'
            : Math.abs(relativeErrorPct) > 2
                ? 'var(--accent-red)'
                : 'var(--text-primary)';

        html += `<tr>
            <td style="padding: 2px; color: var(--text-secondary);">${modelBlock.name}</td>
            <td style="padding: 2px; font-family: var(--font-mono); color: ${color};">$${modelBlock.result.price.toFixed(2)}</td>
            <td style="padding: 2px; font-family: var(--font-mono); font-size: 8px; color: ${color};">${Number.isFinite(relativeErrorPct) ? relativeErrorPct.toFixed(2) : '--'}%</td>
        </tr>`;
    });

    tableBody.innerHTML = html;

    const chipHealth = document.getElementById('chipHealth');
    if (chipHealth) {
        const avgErr = comparison.models.length
            ? comparison.models.reduce((acc, modelBlock) => {
                const relative = modelBlock?.errors?.price?.relative;
                return acc + (Number.isFinite(relative) ? Math.abs(relative * 100) : 0);
            }, 0) / comparison.models.length
            : 0;

        chipHealth.className = 'v-chip ' + (avgErr < 1 ? 'pass' : avgErr < 5 ? 'warn' : 'fail');
    }
}

// Update insights panel
function updateInsights(greeks) {
    const { spot, strike, maturity, volatility, optionType } = state;
    const moneyness = spot / strike;
    const insightsContainer = document.getElementById('insights');
    const quickFactsContainer = document.getElementById('quickFacts');

    let insights = '<div class="insight-item">';

    // Moneyness insight
    if (moneyness > 1.05) {
        insights += '<p><strong>In-the-Money:</strong> This option has intrinsic value and would be profitable if exercised now.</p>';
    } else if (moneyness < 0.95) {
        insights += '<p><strong>Out-of-the-Money:</strong> This option has no intrinsic value, only time value.</p>';
    } else {
        insights += '<p><strong>At-the-Money:</strong> This option has maximum time value and gamma.</p>';
    }

    // Delta insight
    if (Math.abs(greeks.delta) > 0.7) {
        insights += '<p><strong>High Delta:</strong> This option moves almost 1-to-1 with the underlying.</p>';
    } else if (Math.abs(greeks.delta) < 0.3) {
        insights += '<p><strong>Low Delta:</strong> This option has low sensitivity to price changes.</p>';
    }

    // Gamma insight
    if (greeks.gamma > 0.02) {
        insights += '<p><strong>High Gamma:</strong> Delta will change rapidly. Frequent rehedging needed.</p>';
    }

    // Theta insight
    if (maturity < 0.25) {
        insights += '<p><strong>Near Expiration:</strong> Time decay is accelerating rapidly.</p>';
    }

    insights += '</div>';

    const intrinsicValue = optionType === 'call'
        ? Math.max(0, spot - strike)
        : Math.max(0, strike - spot);
    const timeValue = greeks.price - intrinsicValue;

    const facts = `
        <p><strong>Intrinsic Value:</strong> $${intrinsicValue.toFixed(2)}</p>
        <p><strong>Time Value:</strong> $${timeValue.toFixed(2)}</p>
        <p><strong>Moneyness:</strong> ${(moneyness * 100).toFixed(1)}%</p>
        <p><strong>Days to Expiry:</strong> ${Math.round(maturity * 365)}</p>
    `;

    if (insightsContainer) {
        insightsContainer.innerHTML = insights;
    }

    if (quickFactsContainer) {
        quickFactsContainer.innerHTML = insightsContainer ? facts : `${insights}${facts}`;
    }

    // Update Advice
    updateAdvice(greeks);
}

function updateAdvice(greeks) {
    if (typeof AdviceGenerator === 'undefined') return;

    const advice = AdviceGenerator.generate(state, greeks);
    const container = document.getElementById('traderAdvice');
    if (!container) return;

    container.className = `advice-panel advice-${advice.type}`;
    container.innerHTML = `
        <div class="advice-header">
            <h4>${advice.title}</h4>
        </div>
        <p>${advice.text}</p>
    `;
}

// Update moneyness indicator
function updateMoneyness() {
    const { spot, strike } = state;
    const moneyness = spot / strike;
    const position = ((moneyness - 0.8) / 0.4) * 100; // Map 0.8-1.2 to 0-100%
    const clampedPosition = Math.max(0, Math.min(100, position));

    const bar = document.getElementById('moneynessBar');
    bar.style.setProperty('--position', `${clampedPosition}%`);
}

// Update chart based on current visualization
function updateChart() {
    const { currentViz } = state;

    // Manage canvas vs Plotly div visibility
    const canvas = document.getElementById('mainChart');
    const plotlyDiv = document.getElementById('plotlyChart');
    const validationPanel = document.getElementById('validationPanel');
    const mcQualityPanel = document.getElementById('mcQualityPanel');

    // Default reset blocks
    canvas.style.display = 'block';
    plotlyDiv.style.display = 'none';
    if (validationPanel) validationPanel.style.display = 'none';
    if (mcQualityPanel) mcQualityPanel.style.display = 'none';

    if (currentViz === 'surface3d') {
        canvas.style.display = 'none';
        plotlyDiv.style.display = 'block';
    } else if (currentViz === 'validation') {
        canvas.style.display = 'none';
        if (validationPanel) validationPanel.style.display = 'block';
    } else if (currentViz === 'convergence') {
        if (mcQualityPanel) mcQualityPanel.style.display = 'block';
    }

    switch (currentViz) {
        case 'price':
            drawPriceChart();
            break;
        case 'greeks':
            drawGreeksChart();
            break;
        case 'volatility':
            drawVolatilityChart();
            break;
        case 'time':
            drawTimeDecayChart();
            break;
        case 'comparison':
            drawModelComparisonChart();
            break;
        case 'convergence':
            drawConvergenceChart();
            break;
        case 'surface3d':
            draw3DSurfaceChart();
            break;
        case 'validation':
            drawValidationView();
            break;
    }
}

function drawValidationView() {
    const { spot, strike, maturity, volatility, rate, dividend, optionType } = state;
    const isCall = optionType === 'call';
    const params = { S: spot, K: strike, T: maturity, sigma: volatility, r: rate, q: dividend, isCall };

    if (!state.wasmLoaded) {
        const panel = document.getElementById('validationPanel');
        if (panel) panel.innerHTML = "<div class='info-message' style='padding: 15px;'>WASM required for cross-model validation.</div>";
        return;
    }

    const container = document.getElementById('validationPanel');
    if (!container) return;

    let comparisonDiv = document.getElementById('crossModelComparisonDiv');
    if (!comparisonDiv) {
        comparisonDiv = document.createElement('div');
        comparisonDiv.id = 'crossModelComparisonDiv';
        container.insertBefore(comparisonDiv, container.firstChild);
    }

    const comparison = runCrossModelComparison(params);
    renderValidationPanel(comparison, comparisonDiv);
}

// Helper to get Greeks for the current chart using selected model
function getChartGreeks(S, K, T, sigma, r, q, isCall) {
    if (!state.wasmLoaded) {
        return calculator.calculateGreeks(S, K, T, sigma, r, q, isCall);
    }

    // For charts, we use lower precision for slow models to keep UI responsive
    if (state.pricingModel === 'binomial') {
        return calculate_binomial_wasm(S, K, T, sigma, r, q, isCall, 100);
    } else if (state.pricingModel === 'monte_carlo') {
        return calculate_mc_wasm(S, K, T, sigma, r, q, isCall, 5000);
    } else if (state.pricingModel === 'ai_surrogate' && window.aiSurrogate && window.aiSurrogate.ready) {
        return window.aiSurrogate.predictGreeks(S, K, T, sigma, r, q, isCall);
    } else {
        return calculate_greeks_wasm(S, K, T, sigma, r, q, isCall);
    }
}

// Calculate Greeks range using active model
function calculateModelGreeksRange(K, T, sigma, r, q, isCall, spotMin, spotMax, points = 50) {
    const results = [];
    const step = (spotMax - spotMin) / (points - 1);
    for (let i = 0; i < points; i++) {
        const S = spotMin + i * step;
        const greeks = getChartGreeks(S, K, T, sigma, r, q, isCall);
        results.push({ spot: S, ...greeks });
    }
    return results;
}

// Calculate time decay range using active model
function calculateModelTimeDecay(S, K, sigma, r, q, isCall, maxDays = 90) {
    const results = [];
    for (let days = maxDays; days >= 0; days -= Math.ceil(maxDays / 50)) {
        const T = days / 365;
        if (T <= 0) continue;
        const greeks = getChartGreeks(S, K, T, sigma, r, q, isCall);
        results.push({ daysToExpiry: days, ...greeks });
    }
    return results;
}

// Draw price vs spot chart
function drawPriceChart() {
    const { strike, maturity, volatility, rate, dividend, optionType, spot } = state;
    const isCall = optionType === 'call';

    const spotMin = strike * 0.7;
    const spotMax = strike * 1.3;
    const data = calculateModelGreeksRange(strike, maturity, volatility, rate, dividend, isCall, spotMin, spotMax);

    const ctx = document.getElementById('mainChart').getContext('2d');

    if (state.currentChart) {
        state.currentChart.destroy();
    }

    state.currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.spot.toFixed(0)),
            datasets: [{
                label: 'Option Price',
                data: data.map(d => d.price),
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f1f5f9' }
                },
                tooltip: {
                    enabled: false,
                    external: customTooltip
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Spot Price', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                },
                y: {
                    title: { display: true, text: 'Option Price ($)', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                }
            },
            annotation: {
                annotations: [{
                    type: 'line',
                    mode: 'vertical',
                    scaleID: 'x',
                    value: spot,
                    borderColor: '#10b981',
                    borderWidth: 2,
                    label: {
                        content: 'Current Spot',
                        enabled: true
                    }
                }]
            }
        }
    });
}

// Draw Greeks vs spot chart
function drawGreeksChart() {
    const { strike, maturity, volatility, rate, dividend, optionType } = state;
    const isCall = optionType === 'call';

    const spotMin = strike * 0.7;
    const spotMax = strike * 1.3;
    const data = calculateModelGreeksRange(strike, maturity, volatility, rate, dividend, isCall, spotMin, spotMax);

    const ctx = document.getElementById('mainChart').getContext('2d');

    if (state.currentChart) {
        state.currentChart.destroy();
    }

    state.currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.spot.toFixed(0)),
            datasets: [
                {
                    label: 'Delta',
                    data: data.map(d => d.delta),
                    borderColor: '#2563eb',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Gamma (×10)',
                    data: data.map(d => d.gamma * 10),
                    borderColor: '#10b981',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f1f5f9' }
                },
                tooltip: {
                    enabled: false,
                    external: customTooltip
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Spot Price', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                },
                y: {
                    title: { display: true, text: 'Greek Value', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

// Draw volatility surface (simplified 2D view)
function drawVolatilityChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');

    if (state.currentChart) {
        state.currentChart.destroy();
    }

    // Simplified volatility smile
    const strikes = [];
    const vols = [];
    const { strike } = state;

    for (let k = strike * 0.7; k <= strike * 1.3; k += strike * 0.05) {
        strikes.push(k.toFixed(0));
        const moneyness = Math.log(k / strike);
        // Simplified SVI-like smile
        const vol = 0.25 + 0.1 * Math.abs(moneyness) + 0.05 * moneyness;
        vols.push(vol * 100);
    }

    state.currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: strikes,
            datasets: [{
                label: 'Implied Volatility (%)',
                data: vols,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f1f5f9' }
                },
                tooltip: {
                    enabled: false,
                    external: customTooltip
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Strike Price', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                },
                y: {
                    title: { display: true, text: 'Implied Volatility (%)', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

// Draw time decay chart
function drawTimeDecayChart() {
    const { spot, strike, volatility, rate, dividend, optionType } = state;
    const isCall = optionType === 'call';

    const data = calculateModelTimeDecay(spot, strike, volatility, rate, dividend, isCall, 90);

    const ctx = document.getElementById('mainChart').getContext('2d');

    if (state.currentChart) {
        state.currentChart.destroy();
    }

    state.currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.daysToExpiry),
            datasets: [{
                label: 'Option Price',
                data: data.map(d => d.price),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f1f5f9' }
                },
                tooltip: {
                    enabled: false,
                    external: customTooltip
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Days to Expiration', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' },
                    reverse: true
                },
                y: {
                    title: { display: true, text: 'Option Price ($)', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

// Draw model comparison chart
function drawModelComparisonChart() {
    const { spot, strike, maturity, volatility, rate, dividend, optionType, wasmLoaded } = state;

    const ctx = document.getElementById('mainChart').getContext('2d');
    if (state.currentChart) {
        state.currentChart.destroy();
    }

    if (!wasmLoaded) {
        // Fallback info if no WASM available
        state.currentChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['Error'], datasets: [{ data: [0], label: 'WASM Needed for Comparison' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
        return;
    }

    const isCall = optionType === 'call';
    document.body.style.cursor = 'wait';

    // Calculate prices for all three models
    // We'll show Price, Delta, and Gamma side by side
    const bs = calculate_greeks_wasm(spot, strike, maturity, volatility, rate, dividend, isCall);
    const crr = calculate_binomial_wasm(spot, strike, maturity, volatility, rate, dividend, isCall, 500);
    const mc = calculate_mc_wasm(spot, strike, maturity, volatility, rate, dividend, isCall, 50000);

    let ai = null;
    if (window.aiSurrogate && window.aiSurrogate.ready) {
        ai = window.aiSurrogate.predictGreeks(spot, strike, maturity, volatility, rate, dividend, isCall);
    }

    document.body.style.cursor = 'default';

    const datasets = [
        {
            label: 'Black-Scholes (Exact)',
            data: [bs.price, bs.delta * 10, bs.gamma * 100, bs.vega],
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1
        },
        {
            label: 'Binomial Tree (CRR)',
            data: [crr.price, crr.delta * 10, crr.gamma * 100, crr.vega],
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderColor: 'rgb(16, 185, 129)',
            borderWidth: 1
        },
        {
            label: 'Monte Carlo (GBM)',
            data: [mc.price, mc.delta * 10, mc.gamma * 100, mc.vega],
            backgroundColor: 'rgba(245, 158, 11, 0.8)',
            borderColor: 'rgb(245, 158, 11)',
            borderWidth: 1
        }
    ];

    if (ai) {
        datasets.push({
            label: 'AI Surrogate (MLP)',
            data: [ai.price, ai.delta * 10, ai.gamma * 100, ai.vega],
            backgroundColor: 'rgba(168, 85, 247, 0.8)',
            borderColor: 'rgb(168, 85, 247)',
            borderWidth: 1
        });
    }

    state.currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Price ($)', 'Delta (x10)', 'Gamma (x100)', 'Vega'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#f1f5f9' }
                },
                title: {
                    display: true,
                    text: 'Model Output Comparison',
                    color: '#f8fafc'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

// Draw convergence chart
async function drawConvergenceChart() {
    const { spot, strike, maturity, volatility, rate, dividend, optionType, pricingModel, wasmLoaded } = state;

    const ctx = document.getElementById('mainChart').getContext('2d');
    if (state.currentChart) {
        state.currentChart.destroy();
        state.currentChart = null; // Important context wipe for pure canvas reuse
    }

    if (!wasmLoaded || pricingModel === 'black_scholes' || pricingModel === 'ai_surrogate') {
        state.currentChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['Info'], datasets: [{ data: [0], label: 'Please select Binomial or Monte Carlo model to see convergence' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
        const mcQualityPanel = document.getElementById('mcQualityPanel');
        if (mcQualityPanel) mcQualityPanel.style.display = 'none';
        return;
    }

    const isCall = optionType === 'call';
    const params = { S: spot, K: strike, T: maturity, sigma: volatility, r: rate, q: dividend, isCall };

    document.body.style.cursor = 'wait';

    // Defer heavy computation to allow UI thread to breathe
    const diagnostics = await new Promise(resolve => {
        setTimeout(() => {
            resolve(computeConvergenceDiagnostics(params));
        }, 10);
    });

    document.body.style.cursor = 'default';

    // renderConvergenceChart creates/mutates a chart on the given ctx and returns the instance
    state.currentChart = renderConvergenceChart({
        diagnostics,
        pricingModel,
        canvasCtx: ctx,
        existingChart: state.currentChart
    });

    const mcQualityPanel = document.getElementById('mcQualityPanel');
    if (mcQualityPanel) {
        renderMCQualityPanel(diagnostics, mcQualityPanel);
    }
}

// Draw 3D Surface Chart using Plotly
function draw3DSurfaceChart() {
    const { spot, strike, volatility, rate, dividend, optionType } = state;
    const isCall = optionType === 'call';

    document.body.style.cursor = 'wait';

    // We will plot Price (Z) against Spot Price (X) and Time to Maturity (Y)
    const points = 30; // Grid resolution

    const spotMin = strike * 0.5;
    const spotMax = strike * 1.5;
    const spotStep = (spotMax - spotMin) / (points - 1);

    const timeMin = 0.01; // nearly expired
    const timeMax = 2.0;  // 2 years
    const timeStep = (timeMax - timeMin) / (points - 1);

    const x_spots = [];
    const y_times = [];
    const z_prices = [];

    // Pre-calculate X axis values
    for (let i = 0; i < points; i++) {
        x_spots.push(spotMin + i * spotStep);
    }

    // Double loop to populate Z values array
    for (let j = 0; j < points; j++) {
        const time = timeMin + j * timeStep;
        y_times.push(time);

        const z_row = [];
        for (let i = 0; i < points; i++) {
            const currentSpot = x_spots[i];
            const greeks = getChartGreeks(currentSpot, strike, time, volatility, rate, dividend, isCall);
            z_row.push(greeks.price);
        }
        z_prices.push(z_row);
    }

    document.body.style.cursor = 'default';

    const data = [{
        z: z_prices,
        x: x_spots,
        y: y_times,
        type: 'surface',
        colorscale: 'Viridis',
        colorbar: { title: 'Price ($)' },
        hovertemplate: 'Spot: %{x:.2f}<br>Time: %{y:.2f} yrs<br>Price: %{z:.2f}<extra></extra>'
    }];

    const layout = {
        title: 'Option Price Surface (Spot vs Time vs Price)',
        autosize: true,
        margin: { l: 0, r: 0, b: 0, t: 40 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#f8fafc' },
        scene: {
            xaxis: { title: 'Spot Price', gridcolor: '#334155' },
            yaxis: { title: 'Time to Exp (Yrs)', gridcolor: '#334155' },
            zaxis: { title: 'Option Price', gridcolor: '#334155' },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } }
        }
    };

    const config = { responsive: true };

    Plotly.newPlot('plotlyChart', data, layout, config);
}

// Initialize challenge buttons
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.challenge-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const challengeId = e.target.dataset.challenge;

            // Switch to practice tab
            document.querySelector('.nav-btn[data-section="practice"]').click();

            // Allow time for tab switch, then start exercise
            setTimeout(() => {
                startExercise(challengeId);
            }, 100);
        });
    });
});
