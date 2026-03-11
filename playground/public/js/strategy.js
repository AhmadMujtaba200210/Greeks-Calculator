// Strategy Builder Module
import { customTooltip } from './ui_utils.js';

export const strategyState = {
    legs: [],
    scenarios: [],
    savedStrategies: [],
    chart: null,
    greeksChart: null,
    positionRollChart: null,
    compareExpiryChart: null,
    compareModalExpiryChart: null,
    compareTodayChart: null,
    nextId: 1
};

export const sharedMarketState = {
    ticker: 'SPY',
    spot: 100,
    volatility: 0.25,
    tYears: 1.0,
    rate: 0.05,
    dividend: 0.0
};

const tradeThesisState = {
    catalyst: '',
    tags: [],
    priceView: null,
    volatilityView: null,
    timeframe: null,
    objective: null,
    riskProfile: 'defined',
    premiumStyle: 'either',
    volRegime: 'neutral',
    suggestions: [],
    selectedPresetId: null,
    loadedPresetId: null,
    riskPct: 3,
    aum: 100000
};

const scenarioState = {
    spotChangePct: 0,
    ivChangePts: 0,
    daysElapsed: 0
};

const positionState = {
    active: null,
    journal: [],
    actionMode: null,
    lastResultHtml: 'No position action taken yet.',
    rollPreview: null,
    exportStatus: ''
};

const chartState = {
    showProbabilityOverlay: false
};

const builderUiState = {
    activeUtilityPane: 'playbook'
};

window.sharedMarketState = sharedMarketState;

function cloneMarketState(source = sharedMarketState) {
    return {
        ticker: source.ticker,
        spot: source.spot,
        volatility: source.volatility,
        tYears: source.tYears,
        rate: source.rate,
        dividend: source.dividend
    };
}

function cloneLegs(legs = []) {
    return legs.map(leg => ({ ...leg }));
}

function gcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) {
        const temp = y;
        y = x % y;
        x = temp;
    }
    return x || 1;
}

function detectStrategyUnits(legs = []) {
    if (!legs.length) return 1;
    const rounded = legs.map(leg => Math.round(leg.quantity));
    const hasFractional = legs.some((leg, index) => Math.abs(leg.quantity - rounded[index]) > 1e-6);
    if (hasFractional) return 1;
    return Math.max(1, rounded.reduce((acc, quantity) => gcd(acc, quantity), rounded[0] || 1));
}

function scaleLegTemplate(baseLegs = [], units = 1) {
    return baseLegs.map(leg => ({
        ...leg,
        quantity: leg.quantity * units
    }));
}

function getEntryPriceText(totalCost) {
    if (!Number.isFinite(totalCost)) return '--';
    if (Math.abs(totalCost) < 0.005) return '$0';
    return totalCost >= 0 ? `Debit $${totalCost.toFixed(2)}` : `Credit $${Math.abs(totalCost).toFixed(2)}`;
}

function formatPositionMoney(value) {
    if (!Number.isFinite(value)) return '--';
    const sign = value > 0 ? '+' : '';
    return `${sign}$${value.toFixed(2)}`;
}

function formatPositionPct(value) {
    if (!Number.isFinite(value)) return '--';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

function formatBreakevenList(points = []) {
    return points.length ? points.map(point => point.toFixed(1)).join(', ') : 'None';
}

function formatJournalTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getScenarioMarketState(baseMarketState = sharedMarketState, nextScenarioState = scenarioState) {
    const spot = baseMarketState.spot * (1 + (nextScenarioState.spotChangePct / 100));
    const volatility = Math.max(0.01, Math.min(3, baseMarketState.volatility + (nextScenarioState.ivChangePts / 100)));
    const tYears = Math.max(0.0001, baseMarketState.tYears - (nextScenarioState.daysElapsed / 365.25));

    return {
        ...cloneMarketState(baseMarketState),
        spot,
        volatility,
        tYears
    };
}

function getLegModelPrice(leg, spot, tYears, marketState) {
    if (leg.type === 'stock') return spot;
    if (!window.calculator) {
        if (leg.type === 'call') return Math.max(0, spot - leg.strike);
        return Math.max(0, leg.strike - spot);
    }

    return window.calculator.calculatePrice(
        spot,
        leg.strike,
        Math.max(0.0001, tYears),
        marketState.volatility,
        marketState.rate,
        marketState.dividend,
        leg.type === 'call'
    );
}

function getLegScenarioGreeks(leg, marketState, spot = marketState.spot) {
    if (leg.type === 'stock') {
        return { delta: 1, gamma: 0, vega: 0, theta: 0, rho: 0 };
    }

    if (!window.calculator) {
        return { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 };
    }

    return window.calculator.calculateGreeks(
        spot,
        leg.strike,
        Math.max(0.0001, marketState.tYears),
        marketState.volatility,
        marketState.rate,
        marketState.dividend,
        leg.type === 'call'
    );
}

function calculateScenarioMetricsForLegs(legs, nextScenarioState = scenarioState, entryMarketState = sharedMarketState) {
    if (!legs || !legs.length) {
        return {
            totalCost: 0,
            totalValue: 0,
            scenarioPL: 0,
            scenarioPLPct: 0,
            marketState: getScenarioMarketState(entryMarketState, nextScenarioState),
            greeks: { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 }
        };
    }

    const scenarioMarket = getScenarioMarketState(entryMarketState, nextScenarioState);
    let totalCost = 0;
    let totalValue = 0;
    let netDelta = 0;
    let netGamma = 0;
    let netVega = 0;
    let netTheta = 0;
    let netRho = 0;

    legs.forEach(leg => {
        const direction = leg.action === 'buy' ? 1 : -1;
        const multiplier = leg.quantity * direction * 100;
        const entryCost = getLegModelPrice(leg, entryMarketState.spot, entryMarketState.tYears, entryMarketState);
        const currentPrice = getLegModelPrice(leg, scenarioMarket.spot, scenarioMarket.tYears, scenarioMarket);
        const greeks = getLegScenarioGreeks(leg, scenarioMarket);

        totalCost += entryCost * direction * leg.quantity * 100;
        totalValue += currentPrice * direction * leg.quantity * 100;
        netDelta += greeks.delta * multiplier;
        netGamma += greeks.gamma * multiplier;
        netVega += greeks.vega * multiplier;
        netTheta += greeks.theta * multiplier;
        netRho += greeks.rho * multiplier;
    });

    const scenarioPL = totalValue - totalCost;
    const scenarioPLPct = totalCost !== 0 ? (scenarioPL / Math.abs(totalCost)) * 100 : 0;

    return {
        totalCost,
        totalValue,
        scenarioPL,
        scenarioPLPct,
        marketState: scenarioMarket,
        greeks: {
            delta: netDelta,
            gamma: netGamma,
            vega: netVega,
            theta: netTheta / 365.25,
            rho: netRho
        }
    };
}

function buildExpirySeries(legs, entryMarketState, start = entryMarketState.spot * 0.7, end = entryMarketState.spot * 1.3, steps = 100) {
    const stepSize = (end - start) / steps;
    const labels = [];
    const data = [];

    for (let i = 0; i <= steps; i++) {
        const spot = start + (i * stepSize);
        labels.push(spot.toFixed(2));
        let total = 0;
        legs.forEach(leg => {
            total += calculateNetValue(spot, leg, 0, entryMarketState);
        });
        data.push(total);
    }

    return { labels, data, start, end, stepSize, steps };
}

function getBreakevensFromSeries(series) {
    const points = [];
    for (let i = 0; i < series.data.length - 1; i++) {
        if (series.data[i] * series.data[i + 1] <= 0) {
            const x1 = series.start + (i * series.stepSize);
            const x2 = series.start + ((i + 1) * series.stepSize);
            const y1 = series.data[i];
            const y2 = series.data[i + 1];
            if (y1 !== y2) {
                points.push(x1 + ((0 - y1) * (x2 - x1) / (y2 - y1)));
            }
        }
    }
    return points;
}

function getPositionAnchorStrike(legs = [], fallback = sharedMarketState.spot) {
    const optionStrikes = legs.filter(leg => leg.type !== 'stock').map(leg => leg.strike);
    if (!optionStrikes.length) return fallback;
    return optionStrikes.reduce((sum, strike) => sum + strike, 0) / optionStrikes.length;
}

// Initialize the Context Bar
export function initStrategyContextBar() {
    const tickerInput = document.getElementById('sharedTicker');
    if (tickerInput) {
        tickerInput.addEventListener('input', (e) => {
            sharedMarketState.ticker = e.target.value.toUpperCase();
        });
    }

    function setupSync(numId, rangeId, stateKey, isPercent) {
        const numInput = document.getElementById(numId);
        const rangeInput = document.getElementById(rangeId);
        if (!numInput || !rangeInput) return;

        const sync = (val) => {
            const parsed = parseFloat(val);
            if (!Number.isFinite(parsed)) return;
            numInput.value = parsed;
            rangeInput.value = parsed;
            sharedMarketState[stateKey] = isPercent ? parsed / 100 : parsed;
            if (stateKey === 'rate' || stateKey === 'dividend' || stateKey === 'spot' || stateKey === 'volatility') {
                updateStrategyChart();
            }
        };

        numInput.addEventListener('input', (e) => sync(e.target.value));
        rangeInput.addEventListener('input', (e) => sync(e.target.value));
    }

    setupSync('sharedSpotNum', 'sharedSpot', 'spot', false);
    setupSync('sharedVolNum', 'sharedVol', 'volatility', true);
    setupSync('sharedRateNum', 'sharedRate', 'rate', true);
    setupSync('sharedDivNum', 'sharedDiv', 'dividend', true);

    const expiryInput = document.getElementById('sharedExpiry');
    const tSpan = document.getElementById('sharedTValue');
    if (expiryInput && tSpan) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 365);
        expiryInput.valueAsDate = targetDate;

        expiryInput.addEventListener('input', (e) => {
            const selectedStr = e.target.value;
            if (!selectedStr) return;
            const parts = selectedStr.split('-');
            const selectedDate = new Date(parts[0], parts[1] - 1, parts[2]);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let diffDays = (selectedDate - today) / (1000 * 60 * 60 * 24);
            if (diffDays < 0) diffDays = 0;
            let tYears = diffDays / 365.25;
            if (tYears < 0.001) tYears = 0.001;

            sharedMarketState.tYears = tYears;
            tSpan.textContent = `T=${tYears.toFixed(2)}y`;

            // Sync max days on scenario slider
            if (window.updateScenarioMaxDays) window.updateScenarioMaxDays();
            updateStrategyChart();
        });
    }
}

export function initScenarioSandbox() {
    const spotSlider = document.getElementById('scenarioSpotChange');
    const volSlider = document.getElementById('scenarioVolChange');
    const daysSlider = document.getElementById('scenarioDaysElapsed');

    const spotVal = document.getElementById('valSpotChange');
    const volVal = document.getElementById('valVolChange');
    const daysVal = document.getElementById('valDaysElapsed');

    const plEl = document.getElementById('scenarioPL');
    const plPctEl = document.getElementById('scenarioPLPct');
    const dEl = document.getElementById('scenDelta');
    const gEl = document.getElementById('scenGamma');
    const vEl = document.getElementById('scenVega');
    const thEl = document.getElementById('scenTheta');

    window.updateScenarioMaxDays = () => {
        if (!daysSlider) return;
        const maxDays = Math.max(1, Math.floor(sharedMarketState.tYears * 365.25));
        daysSlider.max = maxDays;
        if (parseFloat(daysSlider.value) > maxDays) {
            daysSlider.value = maxDays;
        }
    };
    window.updateScenarioMaxDays();

    function syncScenarioInputs(nextScenarioState = {}) {
        if (typeof nextScenarioState.spotChangePct === 'number') {
            scenarioState.spotChangePct = nextScenarioState.spotChangePct;
            if (spotSlider) spotSlider.value = String(nextScenarioState.spotChangePct);
        }
        if (typeof nextScenarioState.ivChangePts === 'number') {
            scenarioState.ivChangePts = nextScenarioState.ivChangePts;
            if (volSlider) volSlider.value = String(nextScenarioState.ivChangePts);
        }
        if (typeof nextScenarioState.daysElapsed === 'number') {
            scenarioState.daysElapsed = nextScenarioState.daysElapsed;
            if (daysSlider) daysSlider.value = String(nextScenarioState.daysElapsed);
        }
    }

    function updateScenario() {
        if (!spotSlider || !volSlider || !daysSlider) return;

        syncScenarioInputs({
            spotChangePct: parseFloat(spotSlider.value),
            ivChangePts: parseFloat(volSlider.value),
            daysElapsed: parseFloat(daysSlider.value)
        });

        spotVal.textContent = scenarioState.spotChangePct > 0 ? `+${scenarioState.spotChangePct}%` : `${scenarioState.spotChangePct}%`;
        volVal.textContent = scenarioState.ivChangePts > 0 ? `+${scenarioState.ivChangePts}` : `${scenarioState.ivChangePts}`;
        daysVal.textContent = `${scenarioState.daysElapsed}`;

        if (!strategyState.legs.length) {
            if (plEl) plEl.textContent = '$0.00';
            if (plPctEl) plPctEl.textContent = '0.00%';
            if (dEl) dEl.textContent = '0.00';
            if (gEl) gEl.textContent = '0.00';
            if (vEl) vEl.textContent = '0.00';
            if (thEl) thEl.textContent = '0.00';
            if (window.refreshPositionManagement) window.refreshPositionManagement();
            return;
        }

        const entryMarketState = positionState.active?.entryMarketState || sharedMarketState;
        const metrics = calculateScenarioMetricsForLegs(strategyState.legs, scenarioState, entryMarketState);

        plEl.textContent = `$${metrics.scenarioPL.toFixed(2)}`;
        plEl.style.color = metrics.scenarioPL > 0 ? '#10b981' : (metrics.scenarioPL < 0 ? '#ef4444' : '#f8fafc');
        plPctEl.textContent = `${metrics.scenarioPLPct.toFixed(2)}%`;
        plPctEl.style.color = plEl.style.color;

        dEl.textContent = metrics.greeks.delta.toFixed(2);
        gEl.textContent = metrics.greeks.gamma.toFixed(2);
        vEl.textContent = metrics.greeks.vega.toFixed(2);
        thEl.textContent = metrics.greeks.theta.toFixed(2);

        if (window.refreshPositionManagement) window.refreshPositionManagement();
    }

    // Listeners
    if (spotSlider) spotSlider.addEventListener('input', updateScenario);
    if (volSlider) volSlider.addEventListener('input', updateScenario);
    if (daysSlider) daysSlider.addEventListener('input', updateScenario);

    // We want to expose updateScenario so we can call it when main params change
    window.updateSandboxScenario = updateScenario;
    window.getScenarioState = () => ({ ...scenarioState });
    window.resetScenarioSandbox = () => {
        syncScenarioInputs({ spotChangePct: 0, ivChangePts: 0, daysElapsed: 0 });
        updateScenario();
    };

    // Presets
    document.getElementById('scenarioBullBtn')?.addEventListener('click', () => {
        syncScenarioInputs({ spotChangePct: 10, ivChangePts: -5, daysElapsed: Math.min(3, parseInt(daysSlider.max, 10)) });
        updateScenario();
    });
    document.getElementById('scenarioBearBtn')?.addEventListener('click', () => {
        syncScenarioInputs({ spotChangePct: -10, ivChangePts: 5, daysElapsed: Math.min(3, parseInt(daysSlider.max, 10)) });
        updateScenario();
    });
    document.getElementById('scenarioThetaBtn')?.addEventListener('click', () => {
        syncScenarioInputs({ spotChangePct: 0, ivChangePts: 0, daysElapsed: Math.min(7, parseInt(daysSlider.max, 10)) });
        updateScenario();
    });

    // Save
    document.getElementById('saveScenarioBtn')?.addEventListener('click', () => {
        if (strategyState.legs.length === 0) return;
        if (strategyState.scenarios.length >= 6) {
            alert("Maximum 6 scenarios allowed. Please delete one first.");
            return;
        }
        const name = `Scenario ${strategyState.scenarios.length + 1}`;
        strategyState.scenarios.push({
            id: Date.now(),
            name,
            spotChange: spotSlider.value,
            ivChange: volSlider.value,
            days: daysSlider.value,
            pl: plEl.textContent,
            color: plEl.style.color
        });
        renderScenariosTable();
    });
}

