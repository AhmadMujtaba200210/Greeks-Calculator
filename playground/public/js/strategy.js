// Strategy Builder Module
import { customTooltip } from './ui_utils.js';

export const strategyState = {
    legs: [],
    scenarios: [],
    savedStrategies: [],
    chart: null,
    greeksChart: null,
    compareExpiryChart: null,
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

    function updateScenario() {
        if (!spotSlider || !volSlider || !daysSlider || strategyState.legs.length === 0) {
            if (plEl) plEl.textContent = '$0.00';
            if (plPctEl) plPctEl.textContent = '0.00%';
            if (dEl) dEl.textContent = '0.00';
            if (gEl) gEl.textContent = '0.00';
            if (vEl) vEl.textContent = '0.00';
            if (thEl) thEl.textContent = '0.00';
            return;
        }

        const spotChangePct = parseFloat(spotSlider.value);
        const ivChangePts = parseFloat(volSlider.value);
        const daysElapsed = parseFloat(daysSlider.value);

        spotVal.textContent = spotChangePct > 0 ? `+${spotChangePct}%` : `${spotChangePct}%`;
        volVal.textContent = ivChangePts > 0 ? `+${ivChangePts}` : `${ivChangePts}`;
        daysVal.textContent = `${daysElapsed}`;

        const S_new = sharedMarketState.spot * (1 + spotChangePct / 100);
        let sigma_new = sharedMarketState.volatility + (ivChangePts / 100);
        sigma_new = Math.max(0.01, Math.min(3.00, sigma_new)); // cap 1% to 300%
        let T_new = sharedMarketState.tYears - (daysElapsed / 365.25);
        T_new = Math.max(0.0001, T_new); // floor at tiny positive number

        // Calculate new P/L
        let totalValNew = 0;
        let totalCost = 0;
        let netDelta = 0, netGamma = 0, netVega = 0, netTheta = 0;

        strategyState.legs.forEach(leg => {
            const direction = leg.action === 'buy' ? 1 : -1;
            const multiplier = leg.quantity * direction * 100;

            // Entry cost
            let cost = 0;
            if (leg.type === 'stock') {
                cost = sharedMarketState.spot;
            } else if (window.calculator) {
                cost = window.calculator.calculatePrice(sharedMarketState.spot, leg.strike, sharedMarketState.tYears, sharedMarketState.volatility, sharedMarketState.rate, sharedMarketState.dividend, leg.type === 'call');
            }
            totalCost += cost * direction * leg.quantity * 100;

            // New Value and Greeks
            if (leg.type === 'stock') {
                totalValNew += S_new * direction * leg.quantity * 100;
                netDelta += 1 * multiplier;
            } else if (window.calculator) {
                const isCall = leg.type === 'call';
                const price = window.calculator.calculatePrice(S_new, leg.strike, T_new, sigma_new, sharedMarketState.rate, sharedMarketState.dividend, isCall);
                totalValNew += price * multiplier;

                const greeks = window.calculator.calculateGreeks(S_new, leg.strike, T_new, sigma_new, sharedMarketState.rate, sharedMarketState.dividend, isCall);
                netDelta += greeks.delta * multiplier;
                netGamma += greeks.gamma * multiplier;
                netVega += greeks.vega * multiplier;
                netTheta += greeks.theta * multiplier;
            }
        });

        const scenarioPL = totalValNew - totalCost;
        const scenarioPLPct = totalCost !== 0 ? (scenarioPL / Math.abs(totalCost)) * 100 : 0;

        plEl.textContent = `$${scenarioPL.toFixed(2)}`;
        plEl.style.color = scenarioPL > 0 ? '#10b981' : (scenarioPL < 0 ? '#ef4444' : '#f8fafc');
        plPctEl.textContent = `${scenarioPLPct.toFixed(2)}%`;
        plPctEl.style.color = plEl.style.color;

        dEl.textContent = netDelta.toFixed(2);
        gEl.textContent = netGamma.toFixed(2);
        vEl.textContent = netVega.toFixed(2);
        thEl.textContent = (netTheta / 365.25).toFixed(2); // daily
    }

    // Listeners
    if (spotSlider) spotSlider.addEventListener('input', updateScenario);
    if (volSlider) volSlider.addEventListener('input', updateScenario);
    if (daysSlider) daysSlider.addEventListener('input', updateScenario);

    // We want to expose updateScenario so we can call it when main params change
    window.updateSandboxScenario = updateScenario;

    // Presets
    document.getElementById('scenarioBullBtn')?.addEventListener('click', () => {
        if (spotSlider) spotSlider.value = 10;
        if (volSlider) volSlider.value = -5;
        if (daysSlider) { daysSlider.value = Math.min(3, parseInt(daysSlider.max)); }
        updateScenario();
    });
    document.getElementById('scenarioBearBtn')?.addEventListener('click', () => {
        if (spotSlider) spotSlider.value = -10;
        if (volSlider) volSlider.value = 5;
        if (daysSlider) { daysSlider.value = Math.min(3, parseInt(daysSlider.max)); }
        updateScenario();
    });
    document.getElementById('scenarioThetaBtn')?.addEventListener('click', () => {
        if (spotSlider) spotSlider.value = 0;
        if (volSlider) volSlider.value = 0;
        if (daysSlider) { daysSlider.value = Math.min(7, parseInt(daysSlider.max)); }
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
function calculateNetValue(S_test, leg, tRemaining) {
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
            if (window.calculator && sharedMarketState) {
                const v = sharedMarketState.volatility;
                const r = sharedMarketState.rate;
                const q = sharedMarketState.dividend;
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
    if (window.calculator && sharedMarketState) {
        const S = sharedMarketState.spot;
        const T = sharedMarketState.tYears;
        const v = sharedMarketState.volatility;
        const r = sharedMarketState.rate;
        const q = sharedMarketState.dividend;
        const isCall = leg.type === 'call';

        if (leg.type !== 'stock') {
            entryCost = window.calculator.calculatePrice(S, leg.strike, T, v, r, q, isCall);
        } else {
            entryCost = S;
        }
    } else {
        if (leg.type === 'stock') entryCost = sharedMarketState.spot;
        else if (leg.type === 'call') entryCost = Math.max(0, sharedMarketState.spot - leg.strike);
        else entryCost = Math.max(0, leg.strike - sharedMarketState.spot);
    }

    const direction = leg.action === 'buy' ? 1 : -1;
    return direction * leg.quantity * (currentVal - entryCost) * 100;
}

// Calculate aggregated Net Greeks for the entire strategy
function calculateNetGreeks(spotToTest = sharedMarketState.spot) {
    let netDelta = 0, netGamma = 0, netVega = 0, netTheta = 0, netRho = 0;

    if (window.calculator && sharedMarketState) {
        const T = sharedMarketState.tYears;
        const v = sharedMarketState.volatility;
        const r = sharedMarketState.rate;
        const q = sharedMarketState.dividend;

        strategyState.legs.forEach(leg => {
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

// Draw the strategy chart
export function updateStrategyChart() {
    const ctx = document.getElementById('strategyChart');
    if (!ctx) return;

    if (strategyState.legs.length === 0) {
        if (strategyState.chart) strategyState.chart.destroy();
        if (strategyState.greeksChart) strategyState.greeksChart.destroy();
        updateNetGreeksDisplay({ delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 });
        return;
    }

    const strikes = strategyState.legs.map(l => l.strike);
    const currentSpot = sharedMarketState.spot;
    const minSpot = currentSpot * 0.70;
    const maxSpot = currentSpot * 1.30;
    const start = minSpot;
    const end = maxSpot;

    const steps = 100;
    const stepSize = (end - start) / steps;
    const labels = [];

    const originalT = sharedMarketState.tYears;
    const timeProfiles = [
        { label: 'Today', tRemain: originalT, color: '#2563eb', data: [] },
        { label: `75% time (${Math.round(originalT * 0.75 * 365)}d)`, tRemain: originalT * 0.75, color: '#8b5cf6', data: [] },
        { label: `50% time (${Math.round(originalT * 0.50 * 365)}d)`, tRemain: originalT * 0.50, color: '#ec4899', data: [] },
        { label: `25% time (${Math.round(originalT * 0.25 * 365)}d)`, tRemain: originalT * 0.25, color: '#f59e0b', data: [] },
        { label: 'At Expiration', tRemain: 0, color: '#10b981', data: [] }
    ];

    // Calculate P&L for all lines
    for (let i = 0; i <= steps; i++) {
        const spot = start + (i * stepSize);
        labels.push(spot.toFixed(2));
        timeProfiles.forEach(profile => {
            let totalPayoff = 0;
            strategyState.legs.forEach(leg => {
                totalPayoff += calculateNetValue(spot, leg, profile.tRemain);
            });
            profile.data.push(totalPayoff);
        });
    }

    // Update old stats (used elsewhere, passing expiry data)
    updateStrategyStats(timeProfiles[4].data, start, end, stepSize);

    // Update Greek Cards
    const currentNetGreeks = calculateNetGreeks(currentSpot);
    updateNetGreeksDisplay(currentNetGreeks);

    // Draw Greeks Chart over the spot range
    drawGreeksVsSpotChart(start, end, steps, stepSize, labels);

    if (strategyState.chart) {
        strategyState.chart.destroy();
    }

    // Generate horizontal zero line
    const zeroLineData = new Array(labels.length).fill(0);

    const datasets = timeProfiles.map(p => ({
        label: p.label,
        data: p.data,
        borderColor: p.color,
        backgroundColor: p.color + '20', // Add a little transparency
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHitRadius: 10
    }));

    // Make Expiration line slightly thicker and non-smoothed
    datasets[4].tension = 0.0;
    datasets[4].borderWidth = 3;
    datasets[4].borderDash = [5, 5]; // Highlight expiration differently if desired

    // Add Zero Line
    datasets.push({
        label: 'Break Even ($0)',
        data: zeroLineData,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderWidth: 1.5,
        borderDash: [8, 4],
        pointRadius: 0,
        fill: false,
        showLine: true
    });

    const plugins = {
        legend: { labels: { color: '#f1f5f9' } },
        tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
                title: (context) => `Spot Price: $${context[0].label}`,
                label: (ctx) => `${ctx.dataset.label}: $${Number(ctx.parsed.y).toFixed(2)}`
            }
        }
    };

    // Attempt annotation for vertical strike lines if plugin is included
    const strikesUnique = [...new Set(strikes)];
    const annotations = {};
    strikesUnique.forEach((st, idx) => {
        annotations[`line${idx}`] = {
            type: 'line',
            xMin: st,
            xMax: st,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderWidth: 1,
            borderDash: [5, 5]
        };
    });

    if (Object.keys(annotations).length > 0) {
        plugins.annotation = { annotations };
    }

    strategyState.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
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
            scales: {
                x: {
                    title: { display: true, text: 'Spot Price', color: '#94a3b8' },
                    ticks: { color: '#94a3b8', maxTicksLimit: 10 },
                    grid: { color: '#334155' }
                },
                y: {
                    title: { display: true, text: 'Net P&L ($)', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155', zeroLineColor: 'rgba(255,255,255,0.5)' }
                }
            }
        }
    });

    if (window.updateSandboxScenario) {
        window.updateSandboxScenario();
    }
}

// Helper to update Net Greeks DOM Cards
function updateNetGreeksDisplay(greeks) {
    const formatGreek = (val) => val === 0 ? "0.00" : val.toFixed(2);
    document.getElementById('netDeltaResult').textContent = formatGreek(greeks.delta);
    document.getElementById('netGammaResult').textContent = formatGreek(greeks.gamma);
    document.getElementById('netVegaResult').textContent = formatGreek(greeks.vega);
    document.getElementById('netThetaResult').textContent = formatGreek(greeks.theta);
    document.getElementById('netRhoResult').textContent = formatGreek(greeks.rho);
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
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#f1f5f9' }, position: 'top' },
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
function updateStrategyStats(payoffs, start, end, stepSize) {
    const maxProfitEl = document.getElementById('maxProfit');
    const maxLossEl = document.getElementById('maxLoss');
    const breakevensEl = document.getElementById('breakevens');

    if (!maxProfitEl || !maxLossEl || !breakevensEl) return;

    let maxVal = Math.max(...payoffs);
    let minVal = Math.min(...payoffs);

    // Check for Infinite/Unlimited at boundaries
    const isRisingAtEnd = payoffs[payoffs.length - 1] > payoffs[payoffs.length - 2];
    const isFallingAtEnd = payoffs[payoffs.length - 1] < payoffs[payoffs.length - 2];
    const isRisingAtStart = payoffs[0] > payoffs[1];
    const isFallingAtStart = payoffs[0] < payoffs[1];

    // Simplistic infinite detection: if the value at the very end is the max/min and it was moving in that direction
    let maxProfitText = "";
    let maxLossText = "";

    if (isRisingAtEnd || isRisingAtStart) {
        maxProfitText = "Infinite ♾️";
    } else {
        maxProfitText = `$${maxVal.toFixed(2)}`;
    }

    if (isFallingAtEnd || isFallingAtStart) {
        maxLossText = "Unlimited ⚠️";
    } else {
        maxLossText = `$${Math.abs(minVal).toFixed(2)}`;
    }

    maxProfitEl.innerText = maxProfitText;
    maxProfitEl.style.color = maxProfitText.includes('Infinite') ? '#10b981' : (maxVal > 0 ? '#10b981' : '#94a3b8');

    maxLossEl.innerText = maxLossText;
    maxLossEl.style.color = maxLossText.includes('Unlimited') ? '#ef4444' : (minVal < 0 ? '#ef4444' : '#94a3b8');

    // Find Breakevens (Crossings of zero)
    const bePoints = [];
    for (let i = 0; i < payoffs.length - 1; i++) {
        if (payoffs[i] * payoffs[i + 1] <= 0) {
            // Found a crossing between i and i+1
            // Linear interpolation: y = mx + c => 0 = m*x + payoffs[i]
            const x1 = start + (i * stepSize);
            const x2 = start + ((i + 1) * stepSize);
            const y1 = payoffs[i];
            const y2 = payoffs[i + 1];

            if (y1 === y2) continue; // Horizontal on 0

            const breakPrice = x1 + (0 - y1) * (x2 - x1) / (y2 - y1);
            bePoints.push(breakPrice.toFixed(1));
        }
    }

    breakevensEl.innerText = bePoints.length > 0 ? bePoints.join(', ') : 'None';
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
        title: "Steady Bullish View",
        thinking: "You expect the stock to rise, but don't want to pay 'full price' for a naked call. A Bull Call Spread reduces your cost basis by selling upside you don't expect to hit.",
        recommendation: "Bull Call Spread",
        presetId: "bull_call_spread"
    },
    bearish: {
        title: "Controlled Bearish View",
        thinking: "You think the market is overextended. Buying a put is expensive due to high demand. A Bear Put Spread caps your cost while giving you a defined window of profit.",
        recommendation: "Bear Put Spread",
        presetId: "bear_put_spread"
    },
    neutral: {
        title: "Range-Bound / Flat",
        thinking: "Vol is high but the stock isn't moving. Sell an Iron Condor to collect 'Rent' (Theta decay). You win if the stock stays between your two short strikes.",
        recommendation: "Iron Condor",
        presetId: "iron_condor"
    },
    volatile: {
        title: "Explosive Breakout",
        thinking: "Earnings or news is coming. You don't know the direction, but you know it won't stay here. A Straddle wins if the price moves hard in EITHER direction.",
        recommendation: "Long Straddle",
        presetId: "long_straddle"
    }
};

export function initStrategyPlaybook() {
    const container = document.querySelector('.terminal-panel:has(.playbook-scenarios)');
    if (!container) return;

    const buttons = container.querySelectorAll('.scenario-btn');
    const contentArea = document.getElementById('playbookContent');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const scenarioId = btn.dataset.scenario;
            const data = PLAYBOOK_DATA[scenarioId];
            if (!data) return;

            // Update active button
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Render content
            contentArea.innerHTML = `
                <div class="playbook-card active">
                    <h4>${data.title}</h4>
                    <div class="thinking-section">
                        <h5>Thinking Like a Trader</h5>
                        <p>${data.thinking}</p>
                    </div>
                    <div class="thinking-section" style="border-left-color: var(--t-green);">
                        <h5 style="color: var(--t-green);">Strategy Choice</h5>
                        <p>${data.recommendation}</p>
                    </div>
                    <div class="action-row">
                        <button class="btn-playbook-load" onclick="window.loadStrategyPreset('${data.presetId}')">
                            Load Example →
                        </button>
                    </div>
                </div>
            `;
        });
    });
}

