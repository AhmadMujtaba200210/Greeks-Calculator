/**
 * Monte Carlo & Binomial Diagnostics Module
 * Computes convergence profiles, standard errors, and confidence intervals
 * without freezing the main browser thread.
 */

/**
 * Halts the async event loop to allow the DOM to repaint.
 */
const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Computes enhanced convergence data for both Binomial and Monte Carlo engines.
 * 
 * @param {Object} params - { S, K, T, sigma, r, q, isCall }
 * @param {Function} onProgress - Callback(percent, message) strictly for UI updates.
 * @returns {Promise<Object>} The compiled diagnostics payload.
 */
export async function computeConvergenceDiagnostics(params, onProgress = () => { }) {
    const { S, K, T, sigma, r, q, isCall } = params;

    onProgress(0, "Calculating Exact Analytical Reference...");
    await yieldToBrowser();

    // 1. BS REFERENCE (Analytical Ground Truth)
    let bsPrice = 0;
    if (window.calculator && typeof window.calculator.calculatePrice === 'function') {
        bsPrice = window.calculator.calculatePrice(S, K, T, sigma, r, q, isCall);
    } else {
        throw new Error("Cannot run diagnostics: window.calculator.calculatePrice is missing.");
    }

    // Prepare timing data
    const timing = { binomial: {}, monteCarlo: {} };

    // 2. BINOMIAL CONVERGENCE
    const binomialSteps = [10, 25, 50, 100, 200, 300, 500, 750, 1000];
    const binomialData = [];

    if (window.wasm_bindings && typeof window.wasm_bindings.calculate_binomial_wasm === 'function') {
        for (let i = 0; i < binomialSteps.length; i++) {
            const N = binomialSteps[i];
            onProgress(10 + (40 * (i / binomialSteps.length)), `Binomial Tree: N=${N}...`);
            await yieldToBrowser();

            const t0 = performance.now();
            const res = window.wasm_bindings.calculate_binomial_wasm(S, K, T, sigma, r, q, isCall, N);
            timing.binomial[N] = performance.now() - t0;

            const price = res.price;
            const absError = Math.abs(price - bsPrice);
            const relError = Math.max(0, absError / Math.max(1e-4, Math.abs(bsPrice)));

            binomialData.push({
                steps: N,
                price: price,
                absError: absError,
                relError: relError,
                isEvenStep: N % 2 === 0
            });
        }
    }

    // 3. MONTE CARLO CONVERGENCE
    // To estimate variance since WASM backend doesn't return payoff arrays,
    // we must manually invoke it 5 independent times per path count.
    const mcPaths = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
    const mcData = [];
    const NUM_RUNS = 5;

    if (window.wasm_bindings && typeof window.wasm_bindings.calculate_mc_wasm === 'function') {
        for (let i = 0; i < mcPaths.length; i++) {
            const P = mcPaths[i];
            onProgress(50 + (50 * (i / mcPaths.length)), `Monte Carlo: ${P.toLocaleString()} paths...`);
            await yieldToBrowser();

            const prices = [];
            let sumPrices = 0;
            const t0 = performance.now();

            for (let j = 0; j < NUM_RUNS; j++) {
                // To force independent RNG runs mathematically, we'd theoretically re-seed on each call natively
                // But invoking calculate_mc_wasm should inherently draw new RNs inside Rust unless seed is hardcoded.
                const res = window.wasm_bindings.calculate_mc_wasm(S, K, T, sigma, r, q, isCall, P);
                prices.push(res.price);
                sumPrices += res.price;

                // Allow UI to breathe if paths are huge (e.g. 100,000 runs)
                if (P >= 50000) await yieldToBrowser();
            }
            timing.monteCarlo[P] = performance.now() - t0;

            const meanPrice = sumPrices / NUM_RUNS;

            // Standard Deviation across 5 runs
            let sumSqDiff = 0;
            for (let p of prices) sumSqDiff += Math.pow(p - meanPrice, 2);
            // Sample standard deviation (N-1)
            const stdDev = Math.sqrt(sumSqDiff / (NUM_RUNS - 1));

            // Standard Error = sigma / sqrt(n)
            // But note: variance across 5 *mean* runs isn't standard textbook SE.
            // The true variance of the estimator is stdDev. Let's use it as empirical SE.
            let estimatedSE = stdDev;

            // Theoretically if we assume zero variance, default to a tiny epsilon to prevent 0 width bands
            if (estimatedSE === 0) estimatedSE = 1e-4;

            // 95% Confidence Interval using standard Z-score (1.96)
            const zScore = 1.96;
            const ci95 = [meanPrice - zScore * estimatedSE, meanPrice + zScore * estimatedSE];

            const absError = Math.abs(meanPrice - bsPrice);
            const relError = Math.max(0, absError / Math.max(1e-4, Math.abs(bsPrice)));

            mcData.push({
                paths: P,
                prices: prices,
                meanPrice: meanPrice,
                stdDev: stdDev,
                estimatedSE: estimatedSE,
                ci95: ci95,
                absError: absError,
                relError: relError
            });
        }
    }

    onProgress(100, "Diagnostics Complete");

    return {
        bsPrice,
        binomial: binomialData,
        monteCarlo: mcData,
        timing
    };
}


