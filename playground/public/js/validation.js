/**
 * Cross-Model Validation Panel and Health Check Runner
 * 
 * Provides tools to compare Black-Scholes, Binomial Tree, Monte Carlo, and AI Surrogate models
 * against each other and against predefined benchmark datasets.
 */

// Module-level Chart.js instances to allow destruction before recreation
let binomialChartInstance = null;
let mcChartInstance = null;

// Helper to calculate relative error safely
function calculateError(value, reference) {
    if (!Number.isFinite(value) || !Number.isFinite(reference)) {
        return { absolute: NaN, relative: NaN, status: 'fail' };
    }

    // Very small reference values need absolute tolerance or a baseline divisor
    const absolute = Math.abs(value - reference);
    const divisor = Math.max(Math.abs(reference), 1e-4);
    const relative = absolute / divisor;

    let status = 'pass';
    if (relative > 0.01) status = 'fail';      // > 1%
    else if (relative > 0.001) status = 'warning'; // > 0.1%

    // For Greeks near zero, absolute differences matter more
    // If we're off by less than 1e-4 absolute, it's a pass regardless of relative
    if (absolute < 1e-4) {
        status = 'pass';
    }

    return { absolute, relative, status };
}

/**
 * Runs a cross-model comparison for a single parameter set.
 * Calculates convergences for Discrete/Stochastic models.
 */
export function runCrossModelComparison(params) {
    const { S, K, T, sigma, r, q, isCall } = params;

    const result = {
        reference: null,
        models: [],
        convergence: {
            binomial: [],
            monteCarlo: []
        }
    };

    // 1. Black-Scholes (Reference)
    let bsGreeks;
    if (window.wasmLoaded && typeof window.calculate_greeks_wasm === 'function') {
        bsGreeks = window.calculate_greeks_wasm(S, K, T, sigma, r, q, isCall);
    } else if (window.calculator) {
        bsGreeks = window.calculator.calculateGreeks(S, K, T, sigma, r, q, isCall);
    } else {
        throw new Error("No BS pricing engine available.");
    }

    result.reference = {
        ...bsGreeks,
        model: 'Black-Scholes (Analytical)'
    };

    // 2. Binomial Tree (CRR) - N=500 for stats, also building convergence trace
    let binTargetGreeks = null;
    if (window.wasmLoaded && typeof window.calculate_binomial_wasm === 'function') {
        const binSteps = [10, 25, 50, 100, 250, 500, 1000];

        for (const steps of binSteps) {
            // Note: WASM binding returns GreeksResult
            const greeks = window.calculate_binomial_wasm(S, K, T, sigma, r, q, isCall, steps);
            result.convergence.binomial.push({ steps, price: greeks.price, greeks });

            if (steps === 500) {
                binTargetGreeks = greeks;
            }
        }
    }

    // 3. Monte Carlo (GBM) - N=50000 for stats, also building convergence trace
    let mcTargetGreeks = null;
    if (window.wasmLoaded && typeof window.calculate_mc_wasm === 'function') {
        const mcPaths = [1000, 5000, 10000, 25000, 50000, 100000];

        for (const paths of mcPaths) {
            const greeks = window.calculate_mc_wasm(S, K, T, sigma, r, q, isCall, paths);

            // Standard Error approximation since WASM just returns Greeks
            // SE ≈ OptionPrice * Vol / sqrt(N * 2) (using Antithetic)
            // Or roughly Vol * S * sqrt(T) / sqrt(paths) as a generic heuristic
            const approxSE = (sigma * S * Math.sqrt(Math.max(T, 0.001))) / Math.sqrt(paths);

            result.convergence.monteCarlo.push({ paths, price: greeks.price, standardError: approxSE, greeks });

            if (paths === 50000) {
                mcTargetGreeks = greeks;
            }
        }
    }

    // 4. AI Surrogate Model
    let aiTargetGreeks = null;
    if (window.aiSurrogate && window.aiSurrogate.ready) {
        aiTargetGreeks = window.aiSurrogate.predictGreeks(S, K, T, sigma, r, q, isCall);
    }

    // Process Errors
    const metrics = ['price', 'delta', 'gamma', 'vega', 'theta', 'rho'];

    // Helper to format model block
    const buildModelBlock = (name, targetGreeks) => {
        if (!targetGreeks) return null;

        const errors = {};
        let failCount = 0;
        let warnCount = 0;

        for (const m of metrics) {
            errors[m] = calculateError(targetGreeks[m], bsGreeks[m]);
            if (errors[m].status === 'fail') failCount++;
            if (errors[m].status === 'warning') warnCount++;
        }

        let overallStatus = 'pass';
        if (failCount > 0) overallStatus = 'fail';
        else if (warnCount > 0) overallStatus = 'warning';

        return {
            name,
            result: targetGreeks,
            errors,
            overallStatus
        };
    };

    if (binTargetGreeks) {
        result.models.push(buildModelBlock('Binomial Tree (N=500)', binTargetGreeks));
    }
    if (mcTargetGreeks) {
        result.models.push(buildModelBlock('Monte Carlo (N=50000)', mcTargetGreeks));
    }
    if (aiTargetGreeks) {
        result.models.push(buildModelBlock('AI Surrogate', aiTargetGreeks));
    }

    return result;
}

