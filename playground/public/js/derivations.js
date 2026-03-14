/**
 * Mathematical Derivations rendering module using KaTeX.
 * Provides interactive, step-by-step proofs of the Black-Scholes Greeks.
 */

const GREEK_DERIVATIONS = {
    delta: {
        symbol: '\\Delta',
        name: 'Delta',
        definition: 'Delta measures the rate of change of the option price with respect to changes in the underlying asset\'s price. Economically, it represents the equivalent share position needed to hedge the option.',
        startingPoint: `
            C = S e^{-qT} N(d_1) - K e^{-rT} N(d_2) \\\\
            d_1 = \\frac{\\ln(S/K) + (r - q + \\frac{\\sigma^2}{2})T}{\\sigma\\sqrt{T}} \\quad d_2 = d_1 - \\sigma\\sqrt{T}
        `,
        steps: [
            "We differentiate the Call price $C$ with respect to $S$:",
            "\\frac{\\partial C}{\\partial S} = e^{-qT} N(d_1) + S e^{-qT} \\frac{\\partial N(d_1)}{\\partial d_1} \\frac{\\partial d_1}{\\partial S} - K e^{-rT} \\frac{\\partial N(d_2)}{\\partial d_2} \\frac{\\partial d_2}{\\partial S}",
            "Note that the derivative of the standard normal CDF $N(x)$ is the PDF $\\phi(x)$:",
            "\\frac{\\partial N(x)}{\\partial x} = \\phi(x) = \\frac{1}{\\sqrt{2\\pi}} e^{-x^2 / 2}",
            "And the partial derivative of $d_1$ (and $d_2$) with respect to $S$ is:",
            "\\frac{\\partial d_1}{\\partial S} = \\frac{\\partial d_2}{\\partial S} = \\frac{1}{S \\sigma \\sqrt{T}}",
            "This leads to a fundamental identity in Black-Scholes derivations (often called the _Black-Scholes Identity_):",
            "S e^{-qT} \\phi(d_1) = K e^{-rT} \\phi(d_2)",
            "Substituting this identity back into our derivative, the complex terms perfectly cancel out:",
            "\\Delta_{call} = e^{-qT} N(d_1) + \\left[ S e^{-qT} \\phi(d_1) - K e^{-rT} \\phi(d_2) \\right] \\frac{1}{S \\sigma \\sqrt{T}}",
            "\\Delta_{call} = e^{-qT} N(d_1) + [0]"
        ],
        closedForm: {
            call: "\\Delta_{call} = e^{-qT} N(d_1)",
            put: "\\Delta_{put} = -e^{-qT} N(-d_1) = \\Delta_{call} - e^{-qT}"
        },
        boundary: [
            { cond: "$S \\to \\infty$ (Deep ITM Call)", call: "$\\Delta \\to e^{-qT}$", put: "$\\Delta \\to 0$" },
            { cond: "$S \\to 0$ (Deep OTM Call)", call: "$\\Delta \\to 0$", put: "$\\Delta \\to -e^{-qT}$" },
            { cond: "$T \\to 0$ (Near Expiry)", call: "Step function (0 or $1$)", put: "Step function (0 or $-1$)" }
        ],
        practical: "If the spot price moves up by $1.00, your option value will change by exactly $Δ. Conversely, shorting Δ shares of the underlying perfectly hedges the directional risk locally.",
        parity: "Put-Call Parity states $C - P = S e^{-qT} - K e^{-rT}$. Differentiating both sides with respect to $S$ yields: $\\Delta_{call} - \\Delta_{put} = e^{-qT}.$"
    },
    gamma: {
        symbol: '\\Gamma',
        name: 'Gamma',
        definition: 'Gamma measures the rate of change of Delta with respect to changes in the underlying price. It describes the curvature (convexity) of the option\'s value profile.',
        startingPoint: `
            \\Gamma = \\frac{\\partial \\Delta}{\\partial S} = \\frac{\\partial^2 V}{\\partial S^2} \\\\
            \\Delta_{call} = e^{-qT} N(d_1)
        `,
        steps: [
            "We differentiate the $\\Delta_{call}$ equation with respect to $S$:",
            "\\Gamma = \\frac{\\partial}{\\partial S} \\left( e^{-qT} N(d_1) \\right)",
            "Applying the chain rule, where $\\frac{\\partial N(d_1)}{\\partial d_1} = \\phi(d_1)$:",
            "\\Gamma = e^{-qT} \\phi(d_1) \\frac{\\partial d_1}{\\partial S}",
            "We saw during the Delta derivation that the derivative of $d_1$ with respect to $S$ is:",
            "\\frac{\\partial d_1}{\\partial S} = \\frac{1}{S \\sigma \\sqrt{T}}",
            "Substituting this in yields the final result. Note that because $N(-d_1)' = -\\phi(-d_1) = -\\phi(d_1)$, differentiating the Put Delta yields the exact same Gamma."
        ],
        closedForm: {
            call: "\\Gamma_{call} = \\frac{e^{-qT} \\phi(d_1)}{S \\sigma \\sqrt{T}}",
            put: "\\Gamma_{put} = \\Gamma_{call}"
        },
        boundary: [
            { cond: "ATM ($S \\approx K$)", call: "Maximum value", put: "Maximum value" },
            { cond: "Deep ITM / OTM", call: "$\\to 0$", put: "$\\to 0$" },
            { cond: "$T \\to 0$ (ATM)", call: "$\\to \\infty$ (Singularity)", put: "$\\to \\infty$ (Singularity)" }
        ],
        practical: "If Spot moves $1, your Delta implies the immediate profit, but Gamma dictates how your Delta itself changes. High Gamma means your hedge ratio rapidly destabilizes.",
        parity: "Since $\\Delta_{put} = \\Delta_{call} - e^{-qT}$, differentiating again gives $\\Gamma_{put} = \\Gamma_{call} - 0 = \\Gamma_{call}$."
    },
    vega: {
        symbol: '\\mathcal{V}',
        name: 'Vega',
        definition: 'Vega measures sensitivity to volatility ($\\sigma$). It denotes the absolute change in the option price for a 1% absolute change in implied volatility.',
        startingPoint: `
            \\mathcal{V} = \\frac{\\partial C}{\\partial \\sigma} = \\frac{\\partial}{\\partial \\sigma} \\left[ S e^{-qT} N(d_1) - K e^{-rT} N(d_2) \\right]
        `,
        steps: [
            "We differentiate the Call price with respect to $\\sigma$:",
            "\\mathcal{V} = S e^{-qT} \\phi(d_1) \\frac{\\partial d_1}{\\partial \\sigma} - K e^{-rT} \\phi(d_2) \\frac{\\partial d_2}{\\partial \\sigma}",
            "We recall the fundamental identity: $S e^{-qT} \\phi(d_1) = K e^{-rT} \\phi(d_2)$. We factor this term out:",
            "\\mathcal{V} = S e^{-qT} \\phi(d_1) \\left( \\frac{\\partial d_1}{\\partial \\sigma} - \\frac{\\partial d_2}{\\partial \\sigma} \\right)",
            "We know that $d_2 = d_1 - \\sigma \\sqrt{T}$, therefore:",
            "\\frac{\\partial d_2}{\\partial \\sigma} = \\frac{\\partial d_1}{\\partial \\sigma} - \\sqrt{T}",
            "Substituting the partial derivative of $d_2$ back into the factored equation:",
            "\\mathcal{V} = S e^{-qT} \\phi(d_1) \\left( \\frac{\\partial d_1}{\\partial \\sigma} - \\left( \\frac{\\partial d_1}{\\partial \\sigma} - \\sqrt{T} \\right) \\right)",
            "The $d_1$ derivatives perfectly cancel out, leaving just the $\\sqrt{T}$ term:"
        ],
        closedForm: {
            call: "\\mathcal{V} = S e^{-qT} \\phi(d_1) \\sqrt{T}",
            put: "\\mathcal{V}_{put} = \\mathcal{V}_{call}"
        },
        boundary: [
            { cond: "ATM ($S \\approx K$)", call: "Maximum value", put: "Maximum value" },
            { cond: "Deep ITM / OTM", call: "$\\to 0$", put: "$\\to 0$" },
            { cond: "$T \\to 0$ (Expiry)", call: "$\\to 0$", put: "$\\to 0$" }
        ],
        practical: "By convention, Vega is scaled by dividing by 100 so it represents a 1% move. If scaled Vega is 0.15, and IV jumps from 20% to 21%, the option gains exactly $0.15.",
        parity: "Put-Call parity is $C - P = S e^{-qT} - K e^{-rT}$. Since the right side has no $\\sigma$ dependency, differentiating by $\\sigma$ gives $\\mathcal{V}_C - \\mathcal{V}_P = 0$."
    },
    theta: {
        symbol: '\\Theta',
        name: 'Theta',
        definition: 'Theta measures the rate of time decay. It is the derivative of the option price with respect to the passage of time. Because time only moves forward, Theta is typically negative for long options.',
        startingPoint: `
            \\Theta = -\\frac{\\partial C}{\\partial t} = \\frac{\\partial C}{\\partial T} \\\\
            C = S e^{-qT} N(d_1) - K e^{-rT} N(d_2)
        `,
        steps: [
            "We differentiate the Call price with respect to time to maturity, $T$. This requires extensive product rule application across four term clusters.",
            "1. Differentiate the asset term ($S e^{-qT} N(d_1)$):",
            "\\frac{\\partial}{\\partial T} (S e^{-qT} N(d_1)) = -q S e^{-qT} N(d_1) + S e^{-qT} \\phi(d_1) \\frac{\\partial d_1}{\\partial T}",
            "2. Differentiate the strike term ($K e^{-rT} N(d_2)$):",
            "\\frac{\\partial}{\\partial T} (K e^{-rT} N(d_2)) = -r K e^{-rT} N(d_2) + K e^{-rT} \\phi(d_2) \\frac{\\partial d_2}{\\partial T}",
            "3. Apply the fundamental identity $S e^{-qT} \\phi(d_1) = K e^{-rT} \\phi(d_2)$ again to group the probability density terms:",
            "S e^{-qT} \\phi(d_1) \\left( \\frac{\\partial d_1}{\\partial T} - \\frac{\\partial d_2}{\\partial T} \\right)",
            "4. Calculate the time derivatives of $d_1$ and $d_2$. Since $d_1 - d_2 = \\sigma \\sqrt{T}$:",
            "\\frac{\\partial d_1}{\\partial T} - \\frac{\\partial d_2}{\\partial T} = \\frac{\\sigma}{2 \\sqrt{T}}",
            "Substituting this back into the cluster grouping yields the continuous volatility drag term:",
            "\\frac{S e^{-qT} \\phi(d_1) \\sigma}{2 \\sqrt{T}}",
            "Combining all three clusters (Volatility drag, dividends, and risk-free carry) and negating the whole expression (since $\\Theta = -\\partial / \\partial T$):"
        ],
        closedForm: {
            call: "\\Theta_{call} = -\\frac{S e^{-qT} \\phi(d_1) \\sigma}{2 \\sqrt{T}} + q S e^{-qT} N(d_1) - r K e^{-rT} N(d_2)",
            put: "\\Theta_{put} = -\\frac{S e^{-qT} \\phi(d_1) \\sigma}{2 \\sqrt{T}} - q S e^{-qT} N(-d_1) + r K e^{-rT} N(-d_2)"
        },
        boundary: [
            { cond: "ATM ($S \\approx K$)", call: "Maximum decay (Most negative)", put: "Maximum decay" },
            { cond: "Deep ITM Call", call: "$\\to -r K e^{-rT}$ (Cost of carry)", put: "$\\to 0$" },
            { cond: "Deep ITM Put", call: "$\\to 0$", put: "$\\to +r$ (Positive Theta!)" }
        ],
        practical: "Usually reported in value per day ($\\Theta / 365$). If Theta is -$0.05, holding the option overnight, all else equal, strips $0.05 from its value.",
        parity: "Differentiating Put-Call Parity with respect to time: $\\Theta_P = \\Theta_C - r K e^{-rT} + q S e^{-qT}$."
    },
    rho: {
        symbol: '\\rho',
        name: 'Rho',
        definition: 'Rho measures sensitivity to the risk-free interest rate ($r$). It represents the change in option price for a 1% (100 basis point) shift in interest rates.',
        startingPoint: `
            \\rho = \\frac{\\partial C}{\\partial r} = \\frac{\\partial}{\\partial r} \\left[ S e^{-qT} N(d_1) - K e^{-rT} N(d_2) \\right]
        `,
        steps: [
            "We differentiate the Call price with respect to $r$:",
            "\\rho = S e^{-qT} \\phi(d_1) \\frac{\\partial d_1}{\\partial r} - \\left( -T K e^{-rT} N(d_2) + K e^{-rT} \\phi(d_2) \\frac{\\partial d_2}{\\partial r} \\right)",
            "We invoke the fundamental identity $S e^{-qT} \\phi(d_1) = K e^{-rT} \\phi(d_2)$ to clear the $\\phi$ noise:",
            "\\rho = K T e^{-rT} N(d_2) + S e^{-qT} \\phi(d_1) \\left( \\frac{\\partial d_1}{\\partial r} - \\frac{\\partial d_2}{\\partial r} \\right)",
            "Since $d_2 = d_1 - \\sigma \\sqrt{T}$, and the offset term has no $r$ dependency:",
            "\\frac{\\partial d_1}{\\partial r} = \\frac{\\partial d_2}{\\partial r}",
            "Therefore the grouped boundary term evaluates to zero, leaving only the primary term:"
        ],
        closedForm: {
            call: "\\rho_{call} = K T e^{-rT} N(d_2)",
            put: "\\rho_{put} = -K T e^{-rT} N(-d_2)"
        },
        boundary: [
            { cond: "$T \\to 0$ (Near Expiry)", call: "$\\to 0$", put: "$\\to 0$" },
            { cond: "Far ITM Call", call: "$\\approx K \\cdot T$", put: "$\\to 0$" },
            { cond: "Far ITM Put", call: "$\\to 0$", put: "$\\approx -K \\cdot T$" }
        ],
        practical: "Rho is usually scaled by dividing by 100. Call options have strictly positive Rho (higher rates increase call value due to delayed strike payment), while puts are strictly negative.",
        parity: "Differentiating Put-Call Parity by $r$: $\\rho_C - \\rho_P = K T e^{-rT}$."
    }
};