/**
 * Replaces the basic chart with a vastly enhanced technical view mapping error bands and log scaling.
 * 
 * @param {Object} diagnostics - Output from computeConvergenceDiagnostics
 * @param {HTMLCanvasElement} canvasEl - Target canvas to render the context on
 * @param {String} activeModel - 'binomial' or 'monteCarlo'
 * @returns {Object} Chart.js instance tracking object
 */
export function renderConvergenceChart(diagnostics, canvasEl, activeModel) {
    if (!canvasEl || !diagnostics) return null;

    // Destroy previous Chart.js bindings on exactly this canvas if present
    if (window.currentConvergenceChart) {
        window.currentConvergenceChart.destroy();
    }

    const ctx = canvasEl.getContext('2d');
    const datasets = [];
    let xLabels = [];
    let isLogScale = false;

    // --- Black-Scholes Reference Ground Truth Dataset ---
    const bsPrice = diagnostics.bsPrice;

    // Configured shared colors
    const colorBS = 'rgba(59, 130, 246, 0.8)';
    const colorLine = 'rgba(248, 250, 252, 0.9)';
    const colorBandCore = 'rgba(16, 185, 129, 0.2)'; // Green translucent
    const colorPoints = 'rgba(148, 163, 184, 0.4)';

    if (activeModel === 'binomial' && diagnostics.binomial.length > 0) {
        isLogScale = false;
        xLabels = diagnostics.binomial.map(d => d.steps);

        // Horizontal reference line
        datasets.push({
            label: 'Black-Scholes (Exact)',
            data: xLabels.map(() => bsPrice),
            borderColor: colorBS,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            order: 3
        });

        // The Binomial Zig-Zag Price Path
        datasets.push({
            label: 'Binomial CRR Price',
            data: diagnostics.binomial.map(d => d.price),
            borderColor: colorLine,
            borderWidth: 2,
            pointBackgroundColor: diagnostics.binomial.map(d => d.isEvenStep ? '#8B5CF6' : '#F59E0B'),
            pointBorderColor: '#0f172a',
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: false,
            tension: 0, // Linear tension to emphasize oscillation
            order: 2
        });

    } else if (activeModel === 'monteCarlo' && diagnostics.monteCarlo.length > 0) {
        isLogScale = true; // Log scale necessary because paths range from 500 to 100,000
        xLabels = diagnostics.monteCarlo.map(d => d.paths);

        // BS Reference
        datasets.push({
            label: 'Black-Scholes (Exact)',
            data: xLabels.map(() => bsPrice),
            borderColor: colorBS,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            order: 5
        });

        // 95% Confidence Interval Fill Bands via Chart.js
        // We use two datasets (upper and lower) and fill the space between them.
        datasets.push({
            type: 'line',
            label: '95% CI Upper',
            data: diagnostics.monteCarlo.map(d => d.ci95[1]),
            borderColor: 'transparent',
            backgroundColor: colorBandCore,
            pointRadius: 0,
            fill: '+1', // Fill down to the next dataset (Lower bound)
            order: 4
        });
        datasets.push({
            type: 'line',
            label: '95% CI Lower',
            data: diagnostics.monteCarlo.map(d => d.ci95[0]),
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0,
            fill: false,
            order: 4
        });

        // Independent Run Scatter Points (the raw noise)
        const scatterData = [];
        diagnostics.monteCarlo.forEach(d => {
            d.prices.forEach(p => {
                scatterData.push({ x: d.paths, y: p });
            });
        });

        datasets.push({
            type: 'scatter',
            label: 'Raw Run Output',
            data: scatterData,
            backgroundColor: colorPoints,
            pointRadius: 3,
            borderWidth: 0,
            order: 2
        });

        // Mean Path Line
        datasets.push({
            type: 'line',
            label: 'MC Mean Price',
            data: diagnostics.monteCarlo.map(d => ({ x: d.paths, y: d.meanPrice })),
            borderColor: colorLine,
            borderWidth: 2,
            pointBackgroundColor: colorLine,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: false,
            order: 1
        });
    }

    if (datasets.length === 0) return null;

    const chartConfig = {
        type: 'line',
        data: {
            labels: xLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#cbd5e1', font: { family: 'Outfit', size: 12 } },
                    filter: (item) => !item.text.includes('Lower') // Hide the lower CI boundary label from legend
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    titleFont: { family: 'Outfit', size: 14 },
                    bodyFont: { family: 'JetBrains Mono', size: 12 },
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Lower')) return null;
                            const val = typeof context.raw === 'object' ? context.raw.y : context.raw;
                            return `${context.dataset.label}: $${val.toFixed(4)}`;
                        }
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    type: isLogScale ? 'logarithmic' : 'linear',
                    title: {
                        display: true,
                        text: isLogScale ? 'Paths Simulated (Log Scale)' : 'Tree Steps [N]',
                        color: '#94a3b8',
                        font: { family: 'Outfit', size: 13 }
                    },
                    grid: { color: 'rgba(51, 65, 85, 0.3)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'JetBrains Mono', size: 11 },
                        callback: function (v) { return v.toLocaleString(); }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Estimated Option Price ($)',
                        color: '#94a3b8',
                        font: { family: 'Outfit', size: 13 }
                    },
                    grid: { color: 'rgba(51, 65, 85, 0.3)' },
                    ticks: { color: '#cbd5e1', font: { family: 'JetBrains Mono', size: 12 } }
                }
            }
        }
    };

    const chartInstance = new window.Chart(ctx, chartConfig);
    window.currentConvergenceChart = chartInstance;
    return chartInstance;
}


