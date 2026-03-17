/**
 * Citations System Module
 * 
 * Maps computational methodologies deployed in the Playground to their foundational
 * academic papers and textbook proofs. Provides responsive ⓘ tooltips and footers.
 */

export const CITATIONS = {
    black_scholes: {
        method: "Black-Scholes-Merton Analytical Pricing",
        primary: "Black, F. & Scholes, M. (1973). 'The Pricing of Options and Corporate Liabilities.' Journal of Political Economy, 81(3), 637-654.",
        secondary: "Merton, R.C. (1973). 'Theory of Rational Option Pricing.' Bell Journal of Economics and Management Science, 4(1), 141-183.",
        textbook: "Hull, J.C. (2022). Options, Futures, and Other Derivatives, 11th ed., Ch. 15.",
        implementationNote: "Uses Abramowitz & Stegun (1964) polynomial approximation for cumulative normal distribution (Eq. 26.2.17)."
    },
    binomial_crr: {
        method: "Cox-Ross-Rubinstein Binomial Tree",
        primary: "Cox, J.C., Ross, S.A., & Rubinstein, M. (1979). 'Option Pricing: A Simplified Approach.' Journal of Financial Economics, 7(3), 229-263.",
        textbook: "Hull, Ch. 13.",
        implementationNote: "u = exp(σ√Δt), d = 1/u, p = (exp((r-q)Δt) - d)/(u - d). 500 steps default."
    },
    binomial_lr: {
        method: "Leisen-Reimer Binomial Tree",
        primary: "Leisen, D. & Reimer, M. (1996). 'Binomial Models for Option Valuation - Examining and Improving Convergence.' Applied Mathematical Finance, 3(4), 319-346.",
        secondary: "Uses Peizer-Pratt inversion to smooth lattice convergence for European vanilla contracts.",
        textbook: "Hull, Ch. 13 (binomial lattices), with Leisen-Reimer as the convergence upgrade.",
        implementationNote: "Desk default uses an odd-step Leisen-Reimer lattice; CRR remains a comparison method in convergence diagnostics."
    },
    monte_carlo_gbm: {
        method: "Monte Carlo Simulation (Geometric Brownian Motion)",
        primary: "Boyle, P.P. (1977). 'Options: A Monte Carlo Approach.' Journal of Financial Economics, 4(3), 323-338.",
        varianceReduction: "Uses Antithetic Variates: Hammersley, J.M. & Handscomb, D.C. (1964). Monte Carlo Methods.",
        textbook: "Glasserman, P. (2003). Monte Carlo Methods in Financial Engineering. Springer, Ch. 4.",
        implementationNote: "50,000 paths default. Antithetic variates for variance reduction."
    },
    monte_carlo_control_variate: {
        method: "Monte Carlo with Control Variates",
        primary: "Broadie, M. & Glasserman, P. (1996). 'Estimating Security Price Derivatives Using Simulation.' Management Science, 42(2), 269-285.",
        secondary: "Uses antithetic variates and a discounted terminal-stock control variate to reduce estimator variance under GBM.",
        textbook: "Glasserman, P. (2003). Monte Carlo Methods in Financial Engineering. Springer, Ch. 4-7.",
        implementationNote: "Trader-facing output includes standard error and a 95% confidence interval, so the desk can display simulation uncertainty directly."
    },
    greeks_analytical: {
        method: "Analytical Greeks (Closed-Form Partial Derivatives)",
        primary: "Black & Scholes (1973), as above.",
        textbook: "Hull, Ch. 19.",
        implementationNote: "Exact partial derivatives of the BS formula."
    },
    greeks_ad: {
        method: "Automatic Differentiation (Forward-Mode, Dual Numbers)",
        primary: "Griewank, A. & Walther, A. (2008). Evaluating Derivatives: Principles and Techniques of Algorithmic Differentiation. 2nd ed. SIAM.",
        textbook: "Savine, A. (2018). Modern Computational Finance: AAD and Parallel Simulations. Wiley.",
        implementationNote: "Rust backend uses dual numbers (x + x'ε, ε²=0) for exact Delta and Vega without finite differences."
    },
    greeks_finite_diff: {
        method: "Finite Difference Greeks (Bump-and-Reprice)",
        primary: "Standard numerical differentiation.",
        textbook: "Hull, Ch. 19 (comparison with analytical).",
        implementationNote: "Used by Monte Carlo and AI Surrogate models. Central differences: Δ ≈ [V(S+h) - V(S-h)] / 2h."
    },
    svi_surface: {
        method: "SVI (Stochastic Volatility Inspired) Parameterization",
        primary: "Gatheral, J. (2004). 'A Parsimonious Arbitrage-Free Implied Volatility Parameterization.' Presentation at Global Derivatives & Risk Management.",
        textbook: "Gatheral, J. (2006). The Volatility Surface: A Practitioner's Guide. Wiley, Ch. 3.",
        implementationNote: "w(k) = a + b(ρ(k-m) + √((k-m)² + σ²)). The Playground shows scenario SVI slices/surfaces generated in Rust until full calibration is added."
    },
    ai_surrogate: {
        method: "Neural Network Surrogate (Multi-Layer Perceptron)",
        primary: "Hutchinson, J.M., Lo, A.W., & Poggio, T. (1994). 'A Nonparametric Approach to Pricing and Hedging Derivative Securities.' Journal of Finance, 49(3), 851-889.",
        implementationNote: "Feed-forward MLP trained on BS data. Greeks computed via finite differences on the network output. EXPERIMENTAL — not for production pricing."
    },
    probability_analysis: {
        method: "Log-Normal Probability Distribution",
        primary: "Standard risk-neutral pricing theory. See Hull, Ch. 15.",
        implementationNote: "Numerical integration over log-normal density for probability of profit and expected P&L."
    }
};