export function renderScenariosTable() {
    const tbody = document.getElementById('scenariosTableBody');
    if (!tbody) return;

    if (strategyState.scenarios.length === 0) {
        tbody.innerHTML = `<tr id="emptyScenariosRow"><td colspan="6" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No scenarios saved yet. Maximum 6 allowed.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    strategyState.scenarios.forEach(scen => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid var(--border-light)";
        tr.innerHTML = `
            <td style="padding: 0.75rem;"><input type="text" value="${scen.name}" class="ticker-input" style="width: 120px; font-size: 0.85rem; padding: 0.2rem 0.5rem;" onchange="window.updateScenarioName(${scen.id}, this.value)"></td>
            <td style="padding: 0.75rem;">${scen.spotChange > 0 ? '+' : ''}${scen.spotChange}%</td>
            <td style="padding: 0.75rem;">${scen.ivChange > 0 ? '+' : ''}${scen.ivChange} pts</td>
            <td style="padding: 0.75rem;">${scen.days}</td>
            <td style="padding: 0.75rem; color: ${scen.color}; font-weight: bold; font-family: 'JetBrains Mono', monospace;">${scen.pl}</td>
            <td style="padding: 0.75rem;"><button onclick="window.removeScenario(${scen.id})" class="remove-leg-btn" style="position: relative; top: 0; right: 0; width: 20px; height: 20px; font-size: 0.8rem;">×</button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateScenarioName = (id, newName) => {
    const s = strategyState.scenarios.find(x => x.id === id);
    if (s) s.name = newName;
};
window.removeScenario = (id) => {
    strategyState.scenarios = strategyState.scenarios.filter(x => x.id !== id);
    renderScenariosTable();
};

// Add a default leg
export function addLeg(defaults = {}) {
    const leg = {
        id: `${Date.now()}-${strategyState.nextId++}`,
        type: defaults.type || 'call',
        action: defaults.action || 'buy',
        strike: defaults.strike || sharedMarketState.spot,
        expiry: defaults.expiry || sharedMarketState.tYears,
        quantity: defaults.quantity || 1
    };
    strategyState.legs.push(leg);
    renderLegs();
    updateStrategyChart();
    return leg;
}

// Remove a leg
export function removeLeg(id) {
    strategyState.legs = strategyState.legs.filter(l => l.id !== id);
    renderLegs();
    updateStrategyChart();
}

// Update a leg parameter
export function updateLeg(id, param, value) {
    const leg = strategyState.legs.find(l => l.id === id);
    if (leg) {
        if (param === 'quantity' || param === 'strike' || param === 'expiry') {
            const parsed = parseFloat(value);
            if (!Number.isFinite(parsed)) return;
            if (param === 'quantity') {
                leg[param] = Math.max(1, parsed);
            } else if (param === 'strike') {
                leg[param] = Math.max(0, parsed);
            } else {
                leg[param] = Math.max(0.01, parsed);
            }
        } else {
            leg[param] = value;
        }
        updateStrategyChart();
    }
}

// Render the list of legs in the UI
function renderLegs() {
    const container = document.getElementById('legsContainer');
    const emptyState = document.getElementById('legsEmptyState');
    if (!container) return;

    if (strategyState.legs.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        // Clear anything else BUT the empty state
        Array.from(container.children).forEach(child => {
            if (child.id !== 'legsEmptyState') child.remove();
        });
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Remove existing leg cards (but keep empty state div for future use)
    Array.from(container.children).forEach(child => {
        if (child.id !== 'legsEmptyState') child.remove();
    });

    strategyState.legs.forEach(leg => {
        const div = document.createElement('div');
        div.className = 'leg-card glass';
        div.innerHTML = `
            <div class="leg-header">
                <select onchange="window.updateLeg('${leg.id}', 'action', this.value)" class="leg-select ${leg.action}">
                    <option value="buy" ${leg.action === 'buy' ? 'selected' : ''}>Buy</option>
                    <option value="sell" ${leg.action === 'sell' ? 'selected' : ''}>Sell</option>
                </select>
                <select onchange="window.updateLeg('${leg.id}', 'type', this.value)" class="leg-select">
                    <option value="call" ${leg.type === 'call' ? 'selected' : ''}>Call</option>
                    <option value="put" ${leg.type === 'put' ? 'selected' : ''}>Put</option>
                    <option value="stock" ${leg.type === 'stock' ? 'selected' : ''}>Stock</option>
                </select>
                <button onclick="window.removeLeg('${leg.id}')" class="remove-leg-btn">×</button>
            </div>
            <div class="leg-controls">
                <div class="control-group">
                    <label>Strike / Entry</label>
                    <input type="number" value="${leg.strike}" onchange="window.updateLeg('${leg.id}', 'strike', this.value)">
                </div>
                <div class="control-group">
                    <label>Qty</label>
                    <input type="number" value="${leg.quantity}" min="1" onchange="window.updateLeg('${leg.id}', 'quantity', this.value)">
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// Calculate Net Value (P&L) of a leg at a specific time remaining and spot price
function calculateNetValue(S_test, leg, tRemaining, entryMarketState = sharedMarketState) {
    let currentVal = 0;

    // Calculate theoretical intrinsic or BS value based on tRemaining
    if (leg.type === 'stock') {
        currentVal = S_test;
    } else {
        if (tRemaining <= 0) {
            // Expiration intrinsic
            if (leg.type === 'call') currentVal = Math.max(0, S_test - leg.strike);
            else currentVal = Math.max(0, leg.strike - S_test);
        } else {
            // Before expiration, use Black-Scholes
            if (window.calculator && entryMarketState) {
                const v = entryMarketState.volatility;
                const r = entryMarketState.rate;
                const q = entryMarketState.dividend;
                const isCall = leg.type === 'call';
                currentVal = window.calculator.calculatePrice(S_test, leg.strike, tRemaining, v, r, q, isCall);
            } else {
                if (leg.type === 'call') currentVal = Math.max(0, S_test - leg.strike);
                else currentVal = Math.max(0, leg.strike - S_test);
            }
        }
    }

    // Calculate Entry Cost based on Panel 1's sharedMarketState
    let entryCost = 0;
    if (window.calculator && entryMarketState) {
        const S = entryMarketState.spot;
        const T = entryMarketState.tYears;
        const v = entryMarketState.volatility;
        const r = entryMarketState.rate;
        const q = entryMarketState.dividend;
        const isCall = leg.type === 'call';

        if (leg.type !== 'stock') {
            entryCost = window.calculator.calculatePrice(S, leg.strike, T, v, r, q, isCall);
        } else {
            entryCost = S;
        }
    } else {
        if (leg.type === 'stock') entryCost = entryMarketState.spot;
        else if (leg.type === 'call') entryCost = Math.max(0, entryMarketState.spot - leg.strike);
        else entryCost = Math.max(0, leg.strike - entryMarketState.spot);
    }

    const direction = leg.action === 'buy' ? 1 : -1;
    return direction * leg.quantity * (currentVal - entryCost) * 100;
}

// Calculate aggregated Net Greeks for the entire strategy
function calculateNetGreeks(spotToTest = sharedMarketState.spot, marketState = sharedMarketState, legs = strategyState.legs) {
    let netDelta = 0, netGamma = 0, netVega = 0, netTheta = 0, netRho = 0;

    if (window.calculator && marketState) {
        const T = marketState.tYears;
        const v = marketState.volatility;
        const r = marketState.rate;
        const q = marketState.dividend;

        legs.forEach(leg => {
            const direction = leg.action === 'buy' ? 1 : -1;
            const multiplier = leg.quantity * direction * 100;

            if (leg.type === 'stock') {
                netDelta += 1 * multiplier; // Stock delta is 1 per share
            } else if (T > 0) {
                const isCall = leg.type === 'call';
                const greeks = window.calculator.calculateGreeks(spotToTest, leg.strike, T, v, r, q, isCall);

                netDelta += greeks.delta * multiplier;
                netGamma += greeks.gamma * multiplier;
                netVega += greeks.vega * multiplier;
                netTheta += greeks.theta * multiplier;
                netRho += greeks.rho * multiplier;
            }
        });
    }
    return {
        delta: netDelta,
        gamma: netGamma,
        vega: netVega,
        theta: netTheta / 365.25, // Convert to daily theta
        rho: netRho
    };
}

function calculateStrategyPayoffAt(spot, tRemain = 0, legs = strategyState.legs, entryMarketState = sharedMarketState) {
    return legs.reduce((total, leg) => total + calculateNetValue(spot, leg, tRemain, entryMarketState), 0);
}

function formatChartCurrency(value) {
    return `$${Math.abs(value).toFixed(2)}`;
}

function formatChartSignedCurrency(value) {
    if (!Number.isFinite(value)) return '--';
    const sign = value > 0 ? '+' : (value < 0 ? '-' : '');
    return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function formatChartSignedPct(value) {
    if (!Number.isFinite(value)) return '--';
    const sign = value > 0 ? '+' : (value < 0 ? '-' : '');
    return `${sign}${Math.abs(value).toFixed(1)}%`;
}

function erf(x) {
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * absX);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return sign * y;
}

function normalCdf(x) {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function logNormalPdf(spot, marketState = sharedMarketState) {
    const S0 = marketState.spot;
    const sigma = marketState.volatility;
    const T = marketState.tYears;
    if (spot <= 0 || S0 <= 0 || sigma <= 0 || T <= 0) return 0;

    const mu = Math.log(S0) + (marketState.rate - marketState.dividend - 0.5 * sigma * sigma) * T;
    const variance = sigma * sigma * T;
    const denom = spot * Math.sqrt(2 * Math.PI * variance);
    const exponent = -((Math.log(spot) - mu) ** 2) / (2 * variance);
    return Math.exp(exponent) / denom;
}

function getBreakevenObjects(expiryPoints, currentSpot = sharedMarketState.spot) {
    const breakevens = [];
    for (let i = 0; i < expiryPoints.length - 1; i++) {
        const left = expiryPoints[i];
        const right = expiryPoints[i + 1];
        if (left.y * right.y <= 0 && left.y !== right.y) {
            const price = left.x + ((0 - left.y) * (right.x - left.x) / (right.y - left.y));
            breakevens.push({
                price,
                pctFromSpot: ((price / currentSpot) - 1) * 100
            });
        }
    }
    return breakevens;
}

function interpolatePayoffFromPoints(points, x) {
    if (!points.length) return 0;
    if (x <= points[0].x) return points[0].y;
    if (x >= points[points.length - 1].x) return points[points.length - 1].y;

    for (let i = 0; i < points.length - 1; i++) {
        const left = points[i];
        const right = points[i + 1];
        if (x >= left.x && x <= right.x) {
            if (left.x === right.x) return left.y;
            const ratio = (x - left.x) / (right.x - left.x);
            return left.y + ((right.y - left.y) * ratio);
        }
    }

    return points[points.length - 1].y;
}

function computeProbabilityAnalysis(expiryPoints, legs, marketState, chartRange) {
    if (!legs.length || marketState.tYears <= 0 || marketState.volatility <= 0 || marketState.spot <= 0) {
        return null;
    }

    const sigmaT = marketState.volatility * Math.sqrt(marketState.tYears);
    const low = Math.max(0.01, marketState.spot * Math.exp((marketState.rate - marketState.dividend - 0.5 * marketState.volatility ** 2) * marketState.tYears - (6 * sigmaT)));
    const high = marketState.spot * Math.exp((marketState.rate - marketState.dividend - 0.5 * marketState.volatility ** 2) * marketState.tYears + (6 * sigmaT));

    const integrationSteps = 800;
    const dx = (high - low) / integrationSteps;
    let totalMass = 0;
    let profitMass = 0;
    let expectedPL = 0;

    for (let i = 0; i < integrationSteps; i++) {
        const x = low + ((i + 0.5) * dx);
        const density = logNormalPdf(x, marketState);
        const payoff = calculateStrategyPayoffAt(x, 0, legs, marketState);
        const mass = density * dx;
        totalMass += mass;
        if (payoff > 0) profitMass += mass;
        expectedPL += payoff * mass;
    }

    const overlaySamples = [];
    let maxOverlayDensity = 0;
    const overlaySteps = 160;
    for (let i = 0; i <= overlaySteps; i++) {
        const x = chartRange.start + (((chartRange.end - chartRange.start) * i) / overlaySteps);
        const density = logNormalPdf(x, marketState);
        maxOverlayDensity = Math.max(maxOverlayDensity, density);
        overlaySamples.push({
            x,
            density,
            payoff: interpolatePayoffFromPoints(expiryPoints, x)
        });
    }

    overlaySamples.forEach(sample => {
        sample.normalizedDensity = maxOverlayDensity > 0 ? sample.density / maxOverlayDensity : 0;
        sample.isProfit = sample.payoff > 0;
    });

    if (totalMass <= 0) return null;

    return {
        probProfit: profitMass / totalMass,
        expectedPL: expectedPL / totalMass,
        samples: overlaySamples
    };
}

function computeThetaAbsorbMetric(legs, marketState, currentSpot = marketState.spot) {
    const currentGreeks = calculateNetGreeks(currentSpot, marketState, legs);
    if (currentGreeks.theta >= 0) {
        return {
            days: null,
            text: 'Theta positive'
        };
    }

    const totalDays = Math.max(1, Math.floor(marketState.tYears * 365.25));
    for (let day = 1; day <= totalDays; day++) {
        const tRemain = Math.max(0.0001, marketState.tYears - (day / 365.25));
        const pnl = calculateStrategyPayoffAt(currentSpot, tRemain, legs, marketState);
        if (pnl < 0) {
            return {
                days: day,
                text: `${day}d`
            };
        }
    }

    return {
        days: totalDays,
        text: `>${totalDays}d`
    };
}

function analyzeExpiryProfile(expiryPoints, legs, marketState, currentSpot, currentNetGreeks) {
    const payoffs = expiryPoints.map(point => point.y);
    const maxVal = Math.max(...payoffs);
    const minVal = Math.min(...payoffs);
    const lastIndex = payoffs.length - 1;

    const isRisingAtEnd = payoffs[lastIndex] > payoffs[lastIndex - 1];
    const isFallingAtEnd = payoffs[lastIndex] < payoffs[lastIndex - 1];
    const isRisingAtStart = payoffs[0] > payoffs[1];
    const isFallingAtStart = payoffs[0] < payoffs[1];

    const breakevens = getBreakevenObjects(expiryPoints, currentSpot);
    const maxLossIndex = payoffs.indexOf(minVal);
    const maxLossPoint = {
        price: expiryPoints[maxLossIndex]?.x ?? currentSpot,
        value: minVal,
        totalLoss: Math.abs(minVal),
        perContractLoss: Math.abs(minVal) / Math.max(1, detectStrategyUnits(legs))
    };

    const probability = computeProbabilityAnalysis(
        expiryPoints,
        legs,
        marketState,
        { start: expiryPoints[0].x, end: expiryPoints[expiryPoints.length - 1].x }
    );

    const thetaAbsorb = computeThetaAbsorbMetric(legs, marketState, currentSpot);

    return {
        expiryPoints,
        breakevens,
        maxProfitValue: maxVal,
        maxLossValue: minVal,
        maxProfitText: (isRisingAtEnd || isRisingAtStart) ? 'Infinite ♾️' : `$${maxVal.toFixed(2)}`,
        maxLossText: (isFallingAtEnd || isFallingAtStart) ? 'Unlimited ⚠️' : `$${Math.abs(minVal).toFixed(2)}`,
        maxLossPoint,
        breakevenText: breakevens.length ? breakevens.map(point => point.price.toFixed(1)).join(', ') : 'None',
        breakEvenMoveText: breakevens.length ? breakevens.map(point => formatChartSignedPct(point.pctFromSpot)).join(' / ') : 'No expiry B/E',
        probability,
        probabilityText: probability ? `${(probability.probProfit * 100).toFixed(1)}%` : '--',
        expectedPLText: probability ? formatChartSignedCurrency(probability.expectedPL) : '--',
        thetaAbsorb,
        thetaAbsorbText: thetaAbsorb.text,
        positiveZonePoints: expiryPoints.map(point => ({ x: point.x, y: point.y > 0 ? point.y : null })),
        negativeZonePoints: expiryPoints.map(point => ({ x: point.x, y: point.y < 0 ? point.y : null })),
        currentSpot,
        currentNetGreeks
    };
}

function measureAnnotationLabel(ctx, lines) {
    ctx.save();
    ctx.font = "11px 'JetBrains Mono', monospace";
    const paddingX = 8;
    const paddingY = 6;
    const lineHeight = 13;
    const width = Math.max(...lines.map(line => ctx.measureText(line).width)) + (paddingX * 2);
    const height = (lines.length * lineHeight) + (paddingY * 2);
    ctx.restore();
    return { width, height, paddingX, paddingY, lineHeight };
}

function clampAnnotationRect(rect, chartArea, padding = 8) {
    const left = Math.min(
        Math.max(rect.left, chartArea.left + padding),
        chartArea.right - rect.width - padding
    );
    const top = Math.min(
        Math.max(rect.top, chartArea.top + padding),
        chartArea.bottom - rect.height - padding
    );
    return {
        left,
        top,
        width: rect.width,
        height: rect.height,
        right: left + rect.width,
        bottom: top + rect.height
    };
}

function annotationRectsOverlap(leftRect, rightRect, padding = 10) {
    return !(
        leftRect.right + padding < rightRect.left ||
        rightRect.right + padding < leftRect.left ||
        leftRect.bottom + padding < rightRect.top ||
        rightRect.bottom + padding < leftRect.top
    );
}

function getAnnotationConnectorPoint(rect, anchorX, anchorY) {
    return {
        x: Math.min(Math.max(anchorX, rect.left), rect.right),
        y: Math.min(Math.max(anchorY, rect.top), rect.bottom)
    };
}

function buildAnnotationCandidate(position, anchorX, anchorY, width, height, chartArea) {
    const topBand = chartArea.top + 10;
    const bottomBand = chartArea.bottom - height - 10;
    const gap = 14;

    switch (position) {
        case 'top-band':
            return { left: anchorX - (width / 2), top: topBand, width, height };
        case 'top-band-right':
            return { left: anchorX + gap, top: topBand, width, height };
        case 'top-band-left':
            return { left: anchorX - width - gap, top: topBand, width, height };
        case 'above-right':
            return { left: anchorX + gap, top: anchorY - height - gap, width, height };
        case 'above-left':
            return { left: anchorX - width - gap, top: anchorY - height - gap, width, height };
        case 'mid-right':
            return { left: anchorX + gap, top: anchorY - (height / 2), width, height };
        case 'mid-left':
            return { left: anchorX - width - gap, top: anchorY - (height / 2), width, height };
        case 'below-right':
            return { left: anchorX + gap, top: anchorY + gap, width, height };
        case 'below-left':
            return { left: anchorX - width - gap, top: anchorY + gap, width, height };
        case 'bottom-band':
            return { left: anchorX - (width / 2), top: bottomBand, width, height };
        default:
            return { left: anchorX - (width / 2), top: topBand, width, height };
    }
}

function placeAnnotationLabel(ctx, chartArea, anchorX, anchorY, lines, borderColor, occupiedRects, placements, fillColor = 'rgba(10, 12, 18, 0.94)') {
    const metrics = measureAnnotationLabel(ctx, lines);
    let bestRect = null;
    let bestScore = Number.POSITIVE_INFINITY;

    placements.forEach(position => {
        const requestedRect = buildAnnotationCandidate(position, anchorX, anchorY, metrics.width, metrics.height, chartArea);
        const rect = clampAnnotationRect(requestedRect, chartArea);
        const centerX = rect.left + (rect.width / 2);
        const centerY = rect.top + (rect.height / 2);
        const clampPenalty = Math.abs(rect.left - requestedRect.left) + Math.abs(rect.top - requestedRect.top);
        const distancePenalty = Math.hypot(centerX - anchorX, centerY - anchorY);
        const overlapPenalty = occupiedRects.some(existingRect => annotationRectsOverlap(rect, existingRect)) ? 10000 : 0;
        const score = overlapPenalty + (clampPenalty * 3) + distancePenalty;

        if (score < bestScore) {
            bestScore = score;
            bestRect = rect;
        }
    });

    if (!bestRect) {
        bestRect = clampAnnotationRect(
            { left: anchorX - (metrics.width / 2), top: chartArea.top + 10, width: metrics.width, height: metrics.height },
            chartArea
        );
    }

    const connector = getAnnotationConnectorPoint(bestRect, anchorX, anchorY);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(connector.x, connector.y);
    ctx.lineTo(anchorX, anchorY);
    ctx.strokeStyle = borderColor;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bestRect.left, bestRect.top, bestRect.width, bestRect.height, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e2e4f0';
    lines.forEach((line, index) => {
        ctx.fillText(
            line,
            bestRect.left + metrics.paddingX,
            bestRect.top + metrics.paddingY + 9 + (index * metrics.lineHeight)
        );
    });
    ctx.restore();

    occupiedRects.push(bestRect);
    return bestRect;
}

function drawPinnedValueTag(ctx, chartArea, {
    x,
    y,
    text,
    borderColor,
    fillColor,
    textColor = '#e2e4f0',
    placement = 'above',
    occupiedRects = []
}) {
    ctx.save();
    ctx.font = "10px 'JetBrains Mono', monospace";
    const paddingX = 7;
    const paddingY = 5;
    const width = ctx.measureText(text).width + (paddingX * 2);
    const height = 22;
    const gap = 10;

    const candidates = placement === 'left-axis'
        ? [
            { left: chartArea.left + 10, top: y - (height / 2), width, height },
            { left: chartArea.left + 10, top: y - height - gap, width, height },
            { left: chartArea.left + 10, top: y + gap, width, height }
        ]
        : placement === 'below'
            ? [
                { left: x - (width / 2), top: y + gap, width, height },
                { left: x + gap, top: y - (height / 2), width, height },
                { left: x - width - gap, top: y - (height / 2), width, height },
                { left: x - (width / 2), top: y - height - gap, width, height }
            ]
        : [
            { left: x - (width / 2), top: y - height - gap, width, height },
            { left: x + gap, top: y - (height / 2), width, height },
            { left: x - width - gap, top: y - (height / 2), width, height },
            { left: x - (width / 2), top: y + gap, width, height }
        ];

    let bestRect = null;
    let bestScore = Number.POSITIVE_INFINITY;

    candidates.forEach(candidate => {
        const rect = clampAnnotationRect(candidate, chartArea, 8);
        const centerX = rect.left + (rect.width / 2);
        const centerY = rect.top + (rect.height / 2);
        const overlapPenalty = occupiedRects.some(existingRect => annotationRectsOverlap(rect, existingRect, 6)) ? 10000 : 0;
        const distancePenalty = Math.hypot(centerX - x, centerY - y);
        const clampPenalty = Math.abs(rect.left - candidate.left) + Math.abs(rect.top - candidate.top);
        const score = overlapPenalty + distancePenalty + (clampPenalty * 2);

        if (score < bestScore) {
            bestScore = score;
            bestRect = rect;
        }
    });

    if (!bestRect) {
        bestRect = clampAnnotationRect(candidates[0], chartArea, 8);
    }

    const connector = getAnnotationConnectorPoint(bestRect, x, y);

    ctx.beginPath();
    ctx.moveTo(connector.x, connector.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.85;
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bestRect.left, bestRect.top, bestRect.width, bestRect.height, 999);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.fillText(text, bestRect.left + paddingX, bestRect.top + paddingY + 8);
    ctx.restore();

    occupiedRects.push(bestRect);
    return bestRect;
}

const htmlLegendPlugin = {
    id: 'htmlLegend',
    afterUpdate(chart, _args, options) {
        const container = document.getElementById(options?.containerID || '');
        if (!container) return;

        container.innerHTML = '';

        const labelGenerator = chart.options.plugins.legend.labels.generateLabels;
        const legendItems = labelGenerator(chart)
            .filter(item => !options?.filter || options.filter(item, chart));

        legendItems.forEach(item => {
            const dataset = chart.data.datasets[item.datasetIndex];
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `chart-legend-chip${item.hidden ? ' is-hidden' : ''}`;
            button.setAttribute('aria-pressed', item.hidden ? 'false' : 'true');
            button.title = item.hidden ? 'Show curve' : 'Hide curve';

            const swatch = document.createElement('span');
            swatch.className = 'chart-legend-swatch';
            swatch.style.borderTopColor = item.strokeStyle || item.fillStyle || dataset?.borderColor || '#94a3b8';
            if (Array.isArray(item.lineDash) && item.lineDash.length) {
                swatch.classList.add('is-dashed');
            }

            const text = document.createElement('span');
            text.className = 'chart-legend-text';
            text.textContent = dataset?.legendLabel || item.text;

            button.appendChild(swatch);
            button.appendChild(text);
            button.addEventListener('click', () => {
                chart.setDatasetVisibility(item.datasetIndex, !chart.isDatasetVisible(item.datasetIndex));
                chart.update();
            });

            container.appendChild(button);
        });
    }
};

function clearChartLegend(containerId) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
}

function renderStrategyChartReadouts(analysis) {
    const container = document.getElementById('strategyChartReadouts');
    if (!container) return;

    if (!analysis) {
        container.innerHTML = `
            <div class="chart-readout" data-tone="muted">
                <span class="chart-readout-label">Chart Readouts</span>
                <strong class="chart-readout-value">Waiting for strategy</strong>
                <span class="chart-readout-meta">Load or build a position to see breakevens, loss limits, and probability context.</span>
            </div>
        `;
        return;
    }

    const readouts = [];
    const breakevenLabels = analysis.breakevens.length === 1
        ? ['Expiry B/E']
        : ['Lower B/E', 'Upper B/E'];

    if (analysis.breakevens.length) {
        analysis.breakevens.forEach((breakeven, index) => {
            readouts.push({
                label: breakevenLabels[index] || `B/E ${index + 1}`,
                value: `$${breakeven.price.toFixed(2)}`,
                meta: `${formatChartSignedPct(breakeven.pctFromSpot)} from spot`,
                tone: 'amber'
            });
        });
    } else {
        readouts.push({
            label: 'Expiry B/E',
            value: 'None',
            meta: 'No payoff crossover within the plotted expiry range.',
            tone: 'muted'
        });
    }

    readouts.push({
        label: 'Max Loss',
        value: formatChartCurrency(analysis.maxLossPoint.totalLoss),
        meta: `${formatChartCurrency(analysis.maxLossPoint.perContractLoss)} / contract`,
        tone: 'red'
    });

    if (analysis.probability) {
        readouts.push({
            label: 'Profit Odds',
            value: `${(analysis.probability.probProfit * 100).toFixed(1)}%`,
            meta: `Expected ${formatChartSignedCurrency(analysis.probability.expectedPL)}`,
            tone: analysis.probability.probProfit >= 0.5 ? 'green' : 'muted'
        });
    }

    container.innerHTML = readouts.map(readout => `
        <div class="chart-readout" data-tone="${readout.tone}">
            <span class="chart-readout-label">${readout.label}</span>
            <strong class="chart-readout-value">${readout.value}</strong>
            <span class="chart-readout-meta">${readout.meta}</span>
        </div>
    `).join('');
}

const strategyPayoffOverlayPlugin = {
    id: 'strategyPayoffOverlay',
    beforeDatasetsDraw(chart, _args, options) {
        if (!options?.showProbabilityOverlay || !options.analysis?.probability?.samples?.length) return;

        const { ctx, chartArea, scales } = chart;
        const xScale = scales.x;
        const samples = options.analysis.probability.samples;
        const bandHeight = Math.min(60, chartArea.height * 0.22);
        const baseY = chartArea.bottom - 4;
        const topY = baseY - bandHeight;

        ctx.save();
        ctx.fillStyle = 'rgba(8, 9, 13, 0.55)';
        ctx.fillRect(chartArea.left, topY, chartArea.right - chartArea.left, bandHeight);

        for (let i = 0; i < samples.length - 1; i++) {
            const left = samples[i];
            const right = samples[i + 1];
            const x1 = xScale.getPixelForValue(left.x);
            const x2 = xScale.getPixelForValue(right.x);
            const y1 = baseY - (left.normalizedDensity * bandHeight);
            const y2 = baseY - (right.normalizedDensity * bandHeight);
            const isProfitSegment = left.isProfit && right.isProfit;
            const isLossSegment = !left.isProfit && !right.isProfit;

            ctx.beginPath();
            ctx.moveTo(x1, baseY);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x2, baseY);
            ctx.closePath();
            ctx.fillStyle = isProfitSegment ? 'rgba(16, 185, 129, 0.16)' : (isLossSegment ? 'rgba(239, 68, 68, 0.14)' : 'rgba(148, 163, 184, 0.10)');
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = isProfitSegment ? 'rgba(16, 185, 129, 0.35)' : (isLossSegment ? 'rgba(239, 68, 68, 0.30)' : 'rgba(148, 163, 184, 0.22)');
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    },
    afterDatasetsDraw(chart, _args, options) {
        const analysis = options?.analysis;
        if (!analysis) return;

        const { ctx, chartArea, scales } = chart;
        const xScale = scales.x;
        const yScale = scales.y;

        ctx.save();
        const occupiedRects = [];

        analysis.breakevens.forEach((breakeven, index) => {
            const xPixel = xScale.getPixelForValue(breakeven.price);
            const yPixel = yScale.getPixelForValue(0);

            ctx.beginPath();
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = 'rgba(255, 176, 32, 0.65)';
            ctx.lineWidth = 1;
            ctx.moveTo(xPixel, chartArea.top);
            ctx.lineTo(xPixel, chartArea.bottom);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.fillStyle = '#ffb020';
            ctx.arc(xPixel, yPixel, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0a0c12';
            ctx.lineWidth = 1;
            ctx.stroke();

            drawPinnedValueTag(ctx, chartArea, {
                x: xPixel,
                y: yPixel,
                text: `$${breakeven.price.toFixed(2)}`,
                borderColor: 'rgba(255, 176, 32, 0.55)',
                fillColor: 'rgba(10, 12, 18, 0.94)',
                placement: index === 0 ? 'above' : 'below',
                occupiedRects
            });
        });

        if (Number.isFinite(analysis.maxLossPoint.value)) {
            const xPixel = xScale.getPixelForValue(analysis.maxLossPoint.price);
            const yPixel = yScale.getPixelForValue(analysis.maxLossPoint.value);

            ctx.beginPath();
            ctx.setLineDash([8, 4]);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
            ctx.lineWidth = 1;
            ctx.moveTo(chartArea.left, yPixel);
            ctx.lineTo(chartArea.right, yPixel);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.fillStyle = '#ef4444';
            ctx.arc(xPixel, yPixel, 4, 0, Math.PI * 2);
            ctx.fill();

            drawPinnedValueTag(ctx, chartArea, {
                x: xPixel,
                y: yPixel,
                text: `-${formatChartCurrency(analysis.maxLossPoint.totalLoss)}`,
                borderColor: 'rgba(239, 68, 68, 0.55)',
                fillColor: 'rgba(10, 12, 18, 0.94)',
                textColor: '#fca5a5',
                placement: 'left-axis',
                occupiedRects
            });
        }

        ctx.restore();
    }
};

// Draw the strategy chart
export function updateStrategyChart() {
    const ctx = document.getElementById('strategyChart');
    if (!ctx) return;

    if (strategyState.legs.length === 0) {
        if (strategyState.chart) strategyState.chart.destroy();
        if (strategyState.greeksChart) strategyState.greeksChart.destroy();
        clearChartLegend('strategyChartLegend');
        clearChartLegend('greeksChartLegend');
        renderStrategyChartReadouts(null);
        updateNetGreeksDisplay({ delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 });
        updateStrategyStats(null);
        updateStrategyChartMetrics(null);
        window.syncStrategyChartControls?.();
        if (window.refreshPositionManagement) window.refreshPositionManagement();
        if (window.refreshTradeThesisRisk) window.refreshTradeThesisRisk();
        return;
    }

    const currentSpot = sharedMarketState.spot;
    const start = currentSpot * 0.70;
    const end = currentSpot * 1.30;

    const steps = 100;
    const stepSize = (end - start) / steps;
    const xValues = [];

    const originalT = sharedMarketState.tYears;
    const seventyFiveDays = Math.round(originalT * 0.75 * 365);
    const fiftyDays = Math.round(originalT * 0.50 * 365);
    const twentyFiveDays = Math.round(originalT * 0.25 * 365);
    const timeProfiles = [
        { label: 'Today', legendLabel: 'Today', tooltipLabel: 'Today', tRemain: originalT, color: '#2563eb', data: [] },
        { label: `75% T (${seventyFiveDays}d)`, legendLabel: `75% T · ${seventyFiveDays}d`, tooltipLabel: `75% time (${seventyFiveDays}d)`, tRemain: originalT * 0.75, color: '#8b5cf6', data: [] },
        { label: `50% T (${fiftyDays}d)`, legendLabel: `50% T · ${fiftyDays}d`, tooltipLabel: `50% time (${fiftyDays}d)`, tRemain: originalT * 0.50, color: '#ec4899', data: [] },
        { label: `25% T (${twentyFiveDays}d)`, legendLabel: `25% T · ${twentyFiveDays}d`, tooltipLabel: `25% time (${twentyFiveDays}d)`, tRemain: originalT * 0.25, color: '#f59e0b', data: [] },
        { label: 'Expiry', legendLabel: 'At Expiry', tooltipLabel: 'At Expiration', tRemain: 0, color: '#10b981', data: [] }
    ];

    for (let i = 0; i <= steps; i++) {
        const spot = start + (i * stepSize);
        xValues.push(spot);
        timeProfiles.forEach(profile => {
            const payoff = calculateStrategyPayoffAt(spot, profile.tRemain, strategyState.legs, sharedMarketState);
            profile.data.push({ x: spot, y: payoff });
        });
    }

    const currentNetGreeks = calculateNetGreeks(currentSpot);
    updateNetGreeksDisplay(currentNetGreeks);
    drawGreeksVsSpotChart(start, end, steps, stepSize, xValues.map(value => value.toFixed(2)));

    if (strategyState.chart) {
        strategyState.chart.destroy();
    }

    const expiryAnalysis = analyzeExpiryProfile(timeProfiles[4].data, strategyState.legs, sharedMarketState, currentSpot, currentNetGreeks);
    updateStrategyStats(expiryAnalysis);
    updateStrategyChartMetrics(expiryAnalysis);
    renderStrategyChartReadouts(expiryAnalysis);

    const datasets = [
        {
            label: 'Profit Zone',
            data: expiryAnalysis.positiveZonePoints,
            helperDataset: true,
            borderWidth: 0,
            pointRadius: 0,
            fill: 'origin',
            backgroundColor: 'rgba(16, 185, 129, 0.18)',
            spanGaps: false,
            order: 0
        },
        {
            label: 'Loss Zone',
            data: expiryAnalysis.negativeZonePoints,
            helperDataset: true,
            borderWidth: 0,
            pointRadius: 0,
            fill: 'origin',
            backgroundColor: 'rgba(239, 68, 68, 0.18)',
            spanGaps: false,
            order: 0
        },
        ...timeProfiles.map(profile => ({
            label: profile.label,
            legendLabel: profile.legendLabel,
            tooltipLabel: profile.tooltipLabel,
            data: profile.data,
            borderColor: profile.color,
            backgroundColor: `${profile.color}20`,
            borderWidth: profile.label === 'Expiry' ? 3 : 2,
            borderDash: profile.label === 'Expiry' ? [5, 5] : undefined,
            fill: false,
            tension: profile.label === 'Expiry' ? 0 : 0.35,
            pointRadius: 0,
            pointHitRadius: 10,
            order: profile.label === 'Expiry' ? 4 : 3
        })),
        {
            label: 'Break Even ($0)',
            data: xValues.map(spot => ({ x: spot, y: 0 })),
            helperDataset: true,
            borderColor: 'rgba(255, 255, 255, 0.45)',
            borderWidth: 1.5,
            borderDash: [8, 4],
            pointRadius: 0,
            fill: false,
            order: 1
        }
    ];

    const plugins = {
        legend: {
            display: false,
            labels: {
                color: '#f1f5f9',
                filter: (_item, data) => !data.datasets[_item.datasetIndex]?.helperDataset
            }
        },
        htmlLegend: {
            containerID: 'strategyChartLegend',
            filter: (item, chart) => !chart.data.datasets[item.datasetIndex]?.helperDataset
        },
        tooltip: {
            mode: 'index',
            intersect: false,
            filter: (tooltipItem) => !tooltipItem.dataset?.helperDataset,
            callbacks: {
                title: (context) => `Spot Price: $${Number(context[0].parsed.x).toFixed(2)}`,
                label: (tooltipItem) => `${tooltipItem.dataset.tooltipLabel || tooltipItem.dataset.label}: $${Number(tooltipItem.parsed.y).toFixed(2)}`
            }
        },
        strategyPayoffOverlay: {
            analysis: expiryAnalysis,
            showProbabilityOverlay: chartState.showProbabilityOverlay
        }
    };

    strategyState.chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        plugins: [htmlLegendPlugin, strategyPayoffOverlayPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            transitions: {
                active: { animation: { duration: 0 } }
            },
            plugins: plugins,
            interaction: {
                mode: 'index',
                intersect: false
            },
            layout: {
                padding: {
                    top: 6,
                    right: 10,
                    bottom: 4,
                    left: 6
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'Spot Price', color: '#94a3b8' },
                    ticks: {
                        color: '#94a3b8',
                        maxTicksLimit: 8,
                        callback: (value) => `$${Number(value).toFixed(0)}`
                    },
                    grid: { color: '#334155' }
                },
                y: {
                    title: { display: true, text: 'Net P&L ($)', color: '#94a3b8' },
                    ticks: {
                        color: '#94a3b8',
                        maxTicksLimit: 7,
                        callback: (value) => Number(value).toLocaleString()
                    },
                    grid: { color: '#334155', zeroLineColor: 'rgba(255,255,255,0.5)' }
                }
            }
        }
    });

    window.syncStrategyChartControls?.();

    if (window.updateSandboxScenario) {
        window.updateSandboxScenario();
    }

    if (window.refreshTradeThesisRisk) {
        window.refreshTradeThesisRisk();
    }

    if (window.refreshPositionManagement) {
        window.refreshPositionManagement();
    }
}

// Helper to update Net Greeks DOM Cards
function updateNetGreeksDisplay(greeks) {
    const formatGreek = (val) => val === 0 ? "0.00" : val.toFixed(2);
    const bindings = {
        netDeltaResult: greeks.delta,
        netGammaResult: greeks.gamma,
        netVegaResult: greeks.vega,
        netThetaResult: greeks.theta,
        netRhoResult: greeks.rho
    };

    Object.entries(bindings).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = formatGreek(value);
    });
}

// Function to draw Greek charts vs Spot
function drawGreeksVsSpotChart(start, end, steps, stepSize, labels) {
    const ctx = document.getElementById('netGreeksChart');
    if (!ctx) return;

    const deltaData = [], gammaData = [], vegaData = [], thetaData = [], rhoData = [];

    for (let i = 0; i <= steps; i++) {
        const spot = start + (i * stepSize);
        const g = calculateNetGreeks(spot);
        deltaData.push(g.delta);
        gammaData.push(g.gamma);
        vegaData.push(g.vega);
        thetaData.push(g.theta);
        rhoData.push(g.rho);
    }

    if (strategyState.greeksChart) {
        strategyState.greeksChart.destroy();
    }

    strategyState.greeksChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Net Delta', data: deltaData, borderColor: '#3b82f6', hidden: false, tension: 0.4, pointRadius: 0 },
                { label: 'Net Gamma', data: gammaData, borderColor: '#10b981', hidden: false, tension: 0.4, pointRadius: 0 },
                { label: 'Net Vega', data: vegaData, borderColor: '#f59e0b', hidden: false, tension: 0.4, pointRadius: 0 },
                { label: 'Net Theta (Daily)', data: thetaData, borderColor: '#ef4444', hidden: false, tension: 0.4, pointRadius: 0 },
                { label: 'Net Rho', data: rhoData, borderColor: '#8b5cf6', hidden: true, tension: 0.4, pointRadius: 0 }
            ]
        },
        plugins: [htmlLegendPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: false,
                    labels: { color: '#f1f5f9' }
                },
                htmlLegend: {
                    containerID: 'greeksChartLegend'
                },
                tooltip: {
                    mode: 'index', intersect: false,
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(2)}`
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Spot Price', color: '#94a3b8' },
                    ticks: { color: '#94a3b8', maxTicksLimit: 10 },
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

// Calculate and Update Stats Cards
function updateStrategyStats(analysis) {
    const maxProfitEl = document.getElementById('maxProfit');
    const maxLossEl = document.getElementById('maxLoss');
    const breakevensEl = document.getElementById('breakevens');
    const aumRiskEl = document.getElementById('builderAumRiskValue');

    if (!maxProfitEl || !maxLossEl || !breakevensEl) return;

    if (!analysis) {
        maxProfitEl.innerText = '--';
        maxLossEl.innerText = '--';
        breakevensEl.innerText = '--';
        if (aumRiskEl) aumRiskEl.innerText = '--';
        return;
    }

    maxProfitEl.innerText = analysis.maxProfitText;
    maxProfitEl.style.color = analysis.maxProfitText.includes('Infinite') ? '#10b981' : (analysis.maxProfitValue > 0 ? '#10b981' : '#94a3b8');

    maxLossEl.innerText = analysis.maxLossText;
    maxLossEl.style.color = analysis.maxLossText.includes('Unlimited') ? '#ef4444' : (analysis.maxLossValue < 0 ? '#ef4444' : '#94a3b8');
    breakevensEl.innerText = analysis.breakevenText;

    if (aumRiskEl) {
        const aumRisk = analysis.maxLossText.includes('Unlimited')
            ? null
            : ((Math.abs(analysis.maxLossValue) / getPositionPortfolioAum()) * 100);
        aumRiskEl.innerText = Number.isFinite(aumRisk) ? `${aumRisk.toFixed(2)}%` : '--';
        aumRiskEl.style.color = !Number.isFinite(aumRisk)
            ? '#e2e4f0'
            : (aumRisk > 5 ? '#fca5a5' : (aumRisk >= 3 ? '#f8d08a' : '#b6ffd7'));
    }
}

function updateStrategyChartMetrics(analysis) {
    const breakEvenMoveEl = document.getElementById('chartBreakEvenMove');
    const popEl = document.getElementById('chartProbabilityOfProfit');
    const expectedEl = document.getElementById('chartExpectedPL');
    const thetaEl = document.getElementById('chartThetaAbsorb');

    if (!breakEvenMoveEl || !popEl || !expectedEl || !thetaEl) return;

    if (!analysis) {
        breakEvenMoveEl.textContent = '--';
        popEl.textContent = '--';
        expectedEl.textContent = '--';
        thetaEl.textContent = '--';
        return;
    }

    breakEvenMoveEl.textContent = analysis.breakEvenMoveText;
    popEl.textContent = analysis.probabilityText;
    expectedEl.textContent = analysis.expectedPLText;
    expectedEl.style.color = analysis.probability?.expectedPL > 0 ? '#10b981' : (analysis.probability?.expectedPL < 0 ? '#fca5a5' : '#e2e4f0');
    thetaEl.textContent = analysis.thetaAbsorbText;
}

export function initStrategyChartControls() {
    const toggle = document.getElementById('probabilityOverlayToggle');
    if (!toggle) return;

    const sync = () => {
        toggle.textContent = `Probability Overlay: ${chartState.showProbabilityOverlay ? 'On' : 'Off'}`;
        toggle.classList.toggle('active', chartState.showProbabilityOverlay);
        toggle.disabled = strategyState.legs.length === 0;
    };

    toggle.addEventListener('click', () => {
        chartState.showProbabilityOverlay = !chartState.showProbabilityOverlay;
        sync();
        updateStrategyChart();
    });

    window.syncStrategyChartControls = sync;
    sync();
}

// Initialize Guide Modal with Carousel logic
export function initStrategyGuide() {
    const modal = document.getElementById('guideModal');
    const btn = document.getElementById('builderGuideBtn');
    const closeBtn = modal ? modal.querySelector('.close-modal') : null;
    const finishBtn = document.getElementById('closeGuideFinal');

    const steps = document.querySelectorAll('.guide-step');
    const dots = document.querySelectorAll('.dot');
    const nextBtn = document.getElementById('nextStep');
    const prevBtn = document.getElementById('prevStep');

    if (!modal || !btn || !closeBtn) return;

    let currentStep = 1;

    function updateStep(newStep) {
        currentStep = newStep;

        // Update steps
        steps.forEach(step => {
            step.classList.toggle('active', parseInt(step.dataset.step) === currentStep);
        });

        // Update dots
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index + 1 === currentStep);
        });

        // Update buttons
        prevBtn.disabled = currentStep === 1;
        if (currentStep === steps.length) {
            nextBtn.innerText = 'Finish ✓';
            nextBtn.onclick = closeModal;
        } else {
            nextBtn.innerText = 'Next →';
            nextBtn.onclick = () => updateStep(currentStep + 1);
        }
    }

    function closeModal() {
        modal.classList.remove('show');
    }

    btn.onclick = () => {
        updateStep(1); // Reset to first step
        modal.classList.add('show');
    };

    closeBtn.onclick = closeModal;
    if (finishBtn) finishBtn.onclick = closeModal;

    prevBtn.onclick = () => {
        if (currentStep > 1) updateStep(currentStep - 1);
    };

    nextBtn.onclick = () => {
        if (currentStep < steps.length) updateStep(currentStep + 1);
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            closeModal();
        }
    };
}

// ─── Strategy Playbook Logic ──────────────────────────────────────────────
const PLAYBOOK_DATA = {
    bullish: {
        title: "Bullish Research Deck",
        thinking: "Start with defined-risk bullish expressions, then expand into income or stock-overlay structures only if that matches your objective. The trade should reflect whether you want breakout convexity, steady upside, or carry.",
        strategyIds: ['bull_call_spread', 'bull_put_spread', 'covered_call', 'protective_put', 'collar', 'synthetic_stock', 'call_backspread', 'diagonal_spread']
    },
    bearish: {
        title: "Bearish Research Deck",
        thinking: "Separate controlled downside views from crash/hedge views. Defined-risk put structures fit measured bearish theses; backspreads belong in sharper downside or volatility shock setups.",
        strategyIds: ['bear_put_spread', 'bear_call_spread', 'protective_put', 'put_backspread', 'long_put_butterfly', 'ratio_spread']
    },
    neutral: {
        title: "Neutral / Range Research Deck",
        thinking: "For flat or pinning views, decide whether you want to collect premium, target a price zone precisely, or own term-structure exposure into a known event window.",
        strategyIds: ['iron_condor', 'iron_butterfly', 'long_call_butterfly', 'long_put_butterfly', 'broken_wing_butterfly', 'calendar_spread', 'diagonal_spread', 'short_strangle']
    },
    volatile: {
        title: "Event & Volatility Research Deck",
        thinking: "A proper event setup distinguishes between long-vol breakout trades, convex tail hedges, and premium-selling event fades. The right choice depends on whether IV is cheap, rich, or event-loaded.",
        strategyIds: ['long_straddle', 'long_strangle', 'call_backspread', 'put_backspread', 'double_calendar', 'calendar_spread', 'short_straddle', 'short_strangle']
    }
};

const THESIS_SUMMARY_LABELS = {
    priceView: {
        up: 'GO UP',
        down: 'GO DOWN',
        move_big: 'MOVE BIG',
        flat: 'STAY FLAT'
    },
    volatilityView: {
        increase: 'INCREASING',
        decrease: 'DECREASING',
        same: 'UNCHANGED'
    },
    timeframe: {
        days: 'DAYS',
        weeks: 'WEEKS',
        months: 'MONTHS'
    },
    objective: {
        directional: 'Directional',
        income: 'Income / Carry',
        hedge: 'Hedge',
        event: 'Event / Vol',
        target: 'Target Price'
    },
    riskProfile: {
        defined: 'Defined Risk Only',
        stock: 'Stock Overlay OK',
        advanced: 'Advanced Structures'
    },
    premiumStyle: {
        debit: 'Paying Debit',
        credit: 'Collecting Credit',
        either: 'Debit or Credit'
    },
    volRegime: {
        cheap: 'IV Cheap',
        rich: 'IV Rich',
        event: 'Event Premium',
        neutral: 'Neutral / Unsure'
    }
};

const CATALYST_KEYWORDS = {
    Earnings: ['earnings', 'guidance', 'eps', 'quarter', 'results', 'revenue'],
    'Macro Event': ['macro', 'cpi', 'ppi', 'jobs', 'payroll', 'inflation', 'gdp', 'pmi'],
    Geopolitical: ['war', 'conflict', 'sanction', 'tariff', 'middle east', 'ukraine', 'china', 'opec'],
    'Fed/Central Bank': ['fed', 'fomc', 'powell', 'ecb', 'boj', 'rate cut', 'rate hike', 'central bank'],
    'Sector Rotation': ['sector', 'rotation', 'semis', 'banks', 'energy', 'financials', 'cyclicals', 'defensives'],
    'Technical Breakout': ['breakout', 'breakdown', 'support', 'resistance', 'trendline', 'range break', 'momentum'],
    'Volatility Event': ['volatility', 'event', 'gap', 'move', 'implied move', 'uncertainty', 'squeeze']
};

const THESIS_STRATEGY_LIBRARY = [
    { presetId: 'bull_call_spread', scenario: 'bullish', priceViews: ['up'], volViews: ['decrease', 'same'], timeframes: ['days', 'weeks'], tags: ['Technical Breakout', 'Sector Rotation', 'Earnings'], objectives: ['directional'], riskProfiles: ['defined'], premiumStyles: ['debit'], volRegimes: ['cheap', 'neutral'], complexity: 'core', rationale: 'Defined-risk debit spread for a measured upside thesis.', fitTags: ['Bullish', 'Defined Risk', 'Debit'], caution: 'Upside is capped if the rally overshoots your target.' },
    { presetId: 'bull_put_spread', scenario: 'bullish', priceViews: ['up', 'flat'], volViews: ['decrease', 'same'], timeframes: ['days', 'weeks'], tags: ['Sector Rotation', 'Macro Event', 'Technical Breakout'], objectives: ['income', 'directional'], riskProfiles: ['defined'], premiumStyles: ['credit'], volRegimes: ['rich', 'neutral'], complexity: 'core', rationale: 'Short-premium bullish structure for hold-up or modest upside views.', fitTags: ['Income', 'Defined Risk', 'Credit'], caution: 'Weak reward if you sell the spread too close to support.' },
    { presetId: 'covered_call', scenario: 'bullish', priceViews: ['up', 'flat'], volViews: ['decrease', 'same'], timeframes: ['weeks', 'months'], tags: ['Sector Rotation', 'Macro Event'], objectives: ['income'], riskProfiles: ['stock'], premiumStyles: ['credit'], volRegimes: ['rich', 'neutral'], complexity: 'core', rationale: 'Stock-overlay income trade for mild upside or sideways views.', fitTags: ['Income', 'Stock Overlay', 'Credit'], caution: 'Do not use it if you need uncapped upside.' },
    { presetId: 'protective_put', scenario: 'bullish', priceViews: ['up', 'flat', 'down'], volViews: ['increase', 'same'], timeframes: ['days', 'weeks', 'months'], tags: ['Macro Event', 'Geopolitical', 'Volatility Event'], objectives: ['hedge'], riskProfiles: ['stock'], premiumStyles: ['debit'], volRegimes: ['cheap', 'event', 'neutral'], complexity: 'core', rationale: 'Long-stock hedge that preserves upside while defining tail risk.', fitTags: ['Hedge', 'Stock Overlay', 'Debit'], caution: 'Insurance gets expensive if you buy protection after volatility has already exploded.' },
    { presetId: 'collar', scenario: 'bullish', priceViews: ['up', 'flat'], volViews: ['decrease', 'same'], timeframes: ['weeks', 'months'], tags: ['Macro Event', 'Geopolitical', 'Fed/Central Bank'], objectives: ['hedge', 'income'], riskProfiles: ['stock'], premiumStyles: ['either', 'credit'], volRegimes: ['rich', 'neutral'], complexity: 'core', rationale: 'Cost-controlled hedge for long stock when you can cap some upside.', fitTags: ['Hedge', 'Income', 'Stock Overlay'], caution: 'The call cap can become painful if the underlying squeezes higher.' },
    { presetId: 'synthetic_stock', scenario: 'bullish', priceViews: ['up'], volViews: ['same'], timeframes: ['weeks', 'months'], tags: ['Technical Breakout'], objectives: ['directional'], riskProfiles: ['advanced'], premiumStyles: ['either'], volRegimes: ['neutral', 'cheap'], complexity: 'advanced', rationale: 'Capital-efficient stock replacement for advanced users comfortable with short-put exposure.', fitTags: ['Directional', 'Capital Efficient', 'Advanced'], caution: 'Short-put risk makes this inappropriate unless assignment and margin are acceptable.' },
    { presetId: 'bear_put_spread', scenario: 'bearish', priceViews: ['down'], volViews: ['increase', 'same'], timeframes: ['days', 'weeks'], tags: ['Macro Event', 'Geopolitical', 'Sector Rotation', 'Fed/Central Bank'], objectives: ['directional', 'hedge'], riskProfiles: ['defined'], premiumStyles: ['debit'], volRegimes: ['cheap', 'neutral'], complexity: 'core', rationale: 'Defined-risk downside spread for controlled bearish setups.', fitTags: ['Bearish', 'Defined Risk', 'Debit'], caution: 'Crash-like moves may outrun the spread’s capped payoff.' },
    { presetId: 'bear_call_spread', scenario: 'bearish', priceViews: ['down', 'flat'], volViews: ['decrease', 'same'], timeframes: ['days', 'weeks'], tags: ['Macro Event', 'Sector Rotation', 'Fed/Central Bank'], objectives: ['income', 'directional'], riskProfiles: ['defined'], premiumStyles: ['credit'], volRegimes: ['rich', 'neutral'], complexity: 'core', rationale: 'Credit spread for bearish or stalled price action without paying long premium.', fitTags: ['Bearish', 'Income', 'Defined Risk'], caution: 'Avoid it if a catalyst can force a sharp short-covering rally.' },
    { presetId: 'put_backspread', scenario: 'volatile', priceViews: ['down', 'move_big'], volViews: ['increase'], timeframes: ['days', 'weeks'], tags: ['Geopolitical', 'Macro Event', 'Volatility Event'], objectives: ['event', 'hedge'], riskProfiles: ['advanced'], premiumStyles: ['either', 'debit'], volRegimes: ['cheap', 'event'], complexity: 'advanced', rationale: 'Convex downside hedge when you expect panic and volatility expansion.', fitTags: ['Crash Hedge', 'Long Vol', 'Convex'], caution: 'There is still a loss zone around the short strike, so this needs active management.' },
    { presetId: 'long_straddle', scenario: 'volatile', priceViews: ['move_big'], volViews: ['increase'], timeframes: ['days', 'weeks'], tags: ['Earnings', 'Geopolitical', 'Fed/Central Bank', 'Volatility Event'], objectives: ['event'], riskProfiles: ['defined'], premiumStyles: ['debit'], volRegimes: ['cheap', 'event'], complexity: 'core', rationale: 'Pure long-vol expression when realized movement may exceed the implied move.', fitTags: ['Event', 'Long Vol', 'Defined Risk'], caution: 'If IV is already rich, the move still has to beat what the market priced in.' },
    { presetId: 'long_strangle', scenario: 'volatile', priceViews: ['move_big'], volViews: ['increase'], timeframes: ['weeks', 'months'], tags: ['Earnings', 'Macro Event', 'Geopolitical', 'Volatility Event'], objectives: ['event'], riskProfiles: ['defined'], premiumStyles: ['debit'], volRegimes: ['cheap', 'event'], complexity: 'core', rationale: 'Lower-cost long-vol trade when you expect a wider move over a broader window.', fitTags: ['Event', 'Long Vol', 'Debit'], caution: 'Because the strikes are wider, modest moves will not pay enough.' },
    { presetId: 'short_straddle', scenario: 'neutral', priceViews: ['flat'], volViews: ['decrease'], timeframes: ['days', 'weeks'], tags: ['Sector Rotation', 'Macro Event'], objectives: ['income'], riskProfiles: ['advanced'], premiumStyles: ['credit'], volRegimes: ['rich'], complexity: 'advanced', rationale: 'High-theta event fade only for advanced users comfortable with undefined risk.', fitTags: ['Income', 'Short Vol', 'Advanced'], caution: 'Undefined risk means it should never appear unless the user explicitly allows advanced structures.' },
    { presetId: 'short_strangle', scenario: 'neutral', priceViews: ['flat'], volViews: ['decrease', 'same'], timeframes: ['days', 'weeks'], tags: ['Sector Rotation', 'Macro Event'], objectives: ['income'], riskProfiles: ['advanced'], premiumStyles: ['credit'], volRegimes: ['rich'], complexity: 'advanced', rationale: 'OTM premium seller for range-bound markets with rich implied volatility.', fitTags: ['Income', 'Short Vol', 'Advanced'], caution: 'Tail risk remains substantial and requires active risk limits.' },
    { presetId: 'call_backspread', scenario: 'volatile', priceViews: ['up', 'move_big'], volViews: ['increase'], timeframes: ['days', 'weeks'], tags: ['Earnings', 'Technical Breakout', 'Volatility Event'], objectives: ['event', 'directional'], riskProfiles: ['advanced'], premiumStyles: ['either', 'debit'], volRegimes: ['cheap', 'event'], complexity: 'advanced', rationale: 'Upside-convex structure when you expect a squeeze or breakout with higher vol.', fitTags: ['Breakout', 'Convexity', 'Long Gamma'], caution: 'The middle loss zone around the short call needs to be understood before entry.' },
    { presetId: 'iron_condor', scenario: 'neutral', priceViews: ['flat'], volViews: ['decrease'], timeframes: ['days', 'weeks'], tags: ['Sector Rotation', 'Macro Event', 'Fed/Central Bank'], objectives: ['income', 'target'], riskProfiles: ['defined'], premiumStyles: ['credit'], volRegimes: ['rich', 'neutral'], complexity: 'core', rationale: 'Defined-risk premium seller for range-bound markets and cooling IV.', fitTags: ['Neutral', 'Defined Risk', 'Credit'], caution: 'Poor fit when trend or event risk is still unresolved.' },
    { presetId: 'iron_butterfly', scenario: 'neutral', priceViews: ['flat'], volViews: ['decrease', 'same'], timeframes: ['days', 'weeks'], tags: ['Fed/Central Bank', 'Sector Rotation'], objectives: ['income', 'target'], riskProfiles: ['defined'], premiumStyles: ['credit'], volRegimes: ['rich', 'neutral'], complexity: 'intermediate', rationale: 'Higher-credit pinning trade when you have a tighter center-strike view.', fitTags: ['Pin Risk Trade', 'Credit', 'Defined Risk'], caution: 'The payoff is narrow enough that even modest drift can damage the trade.' },
    { presetId: 'long_call_butterfly', scenario: 'neutral', priceViews: ['flat'], volViews: ['decrease', 'same'], timeframes: ['days', 'weeks'], tags: ['Earnings', 'Fed/Central Bank'], objectives: ['target'], riskProfiles: ['defined'], premiumStyles: ['debit'], volRegimes: ['rich', 'neutral'], complexity: 'intermediate', rationale: 'Low-cost target-price structure when you expect a pin or a narrow terminal range.', fitTags: ['Target Price', 'Defined Risk', 'Low Cost'], caution: 'Not appropriate if your view is “move big”; it needs price to settle near the body.' },
    { presetId: 'long_put_butterfly', scenario: 'neutral', priceViews: ['flat', 'down'], volViews: ['decrease', 'same'], timeframes: ['days', 'weeks'], tags: ['Macro Event', 'Fed/Central Bank'], objectives: ['target'], riskProfiles: ['defined'], premiumStyles: ['debit'], volRegimes: ['rich', 'neutral'], complexity: 'intermediate', rationale: 'Downside-tilted target structure when you want a precise settlement zone.', fitTags: ['Target Price', 'Defined Risk', 'Downside Tilt'], caution: 'Like all butterflies, it loses quickly if price drifts away from the body.' },
    { presetId: 'broken_wing_butterfly', scenario: 'neutral', priceViews: ['flat', 'up'], volViews: ['decrease', 'same'], timeframes: ['days', 'weeks'], tags: ['Sector Rotation', 'Technical Breakout'], objectives: ['target', 'income'], riskProfiles: ['defined'], premiumStyles: ['either', 'credit'], volRegimes: ['rich', 'neutral'], complexity: 'intermediate', rationale: 'Asymmetric butterfly for users who want a cheap range trade with one-sided bias.', fitTags: ['Asymmetric', 'Target Price', 'Defined Risk'], caution: 'The wider wing still leaves one tail more vulnerable than the other.' },
    { presetId: 'ratio_spread', scenario: 'bearish', priceViews: ['up', 'flat'], volViews: ['decrease', 'same'], timeframes: ['days', 'weeks'], tags: ['Technical Breakout', 'Sector Rotation'], objectives: ['income', 'target'], riskProfiles: ['advanced'], premiumStyles: ['either', 'credit'], volRegimes: ['rich', 'neutral'], complexity: 'advanced', rationale: 'Advanced ratio trade for price drifting toward a target then stalling.', fitTags: ['Target Zone', 'Advanced', 'Short Vol'], caution: 'This becomes dangerous if price runs through the short strike.' },
    { presetId: 'calendar_spread', scenario: 'neutral', priceViews: ['flat'], volViews: ['increase', 'same'], timeframes: ['weeks', 'months'], tags: ['Earnings', 'Fed/Central Bank', 'Volatility Event'], objectives: ['event', 'target'], riskProfiles: ['defined'], premiumStyles: ['debit'], volRegimes: ['event', 'rich', 'neutral'], complexity: 'intermediate', rationale: 'Time-spread expression for pinning around a strike with favorable term structure.', fitTags: ['Time Spread', 'Long Vega', 'Defined Risk'], caution: 'A fast directional break can overwhelm the calendar before the front leg decays.' },
    { presetId: 'diagonal_spread', scenario: 'bullish', priceViews: ['up', 'flat'], volViews: ['increase', 'same'], timeframes: ['weeks', 'months'], tags: ['Earnings', 'Technical Breakout', 'Sector Rotation'], objectives: ['directional', 'income'], riskProfiles: ['defined'], premiumStyles: ['debit'], volRegimes: ['rich', 'neutral'], complexity: 'intermediate', rationale: 'Directional time spread when you want theta help without abandoning upside bias.', fitTags: ['Directional', 'Time Spread', 'Defined Risk'], caution: 'The position evolves over time, so the short strike needs active rolling.' },
    { presetId: 'double_calendar', scenario: 'volatile', priceViews: ['flat', 'move_big'], volViews: ['increase'], timeframes: ['weeks', 'months'], tags: ['Earnings', 'Macro Event', 'Volatility Event'], objectives: ['event', 'target'], riskProfiles: ['defined'], premiumStyles: ['debit'], volRegimes: ['event', 'rich'], complexity: 'intermediate', rationale: 'Defined-risk event structure when the market is pricing rich front-month vol around a catalyst.', fitTags: ['Event', 'Time Spread', 'Defined Risk'], caution: 'The trade still depends on managing the front expiry rather than simply holding to the back month.' }
];

const THESIS_STRATEGY_MAP = Object.fromEntries(
    THESIS_STRATEGY_LIBRARY.map(strategy => [strategy.presetId, strategy])
);

function getStrategyResearchCopy(presetId) {
    return window.strategyResearchLibrary?.[presetId] || null;
}

function getStrategyDisplayLabel(presetId) {
    return window.strategyPresets?.[presetId]?.label || getStrategyResearchCopy(presetId)?.title || presetId;
}

function inferCatalystTagsFromText(text = '') {
    const normalized = text.toLowerCase();
    if (!normalized.trim()) return [];

    return Object.entries(CATALYST_KEYWORDS)
        .filter(([, keywords]) => keywords.some(keyword => normalized.includes(keyword)))
        .map(([tag]) => tag);
}

function getEffectiveCatalystTags() {
    return Array.from(new Set([...tradeThesisState.tags, ...inferCatalystTagsFromText(tradeThesisState.catalyst)]));
}

function isRiskProfileCompatible(strategy, selectedRiskProfile) {
    if (!selectedRiskProfile) return true;
    if (selectedRiskProfile === 'defined') {
        return strategy.riskProfiles.includes('defined');
    }
    if (selectedRiskProfile === 'stock') {
        return strategy.riskProfiles.includes('stock') || strategy.riskProfiles.includes('defined');
    }
    return true;
}

function getTimeframeCompatibilityScore(strategy) {
    if (strategy.timeframes.includes(tradeThesisState.timeframe)) return 10;
    if (
        (tradeThesisState.timeframe === 'weeks' && (strategy.timeframes.includes('days') || strategy.timeframes.includes('months'))) ||
        (tradeThesisState.timeframe === 'days' && strategy.timeframes.includes('weeks')) ||
        (tradeThesisState.timeframe === 'months' && strategy.timeframes.includes('weeks'))
    ) {
        return 5;
    }
    return 0;
}

function getPremiumPreferenceScore(strategy) {
    if (!tradeThesisState.premiumStyle || tradeThesisState.premiumStyle === 'either') return { score: 0, max: 0 };
    return {
        score: strategy.premiumStyles.includes(tradeThesisState.premiumStyle) ? 8 : 0,
        max: 8
    };
}

function getObjectivePreferenceScore(strategy) {
    if (!tradeThesisState.objective) return { score: 0, max: 0 };
    const exactMatch = strategy.objectives.includes(tradeThesisState.objective);
    const partialMatch = (
        (tradeThesisState.objective === 'directional' && (strategy.scenario === 'bullish' || strategy.scenario === 'bearish')) ||
        (tradeThesisState.objective === 'event' && strategy.scenario === 'volatile') ||
        (tradeThesisState.objective === 'target' && strategy.scenario === 'neutral')
    );
    return {
        score: exactMatch ? 12 : (partialMatch ? 5 : 0),
        max: 12
    };
}

function getRiskPreferenceScore(strategy) {
    if (!tradeThesisState.riskProfile) return { score: 0, max: 0 };
    if (tradeThesisState.riskProfile === 'advanced') {
        return {
            score: strategy.riskProfiles.includes('advanced') ? 10 : 7,
            max: 10
        };
    }

    if (tradeThesisState.riskProfile === 'stock') {
        return {
            score: strategy.riskProfiles.includes('stock') ? 10 : (strategy.riskProfiles.includes('defined') ? 6 : 0),
            max: 10
        };
    }

    return {
        score: strategy.riskProfiles.includes('defined') ? 10 : 0,
        max: 10
    };
}

function getVolRegimePreferenceScore(strategy) {
    if (!tradeThesisState.volRegime || tradeThesisState.volRegime === 'neutral') return { score: 0, max: 0 };
    return {
        score: strategy.volRegimes.includes(tradeThesisState.volRegime) ? 8 : 0,
        max: 8
    };
}

function getConfidenceTone(confidence) {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
}

function formatScoreBreakdown(breakdown) {
    return [
        `Outlook ${breakdown.outlook.score}/${breakdown.outlook.max}`,
        `Vol ${breakdown.volatility.score}/${breakdown.volatility.max}`,
        breakdown.structure.max ? `Structure ${breakdown.structure.score}/${breakdown.structure.max}` : null,
        breakdown.catalyst.max ? `Catalyst ${breakdown.catalyst.score}/${breakdown.catalyst.max}` : null
    ].filter(Boolean).join(' • ');
}

function scoreTradeThesisStrategy(strategy) {
    if (!isThesisReady()) return null;
    if (!isRiskProfileCompatible(strategy, tradeThesisState.riskProfile)) return null;

    const effectiveTags = getEffectiveCatalystTags();
    const breakdown = {
        outlook: { score: 0, max: 35 },
        volatility: { score: 0, max: 16 + (tradeThesisState.volRegime && tradeThesisState.volRegime !== 'neutral' ? 8 : 0) },
        structure: { score: 0, max: 0 },
        catalyst: { score: 0, max: effectiveTags.length ? Math.min(effectiveTags.length * 3, 12) : 0 }
    };
    const fitReasons = [];

    if (strategy.priceViews.includes(tradeThesisState.priceView)) {
        breakdown.outlook.score += 20;
        fitReasons.push(`${THESIS_SUMMARY_LABELS.priceView[tradeThesisState.priceView]} outlook`);
    } else if (tradeThesisState.priceView === 'move_big' && strategy.priceViews.some(view => view === 'up' || view === 'down')) {
        breakdown.outlook.score += 8;
    } else if ((tradeThesisState.priceView === 'up' || tradeThesisState.priceView === 'down') && strategy.priceViews.includes('move_big')) {
        breakdown.outlook.score += 8;
    }

    const timeframeScore = getTimeframeCompatibilityScore(strategy);
    breakdown.outlook.score += timeframeScore;
    if (timeframeScore >= 10) {
        fitReasons.push(`${THESIS_SUMMARY_LABELS.timeframe[tradeThesisState.timeframe]} horizon`);
    }

    if (strategy.scenario === inferScenarioFromPriceView(tradeThesisState.priceView)) {
        breakdown.outlook.score += 5;
    }

    if (strategy.volViews.includes(tradeThesisState.volatilityView)) {
        breakdown.volatility.score += 16;
        fitReasons.push(`${THESIS_SUMMARY_LABELS.volatilityView[tradeThesisState.volatilityView]} volatility`);
    } else if (tradeThesisState.volatilityView === 'same' || strategy.volViews.includes('same')) {
        breakdown.volatility.score += 6;
    }

    const volRegimeScore = getVolRegimePreferenceScore(strategy);
    breakdown.volatility.score += volRegimeScore.score;
    if (volRegimeScore.score) {
        fitReasons.push(THESIS_SUMMARY_LABELS.volRegime[tradeThesisState.volRegime]);
    }

    const objectiveScore = getObjectivePreferenceScore(strategy);
    breakdown.structure.score += objectiveScore.score;
    breakdown.structure.max += objectiveScore.max;
    if (objectiveScore.score) {
        fitReasons.push(THESIS_SUMMARY_LABELS.objective[tradeThesisState.objective]);
    }

    const premiumScore = getPremiumPreferenceScore(strategy);
    breakdown.structure.score += premiumScore.score;
    breakdown.structure.max += premiumScore.max;
    if (premiumScore.score) {
        fitReasons.push(THESIS_SUMMARY_LABELS.premiumStyle[tradeThesisState.premiumStyle]);
    }

    const riskScore = getRiskPreferenceScore(strategy);
    breakdown.structure.score += riskScore.score;
    breakdown.structure.max += riskScore.max;
    if (riskScore.score && tradeThesisState.riskProfile) {
        fitReasons.push(THESIS_SUMMARY_LABELS.riskProfile[tradeThesisState.riskProfile]);
    }

    const matchingTags = effectiveTags.filter(tag => strategy.tags.includes(tag)).slice(0, 4);
    if (matchingTags.length) {
        breakdown.catalyst.score += Math.min(matchingTags.length * 3, breakdown.catalyst.max);
        fitReasons.push(...matchingTags.slice(0, 2));
    }

    const total = breakdown.outlook.score + breakdown.volatility.score + breakdown.structure.score + breakdown.catalyst.score;
    const max = breakdown.outlook.max + breakdown.volatility.max + breakdown.structure.max + breakdown.catalyst.max;
    const confidence = Math.round((total / Math.max(1, max)) * 100);

    return {
        total,
        max,
        confidence,
        confidenceTone: getConfidenceTone(confidence),
        breakdown,
        breakdownText: formatScoreBreakdown(breakdown),
        fitReasons: Array.from(new Set(fitReasons)).slice(0, 3)
    };
}

function getTradeThesisSuggestions() {
    if (!isThesisReady()) return [];

    return THESIS_STRATEGY_LIBRARY
        .map(strategy => {
            const scorecard = scoreTradeThesisStrategy(strategy);
            if (!scorecard) return null;

            return {
                ...strategy,
                label: getStrategyDisplayLabel(strategy.presetId),
                research: getStrategyResearchCopy(strategy.presetId),
                scorecard
            };
        })
        .filter(Boolean)
        .filter(strategy => strategy.scorecard.confidence >= 35)
        .sort((left, right) => right.scorecard.total - left.scorecard.total)
        .slice(0, 4);
}

function getPlaybookStrategiesForScenario(scenarioId) {
    const scenario = PLAYBOOK_DATA[scenarioId];
    if (!scenario) return [];

    return scenario.strategyIds
        .map(presetId => {
            const strategy = THESIS_STRATEGY_MAP[presetId];
            if (!strategy) return null;
            if (!isRiskProfileCompatible(strategy, tradeThesisState.riskProfile)) return null;

            return {
                ...strategy,
                label: getStrategyDisplayLabel(presetId),
                research: getStrategyResearchCopy(presetId),
                scorecard: isThesisReady() ? scoreTradeThesisStrategy(strategy) : null
            };
        })
        .filter(Boolean)
        .sort((left, right) => {
            if (left.scorecard && right.scorecard) {
                return right.scorecard.total - left.scorecard.total;
            }
            if (left.complexity === right.complexity) return 0;
            if (left.complexity === 'core') return -1;
            if (right.complexity === 'core') return 1;
            if (left.complexity === 'intermediate') return -1;
            if (right.complexity === 'intermediate') return 1;
            return 0;
        });
}

function renderPlaybookStrategyCard(strategy, index) {
    const summary = strategy.research?.summary || strategy.rationale;
    const caution = strategy.caution || strategy.research?.avoid?.[0] || 'Review liquidity, event timing, and assignment risk before loading.';
    const fitPill = strategy.scorecard
        ? `<span class="playbook-fit-pill is-${strategy.scorecard.confidenceTone}">${strategy.scorecard.confidence}% confidence</span>`
        : '';
    const fitBreakdown = strategy.scorecard
        ? `<div class="playbook-fit-breakdown">${strategy.scorecard.breakdownText}</div>`
        : '';
    const thesisFit = strategy.scorecard?.fitReasons?.length
        ? `<div class="playbook-fit-copy">Why it fits: ${strategy.scorecard.fitReasons.join(' • ')}</div>`
        : '';

    return `
        <article class="playbook-strategy-card ${index === 0 ? 'is-featured' : ''}">
            <div class="playbook-strategy-head">
                <div>
                    <h5>${strategy.label}</h5>
                    <p>${summary}</p>
                </div>
                ${fitPill}
            </div>
            <div class="playbook-strategy-flags">
                ${strategy.fitTags.map(tag => `<span class="playbook-flag">${tag}</span>`).join('')}
                <span class="playbook-flag playbook-flag-muted">${strategy.complexity}</span>
            </div>
            ${fitBreakdown}
            ${thesisFit}
            <div class="playbook-caution">Avoid if: ${caution}</div>
            <div class="action-row">
                <button class="btn-playbook-load" onclick="window.loadStrategyPreset('${strategy.presetId}')">
                    Load →
                </button>
            </div>
        </article>
    `;
}

function renderPlaybookScenario(scenarioId) {
    const data = PLAYBOOK_DATA[scenarioId];
    const contentArea = document.getElementById('playbookContent');
    if (!data || !contentArea) return;

    const strategies = getPlaybookStrategiesForScenario(scenarioId);
    const thesisNote = isThesisReady()
        ? '<div class="playbook-fit-copy playbook-fit-copy-top">Cards are thesis-ranked using outlook, volatility, structure, and catalyst fit.</div>'
        : '<div class="playbook-fit-copy playbook-fit-copy-top">Choose a catalyst and thesis to rank this deck automatically.</div>';

    contentArea.innerHTML = `
        <div class="playbook-card active">
            <h4>${data.title}</h4>
            <div class="thinking-section">
                <h5>Research Framing</h5>
                <p>${data.thinking}</p>
            </div>
            ${thesisNote}
            <div class="playbook-library-grid">
                ${strategies.map((strategy, index) => renderPlaybookStrategyCard(strategy, index)).join('')}
            </div>
        </div>
    `;
}

export function setActivePlaybookScenario(scenarioId) {
    const container = document.getElementById('strategyPlaybookPane');
    if (!container || !scenarioId || !PLAYBOOK_DATA[scenarioId]) return;

    const buttons = container.querySelectorAll('.scenario-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.scenario === scenarioId);
    });

    renderPlaybookScenario(scenarioId);
}

export function initStrategyPlaybook() {
    const container = document.getElementById('strategyPlaybookPane');
    if (!container) return;

    const buttons = container.querySelectorAll('.scenario-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            setActivePlaybookScenario(btn.dataset.scenario);
        });
    });

    setActivePlaybookScenario('bullish');
}