/**
 * Renders the numerical quality summarization panel for Monte Carlo output.
 * 
 * @param {Object} diagnostics - Output from computeConvergenceDiagnostics
 * @param {HTMLElement} containerEl - Container to append the HTML string into
 */
export function renderMCQualityPanel(diagnostics, containerEl) {
    if (!containerEl || !diagnostics.monteCarlo || diagnostics.monteCarlo.length === 0) return;

    // Extract the very last node from the 100,000 parameter set
    const finalRun = diagnostics.monteCarlo[diagnostics.monteCarlo.length - 1];

    // Extrapolations
    const relPrec = finalRun.estimatedSE / finalRun.meanPrice;

    // Standard error drops proportionally to 1/sqrt(N).
    // If we want relative precision of 0.1% (0.001):
    // target_SE = meanPrice * 0.001
    // target_N = paths * (current_SE / target_SE)^2
    const targetPrec = 0.001;
    const targetSE = finalRun.meanPrice * targetPrec;
    let requiredPathsFor01Pct = Math.round(finalRun.paths * Math.pow(finalRun.estimatedSE / targetSE, 2));

    // Dynamic text colors based on limits
    let colorTone = '#EF4444'; // Red
    let statusMsg = "High Variance";
    if (relPrec <= 0.005) { colorTone = '#10B981'; statusMsg = "High Precision"; }
    else if (relPrec <= 0.02) { colorTone = '#F59E0B'; statusMsg = "Moderate Variance"; }

    const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }).format(val);
    const formatPct = (val) => new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 }).format(val);

    const html = `
        <div style="font-family: 'Outfit', sans-serif; background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(51, 65, 85, 0.5); padding: 16px; border-radius: 8px;">
            
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(51, 65, 85, 0.5); padding-bottom: 8px; margin-bottom: 12px;">
                <span style="font-weight: 500; font-size: 1.1rem; color: #f8fafc;">Monte Carlo Variance Checks</span>
                <span style="background: ${colorTone}30; color: ${colorTone}; border: 1px solid ${colorTone}; padding: 2px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">${statusMsg}</span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 0.9rem;">
                <!-- left col -->
                <div>
                    <div style="color: #94a3b8; font-size: 0.8rem; margin-bottom: 2px;">Standard Error (@ ${finalRun.paths.toLocaleString()})</div>
                    <div style="font-family: 'JetBrains Mono', monospace; color: #f1f5f9;">± ${formatMoney(finalRun.estimatedSE)}</div>
                    
                    <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 12px; margin-bottom: 2px;">95% Confidence Interval</div>
                    <div style="font-family: 'JetBrains Mono', monospace; color: ${colorTone};">[${formatMoney(finalRun.ci95[0])}, ${formatMoney(finalRun.ci95[1])}]</div>
                </div>

                <!-- right col -->
                <div>
                     <div style="color: #94a3b8; font-size: 0.8rem; margin-bottom: 2px;">Relative Pricing Precision</div>
                     <div style="font-family: 'JetBrains Mono', monospace; color: #f1f5f9; font-weight: 600;">${formatPct(relPrec)} <span style="font-size:0.75rem; font-weight:normal; color:#64748b;">margin</span></div>
                     
                     <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 12px; margin-bottom: 2px;">Suggested Paths for &lt;0.1% Var</div>
                     <div style="font-family: 'JetBrains Mono', monospace; color: #a855f7;">~${requiredPathsFor01Pct.toLocaleString()}</div>
                </div>
            </div>

            <div style="margin-top: 16px; font-size: 0.75rem; color: #64748b; font-style: italic; text-align: right;">
                *Standard Error computed observationally via independent trajectory subsets. 
            </div>
        </div>
    `;

    containerEl.innerHTML = html;
}
