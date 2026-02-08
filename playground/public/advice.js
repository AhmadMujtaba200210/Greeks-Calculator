/**
 * Trader Advice Generator
 * Generates practical, trader-centric advice based on current Greeks and market conditions.
 */
const AdviceGenerator = {
    generate(state, greeks) {
        const { spot, strike, maturity, volatility, optionType, rate } = state;
        const moneyness = spot / strike;
        const isCall = optionType === 'call';
        const daysToExpiry = maturity * 365;

        // PRIORITY LOGIC: Return only the most critical advice

        // 1. Extreme Volatility (Danger)
        if (volatility > 1.0) {
            return {
                type: 'danger',
                title: 'Extreme Volatility',
                text: 'IV > 100%. Premiums are extremely expensive. Consider selling strategies (Credit Spreads).'
            };
        }

        // 2. Gamma Risk (Danger)
        if (greeks.gamma > 0.05 && daysToExpiry < 30) {
            return {
                type: 'danger',
                title: 'High Gamma Risk',
                text: 'Position is explosive. Small moves will flip your Delta and P&L rapidly.'
            };
        }

        // 3. Theta Cliff (Warning)
        // Threshold: > $5/day decay per contract (approx)
        if (daysToExpiry < 21 && Math.abs(greeks.theta) > 0.05) {
            return {
                type: 'warning',
                title: 'Theta Acceleration',
                text: `You are entering the "Theta Cliff". Time decay is accelerating. You are paying ~$${Math.abs(greeks.theta * 100).toFixed(2)} per day per contract.`
            };
        }

        // 4. "Lotto Ticket" / Deep OTM (Warning)
        if (isCall && moneyness < 0.85) {
            return {
                type: 'warning',
                title: 'Lotto Ticket (OTM)',
                text: 'Low probability of profit. High leverage but highly likely to expire worthless. Manage size.'
            };
        }
        if (!isCall && moneyness > 1.15) {
            return {
                type: 'warning',
                title: 'Deep OTM Put',
                text: 'Low probability hedge. Often overpriced due to skew in equity markets.'
            };
        }

        // 5. High Vega (Info)
        if (greeks.vega > 0.15) {
            return {
                type: 'info',
                title: 'High Vega Exposure',
                text: 'Sensitive to IV changes. A 1% drop in Volatility hurts as much as a price move.'
            };
        }

        // 6. Stock Replacement / Deep ITM (Success/Info)
        if ((isCall && moneyness > 1.10) || (!isCall && moneyness < 0.90)) {
            return {
                type: 'success',
                title: 'Stock Replacement',
                text: 'High Delta (~1.0). Mimics stock ownership with less capital outlay.'
            };
        }

        // Default: ATM / Normal
        return {
            type: 'neutral',
            title: 'Standard Exposure',
            text: 'Balanced profile. Monitor price action and volatility changes.'
        };
    }
};
