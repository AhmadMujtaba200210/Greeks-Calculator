/**
 * @typedef {Object} PricingParams
 * @property {number} S - Spot price
 * @property {number} K - Strike price
 * @property {number} T - Time to maturity in years
 * @property {number} sigma - Volatility (annualized)
 * @property {number} r - Risk-free interest rate
 * @property {number} q - Dividend yield
 * @property {boolean} isCall - True for Call, False for Put
 */

/**
 * @typedef {Object} GreeksResult
 * @property {number} price
 * @property {number} delta
 * @property {number} gamma
 * @property {number} vega
 * @property {number} theta
 * @property {number} rho
 */

/**
 * Transparent wrapper around ANY options pricing function to handle mathematical 
 * edge cases gracefully (singularities, near-zero vols, negative rates, etc).
 * 
 * @param {PricingParams} params - The inputs for the option model
 * @param {function(PricingParams): GreeksResult} pricingFn - The raw pricing function callback
 * @returns {Object} { result, warnings, adjustments, isEdgeCase }
 */
export function guardedPrice(params, pricingFn) {
    const { S, K, T, sigma, r, q, isCall } = params;

    let result = null;
    let warnings = [];
    let adjustments = [];
    let isEdgeCase = false;
    let fallbackTriggered = false;

    // GUARD 1: NEAR-EXPIRY (T < 0.003)
    if (T < 1e-6) {
        isEdgeCase = true;
        warnings.push({
            severity: 'warning',
            code: 'NEAR_EXPIRY',
            message: 'Option expires immediately. Returning intrinsic value.',
            technical: `T=${T} < 1e-6. Bypassed mathematical models to avoid singular Gamma.`
        });
        adjustments.push('Bypassed model: T < 1e-6');

        const price = isCall ? Math.max(0, S - K) : Math.max(0, K - S);
        let delta = 0;
        if (isCall) {
            delta = S > K ? 1 : 0;
        } else {
            delta = K > S ? -1 : 0;
        }

        result = { price, delta, gamma: 0, vega: 0, theta: 0, rho: 0 };
        return { result, warnings, adjustments, isEdgeCase };
    }

    // GUARD 2: ZERO/NEAR-ZERO VOL (sigma < 0.001)
    if (sigma < 0.001) {
        isEdgeCase = true;
        warnings.push({
            severity: 'warning',
            code: 'ZERO_VOL',
            message: 'Volatility is near zero. Option value is strictly intrinsic.',
            technical: `sigma=${sigma} < 0.001. CDF calculation diverges. Bypassed model.`
        });
        adjustments.push('Bypassed model: sigma < 0.001');

        const fwdS = S * Math.exp(-q * T);
        const pvK = K * Math.exp(-r * T);

        let price = 0;
        let delta = 0;

        if (isCall) {
            price = Math.max(0, fwdS - pvK);
            delta = fwdS > pvK ? Math.exp(-q * T) : 0;
        } else {
            price = Math.max(0, pvK - fwdS);
            delta = pvK > fwdS ? -Math.exp(-q * T) : 0;
        }

        result = { price, delta, gamma: 0, vega: 0, theta: 0, rho: 0 };
        return { result, warnings, adjustments, isEdgeCase };
    }

    // --- FROM HERE WE CAN CALL PRICING FN ---

    // GUARD 5: EXTREME VOL
    if (sigma > 2.0) {
        isEdgeCase = true;
        warnings.push({
            severity: 'warning',
            code: 'EXTREME_VOL',
            message: 'Volatility is exceedingly high (>200%). Simulations may become unstable.',
            technical: `sigma=${sigma} > 2.0. High risk of numerical overflow in standard engines.`
        });
    }

    // GUARD 4: NEGATIVE RATES
    if (r < 0) {
        let badStep = 0;
        let badProb = 0;
        let isInvalidTree = false;

        for (const steps of [100, 500]) {
            const dt = T / steps;
            const u = Math.exp(sigma * Math.sqrt(dt));
            const d = 1 / u;
            const p = (Math.exp((r - q) * dt) - d) / (u - d);

            if (p < 0 || p > 1) {
                isInvalidTree = true;
                badStep = steps;
                badProb = p;
                break;
            }
        }

        if (isInvalidTree) {
            isEdgeCase = true;
            warnings.push({
                severity: 'warning',
                code: 'NEGATIVE_RATE',
                message: 'Negative rate may cause invalid probabilities in Binomial Tree. Consider using Black-Scholes or increasing step count.',
                technical: `r=${r}. Calculated up-probability p=${badProb.toFixed(4)} is out of [0,1] bounds for N=${badStep}.`
            });
        }
    }

    // GUARD 3: DEEP ITM/OTM check
    const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    let isDeepMoney = false;
    if (Math.abs(d1) > 8) {
        isEdgeCase = true;
        isDeepMoney = true;
        warnings.push({
            severity: 'info',
            code: 'DEEP_MONEY',
            message: `Option is deep ${isCall ? (d1 > 0 ? 'ITM' : 'OTM') : (d1 < 0 ? 'ITM' : 'OTM')}. Some Greeks are negligibly small.`,
            technical: `|d1| = ${Math.abs(d1).toFixed(2)} > 8. Truncating insignificant floating-point noise.`
        });
    }

    // Execute raw pricing function safely
    try {
        result = pricingFn(params);
    } catch (e) {
        result = { price: NaN, delta: NaN, gamma: NaN, vega: NaN, theta: NaN, rho: NaN };
    }

    // GUARD 6: INVALID OUTPUT Validate output
    const isValid = (val) => typeof val === 'number' && !isNaN(val) && isFinite(val);
    let outputValid = true;

    if (!result || !isValid(result.price) || result.price < 0 ||
        !isValid(result.delta) || !isValid(result.gamma) ||
        !isValid(result.vega) || !isValid(result.theta) || !isValid(result.rho)) {
        outputValid = false;
    }

    if (!outputValid) {
        fallbackTriggered = true;
        isEdgeCase = true;
        warnings.push({
            severity: 'critical',
            code: 'INVALID_OUTPUT',
            message: 'Primary engine produced invalid numbers. Falling back to robust JS calculator.',
            technical: `Output contained NaN, Infinity, or negative price. Using window.calculator.calculateGreeks`
        });
        adjustments.push('Triggered JS Fallback engine due to invalid output');

        if (typeof window !== 'undefined' && window.calculator && typeof window.calculator.calculateGreeks === 'function') {
            result = window.calculator.calculateGreeks(S, K, T, sigma, r, q, isCall);
        } else {
            result = { price: 0, delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 }; // Ultimate fail-safe
        }
    }

    // Apply specific adjustments to the result object

    // GUARD 1b: NEAR_EXPIRY (<0.003) Cap Gamma
    if (T > 1e-6 && T < 0.003) {
        if (!warnings.find(w => w.code === 'NEAR_EXPIRY')) {
            isEdgeCase = true;
            warnings.push({
                severity: 'warning',
                code: 'NEAR_EXPIRY',
                message: 'Option is extremely close to expiration. Gamma singularity capped.',
                technical: `1e-6 < T=${T.toFixed(5)} < 0.003. Limiting Gamma to 1.0 to prevent layout breakage.`
            });
        }
        if (result.gamma > 1.0) {
            result.gamma = 1.0;
            adjustments.push('Capped Gamma at 1.0 due to near-expiry singularity');
        }
    }

    // GUARD 3b: DEEP_MONEY cleanup (Zeros out floating-point dust)
    if (isDeepMoney && !fallbackTriggered) {
        ['delta', 'gamma', 'vega', 'theta', 'rho'].forEach(greek => {
            if (Math.abs(result[greek]) < 1e-10) {
                if (result[greek] !== 0) {
                    result[greek] = 0.0;
                    if (!adjustments.includes('Truncated near-zero Greeks to 0.0')) {
                        adjustments.push('Truncated near-zero Greeks to 0.0');
                    }
                }
            }
        });
    }

    return { result, warnings, adjustments, isEdgeCase };
}

