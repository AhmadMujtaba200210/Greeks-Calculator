// Main Application Logic

// State management
const state = {
    optionType: 'call',
    spot: 100,
    strike: 100,
    maturity: 1.0,
    volatility: 0.25,
    rate: 0.05,
    dividend: 0.0,
    currentViz: 'price',
    currentChart: null,
    wasmLoaded: false
};

// Import WASM module
import init, { calculate_greeks_wasm } from '../pkg/greeks_calculator.js';
import { addLeg } from './strategy.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await init();
        state.wasmLoaded = true;
        console.log('🚀 WASM Backend Initialized');
    } catch (e) {
        console.error('Failed to load WASM backend:', e);
    }

    initializeControls();
    initializeNavigation();
    initializeVisualization();
    updateCalculations();

    // Initialize Strategy Builder
    const addLegBtn = document.getElementById('addLegBtn');
    if (addLegBtn) {
        addLegBtn.addEventListener('click', () => addLeg());
        // Defaults
        addLeg({ type: 'call', action: 'buy', strike: 100 });
    }
});

// Initialize control panel
function initializeControls() {
    // Option type
    document.getElementById('optionType').addEventListener('change', (e) => {
        state.optionType = e.target.value;
        updateCalculations();
    });

    // Sliders
    const sliders = [
        { id: 'spot', key: 'spot', display: 'spotValue', format: (v) => v },
        { id: 'strike', key: 'strike', display: 'strikeValue', format: (v) => v },
        { id: 'maturity', key: 'maturity', display: 'maturityValue', format: (v) => v.toFixed(1) },
        { id: 'volatility', key: 'volatility', display: 'volatilityValue', format: (v) => v },
        { id: 'rate', key: 'rate', display: 'rateValue', format: (v) => v.toFixed(1) },
        { id: 'dividend', key: 'dividend', display: 'dividendValue', format: (v) => v.toFixed(1) }
    ];

    sliders.forEach(({ id, key, display, format }) => {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(display);

        slider.addEventListener('input', (e) => {
            let value = parseFloat(e.target.value);

            // Convert percentage inputs
            if (key === 'volatility' || key === 'rate' || key === 'dividend') {
                state[key] = value / 100;
            } else {
                state[key] = value;
            }

            valueDisplay.textContent = format(value);
            updateCalculations();
        });
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetToDefaults);
}

// Reset to default values
function resetToDefaults() {
    state.spot = 100;
    state.strike = 100;
    state.maturity = 1.0;
    state.volatility = 0.25;
    state.rate = 0.05;
    state.dividend = 0.0;

    document.getElementById('spot').value = 100;
    document.getElementById('strike').value = 100;
    document.getElementById('maturity').value = 1.0;
    document.getElementById('volatility').value = 25;
    document.getElementById('rate').value = 5;
    document.getElementById('dividend').value = 0;

    document.getElementById('spotValue').textContent = '100';
    document.getElementById('strikeValue').textContent = '100';
    document.getElementById('maturityValue').textContent = '1.0';
    document.getElementById('volatilityValue').textContent = '25';
    document.getElementById('rateValue').textContent = '5.0';
    document.getElementById('dividendValue').textContent = '0.0';

    updateCalculations();
}

// Initialize navigation
function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.section');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetSection = btn.dataset.section;

            // Update active states
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(targetSection).classList.add('active');
        });
    });
}

// Initialize visualization tabs
function initializeVisualization() {
    const vizTabs = document.querySelectorAll('.viz-tab');

    vizTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            vizTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            state.currentViz = tab.dataset.viz;
            updateChart();
        });
    });
}

