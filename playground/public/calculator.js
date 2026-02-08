// Black-Scholes Calculator Implementation

class BlackScholesCalculator {
    constructor() {
        this.SQRT_2PI = Math.sqrt(2 * Math.PI);
        this.SQRT_2 = Math.sqrt(2);
    }

    // Standard normal cumulative distribution function
    normCDF(x) {
        const t = 1 / (1 + 0.2316419 * Math.abs(x));
        const d = 0.3989423 * Math.exp(-x * x / 2);
        const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return x > 0 ? 1 - prob : prob;
    }

    // Standard normal probability density function
    normPDF(x) {
        return Math.exp(-0.5 * x * x) / this.SQRT_2PI;
    }

    // Calculate d1 and d2
    calculateD1D2(S, K, T, sigma, r, q) {
        const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
        const d2 = d1 - sigma * Math.sqrt(T);
        return { d1, d2 };
    }

    // Calculate option price
    calculatePrice(S, K, T, sigma, r, q, isCall = true) {
        const { d1, d2 } = this.calculateD1D2(S, K, T, sigma, r, q);
        const discountFactor = Math.exp(-r * T);
        const forwardDiscount = Math.exp(-q * T);

        if (isCall) {
            return S * forwardDiscount * this.normCDF(d1) - K * discountFactor * this.normCDF(d2);
        } else {
            return K * discountFactor * this.normCDF(-d2) - S * forwardDiscount * this.normCDF(-d1);
        }
    }

    // Calculate all Greeks
    calculateGreeks(S, K, T, sigma, r, q, isCall = true) {
        const { d1, d2 } = this.calculateD1D2(S, K, T, sigma, r, q);
        const discountFactor = Math.exp(-r * T);
        const forwardDiscount = Math.exp(-q * T);
        const sqrtT = Math.sqrt(T);

        // Price
        const price = this.calculatePrice(S, K, T, sigma, r, q, isCall);

        // Delta
        const delta = isCall 
            ? forwardDiscount * this.normCDF(d1)
            : forwardDiscount * (this.normCDF(d1) - 1);

        // Gamma (same for call and put)
        const gamma = (forwardDiscount * this.normPDF(d1)) / (S * sigma * sqrtT);

        // Vega (same for call and put, divided by 100 for 1% change)
        const vega = (S * forwardDiscount * sqrtT * this.normPDF(d1)) / 100;

        // Theta (per day, so divide by 365)
        let theta;
        if (isCall) {
            theta = (
                -(S * forwardDiscount * this.normPDF(d1) * sigma) / (2 * sqrtT) -
                r * K * discountFactor * this.normCDF(d2) +
                q * S * forwardDiscount * this.normCDF(d1)
            ) / 365;
        } else {
            theta = (
                -(S * forwardDiscount * this.normPDF(d1) * sigma) / (2 * sqrtT) +
                r * K * discountFactor * this.normCDF(-d2) -
                q * S * forwardDiscount * this.normCDF(-d1)
            ) / 365;
        }

        // Rho (divided by 100 for 1% change)
        const rho = isCall
            ? (K * T * discountFactor * this.normCDF(d2)) / 100
            : -(K * T * discountFactor * this.normCDF(-d2)) / 100;

        return { price, delta, gamma, vega, theta, rho };
    }

    // Calculate Greeks for a range of spot prices (for charting)
    calculateGreeksRange(K, T, sigma, r, q, isCall, spotMin, spotMax, points = 50) {
        const results = [];
        const step = (spotMax - spotMin) / (points - 1);

        for (let i = 0; i < points; i++) {
            const S = spotMin + i * step;
            const greeks = this.calculateGreeks(S, K, T, sigma, r, q, isCall);
            results.push({
                spot: S,
                ...greeks
            });
        }

        return results;
    }

    // Calculate time decay over time (for charting)
    calculateTimeDecay(S, K, sigma, r, q, isCall, maxDays = 90) {
        const results = [];
        
        for (let days = maxDays; days >= 0; days--) {
            const T = days / 365;
            if (T <= 0) continue;
            
            const greeks = this.calculateGreeks(S, K, T, sigma, r, q, isCall);
            results.push({
                daysToExpiry: days,
                ...greeks
            });
        }

        return results;
    }
}

// Export for use in other files
const calculator = new BlackScholesCalculator();
