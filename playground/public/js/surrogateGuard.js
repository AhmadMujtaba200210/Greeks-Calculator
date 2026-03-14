/**
 * Surrogate Guard Module
 * 
 * Validates predictions from the AI Surrogate model against its trained domain
 * and provides fallbacks/confidence scores to ensure reliability.
 */

export let TRAINING_DOMAIN = {
    S: [50, 200],
    K: [50, 200],
    T: [0.01, 3.0],
    sigma: [0.05, 0.80],
    r: [-0.02, 0.15],
    q: [0.0, 0.08]
};

/**
 * Updates the training domain bounds.
 * @param {Object} newDomain - Partial or complete domain object to merge
 */
export function setTrainingDomain(newDomain) {
    TRAINING_DOMAIN = { ...TRAINING_DOMAIN, ...newDomain };
}

/**
 * Validates a parameter against a continuous bound.
 */
function checkBound(val, [min, max]) {
    const range = max - min;
    const margin = range * 0.1; // 10% near-boundary threshold

    if (val < min || val > max) return 'extrapolation';
    if (val < min + margin || val > max - margin) return 'near_boundary';
    return 'in_domain';
}

/**
 * Calculates a confidence score (0 to 1) based on distance from training center.
 */
function paramConfidence(val, [min, max]) {
    const center = (max + min) / 2;
    const halfRange = (max - min) / 2;
    if (halfRange === 0) return 1; // Prevent div by 0 for constants

    // score = 1 - (dist / half_range)^2
    // If val is at edge, score = 0. If outside, score < 0 (clamped to 0).
    const dist = Math.abs(val - center);
    let score = 1 - Math.pow(dist / halfRange, 2);
    return Math.max(0, Math.min(1, score));
}

/**
 * Helper to calculate absolute and relative errors safely.
 */
function calcError(aiVal, bsVal) {
    if (typeof aiVal !== 'number' || typeof bsVal !== 'number' || isNaN(aiVal) || isNaN(bsVal)) {
        return { abs: NaN, rel: NaN };
    }
    const abs = Math.abs(aiVal - bsVal);
    const divisor = Math.max(Math.abs(bsVal), 1e-4);
    const rel = abs / divisor;
    return { abs, rel };
}

/**
 * Validates an AI Surrogate result against the domain and an analytical reference.
 * 
 * @param {Object} params - { S, K, T, sigma, r, q, isCall }
 * @param {Object} aiResult - { price, delta, gamma, vega, theta, rho }
 * @returns {Object} Validation report payload
 */
