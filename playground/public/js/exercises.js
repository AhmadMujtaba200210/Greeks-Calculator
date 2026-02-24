// Practice Exercises

const exercises = {
    'delta-quiz': {
        title: 'Delta Quiz',
        questions: [
            {
                question: 'A call option has a delta of 0.7. If the stock price increases by $2, approximately how much will the option price increase?',
                options: ['$0.70', '$1.40', '$2.00', '$2.80'],
                correct: 1,
                explanation: 'Delta of 0.7 means the option moves $0.70 for every $1 move in the stock. So for a $2 move: 0.7 × $2 = $1.40'
            },
            {
                question: 'Which option typically has the highest delta?',
                options: ['Deep OTM call', 'ATM call', 'Deep ITM call', 'All have the same delta'],
                correct: 2,
                explanation: 'Deep in-the-money calls have delta closest to 1.0, meaning they move almost 1-to-1 with the underlying stock.'
            },
            {
                question: 'You own 100 call options with delta = 0.5. How many shares should you sell to be delta-neutral?',
                options: ['50 shares', '100 shares', '500 shares', '5,000 shares'],
                correct: 3,
                explanation: '100 contracts × 100 shares/contract × 0.5 delta = 5,000 shares'
            },
            {
                question: 'What happens to call option delta as expiration approaches and the option is ATM?',
                options: ['Approaches 0', 'Approaches 0.5', 'Approaches 1', 'Becomes unstable'],
                correct: 3,
                explanation: 'As expiration nears, ATM options become very sensitive to small price moves. Delta becomes unstable and can jump between 0 and 1.'
            },
            {
                question: 'A put option has delta = -0.3. What does this mean?',
                options: [
                    'The option loses $0.30 when stock rises $1',
                    'The option gains $0.30 when stock falls $1',
                    'Both A and B',
                    'The option is worthless'
                ],
                correct: 2,
                explanation: 'Put deltas are negative. Delta of -0.3 means the option loses $0.30 when stock rises $1, and gains $0.30 when stock falls $1.'
            }
        ]
    },

    'greeks-calc': {
        title: 'Calculate the Greeks',
        scenarios: [
            {
                description: 'Calculate the Greeks for this option:',
                params: { spot: 100, strike: 105, maturity: 0.5, volatility: 0.30, rate: 0.05, dividend: 0.02, type: 'call' },
                tasks: ['What is the option price?', 'What is the delta?', 'Is this option ITM, ATM, or OTM?']
            }
        ],
        type: 'calculator' // Placeholder type for custom logic
    },

    'hedging-sim': {
        title: 'Delta Hedging Simulation',
        description: 'Practice maintaining a delta-neutral position as the market moves',
        initialPosition: { options: 100, optionDelta: 0.6, shares: 0, cash: 100000 },
        marketMoves: [
            { day: 1, priceChange: +2, newDelta: 0.65 },
            { day: 2, priceChange: -3, newDelta: 0.55 },
            { day: 3, priceChange: +1, newDelta: 0.60 }
        ],
        type: 'simulation'
    },

    'vol-surface': {
        title: 'Volatility Surface Builder',
        description: 'Experiment with SVI parameters to fit a volatility smile.',
        type: 'interactive',
        content: '<p>Interactive volatility surface builder coming soon. For now, use the "Vol Surface" tab in the Playground.</p>'
    },

    'strategy-builder': {
        title: 'Strategy Builder',
        description: 'Construct multi-leg option strategies.',
        type: 'interactive',
        content: '<p>Open the Builder tab to create multi-leg strategies, load presets, and practice payoff diagrams.</p><button class="start-btn" onclick="document.querySelector(\\\'.nav-btn[data-section=\\\"builder\\\"]\\\')?.click()">Open Builder</button>'
    },

    'liquidity-lab': {
        title: 'Liquidity & Slippage Lab',
        description: 'Estimate execution quality using bid/ask, volume, and open interest.',
        type: 'liquidity-lab'
    },

    'scenario-analysis': {
        title: 'Scenario Analysis',
        description: 'Analyze how your portfolio performs under stress.',
        type: 'interactive',
        content: '<p>Scenario analysis tool coming soon.</p>'
    }
};

// Exercise state
let currentExercise = null;
let currentQuestion = 0;
let score = 0;
let practiceTemplate = null;

