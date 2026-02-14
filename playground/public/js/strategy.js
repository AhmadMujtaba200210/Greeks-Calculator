// Strategy Builder Module
import { customTooltip } from './ui_utils.js';

export const strategyState = {
    legs: [],
    chart: null
};

// Add a default leg
export function addLeg(defaults = {}) {
    const leg = {
        id: Date.now().toString(),
        type: defaults.type || 'call',
        action: defaults.action || 'buy',
        strike: defaults.strike || 100,
        expiry: defaults.expiry || 1.0,
        quantity: defaults.quantity || 1
    };
    strategyState.legs.push(leg);
    renderLegs();
    updateStrategyChart();
    return leg;
}

// Remove a leg
export function removeLeg(id) {
    strategyState.legs = strategyState.legs.filter(l => l.id !== id);
    renderLegs();
    updateStrategyChart();
}

// Update a leg parameter
export function updateLeg(id, param, value) {
    const leg = strategyState.legs.find(l => l.id === id);
    if (leg) {
        if (param === 'quantity' || param === 'strike' || param === 'expiry') {
            leg[param] = parseFloat(value);
        } else {
            leg[param] = value;
        }
        updateStrategyChart();
    }
}

// Render the list of legs in the UI
function renderLegs() {
    const container = document.getElementById('legsContainer');
    const emptyState = document.getElementById('legsEmptyState');
    if (!container) return;

    if (strategyState.legs.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        // Clear anything else BUT the empty state
        Array.from(container.children).forEach(child => {
            if (child.id !== 'legsEmptyState') child.remove();
        });
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Remove existing leg cards (but keep empty state div for future use)
    Array.from(container.children).forEach(child => {
        if (child.id !== 'legsEmptyState') child.remove();
    });

    strategyState.legs.forEach(leg => {
        const div = document.createElement('div');
        div.className = 'leg-card glass';
        div.innerHTML = `
            <div class="leg-header">
                <select onchange="window.updateLeg('${leg.id}', 'action', this.value)" class="leg-select ${leg.action}">
                    <option value="buy" ${leg.action === 'buy' ? 'selected' : ''}>Buy</option>
                    <option value="sell" ${leg.action === 'sell' ? 'selected' : ''}>Sell</option>
                </select>
                <select onchange="window.updateLeg('${leg.id}', 'type', this.value)" class="leg-select">
                    <option value="call" ${leg.type === 'call' ? 'selected' : ''}>Call</option>
                    <option value="put" ${leg.type === 'put' ? 'selected' : ''}>Put</option>
                </select>
                <button onclick="window.removeLeg('${leg.id}')" class="remove-leg-btn">×</button>
            </div>
            <div class="leg-controls">
                <div class="control-group">
                    <label>Strike</label>
                    <input type="number" value="${leg.strike}" onchange="window.updateLeg('${leg.id}', 'strike', this.value)">
                </div>
                <div class="control-group">
                    <label>Qty</label>
                    <input type="number" value="${leg.quantity}" min="1" onchange="window.updateLeg('${leg.id}', 'quantity', this.value)">
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// Calculate P&L at expiration for a given spot price
function calculatePayoff(spot, leg) {
    let intrinsic = 0;
    if (leg.type === 'call') {
        intrinsic = Math.max(0, spot - leg.strike);
    } else {
        intrinsic = Math.max(0, leg.strike - spot);
    }

    // Creating a payoff diagram usually assumes "premium paid" is 0 for visualization 
    // OR we can include a theoretical premium.
    // For a pure "Payoff at Expiration" diagram, we often just show intrinsic value * direction.
    // However, to show Profit/Loss, we need the premium.
    // For simplicity v1, we will assume a theoretical Black-Scholes premium for the entered strike/expiry
    // to show a realistic "Profit/Loss" curve, OR we can add a "Premium" input field to the leg.
    // Let's use a simplified B-S approximation or just intrinsic for now to verify logic.

    // Actually, strictly "Payoff" (value at expiration) is just intrinsic. 
    // "Profit/Loss" includes the initial cost.
    // Let's stick to Payoff Value for now to avoid BS dependency here, 
    // or better, let's ask the user to input price, OR assume 0 cost for simple shapes.

    // Better MVP: Just Payoff (Value of position), not Net Profit.
    // Long Call Payoff = max(S-K, 0)
    // Short Call Payoff = -max(S-K, 0)

    const direction = leg.action === 'buy' ? 1 : -1;
    return direction * leg.quantity * intrinsic;
}

// Draw the strategy chart
export function updateStrategyChart() {
    const ctx = document.getElementById('strategyChart');
    if (!ctx) return;

    // Determine range
    if (strategyState.legs.length === 0) {
        if (strategyState.chart) strategyState.chart.destroy();
        return;
    }

    const strikes = strategyState.legs.map(l => l.strike);
    const minStrike = Math.min(...strikes);
    const maxStrike = Math.max(...strikes);
    const range = (maxStrike - minStrike) || minStrike * 0.2;
    const start = Math.max(0, minStrike - range * 0.5);
    const end = maxStrike + range * 0.5;

    const labels = [];
    const data = [];

    const steps = 50;
    const stepSize = (end - start) / steps;

    for (let i = 0; i <= steps; i++) {
        const spot = start + (i * stepSize);
        let totalPayoff = 0;
        strategyState.legs.forEach(leg => {
            totalPayoff += calculatePayoff(spot, leg);
        });
        labels.push(spot.toFixed(0));
        data.push(totalPayoff);
    }

    updateStrategyStats(data, start, end, stepSize);

    if (strategyState.chart) {
        strategyState.chart.destroy();
    }
    // ... (chart rendering logic continues)
    strategyState.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Payoff at Expiration',
                data: data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1, // Straighter lines for payoff diagrams
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#f1f5f9' } },
                tooltip: {
                    enabled: false,
                    external: customTooltip
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Spot Price at Expiration', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                },
                y: {
                    title: { display: true, text: 'Value ($)', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

// Calculate and Update Stats Cards
function updateStrategyStats(payoffs, start, end, stepSize) {
    const maxProfitEl = document.getElementById('maxProfit');
    const maxLossEl = document.getElementById('maxLoss');
    const breakevensEl = document.getElementById('breakevens');

    if (!maxProfitEl || !maxLossEl || !breakevensEl) return;

    let maxVal = Math.max(...payoffs);
    let minVal = Math.min(...payoffs);

    // Check for Infinite/Unlimited at boundaries
    const isRisingAtEnd = payoffs[payoffs.length - 1] > payoffs[payoffs.length - 2];
    const isFallingAtEnd = payoffs[payoffs.length - 1] < payoffs[payoffs.length - 2];
    const isRisingAtStart = payoffs[0] > payoffs[1];
    const isFallingAtStart = payoffs[0] < payoffs[1];

    // Simplistic infinite detection: if the value at the very end is the max/min and it was moving in that direction
    let maxProfitText = "";
    let maxLossText = "";

    if (isRisingAtEnd || isRisingAtStart) {
        maxProfitText = "Infinite ♾️";
    } else {
        maxProfitText = `$${maxVal.toFixed(2)}`;
    }

    if (isFallingAtEnd || isFallingAtStart) {
        maxLossText = "Unlimited ⚠️";
    } else {
        maxLossText = `$${Math.abs(minVal).toFixed(2)}`;
    }

    maxProfitEl.innerText = maxProfitText;
    maxProfitEl.style.color = maxProfitText.includes('Infinite') ? '#10b981' : (maxVal > 0 ? '#10b981' : '#94a3b8');

    maxLossEl.innerText = maxLossText;
    maxLossEl.style.color = maxLossText.includes('Unlimited') ? '#ef4444' : (minVal < 0 ? '#ef4444' : '#94a3b8');

    // Find Breakevens (Crossings of zero)
    const bePoints = [];
    for (let i = 0; i < payoffs.length - 1; i++) {
        if (payoffs[i] * payoffs[i + 1] <= 0) {
            // Found a crossing between i and i+1
            // Linear interpolation: y = mx + c => 0 = m*x + payoffs[i]
            const x1 = start + (i * stepSize);
            const x2 = start + ((i + 1) * stepSize);
            const y1 = payoffs[i];
            const y2 = payoffs[i + 1];

            if (y1 === y2) continue; // Horizontal on 0

            const breakPrice = x1 + (0 - y1) * (x2 - x1) / (y2 - y1);
            bePoints.push(breakPrice.toFixed(1));
        }
    }

    breakevensEl.innerText = bePoints.length > 0 ? bePoints.join(', ') : 'None';
}

// Initialize Guide Modal with Carousel logic
export function initStrategyGuide() {
    const modal = document.getElementById('guideModal');
    const btn = document.getElementById('builderGuideBtn');
    const closeBtn = document.querySelector('.close-modal');
    const finishBtn = document.getElementById('closeGuideFinal');

    const steps = document.querySelectorAll('.guide-step');
    const dots = document.querySelectorAll('.dot');
    const nextBtn = document.getElementById('nextStep');
    const prevBtn = document.getElementById('prevStep');

    if (!modal || !btn || !closeBtn) return;

    let currentStep = 1;

    function updateStep(newStep) {
        currentStep = newStep;

        // Update steps
        steps.forEach(step => {
            step.classList.toggle('active', parseInt(step.dataset.step) === currentStep);
        });

        // Update dots
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index + 1 === currentStep);
        });

        // Update buttons
        prevBtn.disabled = currentStep === 1;
        if (currentStep === steps.length) {
            nextBtn.innerText = 'Finish ✓';
            nextBtn.onclick = closeModal;
        } else {
            nextBtn.innerText = 'Next →';
            nextBtn.onclick = () => updateStep(currentStep + 1);
        }
    }

    function closeModal() {
        modal.classList.remove('show');
    }

    btn.onclick = () => {
        updateStep(1); // Reset to first step
        modal.classList.add('show');
    };

    closeBtn.onclick = closeModal;
    if (finishBtn) finishBtn.onclick = closeModal;

    prevBtn.onclick = () => {
        if (currentStep > 1) updateStep(currentStep - 1);
    };

    nextBtn.onclick = () => {
        if (currentStep < steps.length) updateStep(currentStep + 1);
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            closeModal();
        }
    };
}

// Global exposure for UI onclick handlers
window.updateLeg = updateLeg;
window.removeLeg = removeLeg;
