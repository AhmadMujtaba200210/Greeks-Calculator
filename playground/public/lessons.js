// Lesson Content Database

const lessons = {
    '1-1': {
        title: 'What are Options?',
        content: `
            <h2>What are Options?</h2>
            
            <p>An <strong>option</strong> is a financial derivative that gives the buyer the <em>right, but not the obligation</em>, to buy or sell an underlying asset at a predetermined price (the strike price) before or on a specific date (the expiration date).</p>

            <h3>Key Characteristics</h3>
            <ul>
                <li><strong>Right, not obligation:</strong> Unlike futures, you can choose not to exercise</li>
                <li><strong>Premium:</strong> The price you pay to buy the option</li>
                <li><strong>Limited risk for buyers:</strong> Maximum loss is the premium paid</li>
                <li><strong>Leverage:</strong> Control large positions with small capital</li>
            </ul>

            <h3>Why Trade Options?</h3>
            <div class="info-box">
                <p><strong>Hedging:</strong> Protect existing positions from adverse price movements</p>
                <p><strong>Speculation:</strong> Profit from price movements with limited capital</p>
                <p><strong>Income Generation:</strong> Sell options to collect premium</p>
                <p><strong>Volatility Trading:</strong> Profit from changes in market volatility</p>
            </div>

            <h3>Interactive Example</h3>
            <p>Imagine a stock trading at $100. You believe it will go up, so you buy a call option with a strike price of $100 for a premium of $5.</p>
            
            <p><strong>Scenario 1:</strong> Stock rises to $120</p>
            <p>→ Exercise the option: Buy at $100, sell at $120 = $20 profit</p>
            <p>→ Subtract premium: $20 - $5 = <span class="highlight">$15 net profit</span></p>

            <p><strong>Scenario 2:</strong> Stock falls to $80</p>
            <p>→ Don't exercise (worthless)</p>
            <p>→ Loss limited to premium: <span class="highlight">-$5 loss</span></p>

            <div class="practice-prompt">
                <p>💡 <strong>Try it yourself:</strong> Go to the Playground and experiment with different spot prices to see how option value changes!</p>
            </div>
        `
    },

    '1-2': {
        title: 'Call vs Put Options',
        content: `
            <h2>Call vs Put Options</h2>

            <h3>Call Options</h3>
            <p>A <strong>call option</strong> gives you the right to <em>buy</em> the underlying asset at the strike price.</p>
            
            <div class="formula-box">
                <p><strong>Payoff at Expiration:</strong></p>
                <p>max(S - K, 0)</p>
                <p>where S = spot price, K = strike price</p>
            </div>

            <p><strong>When to buy calls:</strong></p>
            <ul>
                <li>You expect the price to rise</li>
                <li>You want leverage on upside movement</li>
                <li>You want to limit downside risk</li>
            </ul>

            <h3>Put Options</h3>
            <p>A <strong>put option</strong> gives you the right to <em>sell</em> the underlying asset at the strike price.</p>
            
            <div class="formula-box">
                <p><strong>Payoff at Expiration:</strong></p>
                <p>max(K - S, 0)</p>
            </div>

            <p><strong>When to buy puts:</strong></p>
            <ul>
                <li>You expect the price to fall</li>
                <li>You want to hedge a long position</li>
                <li>You want downside protection</li>
            </ul>

            <h3>Comparison Table</h3>
            <table class="comparison-table">
                <tr>
                    <th>Feature</th>
                    <th>Call Option</th>
                    <th>Put Option</th>
                </tr>
                <tr>
                    <td>Right to</td>
                    <td>Buy</td>
                    <td>Sell</td>
                </tr>
                <tr>
                    <td>Profit when</td>
                    <td>Price rises</td>
                    <td>Price falls</td>
                </tr>
                <tr>
                    <td>Max profit</td>
                    <td>Unlimited</td>
                    <td>Strike price (limited)</td>
                </tr>
                <tr>
                    <td>Max loss</td>
                    <td>Premium paid</td>
                    <td>Premium paid</td>
                </tr>
            </table>

            <div class="practice-prompt">
                <p>🎮 <strong>Practice:</strong> Switch between Call and Put in the Playground and observe how Greeks change!</p>
            </div>
        `
    },

    '3-1': {
        title: 'Delta: Price Sensitivity',
        content: `
            <h2>Delta (Δ): Price Sensitivity</h2>

            <p>Delta measures how much the option price changes when the underlying price changes by $1.</p>

            <div class="formula-box">
                <p><strong>Mathematical Definition:</strong></p>
                <p>Δ = ∂V/∂S</p>
                <p>where V = option value, S = spot price</p>
            </div>

            <h3>Delta Ranges</h3>
            <ul>
                <li><strong>Call options:</strong> 0 to 1</li>
                <li><strong>Put options:</strong> -1 to 0</li>
            </ul>

            <h3>Interpretation</h3>
            <p>A delta of 0.5 means:</p>
            <ul>
                <li>If the stock goes up $1, the option gains $0.50</li>
                <li>If the stock goes down $1, the option loses $0.50</li>
                <li>The option has a ~50% probability of finishing in-the-money</li>
            </ul>

            <h3>Delta by Moneyness</h3>
            <div class="info-box">
                <p><strong>Deep ITM calls:</strong> Delta ≈ 1 (moves 1-to-1 with stock)</p>
                <p><strong>ATM calls:</strong> Delta ≈ 0.5 (moves half as much)</p>
                <p><strong>Deep OTM calls:</strong> Delta ≈ 0 (barely moves)</p>
            </div>

            <h3>Delta Hedging</h3>
            <p>To create a <strong>delta-neutral</strong> position:</p>
            <p>If you own 100 call options with delta = 0.6:</p>
            <p>→ Sell 60 shares of stock (100 × 0.6 = 60)</p>
            <p>→ Now your position is insensitive to small price moves</p>

            <div class="practice-prompt">
                <p>📊 <strong>Visualize:</strong> In the Playground, watch how delta changes as you move the spot price slider!</p>
            </div>
        `
    },

    '3-2': {
        title: 'Gamma: Delta\'s Rate of Change',
        content: `
            <h2>Gamma (Γ): Delta's Rate of Change</h2>

            <p>Gamma measures how much delta changes when the underlying price changes by $1.</p>

            <div class="formula-box">
                <p><strong>Mathematical Definition:</strong></p>
                <p>Γ = ∂²V/∂S² = ∂Δ/∂S</p>
            </div>

            <h3>Why Gamma Matters</h3>
            <p>Gamma tells you how <em>stable</em> your delta hedge is:</p>
            <ul>
                <li><strong>High gamma:</strong> Delta changes rapidly → frequent rehedging needed</li>
                <li><strong>Low gamma:</strong> Delta is stable → less rehedging needed</li>
            </ul>

            <h3>Gamma Characteristics</h3>
            <div class="info-box">
                <p><strong>Always positive</strong> for long options (both calls and puts)</p>
                <p><strong>Highest at-the-money</strong> (ATM options have maximum gamma)</p>
                <p><strong>Increases near expiration</strong> (short-dated options have higher gamma)</p>
                <p><strong>Decreases far from strike</strong> (deep ITM/OTM have low gamma)</p>
            </div>

            <h3>Gamma Scalping</h3>
            <p>A popular trading strategy that exploits gamma:</p>
            <ol>
                <li>Buy an ATM option (long gamma)</li>
                <li>Delta hedge by selling stock</li>
                <li>When stock moves up: delta increases, sell more stock (sell high)</li>
                <li>When stock moves down: delta decreases, buy back stock (buy low)</li>
                <li>Profit from rebalancing as long as stock moves more than implied by volatility</li>
            </ol>

            <div class="warning-box">
                <p>⚠️ <strong>Gamma Risk:</strong> Sellers of options are short gamma, meaning they lose money when the market moves in either direction!</p>
            </div>

            <div class="practice-prompt">
                <p>📈 <strong>Experiment:</strong> In the Playground, set spot = strike and watch gamma peak. Then move spot away and see gamma decrease!</p>
            </div>
        `
    },

    '4-1': {
        title: 'Implied Volatility',
        content: `
            <h2>Implied Volatility</h2>

            <p><strong>Implied volatility (IV)</strong> is the market's expectation of future volatility, backed out from option prices.</p>

            <h3>Historical vs Implied Volatility</h3>
            <table class="comparison-table">
                <tr>
                    <th>Historical Volatility</th>
                    <th>Implied Volatility</th>
                </tr>
                <tr>
                    <td>Backward-looking</td>
                    <td>Forward-looking</td>
                </tr>
                <tr>
                    <td>Calculated from past prices</td>
                    <td>Derived from option prices</td>
                </tr>
                <tr>
                    <td>What happened</td>
                    <td>What market expects</td>
                </tr>
            </table>

            <h3>Why IV Matters</h3>
            <ul>
                <li><strong>Option pricing:</strong> Higher IV = higher option prices</li>
                <li><strong>Market sentiment:</strong> High IV indicates fear/uncertainty</li>
                <li><strong>Trading opportunities:</strong> Buy low IV, sell high IV</li>
            </ul>

            <h3>Volatility Smile</h3>
            <p>In reality, IV is not constant across strikes. The <strong>volatility smile</strong> shows that:</p>
            <ul>
                <li>Out-of-the-money puts have higher IV (demand for downside protection)</li>
                <li>At-the-money options have lower IV</li>
                <li>The pattern looks like a "smile" or "smirk"</li>
            </ul>

            <div class="info-box">
                <p><strong>VIX Index:</strong> The "fear gauge" - measures 30-day implied volatility of S&P 500 options</p>
                <p>VIX > 30: High fear, market expects large moves</p>
                <p>VIX < 15: Low fear, market expects calm</p>
            </div>

            <div class="practice-prompt">
                <p>📊 <strong>Visualize:</strong> Click the "Vol Surface" tab in the Playground to see a volatility smile!</p>
            </div>
        `
    },

    '5-1': {
        title: 'Delta Hedging',
        content: `
            <h2>Delta Hedging</h2>

            <p><strong>Delta hedging</strong> is the practice of offsetting the directional risk (delta) of an options position by taking an opposite position in the underlying asset.</p>

            <h3>Why Delta Hedge?</h3>
            <ul>
                <li>Isolate volatility exposure from directional exposure</li>
                <li>Reduce risk in market-making operations</li>
                <li>Create market-neutral strategies</li>
            </ul>

            <h3>How to Delta Hedge</h3>
            <p><strong>Step 1:</strong> Calculate the delta of your options position</p>
            <p><strong>Step 2:</strong> Take an opposite position in the underlying</p>

            <div class="example-box">
                <h4>Example:</h4>
                <p>You sell 10 call options with delta = 0.6 each</p>
                <p>Total delta = 10 × 0.6 = 6</p>
                <p>To hedge: Buy 600 shares (6 × 100 shares per contract)</p>
                <p>Now your position is delta-neutral!</p>
            </div>

            <h3>Dynamic Hedging</h3>
            <p>Delta changes as the stock price moves (that's gamma!), so you need to <strong>rebalance</strong> your hedge:</p>
            <ol>
                <li>Stock goes up → delta increases → sell more shares</li>
                <li>Stock goes down → delta decreases → buy back shares</li>
            </ol>

            <h3>Costs of Hedging</h3>
            <div class="warning-box">
                <p>⚠️ <strong>Transaction costs:</strong> Each rebalance incurs commissions and bid-ask spread</p>
                <p>⚠️ <strong>Gamma risk:</strong> High gamma means frequent rebalancing</p>
                <p>⚠️ <strong>Slippage:</strong> Large orders can move the market</p>
            </div>

            <div class="practice-prompt">
                <p>🎯 <strong>Challenge:</strong> Go to the Challenges section and try "The Perfect Hedge"!</p>
            </div>
        `
    }
};

// Lesson navigation
function loadLesson(lessonId) {
    const lesson = lessons[lessonId];
    if (!lesson) return;

    const display = document.getElementById('lessonDisplay');
    display.innerHTML = lesson.content;

    // Update active state
    document.querySelectorAll('.lesson-list li').forEach(li => {
        li.classList.remove('active');
    });
    document.querySelector(`[data-lesson="${lessonId}"]`).classList.add('active');

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