// Start an exercise
function startExercise(exerciseId) {
    currentExercise = exercises[exerciseId];
    currentQuestion = 0;
    score = 0;

    if (exerciseId === 'delta-quiz') {
        showQuiz();
    } else if (currentExercise.type === 'interactive') {
        showInteractivePlaceholder();
    } else if (exerciseId === 'greeks-calc') {
        showCalculatorExercise(); // Basic implementation below
    } else if (exerciseId === 'hedging-sim') {
        showHedgingSimulation(); // Basic implementation below
    } else if (exerciseId === 'liquidity-lab') {
        showLiquidityLab();
    }
}

// Show quiz interface
function showQuiz() {
    const container = document.querySelector('.practice-layout');
    const quiz = currentExercise.questions[currentQuestion];

    container.innerHTML = `
        <div class="quiz-container">
            <div class="quiz-header">
                <h2>${currentExercise.title}</h2>
                <p>Question ${currentQuestion + 1} of ${currentExercise.questions.length}</p>
                <p>Score: ${score}/${currentQuestion}</p>
            </div>
            <div class="quiz-question">
                <h3>${quiz.question}</h3>
                <div class="quiz-options">
                    ${quiz.options.map((opt, i) => `
                        <button class="quiz-option" data-index="${i}">${opt}</button>
                    `).join('')}
                </div>
            </div>
            <div id="quizFeedback" class="quiz-feedback"></div>
        </div>
    `;

    document.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => checkAnswer(parseInt(btn.dataset.index)));
    });
}

function checkAnswer(selectedIndex) {
    const quiz = currentExercise.questions[currentQuestion];
    const feedback = document.getElementById('quizFeedback');
    const isCorrect = selectedIndex === quiz.correct;

    if (isCorrect) score++;

    feedback.innerHTML = `
        <div class="feedback-${isCorrect ? 'correct' : 'incorrect'}">
            <h4>${isCorrect ? '✅ Correct!' : '❌ Incorrect'}</h4>
            <p>${isCorrect ? quiz.explanation : `Correct answer: ${quiz.options[quiz.correct]}. ${quiz.explanation}`}</p>
            <button onclick="nextQuestion()">Next Question</button>
        </div>
    `;
    document.querySelectorAll('.quiz-option').forEach(btn => btn.disabled = true);
}

function nextQuestion() {
    currentQuestion++;
    if (currentQuestion < currentExercise.questions.length) {
        showQuiz();
    } else {
        showQuizResults();
    }
}

function showQuizResults() {
    const container = document.querySelector('.practice-layout');
    const percentage = (score / currentExercise.questions.length * 100).toFixed(0);
    container.innerHTML = `
        <div class="quiz-results">
            <h2>Quiz Complete!</h2>
            <div class="score-display"><div class="score-circle">${percentage}%</div></div>
            <div class="results-actions">
                <button onclick="startExercise('delta-quiz')">Retake Quiz</button>
                <button onclick="window.restorePracticeHub?.()">Back to Practice</button>
            </div>
        </div>
    `;
}

function showInteractivePlaceholder() {
    const container = document.querySelector('.practice-layout');
    container.innerHTML = `
        <div class="exercise-card">
            <h2>${currentExercise.title}</h2>
            ${currentExercise.content}
            <button onclick="window.restorePracticeHub?.()" class="start-btn">Back to Practice</button>
        </div>
    `;
}

function showCalculatorExercise() {
    showInteractivePlaceholder(); // Valid placeholder for now
}
function showHedgingSimulation() {
    showInteractivePlaceholder(); // Valid placeholder for now
}