function buildPresetLegs(presetId, options = {}) {
    const preset = window.strategyPresets?.[presetId];
    if (!preset) return [];

    const { includeRuntimeIds = false } = options;
    const S = sharedMarketState.spot;

    return preset.legs.map((leg, index) => {
        let newStrike = leg.strike;
        if (leg.type !== 'stock') {
            const offset = leg.strike - 100;
            newStrike = Math.round((S + offset) * 100) / 100;
        } else {
            newStrike = S;
        }

        return {
            id: includeRuntimeIds ? `leg-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}` : `preset-${presetId}-${index}`,
            type: leg.type,
            action: leg.action,
            strike: newStrike,
            expiry: leg.expiry || sharedMarketState.tYears,
            quantity: leg.quantity || 1
        };
    });
}

export function loadStrategyPreset(presetId) {
    const preset = window.strategyPresets?.[presetId];
    if (!preset) return;

    positionState.active = null;
    if (window.resetScenarioSandbox) window.resetScenarioSandbox();
    strategyState.legs = buildPresetLegs(presetId, { includeRuntimeIds: true });
    tradeThesisState.selectedPresetId = presetId;
    tradeThesisState.loadedPresetId = presetId;
    createManagedPosition(preset.label, strategyState.legs, sharedMarketState, {
        resetJournal: true,
        allowQtyEdit: true
    });

    renderLegs();
    updateStrategyChart();
    if (window.updateSandboxScenario) window.updateSandboxScenario();
    if (window.refreshPositionManagement) window.refreshPositionManagement();
    if (window.refreshTradeThesisPanel) window.refreshTradeThesisPanel();
}