// Update all calculations and display
function updateCalculations() {
    const { spot, strike, maturity, volatility, rate, dividend, optionType, wasmLoaded } = state;
    const isCall = optionType === 'call';
    let greeks;

    if (wasmLoaded) {
        // Use high-performance Rust backend
        greeks = calculate_greeks_wasm(spot, strike, maturity, volatility, rate, dividend, isCall);
    } else {
        // Fallback to JS (or if WASM failed to load)
        greeks = calculator.calculateGreeks(spot, strike, maturity, volatility, rate, dividend, isCall);
    }

    // Update display
    document.getElementById('priceResult').textContent = `$${greeks.price.toFixed(4)}`;
    document.getElementById('deltaResult').textContent = greeks.delta.toFixed(4);
    document.getElementById('gammaResult').textContent = greeks.gamma.toFixed(4);
    document.getElementById('vegaResult').textContent = greeks.vega.toFixed(4);
    document.getElementById('thetaResult').textContent = greeks.theta.toFixed(4);
    document.getElementById('rhoResult').textContent = greeks.rho.toFixed(4);

    // Update insights
    updateInsights(greeks);

    // Update moneyness indicator
    updateMoneyness();

    // Update chart
    updateChart();
}

// Update insights panel
function updateInsights(greeks) {
    const { spot, strike, maturity, volatility, optionType } = state;
    const moneyness = spot / strike;

    let insights = '<div class="insight-item">';

    // Moneyness insight
    if (moneyness > 1.05) {
        insights += '<p><strong>In-the-Money:</strong> This option has intrinsic value and would be profitable if exercised now.</p>';
    } else if (moneyness < 0.95) {
        insights += '<p><strong>Out-of-the-Money:</strong> This option has no intrinsic value, only time value.</p>';
    } else {
        insights += '<p><strong>At-the-Money:</strong> This option has maximum time value and gamma.</p>';
    }

    // Delta insight
    if (Math.abs(greeks.delta) > 0.7) {
        insights += '<p><strong>High Delta:</strong> This option moves almost 1-to-1 with the underlying.</p>';
    } else if (Math.abs(greeks.delta) < 0.3) {
        insights += '<p><strong>Low Delta:</strong> This option has low sensitivity to price changes.</p>';
    }

    // Gamma insight
    if (greeks.gamma > 0.02) {
        insights += '<p><strong>High Gamma:</strong> Delta will change rapidly. Frequent rehedging needed.</p>';
    }

    // Theta insight
    if (maturity < 0.25) {
        insights += '<p><strong>Near Expiration:</strong> Time decay is accelerating rapidly.</p>';
    }

    insights += '</div>';
    document.getElementById('insights').innerHTML = insights;

    // Update quick facts
    const intrinsicValue = optionType === 'call'
        ? Math.max(0, spot - strike)
        : Math.max(0, strike - spot);
    const timeValue = greeks.price - intrinsicValue;

    const facts = `
        <p><strong>Intrinsic Value:</strong> $${intrinsicValue.toFixed(2)}</p>
        <p><strong>Time Value:</strong> $${timeValue.toFixed(2)}</p>
        <p><strong>Moneyness:</strong> ${(moneyness * 100).toFixed(1)}%</p>
        <p><strong>Days to Expiry:</strong> ${Math.round(maturity * 365)}</p>
    `;
    document.getElementById('quickFacts').innerHTML = facts;

    // Update Advice
    updateAdvice(greeks);
}

function updateAdvice(greeks) {
    if (typeof AdviceGenerator === 'undefined') return;

    const advice = AdviceGenerator.generate(state, greeks);
    const container = document.getElementById('traderAdvice');

    container.className = `advice-panel advice-${advice.type}`;
    container.innerHTML = `
        <div class="advice-header">
            <h4>${advice.title}</h4>
        </div>
        <p>${advice.text}</p>
    `;
}

// Update moneyness indicator
function updateMoneyness() {
    const { spot, strike } = state;
    const moneyness = spot / strike;
    const position = ((moneyness - 0.8) / 0.4) * 100; // Map 0.8-1.2 to 0-100%
    const clampedPosition = Math.max(0, Math.min(100, position));

    const bar = document.getElementById('moneynessBar');
    bar.style.setProperty('--position', `${clampedPosition}%`);
}

// Update chart based on current visualization
function updateChart() {
    const { currentViz } = state;

    switch (currentViz) {
        case 'price':
            drawPriceChart();
            break;
        case 'greeks':
            drawGreeksChart();
            break;
        case 'volatility':
            drawVolatilityChart();
            break;
        case 'time':
            drawTimeDecayChart();
            break;
    }
}

