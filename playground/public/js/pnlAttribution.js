/**
 * PnL Attribution Module
 * Decomposes option strategy Profit & Loss into first-order and second-order Greek components.
 */

// Module-level Chart.js instance for the waterfall chart
let waterfallChartInstance = null;

// Helper to get raw BS calculations (using existing JS fallback or WASM if integrated in strategy.js)
// But to ensure compatibility with strategy.js structures, we invoke `window.calculator.calculateGreeks` and `calculatePrice`
function getImpliedGreeks(S, K, T, sigma, r, q, isCall) {
    if (window.calculator && typeof window.calculator.calculateGreeks === 'function') {
        return window.calculator.calculateGreeks(S, K, T, sigma, r, q, isCall);
    }
    // Deep fallback if calculator isn't loaded yet
    return { price: 0, delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 };
}

function getImpliedPrice(S, K, T, sigma, r, q, isCall) {
    if (window.calculator && typeof window.calculator.calculatePrice === 'function') {
        return window.calculator.calculatePrice(S, K, T, sigma, r, q, isCall);
    }
    const greeks = getImpliedGreeks(S, K, T, sigma, r, q, isCall);
    return greeks.price;
}

/**
 * Computes PnL attribution for a portfolio of options.
 * 
 * @param {Array} legs - Array of { type, action, strike, quantity }
 * @param {Object} entryState - { spot, volatility, tYears, rate, dividend }
 * @param {Object} scenarioState - { spotChangePct, ivChangePts, daysElapsed }
 */