export function openStrategyPreset(presetId) {
    const builderBtn = document.querySelector('.nav-btn[data-section=\"builder\"]');
    if (builderBtn) builderBtn.click();
    loadStrategyPreset(presetId);
}

export function initStrategyPresets() {
    const presetSelect = document.getElementById('presetSelect');
    const loadBtn = document.getElementById('loadPresetBtn');

    if (!presetSelect || !loadBtn) return;

    presetSelect.innerHTML = '<option value=\"\">Strategy presets…</option>';

    const groups = window.strategyPresetGroups || {};
    Object.keys(groups).forEach(groupName => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = groupName;
        groups[groupName].forEach(presetId => {
            const preset = window.strategyPresets?.[presetId];
            if (!preset) return;
            const option = document.createElement('option');
            option.value = presetId;
            option.textContent = preset.label;
            optgroup.appendChild(option);
        });
        presetSelect.appendChild(optgroup);
    });

    loadBtn.addEventListener('click', () => {
        if (!presetSelect.value) return;
        openStrategyPreset(presetSelect.value);
    });
}

function getPositionPortfolioAum() {
    return Math.max(1, tradeThesisState.aum || 100000);
}

function getPositionEntryMetrics(activePosition = positionState.active) {
    if (!activePosition) return null;
    return calculateScenarioMetricsForLegs(
        activePosition.currentLegs,
        { spotChangePct: 0, ivChangePts: 0, daysElapsed: 0 },
        activePosition.entryMarketState
    );
}

