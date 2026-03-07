class BlackScholesSurrogate {
    constructor() {
        this.weights = null;
        this.biases = null;
        this.scaler = null;
        this.ready = false;
        this.loadWeights();
    }

    async loadWeights() {
        try {
            const response = await fetch('js/ai_weights.json');
            const data = await response.json();
            this.weights = data.weights;
            this.biases = data.biases;
            this.scaler = data.scaler;
            this.ready = true;
            console.log("🤖 AI Surrogate Model Loaded Successfully");
        } catch (error) {
            console.error("Failed to load AI Surrogate model weights:", error);
        }
    }

    relu(x) {
        return Math.max(0, x);
    }

    // Forward pass for MLPRegressor
    predictPrice(S, K, T, v, r, isCall) {
        if (!this.ready) return 0;

        // Edge cases
        if (T <= 0) {
            return isCall ? Math.max(0, S - K) : Math.max(0, K - S);
        }

        // The model was trained on Call options. We use Put-Call parity for Puts.
        const moneyness = S / K;
        let x = [moneyness, T, v, r];

        // Standard Scaler: (x - mean) / scale
        for (let i = 0; i < x.length; i++) {
            x[i] = (x[i] - this.scaler.mean[i]) / this.scaler.scale[i];
        }

        // Layer 1
        let h1 = [];
        for (let j = 0; j < this.weights[0][0].length; j++) {
            let sum = this.biases[0][j];
            for (let i = 0; i < x.length; i++) {
                sum += x[i] * this.weights[0][i][j];
            }
            h1.push(this.relu(sum));
        }

        // Layer 2
        let h2 = [];
        for (let j = 0; j < this.weights[1][0].length; j++) {
            let sum = this.biases[1][j];
            for (let i = 0; i < h1.length; i++) {
                sum += h1[i] * this.weights[1][i][j];
            }
            h2.push(this.relu(sum));
        }

        // Output Layer
        let out = this.biases[2][0];
        for (let i = 0; i < h2.length; i++) {
            out += h2[i] * this.weights[2][i][0];
        }

        // The target was Price / K
        let callPrice = out * K;
        callPrice = Math.max(0, callPrice); // Ensure non-negative

        if (!isCall) {
            // Put-Call Parity: P = C + K*e^(-r*T) - S
            const putPrice = callPrice + K * Math.exp(-r * T) - S;
            return Math.max(0, putPrice);
        }

        return callPrice;
    }

    // Calculate Greeks computationally via finite differences using the neural net
    predictGreeks(spot, strike, t, vol, rate, q, isCall) {
        if (!this.ready) {
            return { price: 0, delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 };
        }

        const price = this.predictPrice(spot, strike, t, vol, rate, isCall);

        // Perturbations
        const dS = spot * 0.01; // 1%
        const dv = 0.01;        // 1 vol point
        const dT = 1.0 / 365.0; // 1 day
        const dr = 0.01;        // 1 rate point

        const p_up_S = this.predictPrice(spot + dS, strike, t, vol, rate, isCall);
        const p_down_S = this.predictPrice(spot - dS, strike, t, vol, rate, isCall);

        const delta = (p_up_S - p_down_S) / (2 * dS);
        const gamma = (p_up_S - 2 * price + p_down_S) / (dS * dS);

        const p_up_v = this.predictPrice(spot, strike, t, vol + dv, rate, isCall);
        const p_down_v = this.predictPrice(spot, strike, t, Math.max(0.01, vol - dv), rate, isCall);
        const vega = (p_up_v - p_down_v) / (2 * dv) / 100; // standard per 1% point

        const p_down_t = this.predictPrice(spot, strike, Math.max(0.0001, t - dT), vol, rate, isCall);
        const theta = (p_down_t - price); // 1 day decay value

        const p_up_r = this.predictPrice(spot, strike, t, vol, rate + dr, isCall);
        const p_down_r = this.predictPrice(spot, strike, t, Math.max(0, rate - dr), isCall);
        const rho = (p_up_r - p_down_r) / (2 * dr) / 100;

        return {
            price,
            delta,
            gamma,
            vega,
            theta,
            rho
        };
    }
}

// Expose globally
window.aiSurrogate = new BlackScholesSurrogate();