export function computePnLAttribution(legs, entryState, scenarioState) {
    // 1. Calculate Portfolio Entry Greeks
    let pDelta = 0, pGamma = 0, pVega = 0, pTheta = 0, pRho = 0;
    let entryTotalCost = 0;

    for (const leg of legs) {
        if (leg.quantity <= 0) continue;
        const direction = leg.action === 'buy' ? 1 : -1;
        const multiplier = leg.quantity * direction * 100; // Options are 100 share lots

        if (leg.type === 'stock') {
            const price = entryState.spot;
            pDelta += 1.0 * multiplier;
            entryTotalCost += price * multiplier;
        } else {
            const isCall = leg.type === 'call';
            const greeks = getImpliedGreeks(
                entryState.spot, leg.strike, entryState.tYears,
                entryState.volatility, entryState.rate, entryState.dividend, isCall
            );

            pDelta += greeks.delta * multiplier;
            pGamma += greeks.gamma * multiplier;
            pVega += greeks.vega * multiplier;
            pTheta += greeks.theta * multiplier;
            pRho += greeks.rho * multiplier;
            entryTotalCost += greeks.price * multiplier;
        }
    }

    const entryGreeks = { delta: pDelta, gamma: pGamma, vega: pVega, theta: pTheta, rho: pRho };

    // 2. Scenario Changes
    const deltaS = entryState.spot * (scenarioState.spotChangePct / 100);
    const deltaSigma = scenarioState.ivChangePts / 100;
    const deltaT = scenarioState.daysElapsed / 365.25; // Annualized time step
    const deltaR = 0; // No rate slider in scenario yet

    const scenarioChanges = { deltaS, deltaSigma, deltaT, deltaR };

    // 3. Greek-approximated P&L (Taylor Expansion)
    // Note: Vega is conventionally reported per 1% point change. Our math uses absolute decimal σ.
    // So if Vega is 0.20 per 1%, and ivChangePts = 5, we expect Vega PNL = 0.20 * 5 * 100 multiplier
    // Since we aggregated pVega with the *100 multiplier already, and deltaSigma is decimal (0.05).
    // The raw BS Vega is wrt absolute volatility (∂V/∂σ * 1%). The standard Black-Scholes Vega output from calculateGreeks is per 1%.
    const delta_pnl = pDelta * deltaS;
    const gamma_pnl = 0.5 * pGamma * Math.pow(deltaS, 2);
    const vega_pnl = pVega * scenarioState.ivChangePts; // pVega is already scaled for 1% moves
    const theta_pnl = pTheta * scenarioState.daysElapsed; // pTheta is already scaled per day
    const rho_pnl = pRho * (deltaR * 100); // pRho is per 1%

    const total_greek_approx = delta_pnl + gamma_pnl + vega_pnl + theta_pnl + rho_pnl;

    // 4. Full Reprice P&L
    let scenarioTotalValue = 0;
    const s_new = Math.max(0.01, entryState.spot + deltaS);
    const v_new = Math.max(0.001, entryState.volatility + deltaSigma);
    const t_new = Math.max(0.0001, entryState.tYears - deltaT); // Prevent negative time

    for (const leg of legs) {
        if (leg.quantity <= 0) continue;
        const direction = leg.action === 'buy' ? 1 : -1;
        const multiplier = leg.quantity * direction * 100;

        if (leg.type === 'stock') {
            scenarioTotalValue += s_new * multiplier;
        } else {
            const isCall = leg.type === 'call';
            const price = getImpliedPrice(s_new, leg.strike, t_new, v_new, entryState.rate, entryState.dividend, isCall);
            scenarioTotalValue += price * multiplier;
        }
    }

    const full_reprice_pnl = scenarioTotalValue - entryTotalCost;

    // 5. Cross-Greeks (Finite Difference)
    let vanna_pnl = 0, charm_pnl = 0, volga_pnl = 0;
    const dSigma = 0.01;
    const dT = 1 / 365.25;

    for (const leg of legs) {
        if (leg.quantity <= 0 || leg.type === 'stock') continue;
        const direction = leg.action === 'buy' ? 1 : -1;
        const multiplier = leg.quantity * direction * 100;
        const isCall = leg.type === 'call';

        // Base Greeks
        const base = getImpliedGreeks(entryState.spot, leg.strike, entryState.tYears, entryState.volatility, entryState.rate, entryState.dividend, isCall);

        // Bump Volatility (+1%)
        const bumpV = getImpliedGreeks(entryState.spot, leg.strike, entryState.tYears, entryState.volatility + dSigma, entryState.rate, entryState.dividend, isCall);

        // Bump Time (-1 day, moving towards expiration)
        const bumpT = getImpliedGreeks(entryState.spot, leg.strike, Math.max(0.0001, entryState.tYears - dT), entryState.volatility, entryState.rate, entryState.dividend, isCall);

        // Vanna = ∂Delta / ∂sigma ≈ (Delta_upV - Delta_base) / dSigma
        // Charm = ∂Delta / ∂T (typically time decay of delta) ≈ (Delta_upT - Delta_base) / dT
        // Volga = ∂Vega / ∂sigma ≈ (Vega_upV - Vega_base) / dSigma
        const legVanna = (bumpV.delta - base.delta) / dSigma;
        const legCharm = (bumpT.delta - base.delta) / dT;
        const legVolga = (bumpV.vega - base.vega) / dSigma; // Note: Vega is per 1%, so Volga here is rate of change of that 1% vega

        // Transform into PnL space
        // Vanna PNL = Vanna * dS * dSigma
        const legVannaPnL = legVanna * deltaS * deltaSigma * multiplier;

        // Charm PNL = Charm * dS * dT
        const legCharmPnL = legCharm * deltaS * deltaT * multiplier;

        // Volga PNL = 0.5 * Volga * dSigma^2  (But Volga here is based on 1% vega. Actual Volga PNL calculation needs care)
        // Standard expansion: 0.5 * (∂²V/∂σ²) * dσ²
        const legVolgaPnL = 0.5 * (legVolga * 100) * Math.pow(deltaSigma, 2) * multiplier; // Adjusting scaling based on standard Vega output

        vanna_pnl += legVannaPnL;
        charm_pnl += legCharmPnL;
        volga_pnl += legVolgaPnL;
    }

    const total_cross = vanna_pnl + charm_pnl + volga_pnl;

    // 6. Residuals Assessment
    let residual = full_reprice_pnl - total_greek_approx;

    // We base the quality logic on how well the advanced greeks explain the residual
    let advanced_residual = full_reprice_pnl - (total_greek_approx + total_cross);

    // Default to comparing simple residual against base PNL
    const absAbsPnL = Math.max(Math.abs(full_reprice_pnl), 1e-4); // Prevent div by 0
    let residual_pct = (Math.abs(residual) / absAbsPnL) * 100;

    // Check if Cross-Greeks dramatically improve the fit
    const advanced_residual_pct = (Math.abs(advanced_residual) / absAbsPnL) * 100;

    let quality = 'poor';
    let qualityMessage = 'Unexplained deviation >10%. Assumed large jump or non-linear regime.';

    if (residual_pct < 2.0) {
        quality = 'excellent';
        qualityMessage = '1st/2nd order Greeks perfectly trace the P&L curve.';
    } else if (residual_pct < 10.0) {
        quality = 'good';
        qualityMessage = 'Moderate residual components inside tracking tolerance.';
    } else if (advanced_residual_pct < 10.0) {
        // First order failed, but second order (cross greeks) saved it
        quality = 'good';
        qualityMessage = 'Good — Non-linear Cross-Greeks (Vanna/Volga) explain the primary gap.';
    }

    return {
        entryGreeks,
        scenarioChanges,

        delta_pnl, gamma_pnl, vega_pnl, theta_pnl, rho_pnl,
        total_greek_approx, full_reprice_pnl,

        residual, residual_pct,

        crossGreeks: {
            vanna_pnl, charm_pnl, volga_pnl, total_cross
        },
        advanced_residual, advanced_residual_pct,

        quality, qualityMessage
    };
}