function buildOpenJournalDetails(activePosition = positionState.active) {
    const entryMetrics = getPositionEntryMetrics(activePosition);
    if (!activePosition || !entryMetrics) return 'Opened position.';
    return `Opened ${activePosition.quantity} unit${activePosition.quantity === 1 ? '' : 's'} at ${getEntryPriceText(entryMetrics.totalCost)}.`;
}

function addPositionJournalEntry(action, details, pnl = 0, timestamp = Date.now()) {
    const previousCumulative = positionState.journal[positionState.journal.length - 1]?.cumulative ?? 0;
    const entry = {
        id: `${timestamp}-${positionState.journal.length + 1}`,
        timestamp,
        action,
        details,
        pnl,
        cumulative: previousCumulative + pnl
    };
    positionState.journal.push(entry);
    return entry;
}

function setPositionResult(html) {
    positionState.lastResultHtml = html;
}

function resetRollPreview() {
    positionState.rollPreview = null;
    if (strategyState.positionRollChart) {
        strategyState.positionRollChart.destroy();
        strategyState.positionRollChart = null;
    }
}

function setPositionActionMode(mode = null) {
    positionState.actionMode = mode;

    const trimForm = document.getElementById('positionTrimForm');
    const rollForm = document.getElementById('positionRollForm');
    if (trimForm) trimForm.hidden = mode !== 'trim';
    if (rollForm) rollForm.hidden = mode !== 'roll';

    if (mode !== 'roll') {
        resetRollPreview();
        const rollWrap = document.getElementById('positionRollChartWrap');
        if (rollWrap) rollWrap.hidden = true;
    }
}

function renderPositionJournal() {
    const body = document.getElementById('positionJournalBody');
    const exportBtn = document.getElementById('positionJournalExportBtn');
    const exportStatus = document.getElementById('positionJournalExportStatus');
    if (!body) return;

    if (!positionState.journal.length) {
        body.innerHTML = '<tr><td colspan="5" class="position-journal-empty">No journal entries yet.</td></tr>';
    } else {
        body.innerHTML = positionState.journal.map(entry => `
            <tr>
                <td>${formatJournalTimestamp(entry.timestamp)}</td>
                <td>${entry.action}</td>
                <td>${entry.details}</td>
                <td class="${entry.pnl > 0 ? 'is-positive' : (entry.pnl < 0 ? 'is-negative' : '')}">${formatPositionMoney(entry.pnl)}</td>
                <td class="${entry.cumulative > 0 ? 'is-positive' : (entry.cumulative < 0 ? 'is-negative' : '')}">${formatPositionMoney(entry.cumulative)}</td>
            </tr>
        `).join('');
    }

    if (exportBtn) exportBtn.disabled = !positionState.journal.length;
    if (exportStatus) exportStatus.textContent = positionState.exportStatus;
}