/**
 * Renders warning banners into a specified DOM container.
 * 
 * @param {Array<Object>} warnings - Array of warning objects from guardedPrice
 * @param {HTMLElement} containerEl - The DOM element to render the banners into
 */
export function renderWarnings(warnings, containerEl) {
    if (!containerEl) return;

    // We keep existing toasts and just add new ones, or clear if no warnings?
    // Bloomberg style: toasts stack and auto-dismiss.

    if (!warnings || warnings.length === 0) {
        return;
    }

    const severityMap = {
        info: { color: 'var(--accent-blue)', icon: 'ℹ️' },
        warning: { color: 'var(--accent-amber)', icon: '⚠️' },
        critical: { color: 'var(--accent-red)', icon: '🚨' }
    };

    warnings.forEach(warning => {
        const config = severityMap[warning.severity] || severityMap.info;

        const toast = document.createElement('div');
        toast.className = 'bloomberg-toast';
        toast.style.background = 'var(--bg-panel)';
        toast.style.borderLeft = `3px solid ${config.color}`;
        toast.style.color = 'var(--text-primary)';
        toast.style.padding = '8px 12px';
        toast.style.marginBottom = '6px';
        toast.style.fontSize = '11px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '8px';
        toast.style.pointerEvents = 'auto';
        toast.style.animation = 'toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        toast.style.maxWidth = '300px';

        toast.innerHTML = `
            <span style="font-size: 14px;">${config.icon}</span>
            <div style="flex: 1;">
                <div style="font-weight: 700; text-transform: uppercase; font-size: 9px; color: ${config.color};">${warning.severity}</div>
                <div>${warning.message}</div>
            </div>
            <button style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 16px;">&times;</button>
        `;

        const closeBtn = toast.querySelector('button');
        closeBtn.onclick = () => {
            toast.style.animation = 'toastOut 0.2s ease-in forwards';
            setTimeout(() => toast.remove(), 200);
        };

        // Auto-dismiss after 5s
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'toastOut 0.2s ease-in forwards';
                setTimeout(() => toast.remove(), 200);
            }
        }, 5000);

        containerEl.appendChild(toast);
    });
}
// Add required CSS animation if not present globally
if (!document.getElementById('guarded-price-styles')) {
    const style = document.createElement('style');
    style.id = 'guarded-price-styles';
    style.textContent = `
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
    document.head.appendChild(style);
}

/**
 * Self-test routine to verify edge case guards.
 * Call this in the console to validate all logical branches.
 */
export function runSelfTest() {
    console.log("🚀 Starting Numerical Guards Self-Test");
    let passes = 0;
    let total = 0;

    const assert = (condition, msg) => {
        total++;
        if (condition) {
            console.log(`✅ PASS: ${msg}`);
            passes++;
        } else {
            console.error(`❌ FAIL: ${msg}`);
        }
    };

    const dummyPricing = () => ({ price: 1, delta: 0.5, gamma: 1.5, vega: 0.2, theta: -0.05, rho: 0.1 });
    const standardParams = { S: 100, K: 100, T: 1.0, sigma: 0.2, r: 0.05, q: 0.0, isCall: true };

    // 1. NEAR-EXPIRY < 1e-6 (Bypass)
    let res = guardedPrice({ ...standardParams, T: 1e-7 }, dummyPricing);
    assert(res.warnings[0]?.code === 'NEAR_EXPIRY', "Guard 1 (Bypass): Emits NEAR_EXPIRY warning");
    assert(res.result.gamma === 0, "Guard 1 (Bypass): Gamma is exactly 0");

    // 1b. NEAR-EXPIRY < 0.003 (Cap)
    res = guardedPrice({ ...standardParams, T: 0.002 }, dummyPricing);
    assert(res.warnings[0]?.code === 'NEAR_EXPIRY', "Guard 1 (Cap): Emits NEAR_EXPIRY warning");
    assert(res.result.gamma === 1.0, "Guard 1 (Cap): Gamma is capped at 1.0 (dummy returns 1.5)");

    // 2. ZERO VOL
    res = guardedPrice({ ...standardParams, sigma: 0.0001 }, dummyPricing);
    assert(res.warnings[0]?.code === 'ZERO_VOL', "Guard 2: Emits ZERO_VOL warning");
    assert(res.result.vega === 0, "Guard 2: Vega is strictly 0");

    // 3. DEEP MONEY
    res = guardedPrice({ ...standardParams, S: 1000 }, () => ({ price: 900, delta: 1, gamma: 1e-12, vega: 1e-12, theta: -0.01, rho: 0.9 }));
    assert(res.warnings[0]?.code === 'DEEP_MONEY', "Guard 3: Emits DEEP_MONEY warning for |d1| > 8");
    assert(res.result.gamma === 0.0, "Guard 3: Minor Greek truncated to 0");

    // 4. NEGATIVE RATE (Using an extreme negative rate that guarantees invalid probability)
    res = guardedPrice({ ...standardParams, r: -5.0 }, dummyPricing);
    assert(res.warnings.find(w => w.code === 'NEGATIVE_RATE'), "Guard 4: Emits NEGATIVE_RATE warning for out of bounds Binomial tree");

    // 5. EXTREME VOL
    res = guardedPrice({ ...standardParams, sigma: 2.5 }, dummyPricing);
    assert(res.warnings[0]?.code === 'EXTREME_VOL', "Guard 5: Emits EXTREME_VOL warning");

    // 6. INVALID OUTPUT (Fallback)
    const isNode = typeof window === 'undefined';
    if (isNode) {
        global.window = { calculator: { calculateGreeks: () => ({ price: 99, delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 }) } };
    } else {
        window.calculator = { calculateGreeks: () => ({ price: 99, delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 }) };
    }
    res = guardedPrice(standardParams, () => ({ price: NaN, delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 }));
    assert(res.warnings[0]?.code === 'INVALID_OUTPUT', "Guard 6: Emits INVALID_OUTPUT for NaN price");
    assert(res.result.price === 99, "Guard 6: Successfully fell back to JS calculator");

    // Cleanup
    if (isNode) {
        delete global.window;
    } else {
        delete window.calculator;
    }

    console.log(`🏁 Self-Test Complete: ${passes}/${total} passed.`);
}