/**
 * Renders the P&L Attribution analysis UI.
 */
export function renderPnLAttribution(attribution, containerEl, showCrossGreeks = false, onToggleCrossGreeks = null) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    // Define formatters
    const fmtCcy = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', signDisplay: 'always' }).format(val);
    const fmtPct = (val) => new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val / 100);
    const fmtDec = (val) => val.toFixed(2);

    const wrapper = document.createElement('div');
    wrapper.style.fontFamily = 'Outfit, sans-serif';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '20px';

    // 1. HEADER & QUALITY BADGE
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.alignItems = 'center';

    let qColor = '#EF4444', qIcon = '❌', qTitle = 'Poor Tracking';
    if (attribution.quality === 'excellent') { qColor = '#10B981'; qIcon = '🛡️'; qTitle = 'Excellent Tracking'; }
    if (attribution.quality === 'good') { qColor = '#F59E0B'; qIcon = '⚠️'; qTitle = 'Good Tracking'; }

    headerRow.innerHTML = `
        <h3 style="margin:0; color:#f8fafc; font-size:1.1rem;">P&L Attribution (Taylor Expansion)</h3>
        <div style="display:flex; align-items:center; gap:8px; border:1px solid ${qColor}; padding:6px 12px; border-radius:12px; background:rgba(0,0,0,0.2);">
            <span>${qIcon}</span>
            <div style="display:flex; flex-direction:column;">
                <span style="color:${qColor}; font-weight:600; font-size:0.85rem; line-height:1;">${qTitle}</span>
                <span style="color:#94a3b8; font-size:0.75rem;">Residual: ${fmtPct(showCrossGreeks ? attribution.advanced_residual_pct : attribution.residual_pct)}</span>
            </div>
        </div>
    `;
    wrapper.appendChild(headerRow);

    // 2. TOGGLE
    const toggleRow = document.createElement('div');
    toggleRow.style.display = 'flex';
    toggleRow.style.justifyContent = 'flex-end';

    const toggleLabel = document.createElement('label');
    toggleLabel.style.display = 'flex';
    toggleLabel.style.alignItems = 'center';
    toggleLabel.style.gap = '8px';
    toggleLabel.style.color = '#94a3b8';
    toggleLabel.style.fontSize = '0.85rem';
    toggleLabel.style.cursor = 'pointer';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = showCrossGreeks;
    checkbox.onchange = (e) => {
        if (onToggleCrossGreeks) onToggleCrossGreeks(e.target.checked);
    };

    toggleLabel.appendChild(checkbox);
    toggleLabel.appendChild(document.createTextNode('Advanced Mode (Cross-Greeks)'));
    toggleRow.appendChild(toggleLabel);
    wrapper.appendChild(toggleRow);

    // 3. TABLE AND CHART LAYOUT
    const contentRow = document.createElement('div');
    contentRow.style.display = 'flex';
    contentRow.style.gap = '20px';
    contentRow.style.flexWrap = 'wrap';

    // Build Table Rows
    const absReprice = Math.abs(attribution.full_reprice_pnl);
    const getPctStr = (val) => absReprice < 0.01 ? '0.0%' : fmtPct(Math.abs(val) / absReprice);

    const rows = [
        { name: 'Delta', val: attribution.delta_pnl, pct: getPctStr(attribution.delta_pnl), f: 'Δ · δS' },
        { name: 'Gamma', val: attribution.gamma_pnl, pct: getPctStr(attribution.gamma_pnl), f: '½Γ · (δS)²' },
        { name: 'Vega', val: attribution.vega_pnl, pct: getPctStr(attribution.vega_pnl), f: 'ν · δσ' },
        { name: 'Theta', val: attribution.theta_pnl, pct: getPctStr(attribution.theta_pnl), f: 'Θ · δt' },
        { name: 'Rho', val: attribution.rho_pnl, pct: getPctStr(attribution.rho_pnl), f: 'ρ · δr' },
    ];

    if (showCrossGreeks) {
        rows.push({ name: 'Vanna', val: attribution.crossGreeks.vanna_pnl, pct: getPctStr(attribution.crossGreeks.vanna_pnl), f: '∂Δ/∂σ · δSδσ' });
        rows.push({ name: 'Charm', val: attribution.crossGreeks.charm_pnl, pct: getPctStr(attribution.crossGreeks.charm_pnl), f: '∂Δ/∂t · δSδt' });
        rows.push({ name: 'Volga', val: attribution.crossGreeks.volga_pnl, pct: getPctStr(attribution.crossGreeks.volga_pnl), f: '½∂ν/∂σ · (δσ)²' });
    }

    const currentResidual = showCrossGreeks ? attribution.advanced_residual : attribution.residual;

    rows.push({ name: 'Residual', val: currentResidual, pct: getPctStr(currentResidual), f: 'Unexplained' });
    rows.push({ name: 'TOTAL (Reprice)', val: attribution.full_reprice_pnl, pct: '100.0%', f: 'Exact Math' });

    // Render Table
    const tableDiv = document.createElement('div');
    tableDiv.style.flex = '1';
    tableDiv.style.minWidth = '300px';
    tableDiv.style.background = 'rgba(15, 23, 42, 0.4)';
    tableDiv.style.border = '1px solid #334155';
    tableDiv.style.borderRadius = '8px';
    tableDiv.style.overflow = 'hidden';

    let tableHtml = `
        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.9rem;">
            <thead style="background:rgba(51, 65, 85, 0.4); color:#cbd5e1;">
                <tr>
                    <th style="padding:10px 12px; border-bottom:1px solid #334155;">Component</th>
                    <th style="padding:10px 12px; border-bottom:1px solid #334155; text-align:right;">P&L Impact</th>
                    <th style="padding:10px 12px; border-bottom:1px solid #334155; text-align:right;">% Tot</th>
                    <th style="padding:10px 12px; border-bottom:1px solid #334155; text-align:right;">Logic</th>
                </tr>
            </thead>
            <tbody style="font-family:JetBrains Mono, monospace;">
    `;

    rows.forEach((r, idx) => {
        const isTotal = r.name.startsWith('TOTAL');
        const color = r.val > 0 ? '#10B981' : (r.val < 0 ? '#EF4444' : '#94a3b8');
        const bg = isTotal ? 'rgba(51, 65, 85, 0.5)' : (idx % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent');
        const fontWeight = isTotal ? 'bold' : 'normal';

        tableHtml += `
            <tr style="background:${bg}; font-weight:${fontWeight};">
                <td style="padding:8px 12px; color:#f1f5f9; font-family:Outfit, sans-serif;">${r.name}</td>
                <td style="padding:8px 12px; text-align:right; color:${color};">${fmtCcy(r.val)}</td>
                <td style="padding:8px 12px; text-align:right; color:#94a3b8;">${r.pct}</td>
                <td style="padding:8px 12px; text-align:right; color:#64748b; font-size:0.8rem;">${r.f}</td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;
    tableDiv.innerHTML = tableHtml;
    contentRow.appendChild(tableDiv);

    // Container for Chart
    const chartDiv = document.createElement('div');
    chartDiv.style.flex = '1.5';
    chartDiv.style.minWidth = '400px';
    chartDiv.style.background = 'rgba(15, 23, 42, 0.4)';
    chartDiv.style.border = '1px solid #334155';
    chartDiv.style.borderRadius = '8px';
    chartDiv.style.padding = '12px';
    chartDiv.style.position = 'relative';
    chartDiv.style.minHeight = '250px';

    const canvas = document.createElement('canvas');
    canvas.id = 'pnlWaterfallCanvas';
    chartDiv.appendChild(canvas);
    contentRow.appendChild(chartDiv);

    wrapper.appendChild(contentRow);
    containerEl.appendChild(wrapper);

    // --- RENDER WATERFALL CHART ---

    if (waterfallChartInstance) {
        waterfallChartInstance.destroy();
    }

    // Prepare Custom Waterfall Data
    // Waterfall logic: each bar starts where the previous ended
    let cumulative = 0;
    const chartLabels = [];
    const chartDataBase = []; // Transparent bottom blocks for floating effect
    const chartDataVal = [];  // The actual visible blocks (height)
    const chartBgColors = [];

    // Exclude TOTAL from chart rows
    const chartRows = rows.filter(r => !r.name.startsWith('TOTAL'));

    chartRows.forEach(r => {
        chartLabels.push(r.name);

        let start = cumulative;
        cumulative += r.val;
        let end = cumulative;

        // For stacked bar charts, dataset 1 (base) is the lower of the two points
        // dataset 2 (val) is the magnitude (absolute difference)
        const low = Math.min(start, end);
        const high = Math.max(start, end);

        // Due to chart.js stacking mechanics, it's easier to use a single floating bar dataset via {x, y:[start, end]} in newer versions
        chartDataBase.push([start, end]);

        chartBgColors.push(r.val >= 0 ? '#10B981' : '#EF4444');
    });

    // Final Total Bar (anchored to 0)
    chartLabels.push("Total");
    chartDataBase.push([0, attribution.full_reprice_pnl]);
    chartBgColors.push('#3B82F6'); // Action blue for aggregate

    const ctx = document.getElementById('pnlWaterfallCanvas').getContext('2d');

    waterfallChartInstance = new window.Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'PnL Impact',
                data: chartDataBase,
                backgroundColor: chartBgColors,
                borderWidth: 1,
                borderColor: '#1e293b',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const val = ctx.raw[1] - ctx.raw[0];
                            return ` ${fmtCcy(val)}`;
                        }
                    },
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: 'Outfit' },
                    bodyFont: { family: 'JetBrains Mono' },
                    borderColor: '#334155',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(51, 65, 85, 0.3)' },
                    ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
                },
                y: {
                    grid: { color: 'rgba(51, 65, 85, 0.3)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'JetBrains Mono' },
                        callback: (val) => fmtCcy(val)
                    }
                }
            }
        }
    });
}