/**
 * Ensures citation popovers and components have necessary standard CSS rules.
 */
function ensureCitationStyles() {
    if (!document.getElementById('citation-system-styles')) {
        const style = document.createElement('style');
        style.id = 'citation-system-styles';
        style.innerHTML = `
            .cite-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 14px;
                height: 14px;
                background: rgba(148, 163, 184, 0.15);
                border: 1px solid #64748b;
                color: #94a3b8;
                border-radius: 50%;
                font-size: 10px;
                font-family: system-ui, sans-serif;
                cursor: help;
                margin-left: 6px;
                vertical-align: middle;
                transition: all 0.2s;
            }
            .cite-icon:hover {
                background: rgba(59, 130, 246, 0.2);
                border-color: #3B82F6;
                color: #60A5FA;
            }
            .cite-tooltip {
                position: fixed;
                z-index: 1000;
                background: rgba(15, 23, 42, 0.95);
                backdrop-filter: blur(8px);
                border: 1px solid #334155;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                width: max-content;
                max-width: 350px;
                padding: 12px;
                color: #cbd5e1;
                font-family: Outfit, sans-serif;
                font-size: 0.8rem;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            .cite-tooltip.visible {
                opacity: 1;
            }
            .cite-tooltip.expanded {
                pointer-events: auto;
                max-width: 450px;
            }
            .cite-tooltip strong { color: #f8fafc; font-weight: 500; }
            .cite-textbook { color: #10B981; font-family: JetBrains Mono, monospace; font-size: 0.75rem; margin-top: 6px; }
            .cite-technical { color: #94a3b8; font-style: italic; font-size: 0.75rem; margin-top: 6px; padding-left: 8px; border-left: 2px solid #334155; }
            
            .cite-footer-container {
                margin-top: 40px;
                border-top: 1px solid #334155;
                padding-top: 20px;
                font-family: Outfit, sans-serif;
            }
            .cite-footer-header {
                color: #94a3b8;
                font-size: 0.9rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .cite-footer-header:hover { color: #f1f5f9; }
            .cite-footer-list {
                display: none;
                margin-top: 16px;
                padding-left: 0;
                list-style: none;
                font-size: 0.8rem;
                color: #94a3b8;
            }
            .cite-footer-list.open { display: block; animation: slideDown 0.3s ease-out; }
            .cite-footer-list li {
                margin-bottom: 12px;
                display: flex;
                gap: 12px;
            }
            .cite-footer-number { font-family: JetBrains Mono; color: #3B82F6; }
        `;
        document.head.appendChild(style);
    }
}

let activeTooltip = null;

/**
 * Closes the active tooltip if it's pinned open.
 */
function closeActiveTooltip() {
    if (activeTooltip) {
        if (activeTooltip.parentNode) activeTooltip.parentNode.removeChild(activeTooltip);
        activeTooltip = null;
    }
}

// Global click listener to close pinned popovers
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        if (activeTooltip && activeTooltip.classList.contains('expanded')) {
            // Did we click inside the tooltip?
            if (!activeTooltip.contains(e.target)) {
                closeActiveTooltip();
            }
        }
    });
}

/**
 * Injects a small ⓘ icon that acts as an academic citation anchor.
 * 
 * @param {string} methodKey - Key referencing CITATIONS map
 * @param {HTMLElement} containerEl - Node to append the icon to
 */
