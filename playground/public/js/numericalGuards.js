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

    // Clear existing
    containerEl.innerHTML = '';

    if (!warnings || warnings.length === 0) {
        containerEl.style.display = 'none';
        return;
    }

    containerEl.style.display = 'block';

    const colors = {
        info: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3B82F6', icon: 'ℹ️' },
        warning: { bg: 'rgba(245, 158, 11, 0.1)', border: '#F59E0B', icon: '⚠️' },
        critical: { bg: 'rgba(239, 68, 68, 0.1)', border: '#EF4444', icon: '🚨' }
    };

    warnings.forEach(warning => {
        const style = colors[warning.severity] || colors.info;

        const banner = document.createElement('div');
        banner.style.backgroundColor = style.bg;
        banner.style.borderLeft = `4px solid ${style.border}`;
        banner.style.padding = '12px 16px';
        banner.style.marginBottom = '8px';
        banner.style.borderRadius = '4px';
        banner.style.display = 'flex';
        banner.style.flexDirection = 'column';
        banner.style.gap = '8px';
        banner.style.color = '#f8fafc';
        banner.style.fontFamily = 'Outfit, sans-serif';
        banner.style.fontSize = '0.9rem';
        banner.style.position = 'relative';
        banner.style.animation = 'slideDown 0.3s ease-out forwards';

        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.alignItems = 'center';
        topRow.style.gap = '8px';

        const iconSpan = document.createElement('span');
        iconSpan.textContent = style.icon;

        const msgSpan = document.createElement('span');
        msgSpan.textContent = warning.message;
        msgSpan.style.flexGrow = '1';

        // Technical detail toggle button
        if (warning.technical) {
            const techBtn = document.createElement('button');
            techBtn.textContent = 'Details';
            techBtn.style.background = 'none';
            techBtn.style.border = `1px solid ${style.border}`;
            techBtn.style.color = style.border;
            techBtn.style.padding = '2px 8px';
            techBtn.style.fontSize = '0.75rem';
            techBtn.style.borderRadius = '4px';
            techBtn.style.cursor = 'pointer';

            const techDiv = document.createElement('div');
            techDiv.textContent = warning.technical;
            techDiv.style.display = 'none';
            techDiv.style.color = '#94a3b8';
            techDiv.style.fontFamily = 'JetBrains Mono, monospace';
            techDiv.style.fontSize = '0.8rem';
            techDiv.style.backgroundColor = 'rgba(0,0,0,0.2)';
            techDiv.style.padding = '8px';
            techDiv.style.borderRadius = '4px';
            techDiv.style.marginTop = '4px';

            techBtn.onclick = () => {
                const isHidden = techDiv.style.display === 'none';
                techDiv.style.display = isHidden ? 'block' : 'none';
                techBtn.textContent = isHidden ? 'Hide' : 'Details';
                techBtn.style.background = isHidden ? style.border : 'none';
                techBtn.style.color = isHidden ? '#fff' : style.border;
            };

            topRow.appendChild(msgSpan);
            topRow.appendChild(techBtn);
            banner.appendChild(topRow);
            banner.appendChild(techDiv);
        } else {
            topRow.appendChild(msgSpan);
            banner.appendChild(topRow);
        }

        // Dismiss button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.position = 'absolute';
        closeBtn.style.right = '8px';
        closeBtn.style.top = '8px';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.color = '#94a3b8';
        closeBtn.style.fontSize = '1.2rem';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.padding = '0';
        closeBtn.style.lineHeight = '1';

        closeBtn.onclick = () => {
            banner.style.opacity = '0';
            setTimeout(() => banner.remove(), 200);

            if (containerEl.children.length - 1 === 0) {
                setTimeout(() => { if (containerEl.children.length === 0) containerEl.style.display = 'none'; }, 200);
            }
        };

        iconSpan.style.marginRight = '8px';
        banner.appendChild(closeBtn);
        banner.replaceChild(topRow, banner.firstChild);
        topRow.insertBefore(iconSpan, topRow.firstChild);
        containerEl.appendChild(banner);
    });

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