function syncBuilderWithPosition() {
    strategyState.legs = cloneLegs(positionState.active?.currentLegs || []);
    renderLegs();
    updateStrategyChart();
}

function createManagedPosition(label, legs, entryMarketState = sharedMarketState, options = {}) {
    const { resetJournal = true, timestamp = Date.now(), allowQtyEdit = true } = options;
    const currentLegs = cloneLegs(legs);
    const units = detectStrategyUnits(currentLegs);
    const baseLegTemplate = currentLegs.map(leg => ({
        ...leg,
        quantity: leg.quantity / units
    }));

    positionState.active = {
        label,
        openedAt: timestamp,
        entryMarketState: cloneMarketState(entryMarketState),
        quantity: units,
        baseLegTemplate,
        currentLegs,
        canEditQty: allowQtyEdit
    };

    if (resetJournal) {
        positionState.journal = [];
        addPositionJournalEntry('Open', buildOpenJournalDetails(positionState.active), 0, timestamp);
    }

    positionState.exportStatus = '';
    setPositionActionMode(null);
    setPositionResult('No position action taken yet.');
}

function setSharedContextMarketState(nextMarketState, nextExpiryValue = '') {
    sharedMarketState.spot = nextMarketState.spot;
    sharedMarketState.volatility = nextMarketState.volatility;
    sharedMarketState.tYears = nextMarketState.tYears;
    sharedMarketState.rate = nextMarketState.rate;
    sharedMarketState.dividend = nextMarketState.dividend;

    const spotNum = document.getElementById('sharedSpotNum');
    const spotRange = document.getElementById('sharedSpot');
    const volNum = document.getElementById('sharedVolNum');
    const volRange = document.getElementById('sharedVol');
    const expiryInput = document.getElementById('sharedExpiry');
    const tValue = document.getElementById('sharedTValue');

    if (spotNum) spotNum.value = String(nextMarketState.spot);
    if (spotRange) spotRange.value = String(nextMarketState.spot);
    if (volNum) volNum.value = String((nextMarketState.volatility * 100).toFixed(0));
    if (volRange) volRange.value = String((nextMarketState.volatility * 100).toFixed(0));
    if (expiryInput && nextExpiryValue) expiryInput.value = nextExpiryValue;
    if (tValue) tValue.textContent = `T=${nextMarketState.tYears.toFixed(2)}y`;

    if (window.updateScenarioMaxDays) window.updateScenarioMaxDays();
}

function getRollPreview() {
    const activePosition = positionState.active;
    const strikeInput = document.getElementById('positionRollStrike');
    const expiryInput = document.getElementById('positionRollExpiry');

    if (!activePosition || !strikeInput || !expiryInput) return null;

    const strike = parseFloat(strikeInput.value);
    if (!Number.isFinite(strike) || !expiryInput.value) return null;

    const oldMetrics = calculateScenarioMetricsForLegs(activePosition.currentLegs, scenarioState, activePosition.entryMarketState);
    const rollDate = new Date();
    rollDate.setHours(0, 0, 0, 0);
    rollDate.setDate(rollDate.getDate() + scenarioState.daysElapsed);

    const [year, month, day] = expiryInput.value.split('-').map(Number);
    const expiryDate = new Date(year, month - 1, day);
    const diffDays = Math.max(1, Math.round((expiryDate - rollDate) / (1000 * 60 * 60 * 24)));
    const newMarketState = {
        ...cloneMarketState(oldMetrics.marketState),
        tYears: Math.max(0.001, diffDays / 365.25)
    };

    const anchorStrike = getPositionAnchorStrike(activePosition.currentLegs, oldMetrics.marketState.spot);
    const strikeShift = strike - anchorStrike;
    const newLegs = activePosition.currentLegs.map(leg => ({
        ...leg,
        strike: leg.type === 'stock' ? oldMetrics.marketState.spot : Math.max(0, Math.round((leg.strike + strikeShift) * 100) / 100),
        expiry: newMarketState.tYears
    }));

    const newEntryMetrics = calculateScenarioMetricsForLegs(newLegs, { spotChangePct: 0, ivChangePts: 0, daysElapsed: 0 }, newMarketState);
    const costToRoll = newEntryMetrics.totalCost - oldMetrics.totalValue;

    const chartStart = oldMetrics.marketState.spot * 0.7;
    const chartEnd = oldMetrics.marketState.spot * 1.3;
    const oldSeries = buildExpirySeries(activePosition.currentLegs, activePosition.entryMarketState, chartStart, chartEnd);
    const newSeries = buildExpirySeries(newLegs, newMarketState, chartStart, chartEnd);

    return {
        strike,
        expiryValue: expiryInput.value,
        newLegs,
        newMarketState,
        oldMetrics,
        newEntryMetrics,
        costToRoll,
        rollTimestamp: rollDate.getTime(),
        oldSeries,
        newSeries
    };
}

function renderRollPreview() {
    const rollMetrics = document.getElementById('positionRollMetrics');
    const chartWrap = document.getElementById('positionRollChartWrap');
    const canvas = document.getElementById('positionRollChart');
    if (!rollMetrics || !chartWrap || !canvas) return;

    if (positionState.actionMode !== 'roll' || !positionState.active) {
        chartWrap.hidden = true;
        resetRollPreview();
        return;
    }

    const preview = getRollPreview();
    positionState.rollPreview = preview;

    if (!preview) {
        rollMetrics.textContent = 'Enter a strike and expiry to preview the roll.';
        chartWrap.hidden = true;
        resetRollPreview();
        return;
    }

    const rollCostText = preview.costToRoll >= 0 ? `Pay ${formatPositionMoney(preview.costToRoll).replace('+', '')}` : `Collect ${formatPositionMoney(Math.abs(preview.costToRoll)).replace('+', '')}`;
    rollMetrics.textContent = `Close P/L ${formatPositionMoney(preview.oldMetrics.scenarioPL)}. ${rollCostText} to roll into the new structure.`;
    chartWrap.hidden = false;

    if (strategyState.positionRollChart) {
        strategyState.positionRollChart.destroy();
    }

    strategyState.positionRollChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: preview.oldSeries.labels,
            datasets: [
                {
                    label: 'Current Position',
                    data: preview.oldSeries.data,
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.25
                },
                {
                    label: 'Rolled Position',
                    data: preview.newSeries.data,
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.25
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    labels: { color: '#e2e4f0' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8', maxTicksLimit: 6 },
                    grid: { color: '#334155' }
                },
                y: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

function renderPositionManagement() {
    const emptyState = document.getElementById('positionEmptyState');
    const activeCard = document.getElementById('positionActiveCard');
    const statusBadge = document.getElementById('positionStatusBadge');
    const resultEl = document.getElementById('positionActionResult');
    const qtyInput = document.getElementById('positionEntryQty');
    const trimBtn = document.getElementById('positionTrimBtn');
    const rollBtn = document.getElementById('positionRollBtn');
    const closeBtn = document.getElementById('positionCloseBtn');
    const trimSelect = document.getElementById('positionTrimTargetQty');

    if (resultEl) resultEl.innerHTML = positionState.lastResultHtml;
    renderPositionJournal();

    if (!positionState.active) {
        if (emptyState) emptyState.hidden = false;
        if (activeCard) activeCard.hidden = true;
        if (statusBadge) statusBadge.textContent = 'Load a strategy to activate';
        if (trimBtn) trimBtn.disabled = true;
        if (rollBtn) rollBtn.disabled = true;
        if (closeBtn) closeBtn.disabled = true;
        setPositionActionMode(null);
        return;
    }

    const activePosition = positionState.active;
    const entryMetrics = getPositionEntryMetrics(activePosition);
    const currentMetrics = calculateScenarioMetricsForLegs(activePosition.currentLegs, scenarioState, activePosition.entryMarketState);

    if (emptyState) emptyState.hidden = true;
    if (activeCard) activeCard.hidden = false;
    if (statusBadge) statusBadge.textContent = `Open · ${activePosition.quantity} unit${activePosition.quantity === 1 ? '' : 's'}`;

    const strategyName = document.getElementById('positionStrategyName');
    const entryMeta = document.getElementById('positionEntryMeta');
    const entryPrice = document.getElementById('positionEntryPrice');
    const currentPl = document.getElementById('positionCurrentPL');
    const currentPlPct = document.getElementById('positionCurrentPLPct');
    const scenarioMark = document.getElementById('positionScenarioMark');

    if (strategyName) strategyName.textContent = activePosition.label;
    if (entryMeta) entryMeta.textContent = `Entry ${formatJournalTimestamp(activePosition.openedAt)}`;
    if (entryPrice) entryPrice.textContent = getEntryPriceText(entryMetrics?.totalCost ?? 0);
    if (currentPl) {
        currentPl.textContent = formatPositionMoney(currentMetrics.scenarioPL).replace('+', '');
        currentPl.className = `position-metric-value ${currentMetrics.scenarioPL > 0 ? 'is-positive' : (currentMetrics.scenarioPL < 0 ? 'is-negative' : '')}`;
    }
    if (currentPlPct) {
        currentPlPct.textContent = formatPositionPct(currentMetrics.scenarioPLPct);
        currentPlPct.className = `position-metric-sub ${currentMetrics.scenarioPLPct > 0 ? 'is-positive' : (currentMetrics.scenarioPLPct < 0 ? 'is-negative' : '')}`;
    }
    if (scenarioMark) scenarioMark.textContent = formatPositionMoney(currentMetrics.totalValue).replace('+', '');

    if (qtyInput) {
        qtyInput.value = String(activePosition.quantity);
        qtyInput.disabled = !activePosition.canEditQty || positionState.journal.length > 1;
    }

    if (trimBtn) trimBtn.disabled = activePosition.quantity <= 1;
    if (rollBtn) rollBtn.disabled = false;
    if (closeBtn) closeBtn.disabled = false;

    if (trimSelect) {
        trimSelect.innerHTML = '';
        for (let qty = 1; qty < activePosition.quantity; qty++) {
            const option = document.createElement('option');
            option.value = String(qty);
            option.textContent = `${qty}`;
            trimSelect.appendChild(option);
        }
    }

    renderRollPreview();
}

function updatePositionQty(nextQuantity) {
    if (!positionState.active) return;
    const parsed = Math.max(1, Math.round(nextQuantity));
    positionState.active.quantity = parsed;
    positionState.active.currentLegs = scaleLegTemplate(positionState.active.baseLegTemplate, parsed);
    if (positionState.journal[0]?.action === 'Open') {
        positionState.journal[0].details = buildOpenJournalDetails(positionState.active);
    }
    syncBuilderWithPosition();
    renderPositionManagement();
}

function handleTrimConfirm() {
    if (!positionState.active) return;
    const trimSelect = document.getElementById('positionTrimTargetQty');
    const remainingQty = trimSelect ? parseInt(trimSelect.value, 10) : NaN;
    if (!Number.isFinite(remainingQty) || remainingQty < 1 || remainingQty >= positionState.active.quantity) return;

    const closedQty = positionState.active.quantity - remainingQty;
    const closedLegs = scaleLegTemplate(positionState.active.baseLegTemplate, closedQty);
    const remainingLegs = scaleLegTemplate(positionState.active.baseLegTemplate, remainingQty);
    const realized = calculateScenarioMetricsForLegs(closedLegs, scenarioState, positionState.active.entryMarketState);
    const remainingScenario = calculateScenarioMetricsForLegs(remainingLegs, scenarioState, positionState.active.entryMarketState);
    const remainingSeries = buildExpirySeries(remainingLegs, positionState.active.entryMarketState);
    const remainingBreakevens = getBreakevensFromSeries(remainingSeries);

    positionState.active.quantity = remainingQty;
    positionState.active.currentLegs = remainingLegs;
    positionState.active.canEditQty = false;

    addPositionJournalEntry(
        'Trim',
        `Closed ${closedQty} unit${closedQty === 1 ? '' : 's'}; ${remainingQty} remaining.`,
        realized.scenarioPL
    );

    setPositionResult(`
        <strong>Trim executed.</strong>
        Realized ${formatPositionMoney(realized.scenarioPL)} on the closed portion.
        Remaining size ${remainingQty} with Δ ${remainingScenario.greeks.delta.toFixed(2)}, Γ ${remainingScenario.greeks.gamma.toFixed(2)}, ν ${remainingScenario.greeks.vega.toFixed(2)}, Θ ${remainingScenario.greeks.theta.toFixed(2)} and breakevens ${formatBreakevenList(remainingBreakevens)}.
    `);

    syncBuilderWithPosition();
    setPositionActionMode(null);
    renderPositionManagement();
}

function handleRollConfirm() {
    if (!positionState.active) return;
    const preview = positionState.rollPreview || getRollPreview();
    if (!preview) return;

    addPositionJournalEntry(
        'Roll',
        `Rolled to ${preview.strike.toFixed(1)} strike / ${preview.expiryValue}. Roll cost ${formatPositionMoney(preview.costToRoll)}.`,
        preview.oldMetrics.scenarioPL,
        preview.rollTimestamp
    );

    createManagedPosition(positionState.active.label, preview.newLegs, preview.newMarketState, {
        resetJournal: false,
        timestamp: preview.rollTimestamp,
        allowQtyEdit: false
    });

    setSharedContextMarketState(preview.newMarketState, preview.expiryValue);
    strategyState.legs = cloneLegs(preview.newLegs);
    renderLegs();
    updateStrategyChart();
    if (window.resetScenarioSandbox) window.resetScenarioSandbox();

    setPositionResult(`
        <strong>Roll confirmed.</strong>
        Closed the prior structure for ${formatPositionMoney(preview.oldMetrics.scenarioPL)} and ${preview.costToRoll >= 0 ? 'paid' : 'collected'} ${formatPositionMoney(Math.abs(preview.costToRoll)).replace('+', '')} to open the new one.
    `);
    setPositionActionMode(null);
    renderPositionManagement();
}

function handleCloseAll() {
    if (!positionState.active) return;

    const activePosition = positionState.active;
    const realized = calculateScenarioMetricsForLegs(activePosition.currentLegs, scenarioState, activePosition.entryMarketState);
    const portfolioPct = (realized.scenarioPL / getPositionPortfolioAum()) * 100;

    addPositionJournalEntry(
        'Close',
        `Closed all ${activePosition.quantity} unit${activePosition.quantity === 1 ? '' : 's'} (${portfolioPct.toFixed(2)}% of portfolio).`,
        realized.scenarioPL
    );

    setPositionResult(`
        <strong>Position closed.</strong>
        Realized ${formatPositionMoney(realized.scenarioPL)} which is ${formatPositionPct(portfolioPct)} of portfolio AUM.
    `);

    positionState.active = null;
    setPositionActionMode(null);
    strategyState.legs = [];
    renderLegs();
    updateStrategyChart();
    renderPositionManagement();
}

function exportPositionJournal() {
    if (!positionState.journal.length) return;

    const text = positionState.journal.map(entry => (
        `${formatJournalTimestamp(entry.timestamp)} | ${entry.action} | ${entry.details} | ${formatPositionMoney(entry.pnl)} | ${formatPositionMoney(entry.cumulative)}`
    )).join('\n');

    const handleSuccess = () => {
        positionState.exportStatus = 'Journal copied to clipboard.';
        renderPositionJournal();
    };

    const handleFailure = () => {
        positionState.exportStatus = 'Clipboard unavailable. Copy the journal from the table below.';
        renderPositionJournal();
    };

    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(handleSuccess).catch(handleFailure);
        return;
    }

    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        handleSuccess();
    } catch {
        handleFailure();
    }
}

export function initPositionManagement() {
    const panel = document.getElementById('positionManagementPanel');
    if (!panel) return;

    document.getElementById('positionTrimBtn')?.addEventListener('click', () => {
        setPositionActionMode(positionState.actionMode === 'trim' ? null : 'trim');
        renderPositionManagement();
    });

    document.getElementById('positionRollBtn')?.addEventListener('click', () => {
        const expiryInput = document.getElementById('positionRollExpiry');
        const strikeInput = document.getElementById('positionRollStrike');
        if (positionState.active && strikeInput) {
            strikeInput.value = getPositionAnchorStrike(positionState.active.currentLegs, positionState.active.entryMarketState.spot).toFixed(1);
        }
        if (positionState.active && expiryInput && !expiryInput.value) {
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + Math.max(30, Math.round(sharedMarketState.tYears * 365.25)));
            expiryInput.value = nextDate.toISOString().split('T')[0];
        }
        setPositionActionMode(positionState.actionMode === 'roll' ? null : 'roll');
        renderPositionManagement();
    });

    document.getElementById('positionCloseBtn')?.addEventListener('click', handleCloseAll);
    document.getElementById('positionTrimConfirmBtn')?.addEventListener('click', handleTrimConfirm);
    document.getElementById('positionRollConfirmBtn')?.addEventListener('click', handleRollConfirm);
    document.getElementById('positionJournalExportBtn')?.addEventListener('click', exportPositionJournal);

    document.getElementById('positionEntryQty')?.addEventListener('input', (event) => {
        const parsed = parseInt(event.target.value, 10);
        if (!Number.isFinite(parsed)) return;
        updatePositionQty(parsed);
    });

    document.getElementById('positionRollStrike')?.addEventListener('input', renderPositionManagement);
    document.getElementById('positionRollExpiry')?.addEventListener('input', renderPositionManagement);

    window.refreshPositionManagement = renderPositionManagement;
    renderPositionManagement();
}

function isCatalystReady() {
    return tradeThesisState.catalyst.trim().length > 0 || tradeThesisState.tags.length > 0;
}

function isThesisReady() {
    return Boolean(isCatalystReady() && tradeThesisState.priceView && tradeThesisState.volatilityView && tradeThesisState.timeframe);
}

function inferScenarioFromPriceView(priceView) {
    if (priceView === 'up') return 'bullish';
    if (priceView === 'down') return 'bearish';
    if (priceView === 'move_big') return 'volatile';
    if (priceView === 'flat') return 'neutral';
    return null;
}

function formatThesisCurrency(value) {
    if (!Number.isFinite(value)) return '--';
    return `$${Math.round(value).toLocaleString()}`;
}

function getSelectedThesisStrategyContext() {
    const fallbackPresetId = tradeThesisState.suggestions[0]?.presetId || null;
    const selectedPresetId = tradeThesisState.selectedPresetId || fallbackPresetId;
    if (!selectedPresetId) return null;

    const useBuilderStrategy = tradeThesisState.loadedPresetId === selectedPresetId && strategyState.legs.length > 0;
    const legs = useBuilderStrategy ? strategyState.legs : buildPresetLegs(selectedPresetId);
    if (!legs.length) return null;

    return {
        presetId: selectedPresetId,
        label: window.strategyPresets?.[selectedPresetId]?.label || selectedPresetId,
        metrics: computeStrategyMetrics(legs),
        useBuilderStrategy
    };
}

function setStepDisabled(stepEl, disabled) {
    if (!stepEl) return;
    stepEl.classList.toggle('is-blocked', disabled);
    stepEl.querySelectorAll('button, input, textarea, select').forEach(control => {
        control.disabled = disabled;
    });
}