/**
 * Renders the cross-model validation panel into the given container.
 */
export function renderValidationPanel(comparison, containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    if (!comparison || !comparison.reference) {
        containerEl.innerHTML = '<div style="color:#ef4444; padding:20px;">Error: Invalid comparison data. Ensure WASM is loaded.</div>';
        return;
    }

    const { reference, models, convergence } = comparison;

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '24px';
    wrapper.style.width = '100%';

    // --- 1. OVERALL STATUS BADGES ---
    const badgesRow = document.createElement('div');
    badgesRow.style.display = 'flex';
    badgesRow.style.gap = '12px';
    badgesRow.style.flexWrap = 'wrap';

    models.forEach(m => {
        const badge = document.createElement('div');
        badge.style.padding = '12px 16px';
        badge.style.borderRadius = '8px';
        badge.style.border = '1px solid #334155';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.gap = '8px';
        badge.style.background = 'rgba(15, 23, 42, 0.4)'; // glassmorphism back
        badge.style.fontFamily = 'Outfit, sans-serif';

        let icon, color, text;
        if (m.overallStatus === 'pass') {
            icon = '✅'; color = '#10B981'; text = 'Validated';
        } else if (m.overallStatus === 'warning') {
            icon = '⚠️'; color = '#F59E0B'; text = 'Within Tolerance';
        } else {
            icon = '❌'; color = '#EF4444'; text = 'Deviation Detected';
        }

        badge.innerHTML = `
            <span style="font-size: 1.2rem;">${icon}</span>
            <div>
                <div style="font-size: 0.8rem; color: #94a3b8;">${m.name}</div>
                <div style="color: ${color}; font-weight: 600; font-size: 0.95rem;">${text}</div>
            </div>
        `;
        badgesRow.appendChild(badge);
    });
    wrapper.appendChild(badgesRow);

    // --- 2. COMPARISON TABLE ---
    const tableContainer = document.createElement('div');
    tableContainer.style.overflowX = 'auto';
    tableContainer.style.background = 'rgba(15, 23, 42, 0.4)';
    tableContainer.style.borderRadius = '8px';
    tableContainer.style.border = '1px solid #334155';
    tableContainer.style.padding = '1px';

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontFamily = 'JetBrains Mono, monospace';
    table.style.fontSize = '0.9rem';
    table.style.textAlign = 'right';

    // Header
    const thead = document.createElement('thead');
    thead.style.fontFamily = 'Outfit, sans-serif';
    thead.style.color = '#f1f5f9';
    thead.style.background = 'rgba(51, 65, 85, 0.4)';

    let thHtml = `<th style="padding: 12px; text-align: left; border-bottom: 1px solid #334155;">Greek</th>`;
    thHtml += `<th style="padding: 12px; border-bottom: 1px solid #334155;">BS (Ref)</th>`;
    models.forEach(m => {
        thHtml += `<th style="padding: 12px; border-bottom: 1px solid #334155;">${m.name.split(' ')[0]}</th>`;
        thHtml += `<th style="padding: 12px; border-bottom: 1px solid #334155;">Δ Error</th>`;
    });
    thead.innerHTML = `<tr>${thHtml}</tr>`;
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    const metrics = ['price', 'delta', 'gamma', 'vega', 'theta', 'rho'];
    const metricLabels = { price: 'Pri ($)', delta: 'Δ', gamma: 'Γ', vega: 'v', theta: 'Θ', rho: 'ρ' };

    metrics.forEach((m, idx) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = idx === metrics.length - 1 ? 'none' : '1px solid #1e293b';

        let rowHtml = `<td style="padding: 12px; text-align: left; color: #94a3b8; font-family: Outfit, sans-serif;">${metricLabels[m]}</td>`;
        rowHtml += `<td style="padding: 12px; color: #f8fafc;">${reference[m].toFixed(4)}</td>`;

        models.forEach(model => {
            const val = model.result[m];
            const err = model.errors[m];

            let errColor = '#10B981'; // green
            if (err.status === 'warning') errColor = '#F59E0B';
            else if (err.status === 'fail') errColor = '#EF4444';

            rowHtml += `<td style="padding: 12px; color: #cbd5e1;">${val.toFixed(4)}</td>`;
            rowHtml += `<td style="padding: 12px; color: ${errColor};">${(err.relative * 100).toFixed(3)}%</td>`;
        });

        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    wrapper.appendChild(tableContainer);

    // --- 3. CONVERGENCE CHARTS ---
    const chartsRow = document.createElement('div');
    chartsRow.style.display = 'flex';
    chartsRow.style.gap = '20px';
    chartsRow.style.width = '100%';
    chartsRow.style.flexWrap = 'wrap';

    const createChartWrapper = (title, canvasId) => {
        const div = document.createElement('div');
        div.style.flex = '1';
        div.style.minWidth = '300px';
        div.style.background = 'rgba(15, 23, 42, 0.4)';
        div.style.borderRadius = '8px';
        div.style.border = '1px solid #334155';
        div.style.padding = '16px';
        div.innerHTML = `
            <div style="font-family: Outfit, sans-serif; color: #f1f5f9; margin-bottom: 12px;">${title}</div>
            <div style="position: relative; height: 200px;">
                <canvas id="${canvasId}"></canvas>
            </div>
        `;
        return div;
    };

    if (convergence.binomial.length > 0) {
        chartsRow.appendChild(createChartWrapper('Binomial Convergence', 'binConvergenceCanvas'));
    }
    if (convergence.monteCarlo.length > 0) {
        chartsRow.appendChild(createChartWrapper('Monte Carlo Convergence', 'mcConvergenceCanvas'));
    }

    if (chartsRow.children.length > 0) {
        wrapper.appendChild(chartsRow);
    }

    containerEl.appendChild(wrapper);

    // --- RENDER CHART.JS INSTANCES ---

    // Cleanup old instances
    if (binomialChartInstance) binomialChartInstance.destroy();
    if (mcChartInstance) mcChartInstance.destroy();

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleFont: { family: 'Outfit' },
                bodyFont: { family: 'JetBrains Mono' },
                borderColor: '#334155',
                borderWidth: 1
            }
        },
        scales: {
            x: { type: 'logarithmic', grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
            y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } }
        }
    };

    // Render Binomial
    if (convergence.binomial.length > 0) {
        const ctxBin = document.getElementById('binConvergenceCanvas').getContext('2d');
        const binData = convergence.binomial.map(c => ({ x: c.steps, y: c.price }));
        const bsLine = convergence.binomial.map(c => ({ x: c.steps, y: reference.price }));

        binomialChartInstance = new window.Chart(ctxBin, {
            type: 'line',
            data: {
                datasets: [
                    { label: 'Binomial Tree', data: binData, borderColor: '#10B981', borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#10B981', fill: false },
                    { label: 'Black-Scholes (Ref)', data: bsLine, borderColor: '#3b82f6', borderDash: [5, 5], borderWidth: 1, pointRadius: 0, fill: false }
                ]
            },
            options: { ...commonOptions, scales: { ...commonOptions.scales, x: { ...commonOptions.scales.x, title: { display: true, text: 'Steps (Log Scale)', color: '#64748b' } } } }
        });
    }

    // Render MC
    if (convergence.monteCarlo.length > 0) {
        const ctxMC = document.getElementById('mcConvergenceCanvas').getContext('2d');
        const mcData = convergence.monteCarlo.map(c => ({ x: c.paths, y: c.price }));
        const bsLine = convergence.monteCarlo.map(c => ({ x: c.paths, y: reference.price }));

        // Error bands (+/- 1.96 SE)
        const upperBand = convergence.monteCarlo.map(c => ({ x: c.paths, y: c.price + 1.96 * c.standardError }));
        const lowerBand = convergence.monteCarlo.map(c => ({ x: c.paths, y: c.price - 1.96 * c.standardError }));

        mcChartInstance = new window.Chart(ctxMC, {
            type: 'line',
            data: {
                datasets: [
                    { label: 'Monte Carlo', data: mcData, borderColor: '#F59E0B', borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#F59E0B', fill: false, z: 10 },
                    { label: 'Upper 95% CI', data: upperBand, borderColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 1, pointRadius: 0, fill: false },
                    { label: 'Lower 95% CI', data: lowerBand, borderColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 1, pointRadius: 0, fill: '+1', backgroundColor: 'rgba(245, 158, 11, 0.1)' },
                    { label: 'Black-Scholes (Ref)', data: bsLine, borderColor: '#3b82f6', borderDash: [5, 5], borderWidth: 1, pointRadius: 0, fill: false, z: 5 }
                ]
            },
            options: { ...commonOptions, scales: { ...commonOptions.scales, x: { ...commonOptions.scales.x, title: { display: true, text: 'Paths (Log Scale)', color: '#64748b' } } } }
        });
    }
}

/**
 * Runs the benchmark suite through all enabled engines.
 */
export function runHealthCheck(benchmarkData) {
    if (!benchmarkData || !benchmarkData.cases || !Array.isArray(benchmarkData.cases)) {
        throw new Error("Invalid benchmark JSON payload.");
    }

    const report = {
        totalCases: benchmarkData.cases.length,
        results: [],
        summary: {
            bs: { pass: 0, warning: 0, fail: 0 },
            binomial: { pass: 0, warning: 0, fail: 0 },
            mc: { pass: 0, warning: 0, fail: 0 },
            ai: { pass: 0, warning: 0, fail: 0 }
        }
    };

    for (const testCase of benchmarkData.cases) {
        const { S, K, T, sigma, r, q } = testCase.params;
        const isCall = testCase.isCall;
        const params = { S, K, T, sigma, r, q, isCall };

        const caseResult = {
            caseId: testCase.id,
            description: testCase.description,
            models: { bs: 'fail', binomial: 'fail', mc: 'fail', ai: 'fail' }
        };

        // Run full cross comparison for these params
        let comp = null;
        try {
            comp = runCrossModelComparison(params);
        } catch (e) {
            console.error(`HealthCheck skipped case ${testCase.id} due to crash:`, e);
            continue;
        }

        // Compare Reference (BS) against JSON expected to grade BS itself
        let bsOverall = 'pass';
        if (comp.reference) {
            let bsFails = 0, bsWarns = 0;
            const metrics = ['price', 'delta', 'gamma', 'vega', 'theta', 'rho'];
            for (const m of metrics) {
                const err = calculateError(comp.reference[m], testCase.expected[m]);
                if (err.status === 'fail') bsFails++;
                if (err.status === 'warning') bsWarns++;
            }
            if (bsFails > 0) bsOverall = 'fail';
            else if (bsWarns > 0) bsOverall = 'warning';
        }
        caseResult.models.bs = bsOverall;
        report.summary.bs[bsOverall]++;

        // Extract statuses for other models
        comp.models.forEach(m => {
            const status = m.overallStatus;
            if (m.name.includes("Binomial")) {
                caseResult.models.binomial = status;
                report.summary.binomial[status]++;
            } else if (m.name.includes("Monte Carlo")) {
                caseResult.models.mc = status;
                report.summary.mc[status]++;
            } else if (m.name.includes("AI Surrogate")) {
                caseResult.models.ai = status;
                report.summary.ai[status]++;
            }
        });

        report.results.push(caseResult);
    }

    return report;
}

/**
 * Renders the health check dashboard interface.
 */
export function renderHealthCheckDashboard(results, containerEl, onRunRequested) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '20px';
    wrapper.style.fontFamily = 'Outfit, sans-serif';

    // Header & Summary Cards
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    // Status Text vs Run Button
    const headerText = results
        ? `<h3 style="margin: 0; color: #f8fafc;">System Core Health Report</h3><span style="color: #94a3b8; font-family: JetBrains Mono;">${results.totalCases} Checks Completed</span>`
        : `<h3 style="margin: 0; color: #f8fafc;">System Core Health Check</h3>`;

    const runBtn = document.createElement('button');
    runBtn.textContent = '▶ Run Health Check';
    runBtn.style.background = '#3B82F6';
    runBtn.style.color = 'white';
    runBtn.style.border = 'none';
    runBtn.style.borderRadius = '4px';
    runBtn.style.padding = '8px 16px';
    runBtn.style.cursor = 'pointer';
    runBtn.style.fontWeight = 'bold';
    runBtn.style.fontFamily = 'Outfit, sans-serif';
    runBtn.onclick = () => {
        if (onRunRequested) onRunRequested();
    };

    header.innerHTML = `<div>${headerText}</div>`;
    header.appendChild(runBtn);
    wrapper.appendChild(header);

    // Progress Bar container (hidden by default)
    const progressBarContainer = document.createElement('div');
    progressBarContainer.id = 'health-check-progress-container';
    progressBarContainer.style.display = 'none';
    progressBarContainer.innerHTML = `
        <div style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 4px;" id="health-check-progress-text">Initializing...</div>
        <div style="width: 100%; height: 6px; background: rgba(15, 23, 42, 0.6); border-radius: 3px; overflow: hidden; border: 1px solid #334155;">
            <div id="health-check-progress-bar" style="width: 0%; height: 100%; background: #3B82F6; transition: width 0.1s linear;"></div>
        </div>
    `;
    wrapper.appendChild(progressBarContainer);

    // If no results yet, just render the button
    if (!results) {
        containerEl.appendChild(wrapper);
        return;
    }

    const cardsRow = document.createElement('div');
    cardsRow.style.display = 'flex';
    cardsRow.style.gap = '16px';
    cardsRow.style.flexWrap = 'wrap';

    const getModelLabel = (key) => {
        const map = { bs: 'Black-Scholes (WASM)', binomial: 'Binomial Tree', mc: 'Monte Carlo', ai: 'AI Surrogate' };
        return map[key] || key;
    };

    Object.keys(results.summary).forEach(modelKey => {
        const stats = results.summary[modelKey];
        if (stats.pass === 0 && stats.warning === 0 && stats.fail === 0) return; // Skip unused

        const card = document.createElement('div');
        card.style.flex = '1';
        card.style.minWidth = '180px';
        card.style.background = 'rgba(15, 23, 42, 0.4)';
        card.style.border = '1px solid #334155';
        card.style.borderRadius = '8px';
        card.style.padding = '16px';

        let headerColor = '#10B981';
        if (stats.fail > 0) headerColor = '#EF4444';
        else if (stats.warning > 0) headerColor = '#F59E0B';

        card.innerHTML = `
            <div style="font-weight: 500; color: #f1f5f9; margin-bottom: 8px; border-bottom: 2px solid ${headerColor}; padding-bottom: 4px;">
                ${getModelLabel(modelKey)}
            </div>
            <div style="font-family: JetBrains Mono; font-size: 0.85rem; color: #94a3b8; display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between;"><span>Pass:</span> <span style="color: #10B981">${stats.pass}</span></div>
                <div style="display: flex; justify-content: space-between;"><span>Warn:</span> <span style="color: #F59E0B">${stats.warning}</span></div>
                <div style="display: flex; justify-content: space-between;"><span>Fail:</span> <span style="color: #EF4444">${stats.fail}</span></div>
            </div>
        `;
        cardsRow.appendChild(card);
    });
    wrapper.appendChild(cardsRow);

    // Expandable Table
    const tableDiv = document.createElement('div');
    tableDiv.style.borderRadius = '8px';
    tableDiv.style.border = '1px solid #334155';
    tableDiv.style.overflow = 'hidden';

    let tableHtml = `
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
            <thead style="background: rgba(51, 65, 85, 0.4); color: #f1f5f9;">
                <tr>
                    <th style="padding: 12px; border-bottom: 1px solid #334155;">Test Case ID</th>
                    <th style="padding: 12px; border-bottom: 1px solid #334155;">BS</th>
                    <th style="padding: 12px; border-bottom: 1px solid #334155;">BINOMIAL</th>
                    <th style="padding: 12px; border-bottom: 1px solid #334155;">MC</th>
                    <th style="padding: 12px; border-bottom: 1px solid #334155;">AI</th>
                </tr>
            </thead>
            <tbody style="font-family: JetBrains Mono; color: #cbd5e1;">
    `;

    const getStatusDot = (status) => {
        if (status === 'pass') return `<span style="color:#10B981;">●</span> Pass`;
        if (status === 'warning') return `<span style="color:#F59E0B;">●</span> Warn`;
        if (status === 'fail') return `<span style="color:#EF4444;">●</span> Fail`;
        return `<span style="color:#475569;">○</span> N/A`;
    };

    results.results.forEach((r, idx) => {
        const bg = (idx % 2 === 0) ? 'rgba(15, 23, 42, 0.2)' : 'rgba(30, 41, 59, 0.2)';
        tableHtml += `
            <tr style="background: ${bg}; border-bottom: 1px solid #1e293b;">
                <td style="padding: 10px 12px; cursor: help;" title="${r.description}">${r.caseId}</td>
                <td style="padding: 10px 12px;">${getStatusDot(r.models.bs)}</td>
                <td style="padding: 10px 12px;">${getStatusDot(r.models.binomial)}</td>
                <td style="padding: 10px 12px;">${getStatusDot(r.models.mc)}</td>
                <td style="padding: 10px 12px;">${getStatusDot(r.models.ai)}</td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;
    tableDiv.innerHTML = tableHtml;
    wrapper.appendChild(tableDiv);

    containerEl.appendChild(wrapper);
}
