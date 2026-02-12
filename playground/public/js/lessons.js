// Lesson Content Database - Enhanced for Real-World Trading

const lessons = {
    // Module 1: Introduction to Options
    '1-1': {
        title: 'What are Options?',
        content: `
            <h2>What are Options?</h2>
            <p>At its core, an <strong>option</strong> is a contract ensuring a specific price for an asset in the future. It's not just a gambling tool; it's a strategic instrument for <strong>risk transfer</strong>.</p>
            
            <div class="pro-tip">
                <h4>Trader's Mindset</h4>
                <p>Don't think of options as "cheaper stocks". Think of them as <strong>renting exposure</strong> or <strong>selling insurance</strong>. You are trading time and probability, not just price.</p>
            </div>

            <h3>The Two Types</h3>
            <ul>
                <li><strong>Call Option:</strong> The right to buy. You profit if the asset soars.</li>
                <li><strong>Put Option:</strong> The right to sell. You profit if the asset crashes.</li>
            </ul>

            <h3>Key Contract Specs</h3>
            <div class="example-box">
                <h4>Example: AAPL 150 Call Expiring Dec 20</h4>
                <ul>
                    <li><strong>Underlying:</strong> Apple Inc. (AAPL)</li>
                    <li><strong>Strike (K):</strong> $150 (The price you can buy at)</li>
                    <li><strong>Expiration (T):</strong> Dec 20 (The deadline)</li>
                    <li><strong>Multiplier:</strong> 100 shares per contract</li>
                </ul>
            </div>
        `
    },
    '1-2': {
        title: 'Call vs Put Options',
        content: `
            <h2>Call vs Put Options</h2>
            <p>Understanding the four basic positions is critical before constructing complex strategies.</p>

            <h3>1. Long Call (Bullish)</h3>
            <p>You pay a premium to buy upside.
            <br><strong>Use case:</strong> You expect a rapid move up soon.
            <br><strong>Risk:</strong> Limited to premium paid.
            <br><strong>Reward:</strong> Unlimited.</p>

            <h3>2. Short Call (Bearish/Neutral)</h3>
            <p>You collect premium (selling insurance) but take on risk.
            <br><strong>Use case:</strong> You think the market will stay flat or fall.
            <br><strong>Risk:</strong> Unlimited (if stock moons).
            <br><strong>Reward:</strong> Limited to premium received.</p>

            <div class="pro-tip">
                <h4>Pro Tip: Defining Risk</h4>
                <p>Professional traders often prefer <strong>selling options</strong> (shorting) to collect Time Decay (Theta), but they always hedge the "unlimited risk" tail, creating Spreads.</p>
            </div>

            <h3>3. Long Put (Bearish)</h3>
            <p>Profit from a crash.
            <br><strong>Use case:</strong> Portfolio protection (hedging) or speculating on a drop.</p>

            <h3>4. Short Put (Bullish/Neutral)</h3>
            <p>Paid to buy the dip.
            <br><strong>Use case:</strong> You want to own the stock at a lower price and get paid to wait.</p>
        `
    },
    '1-3': {
        title: 'Payoff Diagrams',
        content: `
            <h2>Payoff Diagrams</h2>
            <p>Visualizing your P&L at expiration is the first step in risk management. A payoff diagram plots <strong>Stock Price at Expiration (X-axis)</strong> vs <strong>Profit/Loss (Y-axis)</strong>.</p>

            <div class="formula-box">
                Call Payoff = max(S - K, 0) - Premium<br>
                Put Payoff = max(K - S, 0) - Premium
            </div>

            <h3>Why shapes matter?</h3>
            <ul>
                <li><strong>Hockey Stick:</strong> Long options have a flat loss (premium) and sloped profit.</li>
                <li><strong>Roof Shape:</strong> Short straddles/strangles profit in a range.</li>
            </ul>

            <div class="example-box">
                <h4>Interactive Learning</h4>
                <p>Go to the "Strategy Builder" exercise later to draw these yourself. Notice how the "Break-even point" shifts as you pay more premium.</p>
            </div>
        `
    },
    '1-4': {
        title: 'Intrinsic vs Extrinsic Value',
        content: `
            <h2>Intrinsic vs Extrinsic Value</h2>
            <p>The price of an option implies two things: "Is it worth something now?" and "Might it be worth more later?"</p>

            <div class="formula-box">
                Option Price = Intrinsic Value + Extrinsic Value
            </div>

            <h3>Intrinsic Value (Tangible)</h3>
            <p>The real equity value. If you exercised right now, what would you get?</p>
            <ul>
                <li><strong>ITM Call:</strong> Stock Price - Strike</li>
                <li><strong>OTM Call:</strong> Zero (Negative value is not possible)</li>
            </ul>

            <h3>Extrinsic Value (Hope/Time)</h3>
            <p>Everything else. It consists of <span class="key-concept">Time Value</span> and <span class="key-concept">Volatility Value</span>.</p>
            
            <div class="pro-tip">
                <h4>Trading Implication</h4>
                <p><strong>OTM options are 100% Extrinsic Value.</strong> They are "pure hope". This means they decay the fastest as time passes (Theta burn). Professionals sell extrinsic value and buy intrinsic value.</p>
            </div>
        `
    },

    // Module 2: Black-Scholes
    '2-1': {
        title: 'The Black-Scholes Formula',
        content: `
            <h2>The Black-Scholes Formula</h2>
            <p>Published in 1973, this formula revolutionized finance by providing a theoretical way to value an option.</p>

            <div class="formula-box">
                C = S N(d₁) - K e⁻ʳᵀ N(d₂)
            </div>

            <h3>Deconstruct It</h3>
            <ul>
                <li><strong>S N(d₁):</strong> The expected value of receiving the stock (weighted by probability).</li>
                <li><strong>K e⁻ʳᵀ N(d₂):</strong> The expected cost of paying the strike price (discounted to today).</li>
            </ul>
            <p>Essentially: <em>Benefit - Cost = Fair Value</em>.</p>
        `
    },
    '2-2': {
        title: 'Model Assumptions',
        content: `
            <h2>Model Assumptions & Flaws</h2>
            <p>The model is a theoretical ideal. Real markets are messier. Knowing <em>where</em> it fails is where traders make money.</p>

            <h3>The "Big Lie": Constant Volatility</h3>
            <p>BS assumes volatility ($\sigma$) is constant until expiration. In reality, volatility changes wildly (earnings, crashes). This leads to the "Volatility Smile".</p>

            <h3>The "Fat Tail" Problem</h3>
            <p>BS assumes normal distribution (Bell curve). Real markets have <strong>Black Swans</strong> (crashes happen more often than the model predicts). This makes OTM Puts more expensive than the model says they should be.</p>

            <div class="pro-tip">
                <h4>Arbitrage Alert</h4>
                <p>If you blindly trust the model price, you might sell cheap OTM puts and get wiped out in a crash. Always respect the market's pricing of tail risk.</p>
            </div>
        `
    },
    '2-3': {
        title: 'd1 and d2 Explained',
        content: `
            <h2>d₁ and d₂ Explained</h2>
            <p>These mysterious terms appear inside the Cumulative Distribution Function $N(\cdot)$.</p>

            <h3>N(d₂): Probability of Exercise</h3>
            <p>Roughly the probability that the option finishes <strong>In-The-Money (ITM)</strong> in a "risk-neutral" world.
            <br><em>Example:</em> If $N(d_2) = 0.30$, there is a ~30% chance the option pays out.</p>

            <h3>N(d₁): The Hedge Ratio (Delta)</h3>
            <p>Consider this your <strong>Delta</strong>. It tells you how much stock to hold to be perfectly hedged.
            <br><em>Why is $N(d_1) > N(d_2)$?</em> Because when options finish ITM, they are often <em>deep</em> ITM, contributing more value than just the probability suggests.</p>
        `
    },
    '2-4': {
        title: 'Put-Call Parity',
        content: `
            <h2>Put-Call Parity</h2>
            <p>The iron law of options. It ties Calls, Puts, Stock, and Cash together. If this breaks, free money (arbitrage) exists.</p>

            <div class="formula-box">
                Call - Put = Stock - PV(Strike)
            </div>

            <h3>Synthetic Positions</h3>
            <p>You can create "Synthetic Stock" by buying a Call and selling a Put at the same strike.</p>

            <div class="example-box">
                <h4>Real Application: Conversion/Reversal</h4>
                <p>Market Makers use this to lock in risk-free profit if options prices drift out of line with the stock price. For retail traders, it explains why you don't need to trade the stock itself to get existing exposure.</p>
            </div>
        `
    },

    // Module 3: Greeks (The Core)
    '3-1': {
        title: 'Delta: Price Sensitivity',
        content: `
            <h2>Delta ($\Delta$): The Speed</h2>
            <p>Delta answers: "If the stock moves $1, how much does my option value change?"</p>

            <div class="formula-box">
                $\Delta$ = Change in Option Price / Change in Stock Price
            </div>

            <h3>Three Interpretations</h3>
            <enumerate>
                <li><strong>Speed:</strong> A 0.50 delta call moves $0.50 for every $1 stock move.</li>
                <li><strong>Probability:</strong> A 0.30 delta call has roughly a 30% chance of expiring ITM.</li>
                <li><strong>Hedge Ratio:</strong> To hedge 1 contract (100 shares) of 0.50 delta calls, you need to sell 50 shares of stock.</li>
            </enumerate>

            <div class="pro-tip">
                <h4>Use Case: Delta Neutrality</h4>
                <p>Market makers don't bet on direction. They buy an option and sell stock against it (Delta Hedging) to remove directional risk and purely trade Volatility.</p>
            </div>
        `
    },
    '3-2': {
        title: 'Gamma: Delta\'s Acceleration',
        content: `
            <h2>Gamma ($\Gamma$): The Acceleration</h2>
            <p>Gamma is the rate of change of Delta. It measures the <strong>curvature</strong>/convexity of your position.</p>

            <h3>Why it scares traders?</h3>
            <ul>
                <li><strong>Long Gamma (Buying Options):</strong> Your delta helps you. As stock rises, delta rises (you get longer). As stock falls, delta falls (you get shorter). You buy low, sell high automatically.</li>
                <li><strong>Short Gamma (Selling Options):</strong> The widow-maker. As stock rises (against your short call), your delta rises (you get shorter, losing faster). You are forced to buy high and sell low to hedge.</li>
            </ul>

            <div class="example-box">
                <h4>Gamma Risk</h4>
                <p>ATM options near expiration have <strong>Explosive Gamma</strong>. A small move can flip delta from 0 to 1 instantly. This is "Pin Risk".</p>
            </div>
        `
    },
    '3-3': {
        title: 'Vega: Volatility Sensitivity',
        content: `
            <h2>Vega ($\nu$): The Volatility Exposure</h2>
            <p>Vega measures sensitivity to <strong>Implied Volatility (IV)</strong> changes. It is NOT constant.</p>

            <div class="formula-box">
                Vega = Change in Price per 1% change in IV
            </div>

            <h3>The "Vega Crush"</h3>
            <p>Traders often buy calls before earnings thinking "Stock will pop!". The stock pops 5%, but the option <em>loses value</em>. Why?
            <br><strong>IV Crush.</strong> The uncertainty event passed, IV dropped from 100% to 50%, and Vega losses outweighed Delta gains.</p>

            <div class="pro-tip">
                <h4>Long vs Short Vega</h4>
                <p>Long Term options (LEAPS) are massive Vega plays. Short Term options are Gamma/Theta plays.</p>
            </div>
        `
    },
    '3-4': {
        title: 'Theta: Time Decay',
        content: `
            <h2>Theta ($\Theta$): The Rent Bill</h2>
            <p>Theta is the amount an option loses every day purely due to time passing.</p>

            <h3>The Decay Curve</h3>
            <p>Time decay is roughly square-root.
            <ul>
                <li><strong>45 Days out:</strong> Slow, steady decay.</li>
                <li><strong>7 Days out:</strong> Rapid acceleration.</li>
                <li><strong>ATM Options:</strong> Highest Theta burn.</li>
            </ul></p>

            <div class="example-box">
                <h4>Theta Gang Strategy</h4>
                <p>Selling 30-45 day options takes advantage of the "acceleration point" of the Theta curve. You sell the "meat" of the curve.</p>
            </div>
        `
    },
    '3-5': {
        title: 'Rho: Interest Rate Risk',
        content: `
            <h2>Rho ($\rho$): The Cost of Carry</h2>
            <p>Often ignored in low-rate environments, but critical when rates are 5%+.</p>

            <h3>The Logic</h3>
            <p>Buying a Call is like buying stock on margin (you leverage your capital). Higher rates make leverage expensive, so <strong>Calls benefit from high rates</strong> (the cash you didn't spend on stock earns interest).</p>
            <p>Puts lose value as rates rise.</p>

            <div class="pro-tip">
                <h4>LEAPS Warning</h4>
                <p>For a 2-year option, a 1% rate hike can change the price by 10-15%. Don't ignore Rho on long-term trades.</p>
            </div>
        `
    },

    // Module 4: Volatility Dynamics
    '4-1': {
        title: 'Implied Volatility (IV)',
        content: `
            <h2>Implied Volatility (IV)</h2>
            <p>IV is not "historical volatility". It is the market's <strong>consensus forecast</strong> of future range.</p>

            <h3>The Fear Index</h3>
            <p>Options prices are determined by supply and demand. If everyone rushes to buy Puts for protection, prices rise. The Black-Scholes model interprets this price rise as higher IV.</p>
            
            <div class="formula-box">
                IV = BS_Inverse(Market_Price)
            </div>
            
            <p>It is the only unobservable parameter in the model. We solve for it backwards.</p>
        `
    },
    '4-2': {
        title: 'The Volatility Smile',
        content: `
            <h2>The Volatility Smile/Skew</h2>
            <p>Before 1987, IV was flat across strikes. After the Black Monday crash, traders realized "Crashes happen faster than rallies".</p>

            <h3>Put Skew</h3>
            <p>OTM Puts trade at much higher valuations (higher IV) than Calls. This creates a "Smirk" or "Skew".</p>
            
            <div class="example-box">
                <h4>Trading Implication</h4>
                <p>If you sell an OTM Put, you are selling "expensive" volatility. If you buy an OTM Call, you are buying "cheap" volatility. This is why <strong>Risk Reversals</strong> (Sell Put, Buy Call) are popular.</p>
            </div>
        `
    },
    '4-3': {
        title: 'SVI Parameterization',
        content: `
            <h2>SVI: Modeling the Smile</h2>
            <p>Traders don't just use one IV number. They model the whole surface. <strong>SVI (Stochastic Volatility Inspired)</strong> is a standard industry model to draw a smooth curve through messy market data.</p>

            <p>It ensures the surface is "Arbitrage Free" (no free money). If your custom pricing model generates a surface with "holes" (negative probabilities), algorithms will pick you off.</p>
        `
    },
    '4-4': {
        title: 'Arbitrage-Free Surfaces',
        content: `
            <h2>Arbitrage-Free Logic</h2>
            <p>A valid surface must obey logic:</p>
            <ul>
                <li><strong>Calendar Arb:</strong> Variance cannot decrease with time (uncertainty always grows).</li>
                <li><strong>Butterfly Arb:</strong> Butterfly spreads cannot have negative prices (probability < 0).</li>
            </ul>

            <div class="pro-tip">
                <h4>Quants vs Traders</h4>
                <p>Quants build these constraints into models (like the Rust engine here) to ensure quotes are safe to trade on automated systems.</p>
            </div>
        `
    },

    // Module 5: Strategies
    '5-1': {
        title: 'Delta Hedging',
        content: `
            <h2>Delta Hedging</h2>
            <p>The foundation of Market Making.</p>

            <h3>The Process</h3>
            <enumerate>
                <li>Sell an ATM Call (Short Delta, say -0.50).</li>
                <li>Buy 50 shares of Stock (Long Delta, +0.50).</li>
                <li>Net Delta = 0.</li>
                <li>Stock moves up? Call delta becomes -0.60. Net Delta = -0.10.</li>
                <li>Buy 10 more shares to re-hedge.</li>
            </enumerate>

            <p>This "Buy High, Sell Low" action is the cost of the short gamma position.</p>
        `
    },
    '5-2': {
        title: 'Gamma Scalping',
        content: `
            <h2>Gamma Scalping</h2>
            <p>Turning volatility into cash. Requires a <strong>Long Gamma</strong> position (e.g., Long Straddle).</p>

            <h3>The Mechanic</h3>
            <enumerate>
                <li>You own ATM Straddle (Delta 0).</li>
                <li>Stock Rallies (+). Your Delta becomes positive (+0.10).</li>
                <li>To get back to neutral, you <strong>Sell Shares</strong> (Sell High).</li>
                <li>Stock Crashes (-). Your Delta becomes negative (-0.10).</li>
                <li>To get back to neutral, you <strong>Buy Shares</strong> (Buy Low).</li>
            </enumerate>

            <div class="pro-tip">
                <h4>The Goal</h4>
                <p>Generate enough profit from scalping (trading the stock) to pay for the daily Theta burn of the options.</p>
            </div>
        `
    },
    '5-3': {
        title: 'Volatility Trading',
        content: `
            <h2>Volatility Trading</h2>
            <p>Trading the "Fear" itself.</p>

            <h3>Long Vol (Straddles)</h3>
            <p>Betting that the market move will be <em>larger</em> than what is priced in.</p>

            <h3>Short Vol (Iron Condors / Short Strangles)</h3>
            <p>Betting that the market is over-pricing fear. You profit if the stock stays within a range.</p>

            <div class="key-concept">Statistical Edge</div>
            <p>Historically, Implied Volatility overstates Realized Volatility by ~1-2%. This "Variance Risk Premium" is why shorting volatility is a popular (but dangerous) strategy.</p>
        `
    },
    '5-4': {
        title: 'Spreads and Combinations',
        content: `
            <h2>Defined Risk Spreads</h2>
            <p>Never trade naked options unless you have a massive bankroll.</p>

            <h3>Vertical Spreads</h3>
            <p>Buy one Strike, Sell another.
            <br><em>bull Call Spread:</em> Profit from up move, but cap max gain to reduce cost.</p>

            <h3>Iron Condor</h3>
            <p>Sell a Call Spread AND Sell a Put Spread.
            <br>Profit if stock stays boring. A pure "Theta" play.</p>
        `
    },

    // Module 6: Advanced Quant Topics
    '6-1': {
        title: 'Automatic Differentiation',
        content: `
            <h2>Automatic Differentiation (AD)</h2>
            <p>How do we calculate Greeks? Two ways:</p>
            
            <h3>1. Finite Differences (Bumping)</h3>
            <p>Calculate Price(S). Calculate Price(S + 0.01). Find slope.
            <br><em>Problem:</em> Slow (2x calcs) and inaccurate (rounding errors).</p>

            <h3>2. Automatic Differentiation (The Rust Engine Way)</h3>
            <p>We trace the code execution graph and carry the derivative alongside the value ($x + dx$).
            <br><em>Benefit:</em> <strong>Exact Delta and Vega</strong> in a single pass. Sub-microsecond speed.</p>
        `
    },
    '6-2': {
        title: 'Numerical Methods',
        content: `
            <h2>Numerical Methods</h2>
            <p>Not everything has a formula.</p>

            <h3>Monte Carlo</h3>
            <p>Simulate 1,000,000 random price paths. Average the payoff.
            <br><em>Use case:</em> Path-dependent options (Asian options, Barriers).</p>

            <h3>Binomial Trees</h3>
            <p>Build a lattice of "Up" and "Down" moves.
            <br><em>Use case:</em> American options (early exercise risk).</p>
        `
    },
    '6-3': {
        title: 'Risk Management',
        content: `
            <h2>Risk Management Dashboard</h2>
            <p>How Pro Desks manage risk.</p>

            <h3>VaR (Value at Risk)</h3>
            <p>"We are 99% confident we won't lose more than $1M tomorrow."</p>

            <h3>Scenario Analysis</h3>
            <p>Stress tests: "What if S&P 500 drops 10% AND Volatility spikes 50%?"
            <br>Correlations tend to go to 1.0 during crashes. Diversification often fails when you need it most.</p>
        `
    },
    '6-4': {
        title: 'Real-World Applications',
        content: `
            <h2>Real-World Applications</h2>
            
            <h3>Market Makers</h3>
            <p>Citadel, Susquehanna. They don't gamble. They provide liquidity and earn the Bid-Ask spread.</p>

            <h3>Dispersion Trading</h3>
            <p>Selling Index Volatility vs Buying Single Stock Volatility. Betting that stocks will move, but in inactive directions (canceling each other out).</p>

            <div class="example-box">
                <h4>Final Word</h4>
                <p>Trading options without understanding Greeks is like flying a plane without instruments. You might survive for a while, but eventually, you will fly into a mountain. Use this calculator to master the instruments.</p>
            </div>
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