function updateTradeThesisControls() {
    document.querySelectorAll('.thesis-tag').forEach(button => {
        const isActive = tradeThesisState.tags.includes(button.dataset.tag);
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });

    document.querySelectorAll('.thesis-choice').forEach(button => {
        const field = button.dataset.field;
        const isActive = tradeThesisState[field] === button.dataset.value;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
}

function updateTradeThesisStepStates() {
    const step1 = document.getElementById('tradeThesisStep1');
    const step2 = document.getElementById('tradeThesisStep2');
    const step3 = document.getElementById('tradeThesisStep3');
    const step4 = document.getElementById('tradeThesisStep4');

    const catalystReady = isCatalystReady();
    const thesisReady = isThesisReady();
    const suggestionsReady = tradeThesisState.suggestions.length > 0;

    step1?.classList.toggle('is-complete', catalystReady);
    step2?.classList.toggle('is-complete', thesisReady);
    step3?.classList.toggle('is-complete', suggestionsReady);
    step4?.classList.toggle('is-complete', suggestionsReady && Boolean(getSelectedThesisStrategyContext()));

    setStepDisabled(step2, !catalystReady);
    setStepDisabled(step3, !thesisReady);
    setStepDisabled(step4, !suggestionsReady);
}

function renderCatalystHint() {
    const hintEl = document.getElementById('thesisCatalystHint');
    if (!hintEl) return;

    const inferredOnly = inferCatalystTagsFromText(tradeThesisState.catalyst)
        .filter(tag => !tradeThesisState.tags.includes(tag));

    if (inferredOnly.length) {
        hintEl.textContent = `Detected from catalyst text: ${inferredOnly.join(' • ')}`;
        return;
    }

    hintEl.textContent = tradeThesisState.tags.length
        ? 'Manual tags are active and will steer the event match.'
        : 'Quick tags and catalyst text drive event and strategy matching.';
}

function renderTradeThesisSummary() {
    const summaryEl = document.getElementById('thesisSummaryLine');
    const researchEl = document.getElementById('thesisResearchLine');
    if (!summaryEl || !researchEl) return;

    if (!isThesisReady()) {
        summaryEl.textContent = 'Choose your direction, vol view, and timeframe to build the thesis statement.';
        summaryEl.classList.remove('is-ready');
        researchEl.textContent = 'Optional preferences sharpen the shortlist around objective, risk structure, and current IV regime.';
        researchEl.classList.remove('is-ready');
        return;
    }

    summaryEl.textContent = `You believe price will ${THESIS_SUMMARY_LABELS.priceView[tradeThesisState.priceView]} with ${THESIS_SUMMARY_LABELS.volatilityView[tradeThesisState.volatilityView]} volatility over ${THESIS_SUMMARY_LABELS.timeframe[tradeThesisState.timeframe]}.`;
    summaryEl.classList.add('is-ready');

    const researchPreferences = [
        tradeThesisState.objective ? `Objective: ${THESIS_SUMMARY_LABELS.objective[tradeThesisState.objective]}` : null,
        tradeThesisState.riskProfile ? `Risk: ${THESIS_SUMMARY_LABELS.riskProfile[tradeThesisState.riskProfile]}` : null,
        tradeThesisState.premiumStyle && tradeThesisState.premiumStyle !== 'either' ? `Premium: ${THESIS_SUMMARY_LABELS.premiumStyle[tradeThesisState.premiumStyle]}` : null,
        tradeThesisState.volRegime && tradeThesisState.volRegime !== 'neutral' ? `IV: ${THESIS_SUMMARY_LABELS.volRegime[tradeThesisState.volRegime]}` : null
    ].filter(Boolean);

    researchEl.textContent = researchPreferences.length
        ? researchPreferences.join(' • ')
        : 'Add objective, risk style, premium, or IV setup to sharpen the shortlist.';
    researchEl.classList.toggle('is-ready', researchPreferences.length > 0);

    const scenarioId = inferScenarioFromPriceView(tradeThesisState.priceView);
    if (scenarioId) setActivePlaybookScenario(scenarioId);
}

function renderTradeThesisSuggestions() {
    const container = document.getElementById('thesisSuggestions');
    if (!container) return;

    if (!isThesisReady()) {
        tradeThesisState.suggestions = [];
        container.innerHTML = '<div class="thesis-placeholder">Finish the thesis above to see matching strategies.</div>';
        updateTradeThesisStepStates();
        return;
    }

    tradeThesisState.suggestions = getTradeThesisSuggestions();
    if (!tradeThesisState.suggestions.length) {
        container.innerHTML = '<div class="thesis-placeholder">No close match found. Refine the thesis inputs and try again.</div>';
        updateTradeThesisStepStates();
        return;
    }

    if (!tradeThesisState.selectedPresetId || !tradeThesisState.suggestions.some(strategy => strategy.presetId === tradeThesisState.selectedPresetId)) {
        tradeThesisState.selectedPresetId = tradeThesisState.suggestions[0].presetId;
    }

    container.innerHTML = tradeThesisState.suggestions.map((strategy, index) => `
        <article class="thesis-suggestion-card ${index === 0 ? 'is-best' : ''} ${tradeThesisState.selectedPresetId === strategy.presetId ? 'is-selected' : ''}" data-preset-id="${strategy.presetId}">
            <div class="thesis-suggestion-head">
                <div>
                    <h5>${strategy.label}</h5>
                    <p>${strategy.research?.summary || strategy.rationale}</p>
                </div>
                <div class="thesis-suggestion-badges">
                    ${index === 0 ? '<span class="thesis-best-badge">Best Match</span>' : ''}
                    <span class="thesis-confidence-badge is-${strategy.scorecard.confidenceTone}">${strategy.scorecard.confidence}% confidence</span>
                </div>
            </div>
            <div class="thesis-score-breakdown">${strategy.scorecard.breakdownText}</div>
            <div class="thesis-suggestion-flags">
                ${strategy.fitTags.map(tag => `<span class="thesis-fit-flag">${tag}</span>`).join('')}
            </div>
            <div class="thesis-fit-copy">Why it fits: ${strategy.scorecard.fitReasons.join(' • ')}</div>
            <div class="thesis-suggestion-caution">Avoid if: ${strategy.caution || strategy.research?.avoid?.[0] || 'Liquidity or event pricing does not support the thesis.'}</div>
            <div class="thesis-suggestion-actions">
                <span class="thesis-fit-score">Score ${strategy.scorecard.total}/${strategy.scorecard.max}</span>
                <button type="button" class="thesis-load-btn" data-load-preset="${strategy.presetId}">Load →</button>
            </div>
        </article>
    `).join('');

    container.querySelectorAll('.thesis-suggestion-card').forEach(card => {
        card.addEventListener('click', (event) => {
            if (event.target.closest('.thesis-load-btn')) return;
            tradeThesisState.selectedPresetId = card.dataset.presetId;
            renderTradeThesisSuggestions();
            renderTradeThesisRisk();
        });
    });

    container.querySelectorAll('.thesis-load-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            loadStrategyPreset(button.dataset.loadPreset);
        });
    });

    updateTradeThesisStepStates();
}

function renderTradeThesisRisk() {
    const pctValueEl = document.getElementById('thesisRiskPctValue');
    const trafficEl = document.getElementById('riskTraffic');
    const trafficLabelEl = document.getElementById('riskTrafficLabel');
    const contractsEl = document.getElementById('thesisContracts');
    const maxLossEl = document.getElementById('thesisMaxLossPerContract');
    const detailsEl = document.getElementById('thesisRiskDetails');
    const warningEl = document.getElementById('thesisRiskWarning');
    const peerNoteEl = document.getElementById('thesisPeerNote');

    if (!pctValueEl || !trafficEl || !trafficLabelEl || !contractsEl || !maxLossEl || !detailsEl || !warningEl || !peerNoteEl) {
        return;
    }

    pctValueEl.textContent = `${tradeThesisState.riskPct}%`;

    const riskTone = tradeThesisState.riskPct < 3 ? 'green' : (tradeThesisState.riskPct <= 5 ? 'yellow' : 'red');
    const toneLabel = riskTone === 'green' ? 'Conservative' : (riskTone === 'yellow' ? 'Moderate' : 'Aggressive');
    trafficEl.dataset.riskTone = riskTone;
    trafficLabelEl.textContent = toneLabel;
    warningEl.classList.toggle('is-visible', riskTone === 'red');
    peerNoteEl.classList.toggle('is-hot', tradeThesisState.riskPct >= 8);

    const strategyContext = getSelectedThesisStrategyContext();
    if (!strategyContext) {
        contractsEl.textContent = '--';
        maxLossEl.textContent = '--';
        detailsEl.textContent = 'Select a strategy above to calculate a risk budget and contract count.';
        return;
    }

    const rawMaxLoss = strategyContext.metrics?.maxLoss;
    const maxLossPerContract = Number.isFinite(rawMaxLoss) ? Math.abs(Math.min(rawMaxLoss, 0)) : Infinity;
    const riskBudget = tradeThesisState.aum * (tradeThesisState.riskPct / 100);

    if (!Number.isFinite(maxLossPerContract) || maxLossPerContract === 0) {
        contractsEl.textContent = 'Manual';
        maxLossEl.textContent = 'Undefined';
        detailsEl.textContent = `${strategyContext.label} does not have a clean defined max loss in this model, so size it manually before loading.`;
        return;
    }

    const contracts = Math.floor(riskBudget / maxLossPerContract);
    contractsEl.textContent = `${contracts}`;
    maxLossEl.textContent = formatThesisCurrency(maxLossPerContract);

    if (contracts < 1) {
        detailsEl.textContent = `${strategyContext.label} risks ${formatThesisCurrency(maxLossPerContract)} per 1-lot. Your ${tradeThesisState.riskPct}% budget is ${formatThesisCurrency(riskBudget)}, so even one contract is oversized.`;
        return;
    }

    detailsEl.textContent = `${strategyContext.label} fits a ${formatThesisCurrency(riskBudget)} risk budget at roughly ${contracts} contract${contracts === 1 ? '' : 's'}, using ${formatThesisCurrency(maxLossPerContract)} max loss per 1-lot.`;
}

function refreshTradeThesisPanel() {
    updateTradeThesisControls();
    renderCatalystHint();
    renderTradeThesisSummary();
    renderTradeThesisSuggestions();
    renderTradeThesisRisk();
    updateTradeThesisStepStates();
}

export function initTradeThesisPanel() {
    const panel = document.getElementById('tradeThesisPanel');
    if (!panel) return;

    const catalystInput = document.getElementById('thesisCatalystInput');
    const aumInput = document.getElementById('thesisAumInput');
    const riskSlider = document.getElementById('thesisRiskPct');

    catalystInput?.addEventListener('input', (event) => {
        tradeThesisState.catalyst = event.target.value;
        refreshTradeThesisPanel();
    });

    panel.querySelectorAll('.thesis-tag').forEach(button => {
        button.addEventListener('click', () => {
            const tag = button.dataset.tag;
            if (tradeThesisState.tags.includes(tag)) {
                tradeThesisState.tags = tradeThesisState.tags.filter(item => item !== tag);
            } else {
                tradeThesisState.tags = [...tradeThesisState.tags, tag];
            }
            refreshTradeThesisPanel();
        });
    });

    panel.querySelectorAll('.thesis-choice').forEach(button => {
        button.addEventListener('click', () => {
            tradeThesisState[button.dataset.field] = button.dataset.value;
            refreshTradeThesisPanel();
        });
    });

    aumInput?.addEventListener('input', (event) => {
        const parsed = parseFloat(event.target.value);
        if (!Number.isFinite(parsed)) return;
        tradeThesisState.aum = Math.max(1000, parsed);
        renderTradeThesisRisk();
    });

    riskSlider?.addEventListener('input', (event) => {
        const parsed = parseInt(event.target.value, 10);
        if (!Number.isFinite(parsed)) return;
        tradeThesisState.riskPct = Math.min(10, Math.max(1, parsed));
        renderTradeThesisRisk();
    });

    window.refreshTradeThesisPanel = refreshTradeThesisPanel;
    window.refreshTradeThesisRisk = renderTradeThesisRisk;

    refreshTradeThesisPanel();
}

// Global exposure for UI onclick handlers
window.updateLeg = updateLeg;
window.removeLeg = removeLeg;
window.openStrategyPreset = openStrategyPreset;
window.loadStrategyPreset = loadStrategyPreset;

// ─── Strategy Compare Feature ───────────────────────────────────────────────

const STRATEGY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

// Compute all metrics for a set of legs using the CURRENT sharedMarketState
function computeStrategyMetrics(legs, marketState = sharedMarketState) {
    if (!legs || legs.length === 0) return null;

    const S = marketState.spot;
    const T = marketState.tYears;
    const v = marketState.volatility;
    const r = marketState.rate;
    const q = marketState.dividend;

    // Net debit/credit at entry
    let netCost = 0;
    legs.forEach(leg => {
        const direction = leg.action === 'buy' ? 1 : -1;
        let price = 0;
        if (leg.type === 'stock') {
            price = S;
        } else if (window.calculator && T > 0) {
            price = window.calculator.calculatePrice(S, leg.strike, T, v, r, q, leg.type === 'call');
        }
        netCost += direction * leg.quantity * price * 100;
    });

    // Net Greeks at current spot
    let netDelta = 0, netGamma = 0, netVega = 0, netTheta = 0, netRho = 0;
    legs.forEach(leg => {
        const direction = leg.action === 'buy' ? 1 : -1;
        const mult = leg.quantity * direction * 100;
        if (leg.type === 'stock') {
            netDelta += 1 * mult;
        } else if (window.calculator && T > 0) {
            const g = window.calculator.calculateGreeks(S, leg.strike, T, v, r, q, leg.type === 'call');
            netDelta += g.delta * mult;
            netGamma += g.gamma * mult;
            netVega += g.vega * mult;
            netTheta += g.theta * mult;
            netRho += g.rho * mult;
        }
    });
    const thetaDaily = netTheta / 365.25;

    const start = S * 0.70;
    const end = S * 1.30;
    const steps = 100;
    const stepSize = (end - start) / steps;
    const expiryData = [];
    const expiryPoints = [];
    for (let i = 0; i <= steps; i++) {
        const sp = start + i * stepSize;
        const pl = calculateStrategyPayoffAt(sp, 0, legs, marketState);
        expiryData.push(pl);
        expiryPoints.push({ x: sp, y: pl });
    }

    const analysis = analyzeExpiryProfile(expiryPoints, legs, marketState, S, {
        delta: netDelta,
        gamma: netGamma,
        vega: netVega,
        theta: thetaDaily,
        rho: netRho
    });
    const maxGainComparable = analysis.maxProfitText.includes('Infinite') ? Infinity : analysis.maxProfitValue;
    const maxLossComparable = analysis.maxLossText.includes('Unlimited') ? Infinity : Math.abs(analysis.maxLossValue);
    const riskRewardValue = !Number.isFinite(maxLossComparable) || maxLossComparable <= 0
        ? null
        : (!Number.isFinite(maxGainComparable) ? Infinity : maxGainComparable / maxLossComparable);
    const aumPct = Number.isFinite(maxLossComparable) ? (maxLossComparable / getPositionPortfolioAum()) * 100 : Infinity;
    const closestBreakEvenMove = analysis.breakevens.length
        ? Math.min(...analysis.breakevens.map(point => Math.abs(point.pctFromSpot)))
        : null;

    const formatDollarWhole = (value) => `$${Math.round(value).toLocaleString()}`;
    const entryCostText = netCost >= 0
        ? `${formatDollarWhole(netCost)} debit`
        : `-${formatDollarWhole(Math.abs(netCost))} credit`;
    const maxProfitText = analysis.maxProfitText.includes('Infinite')
        ? 'Unlimited'
        : formatDollarWhole(Math.max(0, analysis.maxProfitValue));
    const maxLossText = analysis.maxLossText.includes('Unlimited')
        ? 'Unlimited'
        : formatDollarWhole(maxLossComparable);
    const breakevensText = analysis.breakevens.length
        ? analysis.breakevens.map(point => `$${point.price.toFixed(1)}`).join(' / ')
        : 'None';
    const thetaText = `${netTheta >= 0 ? '+' : '-'}$${Math.abs(thetaDaily).toFixed(1)}`;
    const riskRewardText = riskRewardValue === null
        ? '--'
        : (!Number.isFinite(riskRewardValue) ? '1:∞' : `1:${riskRewardValue.toFixed(2)}`);

    return {
        legs: legs.length,
        netCost,
        maxGain: Number.isFinite(maxGainComparable) ? maxGainComparable : Infinity,
        maxLoss: Number.isFinite(maxLossComparable) ? -maxLossComparable : -Infinity,
        lowerBE: analysis.breakevens[0]?.price ?? null,
        upperBE: analysis.breakevens[1]?.price ?? null,
        delta: netDelta,
        gamma: netGamma,
        vega: netVega,
        theta: thetaDaily,
        rho: netRho,
        expiryData,
        expiryPoints,
        analysis,
        winProbability: analysis.probability?.probProfit ?? null,
        winProbabilityText: analysis.probability ? `${(analysis.probability.probProfit * 100).toFixed(1)}%` : '--',
        expectedPL: analysis.probability?.expectedPL ?? null,
        entryCostText,
        maxProfitText,
        maxLossText,
        breakevensText,
        riskRewardValue,
        riskRewardText,
        aumPct,
        aumPctText: Number.isFinite(aumPct) ? `${aumPct.toFixed(2)}%` : '--',
        thetaText,
        maxGainComparable,
        maxLossComparable,
        closestBreakEvenMove,
        start, end, stepSize,
        steps
    };
}

// Build Today P/L curve for a set of legs
function computeTodayData(legs, start, steps, stepSize) {
    const todayData = [];
    const T = sharedMarketState.tYears;
    for (let i = 0; i <= steps; i++) {
        const sp = start + i * stepSize;
        let pl = 0;
        legs.forEach(leg => {
            pl += calculateNetValue(sp, leg, T);
        });
        todayData.push(pl);
    }
    return todayData;
}

const SNAPSHOT_LABELS = ['Snapshot A', 'Snapshot B', 'Snapshot C'];
const COMPARE_SLOT_LABELS = ['Strategy A', 'Strategy B', 'Strategy C'];

function getCompareContextSummaryText() {
    return `${sharedMarketState.ticker} | Spot $${sharedMarketState.spot.toFixed(2)} | IV ${(sharedMarketState.volatility * 100).toFixed(1)}% | ${Math.round(sharedMarketState.tYears * 365.25)} DTE | Rate ${(sharedMarketState.rate * 100).toFixed(1)}%`;
}

function getLegSignature(legs = []) {
    return cloneLegs(legs)
        .map(leg => ([
            leg.type,
            leg.action,
            Number(leg.strike ?? 0).toFixed(4),
            Number(leg.expiry ?? 0).toFixed(6),
            Number(leg.quantity ?? 0).toFixed(4)
        ]).join(':'))
        .sort()
        .join('|');
}

function legsMatch(left = [], right = []) {
    if (left.length !== right.length) return false;
    return getLegSignature(left) === getLegSignature(right);
}

function getCurrentStrategySnapshotMeta(index) {
    const defaultName = `Custom Strategy ${index}`;
    const activePosition = positionState.active;
    if (activePosition && legsMatch(strategyState.legs, activePosition.currentLegs)) {
        return {
            displayName: activePosition.label || defaultName,
            presetId: tradeThesisState.loadedPresetId || null
        };
    }

    return {
        displayName: defaultName,
        presetId: null
    };
}

function showComparisonToast(message) {
    const notification = document.createElement('div');
    notification.style.cssText = 'position:fixed;top:1rem;right:1rem;background:#10b981;color:white;padding:0.75rem 1.25rem;border-radius:8px;z-index:9999;font-family:\'Outfit\',sans-serif;font-weight:600;animation:fadeIn 0.3s ease;';
    notification.textContent = message;
    document.body.appendChild(notification);
    window.setTimeout(() => notification.remove(), 2200);
}