function showLiquidityLab() {
    const container = document.querySelector('.practice-layout');
    container.innerHTML = `
        <div class="liquidity-lab">
            <div class="lab-header">
                <h2>Liquidity & Slippage Estimator</h2>
                <p class="subtitle">Educational model that estimates execution cost using spread, volume, and open interest.</p>
            </div>
            <div class="lab-grid">
                <div class="lab-card">
                    <h3>Inputs</h3>
                    <div class="lab-form">
                        <div class="control-group">
                            <label>Bid</label>
                            <input type="number" id="liqBid" value="2.40" step="0.01" min="0">
                        </div>
                        <div class="control-group">
                            <label>Ask</label>
                            <input type="number" id="liqAsk" value="2.60" step="0.01" min="0">
                        </div>
                        <div class="control-group">
                            <label>Daily Volume (contracts)</label>
                            <input type="number" id="liqVolume" value="1200" step="1" min="0">
                        </div>
                        <div class="control-group">
                            <label>Open Interest (contracts)</label>
                            <input type="number" id="liqOI" value="5500" step="1" min="0">
                        </div>
                        <div class="control-group">
                            <label>Order Size (contracts)</label>
                            <input type="number" id="liqSize" value="10" step="1" min="1">
                        </div>
                        <div class="control-group">
                            <label>Side</label>
                            <select id="liqSide">
                                <option value="buy">Buy</option>
                                <option value="sell">Sell</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label>Order Type</label>
                            <select id="liqType">
                                <option value="market">Market</option>
                                <option value="mid">Limit @ Mid</option>
                                <option value="inside">Limit Inside (25% spread)</option>
                                <option value="bidask">Limit @ Bid/Ask</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="lab-card">
                    <h3>Estimated Execution</h3>
                    <div class="lab-metrics">
                        <div class="metric">
                            <span>Mid Price</span>
                            <strong id="liqMid">$0.00</strong>
                        </div>
                        <div class="metric">
                            <span>Spread</span>
                            <strong id="liqSpread">$0.00</strong>
                            <small id="liqSpreadPct">0.0%</small>
                        </div>
                        <div class="metric">
                            <span>Liquidity Score</span>
                            <strong id="liqScore">--</strong>
                            <small id="liqGrade">Grade --</small>
                        </div>
                        <div class="metric">
                            <span>Estimated Slippage / Contract</span>
                            <strong id="liqSlip">$0.00</strong>
                        </div>
                        <div class="metric">
                            <span>Estimated Total Slippage</span>
                            <strong id="liqSlipTotal">$0.00</strong>
                        </div>
                        <div class="metric">
                            <span>Estimated Fill Probability</span>
                            <strong id="liqFill">--%</strong>
                        </div>
                        <div class="metric">
                            <span>Expected Fill Price</span>
                            <strong id="liqFillPrice">$0.00</strong>
                        </div>
                    </div>
                    <div class="lab-callouts" id="liqCallouts"></div>
                </div>
            </div>
            <div class="lab-footer">
                <p><strong>How to use:</strong> Liquidity score blends spread tightness, order size vs volume, and order size vs open interest. Use it to choose order type and size.</p>
                <div class="example-box">
                    <h4>Methodology (Simplified)</h4>
                    <ul>
                        <li><strong>Spread impact:</strong> Wider spreads reduce liquidity score.</li>
                        <li><strong>Size impact:</strong> Order size vs volume and OI increases slippage.</li>
                        <li><strong>Execution style:</strong> Market orders fill fast with more slippage; mid/inside limits reduce slippage but lower fill probability.</li>
                    </ul>
                </div>
                <button onclick="window.restorePracticeHub?.()" class="start-btn">Back to Practice</button>
            </div>
        </div>
    `;

    const inputs = ['liqBid','liqAsk','liqVolume','liqOI','liqSize','liqSide','liqType'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', calculateLiquidity);
        el.addEventListener('change', calculateLiquidity);
    });

    calculateLiquidity();
}