/**
 * Ensures KaTeX text is visible in dark mode.
 */
function injectStyles() {
    if (!document.getElementById('katex-custom-styles')) {
        const style = document.createElement('style');
        style.id = 'katex-custom-styles';
        style.innerHTML = `
            .derivation-panel .katex { color: #f8fafc; font-size: 1.1em; }
            .derivation-panel .katex-display { margin: 0.8em 0; overflow-x: auto; overflow-y: hidden; }
            .derivation-closed-form { 
                background: rgba(59, 130, 246, 0.1); 
                border-left: 3px solid #3B82F6; 
                padding: 12px; 
                margin: 16px 0; 
                border-radius: 0 8px 8px 0;
            }
            .derivation-header {
                background: rgba(30, 41, 59, 0.6);
                border: 1px solid #334155;
                border-radius: 8px;
                padding: 12px 16px;
                cursor: pointer;
                transition: background 0.2s;
                display: flex;
                justify-content: space-between;
                font-family: 'Outfit', sans-serif;
                color: #f1f5f9;
                font-weight: 500;
            }
            .derivation-header:hover { background: rgba(51, 65, 85, 0.6); }
            .derivation-content {
                display: none;
                padding: 20px;
                background: rgba(15, 23, 42, 0.6);
                border: 1px solid #334155;
                border-top: none;
                border-radius: 0 0 8px 8px;
                color: #cbd5e1;
                font-family: system-ui, -apple-system, sans-serif;
                line-height: 1.6;
            }
            .derivation-content.open { display: block; animation: slideDown 0.3s ease-out; }
            .derivation-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.9em; }
            .derivation-table th, .derivation-table td { padding: 8px 12px; border: 1px solid #334155; text-align: left; }
            .derivation-table th { background: rgba(51, 65, 85, 0.4); color: #f1f5f9; }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Internal helper to safely render KaTeX strings.
 */
function renderLatex(latexStr, displayMode = false) {
    if (!window.katex) return `<code>${latexStr}</code>`; // Fallback if KaTeX failed to load
    try {
        return window.katex.renderToString(latexStr, {
            displayMode: displayMode,
            throwOnError: false,
            strict: false
        });
    } catch (e) {
        console.error("KaTeX parse error on:", latexStr, e);
        return `<span style="color:red">Parse Error</span>`;
    }
}

/**
 * Replaces inline $...$ markdown with rendered KaTeX inside standard text.
 */
function parseInlineMath(text) {
    if (!window.katex) return text;
    // Regex splits text into [not-math, math, not-math, ...] matching $expr$
    const parts = text.split(/\$(.*?)\$/g);
    let result = '';
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
            result += renderLatex(parts[i], false); // It's math
        } else {
            result += parts[i]; // It's text
        }
    }
    return result;
}

/**
 * Main export: Renders 5 collapsible accordion panels for the derivations.
 */
export function renderDerivationPanels(containerEl) {
    if (!containerEl) return;
    injectStyles();
    containerEl.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'derivation-panel';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';

    Object.values(GREEK_DERIVATIONS).forEach((greek) => {
        const itemWrap = document.createElement('div');

        // 1. HEADER
        const header = document.createElement('div');
        header.className = 'derivation-header';

        const titleSpan = document.createElement('span');
        titleSpan.innerHTML = `Show Derivation: ${greek.name} (${renderLatex(greek.symbol, false)})`;
        titleSpan.style.display = 'flex';
        titleSpan.style.alignItems = 'center';
        titleSpan.style.gap = '8px';

        const arrowSpan = document.createElement('span');
        arrowSpan.textContent = '▼';
        arrowSpan.style.transition = 'transform 0.2s';

        header.appendChild(titleSpan);
        header.appendChild(arrowSpan);

        // 2. CONTENT
        const content = document.createElement('div');
        content.className = 'derivation-content';

        let html = '';

        // A. DEFINITION
        html += `<div style="margin-bottom: 20px;">
            <strong style="color: #f8fafc; font-family: Outfit;">Economic Definition:</strong><br>
            ${greek.definition}
        </div>`;

        // B. STARTING POINT
        html += `<div style="margin-bottom: 20px;">
            <strong style="color: #f8fafc; font-family: Outfit;">Starting Equations:</strong>
            ${renderLatex(greek.startingPoint, true)}
        </div>`;

        // C. FULL DERIVATION
        html += `<div style="margin-bottom: 20px;">
            <strong style="color: #f8fafc; font-family: Outfit;">Step-by-Step Derivation:</strong>
            <ol style="padding-left: 20px; list-style-type: decimal; color: #94a3b8; display:flex; flex-direction:column; gap:12px; margin-top:8px;">
        `;

        greek.steps.forEach(stepStr => {
            // Check if step is text math or pure latex
            if (stepStr.match(/^[a-zA-Z0-9]/)) {
                // It starts with text, parse inline math
                html += `<li>${parseInlineMath(stepStr)}</li>`;
            } else {
                // It's a pure block equation
                html += `<div style="margin-left: -20px;">${renderLatex(stepStr, true)}</div>`;
            }
        });
        html += `</ol></div>`;

        // D. FINAL CLOSED FORM
        html += `
            <strong style="color: #f8fafc; font-family: Outfit;">Final Closed-Form Equations:</strong>
            <div class="derivation-closed-form">
                ${renderLatex(greek.closedForm.call, true)}
                ${renderLatex(greek.closedForm.put, true)}
            </div>
        `;

        // E. BOUNDARY TABLE
        html += `
            <strong style="color: #f8fafc; font-family: Outfit;">Boundary Behavior Limits:</strong>
            <table class="derivation-table">
                <thead><tr><th>Condition</th><th>Call Limit</th><th>Put Limit</th></tr></thead>
                <tbody>
                    ${greek.boundary.map(b => `
                        <tr>
                            <td>${parseInlineMath(b.cond)}</td>
                            <td>${parseInlineMath(b.call)}</td>
                            <td>${parseInlineMath(b.put)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // F & G. PRACTICAL & PARITY
        html += `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <strong style="color:#10B981; font-family:Outfit; font-size:0.9em; display:block; margin-bottom:4px;">Rule of Thumb</strong>
                    <span style="font-size:0.85em; color:#94a3b8;">${parseInlineMath(greek.practical)}</span>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <strong style="color:#a855f7; font-family:Outfit; font-size:0.9em; display:block; margin-bottom:4px;">Put-Call Parity Identity</strong>
                    <span style="font-size:0.85em; color:#94a3b8;">${parseInlineMath(greek.parity)}</span>
                </div>
            </div>
        `;

        content.innerHTML = html;

        // ACCORDION BEHAVIOR
        header.onclick = () => {
            const isOpen = content.classList.contains('open');
            // Close all others
            wrapper.querySelectorAll('.derivation-content').forEach(el => {
                el.classList.remove('open');
                el.previousElementSibling.querySelector('span:last-child').style.transform = 'rotate(0deg)';
                el.previousElementSibling.style.borderRadius = '8px';
            });
            // Open clicked
            if (!isOpen) {
                content.classList.add('open');
                header.style.borderRadius = '8px 8px 0 0';
                arrowSpan.style.transform = 'rotate(180deg)';
                // Slight scroll adjustment
                setTimeout(() => header.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
            }
        };

        itemWrap.appendChild(header);
        itemWrap.appendChild(content);
        wrapper.appendChild(itemWrap);
    });

    containerEl.appendChild(wrapper);
}

/**
 * Export: Renders a compact summary of a Greek (Closed form + interpretation)
 * Used for tooltips or mini-panels near result cards.
 */
export function renderMiniDerivation(greekName, containerEl) {
    if (!containerEl) return;
    injectStyles();

    const greekId = greekName.toLowerCase();
    const greek = GREEK_DERIVATIONS[greekId];
    if (!greek) {
        containerEl.innerHTML = `<span style="color:red">Greek ${greekName} not found.</span>`;
        return;
    }

    containerEl.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'derivation-panel';
    wrapper.style.padding = '12px';
    wrapper.style.fontFamily = 'Outfit, sans-serif';
    wrapper.style.fontSize = '0.9rem';

    let html = `
        <div style="color: #f8fafc; font-weight: 500; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 8px;">
            ${greek.name} (${renderLatex(greek.symbol, false)}) Formula
        </div>
        <div style="font-size: 0.85em; text-align: center; margin-bottom: 12px;">
            ${renderLatex(greek.closedForm.call, true)}
        </div>
        <div style="color: #94a3b8; font-family: system-ui, sans-serif; font-size: 0.8em; line-height: 1.4;">
            ${parseInlineMath(greek.practical)}
        </div>
    `;

    wrapper.innerHTML = html;
    containerEl.appendChild(wrapper);
}