export function loadStrategyPreset(presetId) {
    const preset = window.strategyPresets?.[presetId];
    if (!preset) return;

    // Use current spot to make strikes relative
    const S = window.sharedMarketState ? window.sharedMarketState.spot : 100;

    strategyState.legs = preset.legs.map((leg, index) => {
        // Presets in lessons.js are mostly based on Spot=100
        // We shift the strike relative to current S
        let newStrike = leg.strike;
        if (leg.type !== 'stock') {
            const offset = leg.strike - 100;
            newStrike = Math.round(S + offset);
        } else {
            newStrike = S;
        }

        return {
            id: `leg-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
            type: leg.type,
            action: leg.action,
            strike: newStrike,
            expiry: leg.expiry || 1.0,
            quantity: leg.quantity || 1
        };
    });

    renderLegs();
    updateStrategyChart();
    if (window.updateSandboxScenario) window.updateSandboxScenario();
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

// Global exposure for UI onclick handlers
window.updateLeg = updateLeg;
window.removeLeg = removeLeg;
window.openStrategyPreset = openStrategyPreset;
window.loadStrategyPreset = loadStrategyPreset;

// ─── Strategy Compare Feature ───────────────────────────────────────────────

const STRATEGY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

// Compute all metrics for a set of legs using the CURRENT sharedMarketState
function computeStrategyMetrics(legs) {
    if (!legs || legs.length === 0) return null;

    const S = sharedMarketState.spot;
    const T = sharedMarketState.tYears;
    const v = sharedMarketState.volatility;
    const r = sharedMarketState.rate;
    const q = sharedMarketState.dividend;

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

    // Expiration P/L curve for stats (100 points ± 30%)
    const start = S * 0.70;
    const end = S * 1.30;
    const steps = 100;
    const stepSize = (end - start) / steps;
    const expiryData = [];
    for (let i = 0; i <= steps; i++) {
        const sp = start + i * stepSize;
        let pl = 0;
        legs.forEach(leg => {
            pl += calculateNetValue(sp, leg, 0);
        });
        expiryData.push(pl);
    }

    const maxGain = Math.max(...expiryData);
    const maxLoss = Math.min(...expiryData);

    // Breakevens
    const breakevens = [];
    for (let i = 0; i < expiryData.length - 1; i++) {
        if (expiryData[i] * expiryData[i + 1] <= 0) {
            const x1 = start + i * stepSize;
            const x2 = start + (i + 1) * stepSize;
            const y1 = expiryData[i], y2 = expiryData[i + 1];
            if (y1 !== y2) breakevens.push(x1 + (0 - y1) * (x2 - x1) / (y2 - y1));
        }
    }

    return {
        legs: legs.length,
        netCost,
        maxGain: isFinite(maxGain) ? maxGain : Infinity,
        maxLoss: isFinite(maxLoss) ? maxLoss : -Infinity,
        lowerBE: breakevens[0] ?? null,
        upperBE: breakevens[1] ?? null,
        delta: netDelta,
        gamma: netGamma,
        vega: netVega,
        theta: thetaDaily,
        rho: netRho,
        expiryData,
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

// Render the comparison table
function renderCompareTable() {
    const head = document.getElementById('compareTableHead');
    const body = document.getElementById('compareTableBody');
    if (!head || !body) return;

    const strategies = strategyState.savedStrategies;

    // Build header columns
    const existingCols = head.querySelectorAll('.strategy-col');
    existingCols.forEach(el => el.remove());
    strategies.forEach((s, i) => {
        const th = document.createElement('th');
        th.className = 'strategy-col';
        th.style.cssText = `padding: 0.75rem; color: ${STRATEGY_COLORS[i]}; min-width: 160px;`;
        th.innerHTML = `<div>${s.name}</div>
            <div style="display:flex;gap:0.4rem;margin-top:0.4rem;">
                <button onclick="window.loadSavedStrategy(${i})" class="add-leg-btn" style="font-size:0.7rem;padding:2px 8px;">Load</button>
                <button onclick="window.deleteSavedStrategy(${i})" class="remove-leg-btn" style="position:static;width:auto;height:auto;padding:2px 8px;font-size:0.7rem;">×</button>
            </div>`;
        head.appendChild(th);
    });

    // Compute metrics for each strategy
    const metrics = strategies.map(s => computeStrategyMetrics(s.legs));

    const fmt = (v, prefix = '', suffix = '') => v === null || v === undefined ? '--'
        : !isFinite(v) ? (v > 0 ? '∞' : '-∞')
            : `${prefix}${v.toFixed(2)}${suffix}`;

    const rows = [
        { label: 'No. of Legs', fn: m => m.legs },
        { label: 'Net Debit (-) / Credit (+)', fn: m => fmt(m.netCost, '$') },
        { label: 'Max Loss', fn: m => fmt(m.maxLoss, '$') },
        { label: 'Max Gain', fn: m => fmt(m.maxGain, '$') },
        { label: 'Lower Breakeven', fn: m => fmt(m.lowerBE, '$') },
        { label: 'Upper Breakeven', fn: m => fmt(m.upperBE, '$') },
        { label: 'Net Delta (Δ)', fn: m => fmt(m.delta) },
        { label: 'Net Gamma (Γ)', fn: m => fmt(m.gamma) },
        { label: 'Net Vega (ν)', fn: m => fmt(m.vega) },
        { label: 'Net Theta/day (Θ)', fn: m => fmt(m.theta) },
        { label: 'Net Rho (ρ)', fn: m => fmt(m.rho) },
    ];

    body.innerHTML = '';
    rows.forEach((row, ri) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-light)';
        tr.style.background = ri % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
        let html = `<td style="padding:0.75rem;font-weight:600;position:sticky;left:0;background:var(--bg-card);color:var(--text-secondary);">${row.label}</td>`;
        metrics.forEach((m, i) => {
            const val = m ? row.fn(m) : '--';
            html += `<td style="padding:0.75rem;font-family:'JetBrains Mono',monospace;color:${STRATEGY_COLORS[i]};">${val}</td>`;
        });
        tr.innerHTML = html;
        body.appendChild(tr);
    });

    return metrics;
}

// Render overlaid charts
function renderCompareCharts(metrics) {
    const S = sharedMarketState.spot;
    const start = S * 0.70;
    const end = S * 1.30;
    const steps = 100;
    const stepSize = (end - start) / steps;
    const labels = [];
    for (let i = 0; i <= steps; i++) labels.push((start + i * stepSize).toFixed(1));

    const expiryDatasets = [];
    const todayDatasets = [];

    strategyState.savedStrategies.forEach((s, i) => {
        const m = metrics[i];
        if (!m) return;
        const color = STRATEGY_COLORS[i];
        const todayData = computeTodayData(s.legs, start, steps, stepSize);

        expiryDatasets.push({
            label: s.name,
            data: m.expiryData,
            borderColor: color,
            backgroundColor: color + '20',
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0,
            fill: false
        });
        todayDatasets.push({
            label: s.name,
            data: todayData,
            borderColor: color,
            backgroundColor: color + '20',
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0.4,
            fill: false
        });
    });

    // Zero line
    const zeroLine = {
        label: 'Break Even',
        data: new Array(labels.length).fill(0),
        borderColor: 'rgba(255,255,255,0.35)',
        borderWidth: 1.5,
        borderDash: [8, 4],
        pointRadius: 0,
        fill: false
    };
    expiryDatasets.push(zeroLine);
    todayDatasets.push({ ...zeroLine, label: '' });

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { labels: { color: '#f1f5f9' } },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    title: ctx => `Spot: $${ctx[0].label}`,
                    label: ctx => `${ctx.dataset.label}: $${Number(ctx.parsed.y).toFixed(2)}`
                }
            }
        },
        scales: {
            x: {
                ticks: { color: '#94a3b8', maxTicksLimit: 8 }, grid: { color: '#334155' },
                title: { display: true, text: 'Spot Price', color: '#94a3b8' }
            },
            y: {
                ticks: { color: '#94a3b8' }, grid: { color: '#334155' },
                title: { display: true, text: 'Net P&L ($)', color: '#94a3b8' }
            }
        }
    };

    const expiryCtx = document.getElementById('compareExpiryChart');
    if (expiryCtx) {
        if (strategyState.compareExpiryChart) strategyState.compareExpiryChart.destroy();
        strategyState.compareExpiryChart = new Chart(expiryCtx, {
            type: 'line', data: { labels, datasets: expiryDatasets }, options: commonOptions
        });
    }
    const todayCtx = document.getElementById('compareTodayChart');
    if (todayCtx) {
        if (strategyState.compareTodayChart) strategyState.compareTodayChart.destroy();
        strategyState.compareTodayChart = new Chart(todayCtx, {
            type: 'line', data: { labels, datasets: todayDatasets }, options: { ...commonOptions }
        });
    }
}

export function initStrategyComparison() {
    const saveBtn = document.getElementById('saveStrategyBtn');
    const compareBtn = document.getElementById('compareStrategiesBtn');
    const modal = document.getElementById('compareModal');
    const closeBtn = document.getElementById('closeCompareModal');

    const updateCompareBtn = () => {
        const count = strategyState.savedStrategies.length;
        if (compareBtn) {
            compareBtn.textContent = count >= 2 ? `Compare (${count})` : `Saved: ${count}`;
            compareBtn.style.display = count >= 1 ? 'inline-block' : 'none';
        }
    };

    saveBtn?.addEventListener('click', () => {
        if (strategyState.legs.length === 0) {
            alert('Add at least one leg before saving a strategy.');
            return;
        }
        if (strategyState.savedStrategies.length >= 4) {
            alert('Maximum 4 strategies allowed. Delete one to save a new one.');
            return;
        }
        const n = strategyState.savedStrategies.length + 1;
        const name = `Strategy ${n}`;
        // Deep clone legs
        const legsCopy = strategyState.legs.map(l => ({ ...l }));
        strategyState.savedStrategies.push({ id: Date.now(), name, legs: legsCopy });
        updateCompareBtn();
        const notification = document.createElement('div');
        notification.style.cssText = `position:fixed;top:1rem;right:1rem;background:#10b981;color:white;padding:0.75rem 1.25rem;border-radius:8px;z-index:9999;font-family:'Outfit',sans-serif;font-weight:600;animation:fadeIn 0.3s ease;`;
        notification.textContent = `✓ "${name}" saved!`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2500);
    });

    compareBtn?.addEventListener('click', () => {
        if (strategyState.savedStrategies.length < 2) {
            alert('Save at least 2 strategies to compare.');
            return;
        }
        const metrics = renderCompareTable();
        renderCompareCharts(metrics);
        modal?.classList.add('show');
    });

    closeBtn?.addEventListener('click', () => modal?.classList.remove('show'));
    modal?.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });

    window.loadSavedStrategy = (index) => {
        const saved = strategyState.savedStrategies[index];
        if (!saved) return;
        // Clear current legs and reload from snapshot
        strategyState.legs = saved.legs.map(l => ({ ...l }));
        renderLegs();
        updateStrategyChart();
        modal?.classList.remove('show');
    };

    window.deleteSavedStrategy = (index) => {
        strategyState.savedStrategies.splice(index, 1);
        updateCompareBtn();
        const metrics = renderCompareTable();
        if (strategyState.savedStrategies.length >= 1) renderCompareCharts(metrics);
    };
}