function calculateLiquidity() {
    const bid = parseFloat(document.getElementById('liqBid').value);
    const ask = parseFloat(document.getElementById('liqAsk').value);
    const volume = Math.max(0, parseFloat(document.getElementById('liqVolume').value));
    const oi = Math.max(0, parseFloat(document.getElementById('liqOI').value));
    const size = Math.max(1, parseFloat(document.getElementById('liqSize').value));
    const side = document.getElementById('liqSide').value;
    const type = document.getElementById('liqType').value;

    const callouts = [];
    if (!Number.isFinite(bid) || !Number.isFinite(ask) || ask <= 0 || bid < 0 || ask <= bid) {
        document.getElementById('liqCallouts').innerHTML = '<p class="risk-note">Enter a valid bid/ask (ask must be greater than bid).</p>';
        return;
    }

    const mid = (bid + ask) / 2;
    const spread = ask - bid;
    const spreadPct = spread / Math.max(mid, 0.01);

    const sizeToVol = size / Math.max(volume, 1);
    const sizeToOi = size / Math.max(oi, 1);

    const spreadImpact = Math.min(35, spreadPct * 100 * 2.0);
    const sizeImpact = Math.min(35, Math.sqrt(sizeToVol) * 30);
    const oiImpact = Math.min(20, Math.sqrt(sizeToOi) * 20);

    let score = 100 - spreadImpact - sizeImpact - oiImpact;
    score = Math.max(5, Math.min(95, score));

    const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'E';

    const impactMultiplier = 1 + 0.6 * Math.sqrt(sizeToVol) + 0.3 * Math.sqrt(sizeToOi);
    const baseSlip = (spread / 2) * impactMultiplier;

    let slipFromMid;
    if (type === 'market') slipFromMid = baseSlip;
    else if (type === 'mid') slipFromMid = (spread * 0.12) * impactMultiplier;
    else if (type === 'inside') slipFromMid = (spread * 0.25) * impactMultiplier;
    else slipFromMid = (spread / 2) * impactMultiplier;

    const fillPrice = mid + (side === 'buy' ? slipFromMid : -slipFromMid);
    const slipTotal = slipFromMid * size * 100;

    let fillProb;
    if (type === 'market') fillProb = 98;
    else if (type === 'bidask') fillProb = Math.min(95, score + 8);
    else if (type === 'inside') fillProb = Math.max(15, score - 5);
    else fillProb = Math.max(10, score - 15);

    if (spreadPct > 0.05) callouts.push('Spread is >5% of mid. Liquidity is poor and slippage can dominate.');
    if (sizeToVol > 0.2) callouts.push('Order size is a large fraction of daily volume. Consider splitting the order.');
    if (sizeToOi > 0.1) callouts.push('Order size is large vs open interest. You may move the market.');
    if (score < 40) callouts.push('Liquidity score is low. Use limit orders and reduce size.');

    document.getElementById('liqMid').innerText = `$${mid.toFixed(2)}`;
    document.getElementById('liqSpread').innerText = `$${spread.toFixed(2)}`;
    document.getElementById('liqSpreadPct').innerText = `${(spreadPct * 100).toFixed(2)}%`;
    document.getElementById('liqScore').innerText = `${Math.round(score)}`;
    document.getElementById('liqGrade').innerText = `Grade ${grade}`;
    document.getElementById('liqSlip').innerText = `$${slipFromMid.toFixed(2)}`;
    document.getElementById('liqSlipTotal').innerText = `$${slipTotal.toFixed(2)}`;
    document.getElementById('liqFill').innerText = `${Math.round(fillProb)}%`;
    document.getElementById('liqFillPrice').innerText = `$${fillPrice.toFixed(2)}`;

    document.getElementById('liqCallouts').innerHTML = callouts.length
        ? `<ul>${callouts.map(text => `<li>${text}</li>`).join('')}</ul>`
        : '<p class="mindset-box"><strong>Tip:</strong> For liquid names, start with limit @ mid. For thin names, use smaller size and accept wider execution.</p>';
}

function bindExerciseCards(container) {
    container.querySelectorAll('.exercise-card .start-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.exercise-card');
            startExercise(card.dataset.exercise);
        });
    });
}

function applyPracticeFilter(container, filter, query) {
    const cards = Array.from(container.querySelectorAll('.exercise-card'));
    const normalizedQuery = (query || '').toLowerCase();

    cards.forEach(card => {
        const category = card.dataset.category || 'all';
        const text = card.textContent.toLowerCase();
        const matchesFilter = filter === 'all' || category === filter;
        const matchesQuery = !normalizedQuery || text.includes(normalizedQuery);
        card.style.display = matchesFilter && matchesQuery ? 'flex' : 'none';
    });
}

function initPracticeFilters(container) {
    const filterButtons = Array.from(container.querySelectorAll('.filter-btn'));
    const search = container.querySelector('#practiceSearch');

    const updateFilter = (filter) => {
        filterButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter));
        applyPracticeFilter(container, filter, search?.value || '');
    };

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => updateFilter(btn.dataset.filter));
    });

    container.querySelectorAll('.track-chip, .hero-actions .start-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.filter) updateFilter(btn.dataset.filter);
        });
    });

    if (search) {
        search.addEventListener('input', () => {
            const active = filterButtons.find(btn => btn.classList.contains('active'));
            const filter = active ? active.dataset.filter : 'all';
            applyPracticeFilter(container, filter, search.value);
        });
    }
}

function initPracticeHub() {
    const container = document.querySelector('.practice-layout');
    if (!container) return;
    bindExerciseCards(container);
    initPracticeFilters(container);
}

window.restorePracticeHub = () => {
    const container = document.querySelector('.practice-layout');
    if (!container || !practiceTemplate) {
        location.reload();
        return;
    }
    container.innerHTML = practiceTemplate;
    initPracticeHub();
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.practice-layout');
    if (container) {
        practiceTemplate = container.innerHTML;
    }
    initPracticeHub();
});