// Draw price vs spot chart
function drawPriceChart() {
    const { strike, maturity, volatility, rate, dividend, optionType, spot } = state;
    const isCall = optionType === 'call';

    const spotMin = strike * 0.7;
    const spotMax = strike * 1.3;
    const data = calculator.calculateGreeksRange(strike, maturity, volatility, rate, dividend, isCall, spotMin, spotMax);

    const ctx = document.getElementById('mainChart').getContext('2d');

    if (state.currentChart) {
        state.currentChart.destroy();
    }

    state.currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.spot.toFixed(0)),
            datasets: [{
                label: 'Option Price',
                data: data.map(d => d.price),
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f1f5f9' }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Spot Price', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                },
                y: {
                    title: { display: true, text: 'Option Price ($)', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                }
            },
            annotation: {
                annotations: [{
                    type: 'line',
                    mode: 'vertical',
                    scaleID: 'x',
                    value: spot,
                    borderColor: '#10b981',
                    borderWidth: 2,
                    label: {
                        content: 'Current Spot',
                        enabled: true
                    }
                }]
            }
        }
    });
}

// Draw Greeks vs spot chart
function drawGreeksChart() {
    const { strike, maturity, volatility, rate, dividend, optionType } = state;
    const isCall = optionType === 'call';

    const spotMin = strike * 0.7;
    const spotMax = strike * 1.3;
    const data = calculator.calculateGreeksRange(strike, maturity, volatility, rate, dividend, isCall, spotMin, spotMax);

    const ctx = document.getElementById('mainChart').getContext('2d');

    if (state.currentChart) {
        state.currentChart.destroy();
    }

    state.currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.spot.toFixed(0)),
            datasets: [
                {
                    label: 'Delta',
                    data: data.map(d => d.delta),
                    borderColor: '#2563eb',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Gamma (×10)',
                    data: data.map(d => d.gamma * 10),
                    borderColor: '#10b981',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f1f5f9' }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Spot Price', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                },
                y: {
                    title: { display: true, text: 'Greek Value', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

// Draw volatility surface (simplified 2D view)
function drawVolatilityChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');

    if (state.currentChart) {
        state.currentChart.destroy();
    }

    // Simplified volatility smile
    const strikes = [];
    const vols = [];
    const { strike } = state;

    for (let k = strike * 0.7; k <= strike * 1.3; k += strike * 0.05) {
        strikes.push(k.toFixed(0));
        const moneyness = Math.log(k / strike);
        // Simplified SVI-like smile
        const vol = 0.25 + 0.1 * Math.abs(moneyness) + 0.05 * moneyness;
        vols.push(vol * 100);
    }

    state.currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: strikes,
            datasets: [{
                label: 'Implied Volatility (%)',
                data: vols,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f1f5f9' }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Strike Price', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                },
                y: {
                    title: { display: true, text: 'Implied Volatility (%)', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

// Draw time decay chart
function drawTimeDecayChart() {
    const { spot, strike, volatility, rate, dividend, optionType } = state;
    const isCall = optionType === 'call';

    const data = calculator.calculateTimeDecay(spot, strike, volatility, rate, dividend, isCall, 90);

    const ctx = document.getElementById('mainChart').getContext('2d');

    if (state.currentChart) {
        state.currentChart.destroy();
    }

    state.currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.daysToExpiry),
            datasets: [{
                label: 'Option Price',
                data: data.map(d => d.price),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f1f5f9' }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Days to Expiration', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' },
                    reverse: true
                },
                y: {
                    title: { display: true, text: 'Option Price ($)', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

// Initialize challenge buttons
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.challenge-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const challengeId = e.target.dataset.challenge;

            // Switch to practice tab
            document.querySelector('.nav-btn[data-section="practice"]').click();

            // Allow time for tab switch, then start exercise
            setTimeout(() => {
                startExercise(challengeId);
            }, 100);
        });
    });
});