export function validateSurrogate(params, aiResult) {
    const { S, K, T, sigma, r, q, isCall } = params;

    // 1. DOMAIN CHECK
    const paramFlags = {
        S: checkBound(S, TRAINING_DOMAIN.S),
        K: checkBound(K, TRAINING_DOMAIN.K),
        T: checkBound(T, TRAINING_DOMAIN.T),
        sigma: checkBound(sigma, TRAINING_DOMAIN.sigma),
        r: checkBound(r, TRAINING_DOMAIN.r),
        q: checkBound(q, TRAINING_DOMAIN.q)
    };

    let overallDomain = 'in_domain';
    for (const key in paramFlags) {
        if (paramFlags[key] === 'extrapolation') {
            overallDomain = 'extrapolation';
            break; // Worst case locked in
        } else if (paramFlags[key] === 'near_boundary' && overallDomain !== 'extrapolation') {
            overallDomain = 'near_boundary';
        }
    }

    // 2. CONFIDENCE SCORE (Geometric Mean)
    const scores = [
        paramConfidence(S, TRAINING_DOMAIN.S),
        paramConfidence(K, TRAINING_DOMAIN.K),
        paramConfidence(T, TRAINING_DOMAIN.T),
        paramConfidence(sigma, TRAINING_DOMAIN.sigma),
        paramConfidence(r, TRAINING_DOMAIN.r),
        paramConfidence(q, TRAINING_DOMAIN.q)
    ];

    const product = scores.reduce((acc, s) => acc * s, 1.0);
    const confidence = Math.pow(product, 1 / scores.length);

    // 3. BS COMPARISON
    const bsComparison = { bs: null, ai: aiResult, errors: null };
    let priceRelError = 0;

    if (window.calculator && typeof window.calculator.calculateGreeks === 'function' && aiResult) {
        const bs = window.calculator.calculateGreeks(S, K, T, sigma, r, q, isCall);
        bsComparison.bs = bs;
        bsComparison.errors = {
            price: calcError(aiResult.price, bs.price),
            delta: calcError(aiResult.delta, bs.delta),
            gamma: calcError(aiResult.gamma, bs.gamma),
            vega: calcError(aiResult.vega, bs.vega),
            theta: calcError(aiResult.theta, bs.theta),
            rho: calcError(aiResult.rho, bs.rho)
        };
        priceRelError = bsComparison.errors.price.rel;
    }

    // 4. RECOMMENDATION
    let recommendation = 'unreliable';
    let recommendationMessage = 'Output deviates significantly from analytical models or is far out of training domain.';

    // If we have a BS cross-check
    if (bsComparison.bs) {
        if (overallDomain === 'in_domain' && priceRelError < 0.01) {
            recommendation = 'trustworthy';
            recommendationMessage = 'Parameters are centered in training domain; neural net price tracks BS within 1%.';
        } else if (overallDomain === 'extrapolation' && priceRelError > 0.05) {
            recommendation = 'unreliable';
            recommendationMessage = 'Parameters are outside training domain and output deviates heavily (>5%). Use analytical engine.';
        } else if (overallDomain === 'extrapolation' && priceRelError <= 0.05) {
            recommendation = 'caution';
            recommendationMessage = 'Extrapolating outside trained boundaries, but output mathematically holds within 5% tolerance.';
        } else if ((overallDomain === 'near_boundary' || overallDomain === 'in_domain') && priceRelError < 0.05) {
            recommendation = 'caution';
            recommendationMessage = 'Model output is slightly loose (1-5% error) or pressing against domain boundaries.';
        }
    } else {
        // Blind mode (No BS to check against)
        if (overallDomain === 'in_domain' && confidence > 0.6) {
            recommendation = 'trustworthy';
            recommendationMessage = 'High confidence score inside training domain. (Math cross-check offline).';
        } else if (overallDomain === 'near_boundary' || confidence > 0.2) {
            recommendation = 'caution';
            recommendationMessage = 'Approaching edge of domain or lower confidence. Use caution.';
        }
    }

    return {
        domainStatus: overallDomain,
        paramFlags,
        confidence,
        bsComparison,
        recommendation,
        recommendationMessage
    };
}

/**
 * Renders the interactive AI guard badge UI.
 * 
 * @param {Object} validation - Output from validateSurrogate()
 * @param {HTMLElement} containerEl - DOM node to mount the UI into
 */
