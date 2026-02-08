// Lesson Content Database

const lessons = {
    // Module 1: Introduction
    '1-1': {
        title: 'What are Options?',
        content: `
            <h2>What are Options?</h2>
            <p>An <strong>option</strong> is a financial contract that gives the buyer the <em>right, but not the obligation</em>, to buy or sell an underlying asset at a specific price (strike) on or before a certain date (expiration).</p>
            <h3>Key Concepts</h3>
            <ul>
                <li><strong>Call Option:</strong> Right to buy.</li>
                <li><strong>Put Option:</strong> Right to sell.</li>
                <li><strong>Premium:</strong> The price paid for the option.</li>
                <li><strong>Strike Price (K):</strong> The pre-agreed price.</li>
            </ul>
        `
    },
    '1-2': {
        title: 'Call vs Put Options',
        content: `
            <h2>Call vs Put Options</h2>
            <p>Calls and Puts are the building blocks of all option strategies.</p>
            <h3>Call Options (Long)</h3>
            <p>Rises in value when the underlying asset price goes up. Unlimited profit potential, limited risk (premium paid).</p>
            <h3>Put Options (Long)</h3>
            <p>Rises in value when the underlying asset price goes down. Substantial profit potential (until stock hits 0), limited risk.</p>
        `
    },
    '1-3': {
        title: 'Payoff Diagrams',
        content: `
            <h2>Payoff Diagrams</h2>
            <p>A payoff diagram shows the profit or loss of an option strategy at expiration for a range of underlying prices.</p>
            <h3>Long Call Payoff</h3>
            <p><code>max(S - K, 0) - Premium</code></p>
            <h3>Long Put Payoff</h3>
            <p><code>max(K - S, 0) - Premium</code></p>
            <div class="practice-prompt"><p>💡 <strong>Try it:</strong> Visualize payoffs in the Strategy Builder exercise.</p></div>
        `
    },
    '1-4': {
        title: 'Intrinsic vs Extrinsic Value',
        content: `
            <h2>Intrinsic vs Extrinsic Value</h2>
            <p>Option Price = Intrinsic Value + Extrinsic Value</p>
            <h3>Intrinsic Value</h3>
            <p>The real value if exercised immediately. For a call, it's <code>max(S - K, 0)</code>.</p>
            <h3>Extrinsic Value (Time Value)</h3>
            <p>The additional premium reflecting time to expiration and volatility. This decays to zero at expiration.</p>
        `
    },

    // Module 2: Black-Scholes
    '2-1': {
        title: 'The Black-Scholes Formula',
        content: `
            <h2>The Black-Scholes Formula</h2>
            <p>The Nobel Prize-winning formula for pricing European options.</p>
            <div class="formula-box">
                <p>C = S N(d₁) - K e⁻ʳᵀ N(d₂)</p>
                <p>P = K e⁻ʳᵀ N(-d₂) - S N(-d₁)</p>
            </div>
            <p>It assumes log-normal price distribution and constant volatility.</p>
        `
    },
    '2-2': {
        title: 'Model Assumptions',
        content: `
            <h2>Model Assumptions</h2>
            <ul>
                <li><strong>Log-normal returns:</strong> Prices can't be negative.</li>
                <li><strong>Constant volatility:</strong> Volatility is known and constant (a major limitation).</li>
                <li><strong>Frictionless markets:</strong> No transaction costs or taxes.</li>
                <li><strong>European style:</strong> Can only exercise at expiration.</li>
            </ul>
        `
    },
    '2-3': {
        title: 'd1 and d2 Explained',
        content: `
            <h2>d₁ and d₂ Explained</h2>
            <p>The terms d₁ and d₂ in the Black-Scholes formula have probabilistic interpretations.</p>
            <ul>
                <li><strong>N(d₂):</strong> The probability that the option finishes in-the-money (risk-neutral).</li>
                <li><strong>N(d₁):</strong> Related to the delta. For a call, Delta ≈ N(d₁). represents the hedge ratio.</li>
            </ul>
        `
    },
    '2-4': {
        title: 'Put-Call Parity',
        content: `
            <h2>Put-Call Parity</h2>
            <p>A fundamental relationship between call and put prices with the same strike and expiration.</p>
            <div class="formula-box"><p>C - P = S - K e⁻ʳᵀ</p></div>
            <p>This implies you can create a synthetic position: <code>Long Call + Short Put = Long Stock - PV(Strike)</code>.</p>
        `
    },

    // Module 3: Greeks
    '3-1': {
        title: 'Delta: Price Sensitivity',
        content: `
            <h2>Delta (Δ)</h2>
            <p>Measures the rate of change of option price with respect to the underlying price.</p>
            <ul>
                <li><strong>Call Delta:</strong> 0 to 1</li>
                <li><strong>Put Delta:</strong> -1 to 0</li>
                <li><strong>ATM Delta:</strong> ≈ 0.5</li>
            </ul>
            <p>Used for hedging: To hedge 100 calls with 0.5 delta, sell 50 shares.</p>
        `
    },
    '3-2': {
        title: 'Gamma: Delta\'s Rate of Change',
        content: `
            <h2>Gamma (Γ)</h2>
            <p>Measures the rate of change of Delta. It's the "acceleration" of option price.</p>
            <ul>
                <li>Highest for ATM options.</li>
                <li>High gamma means delta changes rapidly (high risk).</li>
                <li>Positive for long options, negative for short options.</li>
            </ul>
        `
    },
    '3-3': {
        title: 'Vega: Volatility Sensitivity',
        content: `
            <h2>Vega (ν)</h2>
            <p>Measures sensitivity to Implied Volatility (IV).</p>
            <p>If Vega is 0.10, a 1% increase in IV adds $0.10 to the option price.</p>
            <p>Long options have positive Vega (benefit from rising vol).</p>
        `
    },
    '3-4': {
        title: 'Theta: Time Decay',
        content: `
            <h2>Theta (Θ)</h2>
            <p>Measures the rate of value loss due to the passage of time.</p>
            <p>Usually negative for long options ("time decay").</p>
            <p>Accelerates as expiration approaches, especially for ATM options.</p>
        `
    },
    '3-5': {
        title: 'Rho: Interest Rate Risk',
        content: `
            <h2>Rho (ρ)</h2>
            <p>Measures sensitivity to the risk-free interest rate.</p>
            <p>Often less significant than other Greeks for short-term options, but important for LEAPS.</p>
            <p>Call Rho is positive; Put Rho is negative.</p>
        `
    },

    // Module 4: Volatility Surface
    '4-1': {
        title: 'Implied Volatility',
        content: `
            <h2>Implied Volatility (IV)</h2>
            <p>The market's forecast of specific future volatility, backed out from the option price.</p>
            <p>High IV means expensive options (high expected move).</p>
            <p>Low IV means cheap options (low expected move).</p>
        `
    },
    '4-2': {
        title: 'The Volatility Smile',
        content: `
            <h2>The Volatility Smile</h2>
            <p>In reality, IV is not constant across strikes. OTM puts often trade at higher IV (crash protection), creating a "skew" or "smile".</p>
            <p>This contradicts simple Black-Scholes which assumes constant vol.</p>
        `
    },
    '4-3': {
        title: 'SVI Parameterization',
        content: `
            <h2>SVI Parameterization</h2>
            <p>Stochastic Volatility Inspired (SVI) is a standard model to fit the volatility surface.</p>
            <p>It uses 5 parameters (a, b, ρ, m, σ) to describe the smile shape, ensuring a smooth, arbitrage-free curve.</p>
        `
    },
    '4-4': {
        title: 'Arbitrage-Free Surfaces',
        content: `
            <h2>Arbitrage-Free Surfaces</h2>
            <p>A valid volatility surface must not allow risk-free profit.</p>
            <ul>
                <li><strong>Calendar Arbitrage:</strong> Longer dated variance > Shorter dated.</li>
                <li><strong>Butterfly Arbitrage:</strong> Probability density must be non-negative.</li>
            </ul>
        `
    },

    // Module 5: Strategies
    '5-1': {
        title: 'Delta Hedging',
        content: `
            <h2>Delta Hedging</h2>
            <p>Neutralizing directional risk.</p>
            <p>If you are Long Gamma (Long Straddle), you profit from large moves. As the stock moves, your delta changes, and you re-hedge (buy low, sell high) to lock in profit.</p>
        `
    },
    '5-2': {
        title: 'Gamma Scalping',
        content: `
            <h2>Gamma Scalping</h2>
            <p>An active strategy for long volatility positions.</p>
            <p>As the asset moves, you adjust your stock hedge to return to delta neutral. This trading activity generates profit that offsets daily theta decay.</p>
        `
    },
    '5-3': {
        title: 'Volatility Trading',
        content: `
            <h2>Volatility Trading</h2>
            <p>Trading Vega instead of Delta.</p>
            <ul>
                <li><strong>Long Straddle:</strong> Buy Call + Buy Put. Profit if vol rises or big move.</li>
                <li><strong>Short Straddle:</strong> Sell Call + Sell Put. Profit if vol falls or market stays flat.</li>
            </ul>
        `
    },
    '5-4': {
        title: 'Spreads and Combinations',
        content: `
            <h2>Spreads</h2>
            <p>Combining options to shape risk/reward.</p>
            <ul>
                <li><strong>Vertical Spread:</strong> Buy one strike, sell another. Limits risk and reward.</li>
                <li><strong>Iron Condor:</strong> Sell OTM call spread and OTM put spread. Neutral strategy.</li>
            </ul>
        `
    },

    // Module 6: Advanced
    '6-1': {
        title: 'Automatic Differentiation',
        content: `
            <h2>Automatic Differentiation (AD)</h2>
            <p>A computational technique to calculate exact derivatives (Greeks).</p>
            <p>Unlike finite differences (bumping inputs), AD is precise to machine accuracy and very fast.</p>
        `
    },
    '6-2': {
        title: 'Numerical Methods',
        content: `
            <h2>Numerical Methods</h2>
            <p>Used when analytical formulas (like Black-Scholes) don't exist.</p>
            <ul>
                <li><strong>Monte Carlo:</strong> Simulate millions of price paths.</li>
                <li><strong>Binomial Trees:</strong> Step-by-step price evolution (good for American options).</li>
            </ul>
        `
    },
    '6-3': {
        title: 'Risk Management',
        content: `
            <h2>Risk Management</h2>
            <p>Monitoring Portfolio Greeks.</p>
            <p><strong>Value at Risk (VaR):</strong> Max expected loss over a time horizon.</p>
            <p>Scenario Analysis: "What happens if market drops 10% and vol spikes 50%?"</p>
        `
    },
    '6-4': {
        title: 'Real-World Applications',
        content: `
            <h2>Real-World Applications</h2>
            <ul>
                <li><strong>Market Makers:</strong> Provide liquidity, profit from bid-ask spread, hedge Greeks.</li>
                <li><strong>Hedge Funds:</strong> Volatility arbitrage, tail hedging.</li>
                <li><strong>Corporate Treasuries:</strong> Hedge FX or commodity exposure.</li>
            </ul>
        `
    }
};

// Lesson navigation
function loadLesson(lessonId) {
    const lesson = lessons[lessonId];
    if (!lesson) {
        document.getElementById('lessonDisplay').innerHTML = '<h2>Lesson Content Coming Soon</h2><p>This lesson is currently being updated.</p>';
        return;
    }

    const display = document.getElementById('lessonDisplay');
    display.innerHTML = lesson.content;

    // Update active state
    document.querySelectorAll('.lesson-list li').forEach(li => {
        li.classList.remove('active');
    });
    const activeItem = document.querySelector(`[data-lesson="${lessonId}"]`);
    if (activeItem) activeItem.classList.add('active');

    // Scroll to top
    display.scrollTop = 0;
}

// Initialize lesson navigation
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.lesson-list li').forEach(li => {
        li.addEventListener('click', () => {
            const lessonId = li.dataset.lesson;
            loadLesson(lessonId);
        });
    });

    // Module expand/collapse
    document.querySelectorAll('.module-header').forEach(header => {
        header.addEventListener('click', () => {
            const lessonList = header.nextElementSibling;
            lessonList.style.display = lessonList.style.display === 'none' ? 'block' : 'none';
        });
    });
});