function getCompareSurface(mode = 'desktop') {
    if (mode === 'modal') {
        return {
            mode,
            contextSummary: document.getElementById('compareModalContextSummary'),
            copyStatus: document.getElementById('compareModalCopyStatus'),
            copyBtn: document.getElementById('copyComparisonModalBtn'),
            chartCanvas: document.getElementById('compareModalExpiryChart'),
            tableHead: document.getElementById('compareModalTableHead'),
            tableBody: document.getElementById('compareModalTableBody'),
            recommendation: document.getElementById('compareModalRecommendationText'),
            chartKey: 'compareModalExpiryChart'
        };
    }

    return {
        mode,
        contextSummary: document.getElementById('compareContextSummary'),
        copyStatus: document.getElementById('compareCopyStatus'),
        copyBtn: document.getElementById('copyComparisonBtn'),
        chartCanvas: document.getElementById('compareExpiryChart'),
        tableHead: document.getElementById('compareTableHead'),
        tableBody: document.getElementById('compareTableBody'),
        recommendation: document.getElementById('compareRecommendationText'),
        chartKey: 'compareExpiryChart'
    };
}

function setCompareCopyStatus(text = '', mode = 'desktop') {
    const surface = getCompareSurface(mode);
    if (surface.copyStatus) surface.copyStatus.textContent = text;
}

function getComparisonEntries() {
    return strategyState.savedStrategies
        .map((strategy, index) => {
            const metrics = computeStrategyMetrics(strategy.legs);
            if (!metrics) return null;
            return {
                index,
                color: STRATEGY_COLORS[index % STRATEGY_COLORS.length],
                strategy,
                metrics
            };
        })
        .filter(Boolean);
}

function getCompareWinnerIndices(entries, row) {
    if (!row.score) return new Set();

    const scored = entries
        .map((entry, index) => ({ index, score: row.score(entry) }))
        .filter(item => item.score !== null && item.score !== undefined && !Number.isNaN(item.score));

    if (!scored.length) return new Set();

    const best = Math.max(...scored.map(item => item.score));
    if (best === -Infinity || Number.isNaN(best)) return new Set();

    return new Set(
        scored
            .filter(item => item.score === best || (Number.isFinite(item.score) && Number.isFinite(best) && Math.abs(item.score - best) < 1e-9))
            .map(item => item.index)
    );
}

function formatComparisonDelta(delta) {
    return Math.abs(delta) < 0.05 ? '~0' : delta.toFixed(2);
}

function formatRecommendationLabel(entry) {
    return `${entry.strategy.slotLabel} (${entry.strategy.displayName})`;
}

function getComparisonScore(entry) {
    const metric = entry.metrics;
    const thesisBonus = (
        (isThesisReady() && tradeThesisState.priceView === 'move_big' && metric.maxGainComparable === Infinity ? 8 : 0) +
        (isThesisReady() && tradeThesisState.priceView === 'flat' && metric.theta > 0 ? 8 : 0) +
        (isThesisReady() && tradeThesisState.priceView === 'up' && metric.delta > 0 ? 5 : 0) +
        (isThesisReady() && tradeThesisState.priceView === 'down' && metric.delta < 0 ? 5 : 0)
    );

    return (
        ((metric.winProbability ?? 0) * 100 * 0.45) +
        (Number.isFinite(metric.riskRewardValue) ? Math.min(metric.riskRewardValue, 4) * 8 : (metric.riskRewardValue === Infinity ? 32 : 0)) +
        (Number.isFinite(metric.expectedPL) && Number.isFinite(metric.maxLossComparable) && metric.maxLossComparable > 0
            ? Math.max(-20, Math.min(20, (metric.expectedPL / metric.maxLossComparable) * 50))
            : 0) -
        (Number.isFinite(metric.aumPct) ? metric.aumPct * 2 : 20) +
        (metric.maxGainComparable === Infinity ? 10 : 0) +
        thesisBonus
    );
}

function buildComparisonRecommendation(entries) {
    if (entries.length < 2) {
        return 'Save at least two snapshots to generate a recommendation.';
    }

    const bestPop = entries.reduce((best, entry) => ((entry.metrics.winProbability ?? -1) > (best.metrics.winProbability ?? -1) ? entry : best), entries[0]);
    const highestDebit = entries.reduce((best, entry) => (Math.max(entry.metrics.netCost, 0) > Math.max(best.metrics.netCost, 0) ? entry : best), entries[0]);
    const highestUpside = entries.reduce((best, entry) => ((entry.metrics.maxGainComparable ?? -Infinity) > (best.metrics.maxGainComparable ?? -Infinity) ? entry : best), entries[0]);
    const highestRisk = entries.reduce((best, entry) => ((entry.metrics.aumPct ?? -Infinity) > (best.metrics.aumPct ?? -Infinity) ? entry : best), entries[0]);
    const recommended = entries.reduce((best, entry) => {
        const score = getComparisonScore(entry);
        if (!best || score > best.score) return { entry, score };
        return best;
    }, null)?.entry || entries[0];

    const thesisContext = isThesisReady()
        ? (tradeThesisState.priceView === 'move_big'
            ? 'For your volatility thesis,'
            : tradeThesisState.priceView === 'up'
                ? 'For your bullish thesis,'
                : tradeThesisState.priceView === 'down'
                    ? 'For your bearish thesis,'
                    : 'For your range-bound thesis,')
        : 'For the current market context,';

    const sentences = [
        `${formatRecommendationLabel(highestUpside)} ${highestUpside.metrics.maxGainComparable === Infinity ? 'has unlimited upside' : `offers the highest payoff ceiling at ${highestUpside.metrics.maxProfitText}`}${highestDebit.index === highestUpside.index ? ' but also carries the highest entry cost.' : '.'}`,
        `${formatRecommendationLabel(bestPop)} has the highest win probability at ${bestPop.metrics.winProbabilityText}${bestPop.metrics.maxGainComparable !== Infinity ? ' but the gains are capped.' : '.'}`,
        `${thesisContext} ${formatRecommendationLabel(recommended)} looks strongest overall because it balances ${recommended.metrics.winProbabilityText} win probability, ${recommended.metrics.riskRewardText} risk/reward, and ${recommended.metrics.aumPctText} of AUM.`
    ];

    if (Number.isFinite(highestRisk.metrics.aumPct) && highestRisk.metrics.aumPct > 5) {
        sentences.push(`Consider trimming ${formatRecommendationLabel(highestRisk)} before the meeting because ${highestRisk.metrics.aumPctText} of AUM is aggressive.`);
    }

    return sentences.join(' ');
}

function buildComparisonText(entries, recommendation) {
    const header = ['Metric', ...entries.map(entry => entry.strategy.slotLabel)];
    const rows = [
        ['Name', ...entries.map(entry => entry.strategy.displayName)],
        ['Entry Cost', ...entries.map(entry => entry.metrics.entryCostText)],
        ['Max Profit', ...entries.map(entry => entry.metrics.maxProfitText)],
        ['Max Loss', ...entries.map(entry => entry.metrics.maxLossText)],
        ['Win Probability', ...entries.map(entry => entry.metrics.winProbabilityText)],
        ['Breakevens', ...entries.map(entry => entry.metrics.breakevensText)],
        ['Net Delta', ...entries.map(entry => formatComparisonDelta(entry.metrics.delta))],
        ['Net Theta/day', ...entries.map(entry => entry.metrics.thetaText)],
        ['Risk:Reward', ...entries.map(entry => entry.metrics.riskRewardText)],
        ['% of AUM', ...entries.map(entry => entry.metrics.aumPctText)]
    ];

    return [
        'Strategy Comparison',
        getCompareContextSummaryText(),
        '',
        `| ${header.join(' | ')} |`,
        `| ${header.map(() => '---').join(' | ')} |`,
        ...rows.map(row => `| ${row.join(' | ')} |`),
        '',
        `Recommendation: ${recommendation}`
    ].join('\n');
}

function renderCompareContextSummary(surface) {
    if (surface.contextSummary) surface.contextSummary.textContent = getCompareContextSummaryText();
}

function renderCompareTable(entries, surface) {
    const { tableHead, tableBody } = surface;
    if (!tableHead || !tableBody) return;

    tableHead.querySelectorAll('.compare-strategy-col').forEach(column => column.remove());

    entries.forEach(entry => {
        const th = document.createElement('th');
        th.className = 'compare-strategy-col';
        th.innerHTML = `
            <div class="compare-snapshot-label">${entry.strategy.slotLabel}</div>
            <div class="compare-strategy-name" style="color:${entry.color};">${entry.strategy.displayName}</div>
            <div class="compare-col-actions">
                <button onclick="window.loadSavedStrategy(${entry.index})" class="add-leg-btn">Load</button>
                <button onclick="window.deleteSavedStrategy(${entry.index})" class="remove-leg-btn">×</button>
            </div>
        `;
        tableHead.appendChild(th);
    });

    if (!entries.length) {
        tableBody.innerHTML = '<tr><td colspan="2" class="position-journal-empty">Save a strategy snapshot to begin comparing.</td></tr>';
        return;
    }

    const rows = [
        { label: 'Name', display: entry => entry.strategy.displayName },
        { label: 'Entry Cost', display: entry => entry.metrics.entryCostText, score: entry => Number.isFinite(entry.metrics.netCost) ? -entry.metrics.netCost : null },
        { label: 'Max Profit', display: entry => entry.metrics.maxProfitText, score: entry => entry.metrics.maxGainComparable },
        { label: 'Max Loss', display: entry => entry.metrics.maxLossText, score: entry => Number.isFinite(entry.metrics.maxLossComparable) ? -entry.metrics.maxLossComparable : -Infinity },
        { label: 'Win Probability', display: entry => entry.metrics.winProbabilityText, score: entry => entry.metrics.winProbability ?? -Infinity },
        { label: 'Breakevens', display: entry => entry.metrics.breakevensText, score: entry => Number.isFinite(entry.metrics.closestBreakEvenMove) ? -entry.metrics.closestBreakEvenMove : -Infinity },
        { label: 'Net Delta', display: entry => formatComparisonDelta(entry.metrics.delta), score: entry => -Math.abs(entry.metrics.delta) },
        { label: 'Net Theta/day', display: entry => entry.metrics.thetaText, score: entry => entry.metrics.theta },
        { label: 'Risk:Reward', display: entry => entry.metrics.riskRewardText, score: entry => entry.metrics.riskRewardValue ?? -Infinity },
        { label: '% of AUM', display: entry => entry.metrics.aumPctText, score: entry => Number.isFinite(entry.metrics.aumPct) ? -entry.metrics.aumPct : -Infinity }
    ];

    tableBody.innerHTML = '';
    rows.forEach((row, rowIndex) => {
        const winnerIndices = getCompareWinnerIndices(entries, row);
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-light)';
        tr.style.background = rowIndex % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';

        let html = `<td class="compare-row-label">${row.label}</td>`;
        entries.forEach((entry, index) => {
            const winnerClass = winnerIndices.has(index) ? 'compare-winner' : '';
            html += `<td class="compare-value-cell ${winnerClass}">${row.display(entry)}</td>`;
        });
        tr.innerHTML = html;
        tableBody.appendChild(tr);
    });
}

function renderCompareCharts(entries, surface) {
    const { chartCanvas, chartKey } = surface;
    if (!chartCanvas) return;

    if (strategyState[chartKey]) {
        strategyState[chartKey].destroy();
    }

    if (!entries.length) {
        strategyState[chartKey] = null;
        return;
    }

    const datasets = entries.map(entry => ({
        label: `${entry.strategy.slotLabel} · ${entry.strategy.displayName}`,
        data: entry.metrics.expiryPoints,
        borderColor: entry.color,
        backgroundColor: `${entry.color}20`,
        borderWidth: entry.strategy.slotLabel === 'Strategy A' ? 3 : 2.5,
        pointRadius: 0,
        tension: 0,
        fill: false
    }));

    datasets.push({
        label: 'Break Even',
        data: entries[0].metrics.expiryPoints.map(point => ({ x: point.x, y: 0 })),
        borderColor: 'rgba(255,255,255,0.35)',
        borderWidth: 1.5,
        borderDash: [8, 4],
        pointRadius: 0,
        fill: false
    });

    strategyState[chartKey] = new Chart(chartCanvas, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: {
                        color: '#f1f5f9',
                        filter: item => item.text !== 'Break Even'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: context => `Spot: $${Number(context[0].parsed.x).toFixed(2)}`,
                        label: context => `${context.dataset.label}: $${Number(context.parsed.y).toFixed(2)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    ticks: {
                        color: '#94a3b8',
                        maxTicksLimit: 8,
                        callback: value => `$${Number(value).toFixed(0)}`
                    },
                    grid: { color: '#334155' },
                    title: { display: true, text: 'Spot Price', color: '#94a3b8' }
                },
                y: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' },
                    title: { display: true, text: 'Expiry P&L ($)', color: '#94a3b8' }
                }
            }
        }
    });
}

function renderCompareRecommendation(entries, surface) {
    const recommendation = buildComparisonRecommendation(entries);
    if (surface.recommendation) surface.recommendation.textContent = recommendation;
    return recommendation;
}

function refreshCompareView(mode = 'desktop') {
    const surface = getCompareSurface(mode);
    const entries = getComparisonEntries();
    renderCompareContextSummary(surface);
    renderCompareTable(entries, surface);
    renderCompareCharts(entries, surface);
    const recommendation = renderCompareRecommendation(entries, surface);
    if (surface.copyBtn) surface.copyBtn.disabled = entries.length < 2;
    return { entries, recommendation };
}

async function copyComparisonToClipboard(entries, recommendation, mode = 'desktop') {
    const text = buildComparisonText(entries, recommendation);
    const success = () => setCompareCopyStatus('Comparison copied to clipboard.', mode);
    const failure = () => setCompareCopyStatus('Clipboard unavailable. Copy the table directly from the compare view.', mode);

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            success();
            return;
        }
    } catch {
        // Fall through to legacy method
    }

    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (copied) {
            success();
            return;
        }
    } catch {
        // Fall through to failure state
    }

    failure();
}

function setActiveBuilderUtilityPane(pane) {
    builderUiState.activeUtilityPane = pane;

    document.querySelectorAll('#builderUtilityTabs .builder-utility-tab').forEach(button => {
        button.classList.toggle('active', button.dataset.pane === pane);
    });

    document.querySelectorAll('#builderUtilityPanels .builder-utility-pane').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.pane === pane);
    });

    if (pane === 'compare') {
        refreshCompareView('desktop');
    } else if (pane === 'journal') {
        window.refreshPositionManagement?.();
    }
}

function initBuilderUtilityTabs() {
    const tabs = document.querySelectorAll('#builderUtilityTabs .builder-utility-tab');
    if (!tabs.length) return;

    tabs.forEach(button => {
        button.addEventListener('click', () => {
            setActiveBuilderUtilityPane(button.dataset.pane);
        });
    });

    setActiveBuilderUtilityPane(builderUiState.activeUtilityPane);
}

function prefersCompareModal() {
    return window.matchMedia('(max-width: 900px)').matches;
}

export function refreshBuilderViewport() {
    window.syncStrategyChartControls?.();
    updateStrategyChart();
    strategyState.positionRollChart?.resize();
    window.updateSandboxScenario?.();
    window.refreshPositionManagement?.();
    if (builderUiState.activeUtilityPane === 'compare') {
        refreshCompareView('desktop');
    }
    if (document.getElementById('compareModal')?.classList.contains('show')) {
        refreshCompareView('modal');
    }
}

export function initStrategyComparison() {
    const saveBtn = document.getElementById('saveStrategyBtn');
    const compareBtn = document.getElementById('compareStrategiesBtn');
    const modal = document.getElementById('compareModal');
    const closeBtn = document.getElementById('closeCompareModal');
    const presetSelect = document.getElementById('presetSelect');

    initBuilderUtilityTabs();

    const updateCompareBtn = () => {
        const count = strategyState.savedStrategies.length;
        if (!compareBtn || !saveBtn) return;
        compareBtn.textContent = `Compare (${count})`;
        compareBtn.style.display = count >= 1 ? 'inline-block' : 'none';
        saveBtn.disabled = count >= 3;
        saveBtn.title = count >= 3 ? 'Maximum 3 snapshots saved.' : 'Save the current strategy using the shared market context.';
    };

    const openCompareSurface = () => {
        if (!strategyState.savedStrategies.length) {
            alert('Save at least one snapshot before opening compare mode.');
            return;
        }

        if (prefersCompareModal()) {
            refreshCompareView('modal');
            setCompareCopyStatus('', 'modal');
            modal?.classList.add('show');
            return;
        }

        setActiveBuilderUtilityPane('compare');
        refreshCompareView('desktop');
        setCompareCopyStatus('', 'desktop');
    };

    saveBtn?.addEventListener('click', () => {
        if (strategyState.legs.length === 0) {
            alert('Add at least one leg before saving a comparison snapshot.');
            return;
        }

        if (strategyState.savedStrategies.length >= 3) {
            alert('Maximum 3 snapshots allowed. Delete one to save a new one.');
            return;
        }

        const index = strategyState.savedStrategies.length;
        const snapshotMeta = getCurrentStrategySnapshotMeta(index + 1);
        const snapshot = {
            id: Date.now(),
            snapshotLabel: SNAPSHOT_LABELS[index],
            slotLabel: COMPARE_SLOT_LABELS[index],
            displayName: snapshotMeta.displayName,
            presetId: snapshotMeta.presetId,
            legs: cloneLegs(strategyState.legs),
            savedAt: Date.now()
        };

        strategyState.savedStrategies.push(snapshot);
        updateCompareBtn();
        setCompareCopyStatus('', 'desktop');
        setCompareCopyStatus('', 'modal');
        showComparisonToast(`${snapshot.snapshotLabel} saved`);

        if (builderUiState.activeUtilityPane === 'compare') {
            refreshCompareView('desktop');
        }
        if (modal?.classList.contains('show')) {
            refreshCompareView('modal');
        }
    });

    compareBtn?.addEventListener('click', openCompareSurface);
    closeBtn?.addEventListener('click', () => modal?.classList.remove('show'));
    modal?.addEventListener('click', event => {
        if (event.target === modal) modal.classList.remove('show');
    });

    document.getElementById('copyComparisonBtn')?.addEventListener('click', async () => {
        const entries = getComparisonEntries();
        if (entries.length < 2) return;
        const recommendation = buildComparisonRecommendation(entries);
        await copyComparisonToClipboard(entries, recommendation, 'desktop');
    });

    document.getElementById('copyComparisonModalBtn')?.addEventListener('click', async () => {
        const entries = getComparisonEntries();
        if (entries.length < 2) return;
        const recommendation = buildComparisonRecommendation(entries);
        await copyComparisonToClipboard(entries, recommendation, 'modal');
    });

    window.loadSavedStrategy = (index) => {
        const saved = strategyState.savedStrategies[index];
        if (!saved) return;

        strategyState.legs = cloneLegs(saved.legs);
        if (presetSelect) presetSelect.value = saved.presetId || '';
        tradeThesisState.loadedPresetId = saved.presetId || null;
        if (saved.presetId) tradeThesisState.selectedPresetId = saved.presetId;

        createManagedPosition(saved.displayName, strategyState.legs, sharedMarketState, {
            resetJournal: true,
            allowQtyEdit: true
        });
        renderLegs();
        updateStrategyChart();
        window.updateSandboxScenario?.();
        window.refreshPositionManagement?.();
        window.refreshTradeThesisPanel?.();
        modal?.classList.remove('show');
    };

    window.deleteSavedStrategy = (index) => {
        strategyState.savedStrategies.splice(index, 1);
        strategyState.savedStrategies.forEach((strategy, strategyIndex) => {
            strategy.snapshotLabel = SNAPSHOT_LABELS[strategyIndex];
            strategy.slotLabel = COMPARE_SLOT_LABELS[strategyIndex];
        });
        updateCompareBtn();
        setCompareCopyStatus('', 'desktop');
        setCompareCopyStatus('', 'modal');

        refreshCompareView('desktop');
        if (modal?.classList.contains('show')) {
            refreshCompareView('modal');
        }
    };

    updateCompareBtn();
    refreshCompareView('desktop');
}