export function renderSurrogateBadge(validation, containerEl) {
    if (!containerEl || !validation) return;
    containerEl.innerHTML = '';

    // Destructure properties safely
    const { recommendation, confidence, paramFlags, bsComparison } = validation;

    // Define color themes
    const themes = {
        trustworthy: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', icon: '🛡️', title: 'AI: Reliable' },
        caution: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', icon: '⚠️', title: 'AI: Use Caution' },
        unreliable: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', icon: '🚨', title: 'AI: Unreliable' }
    };

    const theme = themes[recommendation] || themes.unreliable;

    // Formatters
    const fmtPct = (val) => new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(val);
    const confPct = Math.round(confidence * 100);

    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.style.fontFamily = 'Outfit, sans-serif';
    wrapper.style.display = 'inline-block';

    // 1. Inline Badge
    const badge = document.createElement('div');
    badge.style.cursor = 'pointer';
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.gap = '6px';
    badge.style.padding = '4px 10px';
    badge.style.borderRadius = '20px';
    badge.style.background = theme.bg;
    badge.style.border = `1px solid ${theme.color}`;
    badge.style.color = theme.color;
    badge.style.fontSize = '0.85rem';
    badge.style.fontWeight = '500';
    badge.style.transition = 'all 0.2s ease';
    badge.title = 'Click to show AI validation details';

    badge.innerHTML = `<span>${theme.icon}</span> <span>${theme.title}</span> <span style="font-size: 0.7rem; opacity: 0.8; margin-left: 2px;">▼</span>`;

    // Hover effects
    badge.onmouseenter = () => badge.style.boxShadow = `0 0 8px ${theme.color}40`;
    badge.onmouseleave = () => badge.style.boxShadow = 'none';

    // 2. Expandable Panel (hidden by default)
    const panel = document.createElement('div');
    panel.style.display = 'none';
    panel.style.position = 'absolute';
    panel.style.marginTop = '8px';
    panel.style.zIndex = '100';
    panel.style.minWidth = '320px';
    panel.style.background = 'rgba(15, 23, 42, 0.95)';
    panel.style.backdropFilter = 'blur(10px)';
    panel.style.border = '1px solid #334155';
    panel.style.borderRadius = '8px';
    panel.style.padding = '16px';
    panel.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    panel.style.color = '#f1f5f9';
    panel.style.animation = 'fadeIn 0.2s ease-out forwards';

    // Badge toggle logic
    badge.onclick = (e) => {
        e.stopPropagation();
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
        badge.querySelector('span:last-child').textContent = isHidden ? '▲' : '▼';
    };

    // Click outside to close
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target) && panel.style.display === 'block') {
            panel.style.display = 'none';
            badge.querySelector('span:last-child').textContent = '▼';
        }
    });

    // Sub-components of Panel

    // A. Message & Confidence Bar
    let panelHtml = `
        <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:12px; line-height:1.4;">
            ${validation.recommendationMessage}
        </div>
        
        <div style="margin-bottom: 16px;">
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px; color:#cbd5e1;">
                <span>Structural Confidence</span>
                <span>${confPct}%</span>
            </div>
            <div style="width:100%; height:6px; background:rgba(0,0,0,0.4); border-radius:3px; overflow:hidden;">
                <div style="width:${confPct}%; height:100%; background:${theme.color};"></div>
            </div>
        </div>
    `;

    // B. Domain Table
    const mapDomainText = (key) => {
        if (key === 'in_domain') return '<span style="color:#10B981;">In Bounds</span>';
        if (key === 'near_boundary') return '<span style="color:#F59E0B;">Near Edge</span>';
        return '<span style="color:#EF4444;">Extrapolating</span>';
    };

    panelHtml += `
        <div style="font-size: 0.8rem; font-weight: 500; margin-bottom: 6px; border-bottom: 1px solid #334155; padding-bottom: 2px;">Domain Status</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
            ${Object.entries(paramFlags).map(([p, stat]) => `
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px;">
                    <span style="color:#94a3b8; font-family:JetBrains Mono;">${p}</span>
                    <span>${mapDomainText(stat)}</span>
                </div>
            `).join('')}
        </div>
    `;

    // C. Error Cross-Check Table (if available)
    if (bsComparison.bs && bsComparison.errors) {
        panelHtml += `
            <div style="font-size: 0.8rem; font-weight: 500; margin-bottom: 6px; border-bottom: 1px solid #334155; padding-bottom: 2px;">Analytical Cross-Check</div>
            <table style="width:100%; font-size:0.75rem; border-collapse:collapse; font-family:JetBrains Mono;">
                <tr style="color:#94a3b8; text-align:right;">
                    <th style="text-align:left; font-weight:normal; padding:4px;">Met</th>
                    <th style="font-weight:normal; padding:4px;">AI</th>
                    <th style="font-weight:normal; padding:4px;">BS</th>
                    <th style="font-weight:normal; padding:4px;">Err(%)</th>
                </tr>
        `;

        ['price', 'delta', 'gamma'].forEach(m => {
            const aiV = bsComparison.ai[m];
            const bsV = bsComparison.bs[m];
            const err = bsComparison.errors[m];
            const eColor = err.rel > 0.05 ? '#EF4444' : (err.rel > 0.01 ? '#F59E0B' : '#10B981');

            panelHtml += `
                <tr style="text-align:right;">
                    <td style="text-align:left; color:#cbd5e1; padding:2px 4px;">${m}</td>
                    <td style="padding:2px 4px;">${aiV.toFixed(3)}</td>
                    <td style="padding:2px 4px;">${bsV.toFixed(3)}</td>
                    <td style="padding:2px 4px; color:${eColor};">${(err.rel * 100).toFixed(1)}%</td>
                </tr>
            `;
        });
        panelHtml += `</table>`;
    }

    panel.innerHTML = panelHtml;

    // Append necessary keyframes globally if they don't exist
    if (!document.getElementById('surrogate-guard-styles')) {
        const style = document.createElement('style');
        style.id = 'surrogate-guard-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-5px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    wrapper.appendChild(badge);
    wrapper.appendChild(panel);
    containerEl.appendChild(wrapper);
}
