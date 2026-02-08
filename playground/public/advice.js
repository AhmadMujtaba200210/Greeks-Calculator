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
        const advice = [];

        // 1. Moneyness & Directional Advice
        if (isCall) {
            if (moneyness > 1.10) {
                advice.push({
                    type: 'success', // ITM
                    title: 'Deep In-The-Money (ITM)',
                    text: 'This option behaves almost like stock (Delta ~ 1.0). Minimal time value remaining. <strong>Strategy:</strong> Good for stock replacement strategies with less capital outlay than buying shares.'
                });
            } else if (moneyness < 0.85) {
                advice.push({
                    type: 'warning', // OTM
                    title: 'Deep Out-Of-The-Money (OTM)',
                    text: '<strong>"Lotto Ticket" Zone:</strong> Low probability of profit. High leverage but highly likely to expire worthless. <strong>Risk:</strong> Manage position size strictly.'
                });
            } else {
                advice.push({
                    type: 'info', // ATM
                    title: 'At-The-Money (ATM) Battleground',
                    text: 'Highest external/time value. Price is most sensitive to Volatility and Time decay here. <strong>Action:</strong> Ideal for short-term directional plays or volatility speculation.'
                });
            }
        } else { // Put
            if (moneyness < 0.90) {
                advice.push({
                    type: 'success', // ITM Put
                    title: 'Deep In-The-Money (ITM)',
                    text: 'High Delta put. Acts like short stock. <strong>Strategy:</strong> Effective for aggressive hedging or bearish directionality without borrowing shares.'
                });
            } else if (moneyness > 1.15) {
                advice.push({
                    type: 'warning', // OTM Put
                    title: 'Deep Out-Of-The-Money (OTM)',
                    text: 'Low probability cheap hedge. <strong>Note:</strong> Often overpriced due to "skew" (fear premium) in equity markets.'
                });
            }
        }

        // 2. Gamma / Explosiveness Risk
        if (greeks.gamma > 0.05 && daysToExpiry < 30) {
            advice.push({
                type: 'danger',
                title: '🔥 Gamma Risk Alert',
                text: '<strong>Gamma is extremely high.</strong> Your Delta will flip rapidly with small price moves. <strong>Warning:</strong> If you are short this option, a small move against you can explode losses. If long, you need to be quick to monetize.'
            });
        }

        // 4. Volatility Enviroment
        // Check Extreme Vol Check FIRST
        if (volatility > 1.0) { // >100% Vol
            advice.push({
                type: 'danger',
                title: 'Extreme Volatility Environment',
                text: 'IV is > 100%. Option premiums are extremely expensive. <strong>Consider:</strong> Selling strategies (Credit Spreads) might offer better edge than buying outright premium, unless you expect a massive move.'
            });
        }
        // Then Check High Vega (if not extreme, or just as additional info? Let's keep them separate to avoid noise)
        else if (greeks.vega > 0.15) {
            advice.push({
                type: 'info',
                title: 'High Vega Exposure',
                text: 'This position is a <strong>Volatility Play</strong>. A 1% drop in IV will hurt you as much as a significant price move. <strong>Check:</strong> Is IV historically high (IV Rank) or low?'
            });
        }

        // 3. Theta / Time Decay
        // Lowered threshold to 0.05 ($5/day) which is significant for retail
        if (daysToExpiry < 21 && Math.abs(greeks.theta) > 0.05) {
            advice.push({
                type: 'warning',
                title: '⏳ Theta Burn Accelerating',
                text: `You are entering the "Theta Cliff". Time decay is accelerating exponentially. <strong>Reality:</strong> You are paying ~$${Math.abs(greeks.theta * 100).toFixed(2)} per day per contract just to hold this.`
            });
        }

        // 5. Interest Rate (Rho) - Usually ignored, but relevant for LEAPS
        if (maturity > 2 && rate > 0.05) {
            advice.push({
                type: 'info',
                title: 'Interest Rate Sensitivity',
                text: 'For LEAPS, high rates pump Call prices (cost of carry). <strong>Note:</strong> You are effectively leveraging "borrowed money" to control the stock.'
            });
        }

        return advice;
    }
};