export function renderCitationIcon(methodKey, containerEl) {
    if (!containerEl) return;
    const citation = CITATIONS[methodKey];
    if (!citation) {
        console.warn(`Citation key '${methodKey}' not found.`);
        return;
    }

    ensureCitationStyles();

    const icon = document.createElement('span');
    icon.className = 'cite-icon';
    icon.textContent = 'i';
    icon.title = citation.method;

    // Track state to prevent overlap
    let localTooltip = null;
    let isPinned = false;

    const createTooltip = () => {
        if (localTooltip) return;
        closeActiveTooltip(); // Force close any others

        localTooltip = document.createElement('div');
        localTooltip.className = 'cite-tooltip';

        const html = `
            <div style="margin-bottom: 6px;"><strong>${citation.method}</strong></div>
            <div style="font-family: JetBrains Mono, monospace; line-height: 1.4;">${citation.primary}</div>
        `;
        localTooltip.innerHTML = html;
        document.body.appendChild(localTooltip);
        activeTooltip = localTooltip;
        return localTooltip;
    };

    const positionTooltip = () => {
        if (!localTooltip) return;
        const rect = icon.getBoundingClientRect();
        const tooltipRect = localTooltip.getBoundingClientRect();

        // Default: Bottom centered
        let top = rect.bottom + 8;
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

        // Viewport boundaries
        if (top + tooltipRect.height > window.innerHeight) {
            top = rect.top - tooltipRect.height - 8; // Flip to top
        }
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }

        localTooltip.style.top = `${top}px`;
        localTooltip.style.left = `${left}px`;
    };

    icon.addEventListener('mouseenter', () => {
        if (isPinned) return;
        createTooltip();
        positionTooltip();
        // Allow a DOM frame to paint before animating opacity
        requestAnimationFrame(() => localTooltip.classList.add('visible'));
    });

    icon.addEventListener('mouseleave', () => {
        if (isPinned) return;
        if (localTooltip) {
            localTooltip.classList.remove('visible');
            setTimeout(() => {
                if (!isPinned && localTooltip && localTooltip.parentNode) {
                    localTooltip.parentNode.removeChild(localTooltip);
                    if (activeTooltip === localTooltip) activeTooltip = null;
                    localTooltip = null;
                }
            }, 200); // Wait for transition
        }
    });

    icon.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop global document click check

        if (isPinned) {
            isPinned = false;
            icon.style.background = '';
            if (localTooltip) localTooltip.classList.remove('visible');
            setTimeout(() => closeActiveTooltip(), 200);
            return;
        }

        isPinned = true;
        icon.style.background = 'rgba(59, 130, 246, 0.4)';

        if (!localTooltip) createTooltip();

        // Expand the content
        let html = `
            <div style="margin-bottom: 8px;"><strong>${citation.method}</strong></div>
            <div style="font-family: JetBrains Mono, monospace; line-height: 1.4; color: #cbd5e1; margin-bottom: 8px;">${citation.primary}</div>
        `;
        if (citation.secondary) {
            html += `<div style="font-family: JetBrains Mono, monospace; line-height: 1.4; color: #94a3b8; margin-bottom: 8px;">${citation.secondary}</div>`;
        }
        if (citation.varianceReduction) {
            html += `<div style="font-family: JetBrains Mono, monospace; line-height: 1.4; color: #8B5CF6; margin-bottom: 8px;">${citation.varianceReduction}</div>`;
        }
        html += `
            <div class="cite-textbook">📖 ${citation.textbook}</div>
            <div class="cite-technical">🔧 ${citation.implementationNote}</div>
        `;

        localTooltip.innerHTML = html;
        localTooltip.classList.add('expanded');
        localTooltip.classList.add('visible');
        positionTooltip(); // Reposition since size changed
    });

    containerEl.appendChild(icon);
}


/**
 * Renders an absolute footer summarizing all the passed academic citations cleanly.
 * 
 * @param {Array<string>} methodKeys - List of string keys referencing CITATIONS
 * @param {HTMLElement} containerEl - Node to append the footer bibliography to
 */
export function renderCitationFooter(methodKeys, containerEl) {
    if (!containerEl || !methodKeys || methodKeys.length === 0) return;
    ensureCitationStyles();

    // Deduplicate valid keys
    const validKeys = [...new Set(methodKeys)].filter(k => CITATIONS[k]);
    if (validKeys.length === 0) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'cite-footer-container';

    const header = document.createElement('div');
    header.className = 'cite-footer-header';
    header.innerHTML = `<span>📚 References (${validKeys.length})</span> <span style="font-size:0.7rem;">▼</span>`;

    const list = document.createElement('ul');
    list.className = 'cite-footer-list';

    validKeys.forEach((key, index) => {
        const c = CITATIONS[key];
        const li = document.createElement('li');

        let content = `<span style="color:#f8fafc;">${c.primary}</span>`;
        if (c.secondary) content += ` <br><span style="color:#cbd5e1; font-size:0.95em;">${c.secondary}</span>`;
        if (c.textbook) content += ` <br><span style="color:#10B981; font-family:JetBrains Mono; font-size:0.9em;">See also: ${c.textbook}</span>`;

        li.innerHTML = `<span class="cite-footer-number">[${index + 1}]</span> <div>${content}</div>`;
        list.appendChild(li);
    });

    header.onclick = () => {
        const isOpen = list.classList.contains('open');
        if (isOpen) {
            list.classList.remove('open');
            header.querySelector('span:last-child').style.transform = 'rotate(0deg)';
        } else {
            list.classList.add('open');
            header.querySelector('span:last-child').style.transform = 'rotate(180deg)';
            header.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    };

    wrapper.appendChild(header);
    wrapper.appendChild(list);
    containerEl.appendChild(wrapper);
}
