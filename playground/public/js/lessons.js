// Lesson Content Database - Revamped for Beginner → Advanced

const list = (items) => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;

const levelCard = (title, body, cls) => `
    <div class="level-card ${cls}">
        <div class="level-title">${title}</div>
        ${body}
    </div>
`;

const levelGrid = (beginner, intermediate, advanced) => `
    <div class="level-grid">
        ${levelCard('Beginner', beginner, 'beginner')}
        ${levelCard('Intermediate', intermediate, 'intermediate')}
        ${levelCard('Advanced', advanced, 'advanced')}
    </div>
`;

const section = (title, body) => `
    <h3>${title}</h3>
    ${body}
`;

const riskNote = (text) => `
    <div class="risk-note"><strong>Risk Note:</strong> ${text}</div>
`;

const mindsetBox = (title, text) => `
    <div class="mindset-box"><strong>${title}</strong><br>${text}</div>
`;

const exampleBox = (title, body) => `
    <div class="example-box"><h4>${title}</h4>${body}</div>
`;

const proTip = (text) => `
    <div class="pro-tip"><p>${text}</p></div>
`;

// Strategy presets for charts and builder
const strategyPresets = {
    bull_call_spread: {
        label: 'Bull Call Spread',
        group: 'Directional Spreads',
        legs: [
            { action: 'buy', type: 'call', strike: 100, premium: 5, quantity: 1 },
            { action: 'sell', type: 'call', strike: 110, premium: 2, quantity: 1 }
        ]
    },
    bear_put_spread: {
        label: 'Bear Put Spread',
        group: 'Directional Spreads',
        legs: [
            { action: 'buy', type: 'put', strike: 100, premium: 4, quantity: 1 },
            { action: 'sell', type: 'put', strike: 90, premium: 1, quantity: 1 }
        ]
    },
    bull_put_spread: {
        label: 'Bull Put Spread',
        group: 'Directional Spreads',
        legs: [
            { action: 'sell', type: 'put', strike: 95, premium: 2.5, quantity: 1 },
            { action: 'buy', type: 'put', strike: 90, premium: 1, quantity: 1 }
        ]
    },
    bear_call_spread: {
        label: 'Bear Call Spread',
        group: 'Directional Spreads',
        legs: [
            { action: 'sell', type: 'call', strike: 105, premium: 2.5, quantity: 1 },
            { action: 'buy', type: 'call', strike: 110, premium: 1, quantity: 1 }
        ]
    },
    covered_call: {
        label: 'Covered Call',
        group: 'Stock Replacement & Income',
        legs: [
            { action: 'buy', type: 'stock', strike: 100, premium: 0, quantity: 1 },
            { action: 'sell', type: 'call', strike: 110, premium: 2, quantity: 1 }
        ]
    },
    protective_put: {
        label: 'Protective Put',
        group: 'Stock Replacement & Income',
        legs: [
            { action: 'buy', type: 'stock', strike: 100, premium: 0, quantity: 1 },
            { action: 'buy', type: 'put', strike: 95, premium: 2, quantity: 1 }
        ]
    },
    collar: {
        label: 'Collar',
        group: 'Stock Replacement & Income',
        legs: [
            { action: 'buy', type: 'stock', strike: 100, premium: 0, quantity: 1 },
            { action: 'buy', type: 'put', strike: 95, premium: 2, quantity: 1 },
            { action: 'sell', type: 'call', strike: 110, premium: 2, quantity: 1 }
        ]
    },
    synthetic_stock: {
        label: 'Synthetic Stock (Long)',
        group: 'Stock Replacement & Income',
        legs: [
            { action: 'buy', type: 'call', strike: 100, premium: 5, quantity: 1 },
            { action: 'sell', type: 'put', strike: 100, premium: 5, quantity: 1 }
        ]
    },
    long_straddle: {
        label: 'Long Straddle',
        group: 'Volatility Plays',
        legs: [
            { action: 'buy', type: 'call', strike: 100, premium: 5, quantity: 1 },
            { action: 'buy', type: 'put', strike: 100, premium: 5, quantity: 1 }
        ]
    },
    short_straddle: {
        label: 'Short Straddle',
        group: 'Volatility Plays',
        legs: [
            { action: 'sell', type: 'call', strike: 100, premium: 5, quantity: 1 },
            { action: 'sell', type: 'put', strike: 100, premium: 5, quantity: 1 }
        ]
    },
    long_strangle: {
        label: 'Long Strangle',
        group: 'Volatility Plays',
        legs: [
            { action: 'buy', type: 'call', strike: 105, premium: 3, quantity: 1 },
            { action: 'buy', type: 'put', strike: 95, premium: 3, quantity: 1 }
        ]
    },
    short_strangle: {
        label: 'Short Strangle',
        group: 'Volatility Plays',
        legs: [
            { action: 'sell', type: 'call', strike: 105, premium: 3, quantity: 1 },
            { action: 'sell', type: 'put', strike: 95, premium: 3, quantity: 1 }
        ]
    },
    call_backspread: {
        label: 'Call Backspread (1x2)',
        group: 'Volatility Plays',
        legs: [
            { action: 'sell', type: 'call', strike: 100, premium: 6, quantity: 1 },
            { action: 'buy', type: 'call', strike: 110, premium: 2.5, quantity: 2 }
        ]
    },
    put_backspread: {
        label: 'Put Backspread (1x2)',
        group: 'Volatility Plays',
        legs: [
            { action: 'sell', type: 'put', strike: 100, premium: 4, quantity: 1 },
            { action: 'buy', type: 'put', strike: 90, premium: 2, quantity: 2 }
        ]
    },
    iron_condor: {
        label: 'Iron Condor',
        group: 'Range-Bound Premium Sellers',
        legs: [
            { action: 'sell', type: 'put', strike: 95, premium: 2, quantity: 1 },
            { action: 'buy', type: 'put', strike: 90, premium: 1, quantity: 1 },
            { action: 'sell', type: 'call', strike: 105, premium: 2, quantity: 1 },
            { action: 'buy', type: 'call', strike: 110, premium: 1, quantity: 1 }
        ]
    },
    iron_butterfly: {
        label: 'Iron Butterfly',
        group: 'Range-Bound Premium Sellers',
        legs: [
            { action: 'sell', type: 'call', strike: 100, premium: 4, quantity: 1 },
            { action: 'sell', type: 'put', strike: 100, premium: 4, quantity: 1 },
            { action: 'buy', type: 'put', strike: 90, premium: 1, quantity: 1 },
            { action: 'buy', type: 'call', strike: 110, premium: 1, quantity: 1 }
        ]
    },
    long_call_butterfly: {
        label: 'Long Call Butterfly',
        group: 'Butterflies & Ratio Structures',
        legs: [
            { action: 'buy', type: 'call', strike: 90, premium: 6, quantity: 1 },
            { action: 'sell', type: 'call', strike: 100, premium: 3, quantity: 2 },
            { action: 'buy', type: 'call', strike: 110, premium: 1, quantity: 1 }
        ]
    },
    long_put_butterfly: {
        label: 'Long Put Butterfly',
        group: 'Butterflies & Ratio Structures',
        legs: [
            { action: 'buy', type: 'put', strike: 110, premium: 6, quantity: 1 },
            { action: 'sell', type: 'put', strike: 100, premium: 3, quantity: 2 },
            { action: 'buy', type: 'put', strike: 90, premium: 1, quantity: 1 }
        ]
    },
    broken_wing_butterfly: {
        label: 'Broken-Wing Butterfly',
        group: 'Butterflies & Ratio Structures',
        legs: [
            { action: 'buy', type: 'call', strike: 95, premium: 5, quantity: 1 },
            { action: 'sell', type: 'call', strike: 105, premium: 2.5, quantity: 2 },
            { action: 'buy', type: 'call', strike: 120, premium: 0.6, quantity: 1 }
        ]
    },
    ratio_spread: {
        label: 'Call Ratio Spread',
        group: 'Butterflies & Ratio Structures',
        legs: [
            { action: 'buy', type: 'call', strike: 100, premium: 5, quantity: 1 },
            { action: 'sell', type: 'call', strike: 110, premium: 2, quantity: 2 }
        ]
    },
    calendar_spread: {
        label: 'Calendar Spread',
        group: 'Time Spreads',
        legs: [
            { action: 'sell', type: 'call', strike: 100, premium: 3, quantity: 1 },
            { action: 'buy', type: 'call', strike: 100, premium: 5, quantity: 1 }
        ],
        customCurve: {
            spots: [70, 85, 95, 100, 105, 115, 130],
            payoffs: [-2, -1, 1.5, 3, 1.5, -1, -2]
        }
    },
    diagonal_spread: {
        label: 'Diagonal Spread',
        group: 'Time Spreads',
        legs: [
            { action: 'sell', type: 'call', strike: 105, premium: 2.5, quantity: 1 },
            { action: 'buy', type: 'call', strike: 100, premium: 5, quantity: 1 }
        ],
        customCurve: {
            spots: [70, 85, 95, 100, 110, 120, 135],
            payoffs: [-2.5, -1.5, 0.5, 2.5, 2, 0.5, -1.5]
        }
    },
    double_calendar: {
        label: 'Double Calendar',
        group: 'Time Spreads',
        legs: [
            { action: 'sell', type: 'call', strike: 105, premium: 2.5, quantity: 1 },
            { action: 'sell', type: 'put', strike: 95, premium: 2.5, quantity: 1 },
            { action: 'buy', type: 'call', strike: 105, premium: 4, quantity: 1 },
            { action: 'buy', type: 'put', strike: 95, premium: 4, quantity: 1 }
        ],
        customCurve: {
            spots: [70, 85, 95, 100, 105, 115, 130],
            payoffs: [-3, -1, 2.5, 3, 2.5, -1, -3]
        }
    }
};

window.strategyPresets = strategyPresets;

const strategyPresetGroups = {
    'Directional Spreads': ['bull_call_spread', 'bear_put_spread', 'bull_put_spread', 'bear_call_spread'],
    'Stock Replacement & Income': ['covered_call', 'protective_put', 'collar', 'synthetic_stock'],
    'Volatility Plays': ['long_straddle', 'short_straddle', 'long_strangle', 'short_strangle', 'call_backspread', 'put_backspread'],
    'Range-Bound Premium Sellers': ['iron_condor', 'iron_butterfly'],
    'Butterflies & Ratio Structures': ['long_call_butterfly', 'long_put_butterfly', 'broken_wing_butterfly', 'ratio_spread'],
    'Time Spreads': ['calendar_spread', 'diagonal_spread', 'double_calendar']
};

window.strategyPresetGroups = strategyPresetGroups;

const strategyLibrary = {
    bull_call_spread: {
        title: 'Bull Call Spread (Debit)',
        tags: 'Bullish • Defined Risk • Moderate IV',
        summary: 'Buy a call and sell a higher strike call to reduce cost and cap upside.',
        read: [
            'Max loss is the net debit paid.',
            'Max profit is strike width minus debit.',
            'Breakeven = lower strike + debit.'
        ],
        use: [
            'You expect a steady rise, not a moonshot.',
            'IV is elevated and you want cheaper exposure.',
            'You prefer defined risk.'
        ],
        avoid: [
            'You expect explosive upside (cap hurts).',
            'The spread is too narrow for the risk.',
            'Liquidity is poor and bid/ask is wide.'
        ],
        master: [
            'Enter on pullbacks; exit if delta flattens.',
            'Prefer 30–60 DTE for smoother Greeks.',
            'Track delta of the spread, not the long leg.'
        ],
        example: 'XYZ $100. Buy 100C ($5) / Sell 110C ($2). Debit $3. Max profit $7. Max loss $3. BE $103.',
        advanced: 'Skew can make the short call cheap. Adjust by selling a higher delta call only if you can accept slower gamma.'
    },
    bear_put_spread: {
        title: 'Bear Put Spread (Debit)',
        tags: 'Bearish • Defined Risk • Volatility Friendly',
        summary: 'Buy a put and sell a lower strike put to reduce cost and cap downside profit.',
        read: [
            'Max loss is debit paid.',
            'Max profit is strike width minus debit.',
            'Breakeven = higher strike - debit.'
        ],
        use: [
            'You expect a controlled selloff.',
            'IV is high and you want cheaper protection.',
            'You want defined risk without shorting stock.'
        ],
        avoid: [
            'You expect a crash (profit capped).',
            'Event risk could gap through your strikes.',
            'Put skew is extreme and spread is expensive.'
        ],
        master: [
            'Choose strikes near expected support.',
            'Monitor put skew; sometimes a single put is better.',
            'Take profit early if delta saturates.'
        ],
        example: 'XYZ $100. Buy 100P ($4) / Sell 90P ($1). Debit $3. Max profit $7. Max loss $3. BE $97.',
        advanced: 'If skew is steep, the short put can finance more of your long put, improving risk-reward.'
    },
    bull_put_spread: {
        title: 'Bull Put Spread (Credit)',
        tags: 'Bullish/Neutral • Income • Short Vol',
        summary: 'Sell a put and buy a lower strike put for protection. You win if price stays above the short strike.',
        read: [
            'Max profit is credit received.',
            'Max loss is strike width minus credit.',
            'Breakeven = short strike - credit.'
        ],
        use: [
            'You expect sideways to up.',
            'IV is high (premium rich).',
            'You want positive theta.'
        ],
        avoid: [
            'Downside event risk or poor liquidity.',
            'You cannot take assignment risk.',
            'Skew is extreme and you are under-hedged.'
        ],
        master: [
            'Sell 20–30 delta, buy 5–10 delta.',
            'Scale risk per spread; avoid oversized width.',
            'Consider early profit targets (50–70%).'
        ],
        example: 'XYZ $100. Sell 95P ($2.50) / Buy 90P ($1). Credit $1.50. Max loss $3.50. BE $93.50.',
        advanced: 'If you expect a vol crush, consider selling slightly closer strikes; if not, stay wider.'
    },
    bear_call_spread: {
        title: 'Bear Call Spread (Credit)',
        tags: 'Bearish/Neutral • Income • Short Vol',
        summary: 'Sell a call and buy a higher strike call for protection. You win if price stays below the short strike.',
        read: [
            'Max profit is credit received.',
            'Max loss is strike width minus credit.',
            'Breakeven = short strike + credit.'
        ],
        use: [
            'You expect flat to down price action.',
            'IV is elevated (premium rich).',
            'You want defined risk.'
        ],
        avoid: [
            'Strong bullish catalysts ahead.',
            'Borrow costs or call skew are extreme.',
            'Tight spreads with poor reward.'
        ],
        master: [
            'Use 20–30 delta shorts.',
            'Close before expiration to avoid pin risk.',
            'Reduce size when gamma accelerates.'
        ],
        example: 'XYZ $100. Sell 105C ($2.50) / Buy 110C ($1). Credit $1.50. Max loss $3.50. BE $106.50.',
        advanced: 'Compare with risk reversal if skew is steep; sometimes selling put skew is superior.'
    },
    covered_call: {
        title: 'Covered Call',
        tags: 'Income • Slightly Bullish • Stock Based',
        summary: 'Own stock and sell a call to generate income while capping upside.',
        read: [
            'Upside capped at strike plus premium.',
            'Downside is stock risk minus premium.',
            'Best when you are neutral to mildly bullish.'
        ],
        use: [
            'You want income on long stock.',
            'You believe upside is limited.',
            'IV is higher than usual.'
        ],
        avoid: [
            'You expect a big rally.',
            'You cannot handle assignment.',
            'You want full upside exposure.'
        ],
        master: [
            'Sell calls above key resistance.',
            'Roll up and out if trend strengthens.',
            'Use tax-aware exit timing.'
        ],
        example: 'Buy 100 shares at $100. Sell 110C for $2. Max profit $12. Max loss: stock downside minus $2.',
        advanced: 'Use delta targeting (e.g., 0.25) and avoid selling calls into earnings without a plan.'
    },
    protective_put: {
        title: 'Protective Put',
        tags: 'Hedge • Bullish • Tail Risk Control',
        summary: 'Own stock and buy a put to define your downside.',
        read: [
            'Downside floor at put strike minus premium.',
            'Upside remains open, but premium reduces returns.',
            'Acts like an insurance policy.'
        ],
        use: [
            'You want to hold stock through uncertainty.',
            'You need a hard loss limit.',
            'You expect volatility to rise.'
        ],
        avoid: [
            'Premiums are extremely expensive.',
            'You can tolerate the drawdown without a hedge.',
            'You plan to sell the stock soon anyway.'
        ],
        master: [
            'Match the put tenor to your risk window.',
            'Consider spreads if premium is too high.',
            'Re-evaluate after volatility events.'
        ],
        example: 'Buy 100 shares at $100. Buy 95P for $2. Max loss ≈ $7 (to $95 + $2).',
        advanced: 'Dynamic hedging: reduce put strike after rallies to keep protection affordable.'
    },
    collar: {
        title: 'Collar',
        tags: 'Hedge • Cost-Controlled • Range-Bound',
        summary: 'Own stock, buy a put, sell a call to finance the hedge.',
        read: [
            'Downside floor at put strike.',
            'Upside capped at call strike.',
            'Often near-zero cost when strikes are balanced.'
        ],
        use: [
            'You want cheap insurance.',
            'You accept capped upside in exchange for safety.',
            'You are holding a large position long-term.'
        ],
        avoid: [
            'You need full upside participation.',
            'The call you sell is too close to spot.',
            'You expect volatile gaps.'
        ],
        master: [
            'Choose strikes at key support/resistance.',
            'Roll in advance of major events.',
            'Keep the hedge cost near zero if possible.'
        ],
        example: 'Buy 100 shares at $100. Buy 95P ($2). Sell 110C ($2). Net $0. Range: $95–$110.',
        advanced: 'Collars are also volatility trades: long skew (puts) financed by short calls.'
    },
    synthetic_stock: {
        title: 'Synthetic Stock (Long)',
        tags: 'Directional • Capital Efficient',
        summary: 'Buy a call and sell a put at the same strike to mimic long stock.',
        read: [
            'Delta near +1 when ATM.',
            'Requires margin for short put.',
            'Tracks stock closely with different financing.'
        ],
        use: [
            'You want stock-like exposure with option capital usage.',
            'You can manage short put risk.',
            'You want defined entry (strike).' 
        ],
        avoid: [
            'You cannot hold stock if assigned.',
            'Volatility is extremely high.',
            'You want limited downside.'
        ],
        master: [
            'Choose strikes near your preferred entry.',
            'Watch dividend impact on parity.',
            'Use as a replacement for stock in spreads.'
        ],
        example: 'Buy 100C ($5) + Sell 100P ($5) ≈ long stock at $100.',
        advanced: 'Synthetic stock is sensitive to borrow costs and dividends through put-call parity.'
    },
    long_straddle: {
        title: 'Long Straddle',
        tags: 'Long Vol • Event Play • Large Move',
        summary: 'Buy a call and put at the same strike. You win big if price moves hard.',
        read: [
            'Loss limited to total premium.',
            'Breakevens = strike ± total premium.',
            'Profit on big moves either direction.'
        ],
        use: [
            'You expect a large move but unsure direction.',
            'Implied move is underpriced.',
            'Catalyst risk is high.'
        ],
        avoid: [
            'IV is already extremely high.',
            'You expect a small move.',
            'Time to event is long (theta burn).' 
        ],
        master: [
            'Compare implied move vs your forecast.',
            'Exit quickly after volatility expansion.',
            'Avoid paying for excessive IV.'
        ],
        example: 'XYZ $100. Buy 100C ($5) + 100P ($5). Debit $10. BE $90/$110.',
        advanced: 'Gamma is highest near ATM. Manage size; losses accelerate if the stock pins.'
    },
    short_straddle: {
        title: 'Short Straddle',
        tags: 'Short Vol • Income • High Risk',
        summary: 'Sell a call and a put at the same strike. You win if price stays close.',
        read: [
            'Max profit = total credit.',
            'Losses are unlimited on upside, large on downside.',
            'Breakevens = strike ± credit.'
        ],
        use: [
            'You expect low volatility and range trading.',
            'IV is rich and likely to crush.',
            'You have strict risk controls.'
        ],
        avoid: [
            'Events or catalysts ahead.',
            'You cannot hedge quickly.',
            'Skew is steep (tail risk high).'
        ],
        master: [
            'Keep position small relative to capital.',
            'Hedge delta quickly as spot moves.',
            'Consider converting to iron fly for defined risk.'
        ],
        example: 'Sell 100C ($5) + 100P ($5). Credit $10. BE $90/$110.',
        advanced: 'Monitor gamma near expiry. Small moves can quickly become large losses.'
    },
    long_strangle: {
        title: 'Long Strangle',
        tags: 'Long Vol • Cheaper Than Straddle',
        summary: 'Buy an OTM call and OTM put. Lower cost, needs a bigger move.',
        read: [
            'Loss limited to premium.',
            'Breakevens are farther than straddle.',
            'Cheaper entry, wider move required.'
        ],
        use: [
            'You expect a big move but want lower cost.',
            'You can tolerate a lower probability of profit.',
            'You expect volatility expansion.'
        ],
        avoid: [
            'You expect only moderate movement.',
            'IV is already extreme.',
            'Liquidity is thin at chosen strikes.'
        ],
        master: [
            'Choose strikes around expected move.',
            'Scale out as one side wins.',
            'Avoid too-far OTM to keep gamma alive.'
        ],
        example: 'Buy 105C ($3) + 95P ($3). Debit $6. BE $89/$111.',
        advanced: 'Long strangles are sensitive to skew. Favor the side with cheaper vol.'
    },
    short_strangle: {
        title: 'Short Strangle',
        tags: 'Short Vol • Range Trade',
        summary: 'Sell an OTM call and OTM put. You win if price stays inside the range.',
        read: [
            'Max profit = credit.',
            'Losses large beyond breakevens.',
            'Breakevens = strikes ± credit.'
        ],
        use: [
            'You expect range-bound behavior.',
            'IV is elevated and likely to drop.',
            'You can adjust or hedge.'
        ],
        avoid: [
            'High event risk ahead.',
            'Low liquidity on wings.',
            'You cannot actively manage.'
        ],
        master: [
            'Sell further OTM than straddle for safety.',
            'Use delta hedges as spot moves.',
            'Cap risk with wings if needed.'
        ],
        example: 'Sell 105C ($3) + 95P ($3). Credit $6. BE $89/$111.',
        advanced: 'If skew is steep, the put side carries more risk. Size accordingly.'
    },
    call_backspread: {
        title: 'Call Backspread (1x2)',
        tags: 'Long Vol • Convex Upside',
        summary: 'Sell one call and buy two higher calls. Cheap or credit entry with convex upside.',
        read: [
            'Limited risk in a middle zone.',
            'Large upside if price rallies hard.',
            'Sensitive to volatility expansion.'
        ],
        use: [
            'You expect a big upside breakout.',
            'You want limited or low-cost risk.',
            'IV is expected to rise.'
        ],
        avoid: [
            'You expect mild drift up only.',
            'The short call is too close to spot.',
            'Liquidity is thin on wings.'
        ],
        master: [
            'Choose a short call near resistance, long calls above.',
            'Keep net credit/debit small.',
            'Monitor gamma around the short strike.'
        ],
        example: 'Sell 100C ($6), buy 2x 110C ($2.5). Net credit $1.',
        advanced: 'A backspread can be neutralized by rolling the short leg up if price trends.'
    },
    put_backspread: {
        title: 'Put Backspread (1x2)',
        tags: 'Long Vol • Crash Protection',
        summary: 'Sell one put and buy two lower puts. Benefits from sharp downside moves.',
        read: [
            'Limited risk near short strike.',
            'Strong profit in a crash.',
            'Often used as tail hedge.'
        ],
        use: [
            'You expect a sharp selloff.',
            'You want downside convexity.',
            'IV may rise quickly.'
        ],
        avoid: [
            'You expect slow drift down only.',
            'Puts are extremely expensive.',
            'You cannot manage short leg risk.'
        ],
        master: [
            'Place short strike near support.',
            'Use farther OTM longs for convexity.',
            'Be aware of margin on the short leg.'
        ],
        example: 'Sell 100P ($4), buy 2x 90P ($2). Net $0. Risk limited near $100.',
        advanced: 'Backspreads are sensitive to skew; ensure you are not overpaying for tail.'
    },
    iron_condor: {
        title: 'Iron Condor',
        tags: 'Range-Bound • Income • Short Vol',
        summary: 'Sell an OTM call spread and an OTM put spread to collect premium in a range.',
        read: [
            'Max profit = credit.',
            'Max loss = spread width - credit.',
            'Wins if price stays inside short strikes.'
        ],
        use: [
            'You expect low volatility.',
            'IV is elevated and likely to mean-revert.',
            'You want defined risk.'
        ],
        avoid: [
            'Strong trend or event risk ahead.',
            'Wings are too close.',
            'Liquidity is poor at wings.'
        ],
        master: [
            'Keep short strikes outside expected move.',
            'Take profits early (50–70%).',
            'Close before expiration to avoid pin risk.'
        ],
        example: 'Sell 95/90 put spread and 105/110 call spread for $2 credit. Max loss $3.',
        advanced: 'Monitor net delta. If the position leans, roll the tested side only.'
    },
    iron_butterfly: {
        title: 'Iron Butterfly',
        tags: 'Range-Bound • Income • High Theta',
        summary: 'Sell ATM straddle and buy wings for defined risk. Tighter range than a condor.',
        read: [
            'Max profit at the center strike.',
            'Risk defined by wings.',
            'Sensitive to small moves near expiry.'
        ],
        use: [
            'You expect very low movement.',
            'You want strong theta decay.',
            'IV is high and likely to drop.'
        ],
        avoid: [
            'You expect any trend.',
            'Assignment risk near expiry.',
            'You cannot hedge quickly.'
        ],
        master: [
            'Choose ATM short strike with liquid options.',
            'Reduce size near expiration.',
            'Consider early profit targets.'
        ],
        example: 'Sell 100C + 100P, buy 90P and 110C. Credit $6. Max loss $4.',
        advanced: 'Pin risk is real near the short strike. Close early.'
    },
    long_call_butterfly: {
        title: 'Long Call Butterfly',
        tags: 'Range Target • Low Cost',
        summary: 'Buy a call butterfly to target a specific price at expiration.',
        read: [
            'Max profit at middle strike.',
            'Defined, small loss outside wings.',
            'Cheap entry for a precise view.'
        ],
        use: [
            'You have a specific target price.',
            'You expect low volatility into expiry.',
            'You want a low-cost trade.'
        ],
        avoid: [
            'You expect big movement.',
            'You need flexibility to adjust.',
            'Liquidity is poor at wings.'
        ],
        master: [
            'Place center strike at expected pin.',
            'Choose symmetric wings for cleaner payoff.',
            'Exit early if price drifts away.'
        ],
        example: 'Buy 90C, sell 2x 100C, buy 110C. Net debit $1.',
        advanced: 'Butterflies benefit from IV crush; avoid paying high IV.'
    },
    long_put_butterfly: {
        title: 'Long Put Butterfly',
        tags: 'Range Target • Low Cost',
        summary: 'Put butterfly mirrors call butterfly; targets a price with defined risk.',
        read: [
            'Max profit at center strike.',
            'Defined risk outside wings.',
            'Low capital for a precise view.'
        ],
        use: [
            'You expect a price pin near a strike.',
            'You want limited risk.',
            'IV is elevated and likely to drop.'
        ],
        avoid: [
            'You expect large directional moves.',
            'You cannot manage near expiration.',
            'Liquidity is thin.'
        ],
        master: [
            'Align center strike with expected settlement.',
            'Monitor time decay as expiry nears.',
            'Close early if the thesis breaks.'
        ],
        example: 'Buy 110P, sell 2x 100P, buy 90P. Net debit $1.',
        advanced: 'Butterflies with puts can be cheaper due to skew; compare both sides.'
    },
    broken_wing_butterfly: {
        title: 'Broken-Wing Butterfly',
        tags: 'Range Target • Asymmetric Risk',
        summary: 'A butterfly with uneven wings to skew payoff and often create a credit.',
        read: [
            'Max profit near the body.',
            'Asymmetric risk on the wider wing.',
            'Often cheaper than a symmetric butterfly.'
        ],
        use: [
            'You expect drift in one direction.',
            'You want a low-cost structure.',
            'You want some directional bias.'
        ],
        avoid: [
            'You need symmetric risk.',
            'You cannot tolerate tail risk on wide wing.',
            'You expect sharp reversals.'
        ],
        master: [
            'Place wider wing on the less likely tail.',
            'Keep net credit small but positive.',
            'Reduce size ahead of events.'
        ],
        example: 'Buy 95C, sell 2x 105C, buy 120C. Net credit ~$0.6.',
        advanced: 'Broken wings can be managed like short spreads if price breaks the body.'
    },
    ratio_spread: {
        title: 'Ratio Spread',
        tags: 'Directional • Short Vol',
        summary: 'Buy fewer options than you sell (e.g., 1x2). Can be credit or low cost.',
        read: [
            'Profit is limited near the short strike.',
            'Loss can be large beyond the short strike.',
            'Often benefits from IV decay.'
        ],
        use: [
            'You expect a move toward the short strike then stall.',
            'You want a low-cost trade.',
            'You can actively hedge.'
        ],
        avoid: [
            'You expect a runaway trend.',
            'You cannot manage risk.',
            'Skew makes the short options too cheap.'
        ],
        master: [
            'Keep the ratio small (1x2).',
            'Hedge aggressively if price breaks out.',
            'Prefer to set for a net credit.'
        ],
        example: 'Buy 100C ($5), sell 2x 110C ($2). Net credit $-1 (debit).',
        advanced: 'Convert to a butterfly by buying an extra wing if risk expands.'
    },
    calendar_spread: {
        title: 'Calendar Spread',
        tags: 'Time Spread • Long Vol • Neutral',
        summary: 'Sell a near-term option and buy a longer-term option at the same strike.',
        read: [
            'Profit peaks if price stays near the strike at short expiry.',
            'Longer-dated option retains time value.',
            'Sensitive to changes in IV.'
        ],
        use: [
            'You expect price to pin near a level.',
            'Front-month IV is rich vs back-month.',
            'You want long vega with positive theta.'
        ],
        avoid: [
            'You expect large move soon.',
            'Term structure is backwardated.',
            'You cannot manage across expiries.'
        ],
        master: [
            'Choose a strike near expected pin.',
            'Close or roll at short expiration.',
            'Track IV term structure.'
        ],
        example: 'Sell 30D 100C ($3), buy 90D 100C ($5). Net debit $2.',
        advanced: 'Calendar payoff is time-dependent. The diagram shown is at short expiry.'
    },
    diagonal_spread: {
        title: 'Diagonal Spread',
        tags: 'Time + Directional',
        summary: 'Like a calendar, but with different strikes to add directional bias.',
        read: [
            'Directionally tilted calendar.',
            'Longer-dated option at different strike.',
            'Combines time decay with directional view.'
        ],
        use: [
            'You want a mild directional bias.',
            'Front-month is rich vs back-month.',
            'You prefer controlled risk.'
        ],
        avoid: [
            'You expect a sharp move against the bias.',
            'IV term structure is flat.',
            'The diagonal is too expensive.'
        ],
        master: [
            'Pick the long strike where you want long-term exposure.',
            'Let the short option decay, then roll.',
            'Monitor delta drift.'
        ],
        example: 'Sell 30D 105C ($2.5), buy 90D 100C ($5). Net debit $2.5.',
        advanced: 'Diagonals have evolving deltas. Rebalance by rolling the short strike.'
    },
    double_calendar: {
        title: 'Double Calendar',
        tags: 'Time Spread • Neutral Range',
        summary: 'Calendar on both sides: sell near-term call & put, buy longer-term call & put.',
        read: [
            'Profit peaks if price stays between strikes.',
            'Long vega, often positive theta.',
            'Time-dependent payoff.'
        ],
        use: [
            'You expect a tight range around a level.',
            'Front-month IV is rich.',
            'You can manage through the front expiry.'
        ],
        avoid: [
            'You expect a breakout.',
            'Front and back IV are similar.',
            'Liquidity is poor in back month.'
        ],
        master: [
            'Choose symmetric strikes around expected price.',
            'Roll the short legs before expiry.',
            'Control size—gamma can spike near expiry.'
        ],
        example: 'Sell 30D 95P/105C, buy 90D 95P/105C. Net debit ~$3.',
        advanced: 'If price trends, consider converting into a diagonal by rolling one side.'
    }
};

const strategyGroups = {
    directional: {
        title: 'Directional Spreads',
        intro: 'Spreads express a directional view while controlling cost and risk. Focus on strike width, debit/credit, and delta exposure.',
        ids: ['bull_call_spread', 'bear_put_spread', 'bull_put_spread', 'bear_call_spread']
    },
    stock_income: {
        title: 'Stock Replacement & Income',
        intro: 'These pair stock with options to add income or protection. They are ideal for investors who already hold shares.',
        ids: ['covered_call', 'protective_put', 'collar', 'synthetic_stock']
    },
    volatility: {
        title: 'Volatility Plays',
        intro: 'These trade the size of the move, not the direction. Understand vega, gamma, and how event volatility is priced.',
        ids: ['long_straddle', 'short_straddle', 'long_strangle', 'short_strangle', 'call_backspread', 'put_backspread']
    },
    range: {
        title: 'Range-Bound Premium Sellers',
        intro: 'Range strategies earn time decay but require strict risk controls. Manage early, avoid pin risk, and respect tail events.',
        ids: ['iron_condor', 'iron_butterfly']
    },
    butterflies: {
        title: 'Butterflies & Ratio Structures',
        intro: 'Precision trades for specific target zones. Cheap but sensitive to price drift; best near expected pin levels.',
        ids: ['long_call_butterfly', 'long_put_butterfly', 'broken_wing_butterfly', 'ratio_spread']
    },
    time: {
        title: 'Time Spreads',
        intro: 'Calendars and diagonals trade the term structure of volatility and the speed of decay across expiries.',
        ids: ['calendar_spread', 'diagonal_spread', 'double_calendar']
    }
};

window.strategyResearchLibrary = strategyLibrary;
window.strategyResearchGroups = strategyGroups;

const renderStrategyCard = (id) => {
    const s = strategyLibrary[id];
    if (!s) return '';

    return `
        <div class="strategy-card" id="${id}">
            <div class="strategy-header">
                <h3>${s.title}</h3>
                <div class="strategy-tags">${s.tags}</div>
            </div>
            <p>${s.summary}</p>
            <div class="strategy-section">
                <h4>How to Read It</h4>
                ${list(s.read)}
            </div>
            <div class="strategy-section">
                <h4>Why Use It</h4>
                ${list(s.use)}
            </div>
            <div class="strategy-section">
                <h4>When Not to Use</h4>
                ${list(s.avoid)}
            </div>
            <div class="strategy-section">
                <h4>How to Master It</h4>
                ${list(s.master)}
            </div>
            <div class="strategy-section">
                <h4>Realistic Example</h4>
                <p>${s.example}</p>
                <p><em>Multiply per-share values by 100 for one contract.</em></p>
            </div>
            <div class="strategy-section">
                <h4>Advanced Edge</h4>
                <p>${s.advanced}</p>
            </div>
            <div class="strategy-section">
                <h4>Payoff Diagram & Practice</h4>
                <p>Follow the curve below, then open the Builder to recreate it. Draw the intrinsic shape first, then shift by the net debit/credit.</p>
                <canvas class="lesson-payoff-chart" data-strategy="${id}"></canvas>
                <div class="strategy-actions">
                    <button class="preset-btn" data-preset="${id}">Open in Builder</button>
                    <button class="preset-btn secondary" data-preset="${id}" data-action="copy">Copy Legs</button>
                </div>
            </div>
        </div>
    `;
};

const renderStrategyGroup = (groupId) => {
    const group = strategyGroups[groupId];
    if (!group) return '<p>Strategy group coming soon.</p>';

    return `
        <h2>${group.title}</h2>
        <p class="lesson-intro">${group.intro}</p>
        ${riskNote('These examples are educational and simplified. Always verify pricing, margin, and assignment rules with your broker.')}
        <div class="strategy-grid">
            ${group.ids.map(renderStrategyCard).join('')}
        </div>
    `;
};

const lessons = {
    // Module 1: Foundations
    '1-1': {
        title: 'Options Contracts & Market Roles',
        content: `
            <h2>Options Contracts & Market Roles</h2>
            <p class="lesson-intro">An option is a contract on future price movement. Think of it as a <strong>transfer of risk</strong> between people who want insurance and people willing to sell it.</p>
            ${levelGrid(
                `<p>Know the building blocks: <strong>underlying</strong>, <strong>strike</strong>, <strong>expiration</strong>, and <strong>premium</strong>.</p>${list(['Call = right to buy', 'Put = right to sell', 'Contract = typically 100 shares'])}`,
                `<p>Understand the marketplace: <strong>hedgers</strong>, <strong>speculators</strong>, and <strong>market makers</strong>.</p>${list(['Premium reflects time + volatility', 'Liquidity comes from market makers', 'Bid/ask spread is part of your cost'])}`,
                `<p>Track flow and positioning.</p>${list(['Open interest shows positioning', 'Market makers manage delta/gamma', 'Skew reflects crash risk pricing'])}`
            )}
            ${mindsetBox('Mental Model', 'Options are <strong>renting exposure</strong> (buyers) and <strong>selling insurance</strong> (sellers). Know which side you are on and why.')}
            ${section('Key Contract Specs', list(['Underlying ticker', 'Strike price', 'Expiration date', 'Option style (American/European)', 'Multiplier']))}
            ${exampleBox('Example Contract', '<p><strong>XYZ 100C 30D</strong> = right to buy XYZ at $100 within 30 days.</p>')}
        `
    },
    '1-2': {
        title: 'Calls, Puts, and Position Matrix',
        content: `
            <h2>Calls, Puts, and the 4 Core Positions</h2>
            <p class="lesson-intro">Every option strategy is built from four primitives: long call, short call, long put, short put.</p>
            ${levelGrid(
                list(['Long call: bullish, limited loss', 'Long put: bearish, limited loss', 'Short call/put: income, higher risk']),
                list(['Understand payoff shapes', 'Calls and puts are mirror images', 'Short positions collect theta but carry tail risk']),
                list(['Use synthetics to replicate stock', 'Pair options to control delta and vega', 'Know assignment risk on shorts'])
            )}
            ${section('Position Matrix', `
                <div class="formula-box">
                    Long Call = Bullish (limited loss) <br>
                    Short Call = Bearish/Neutral (unlimited risk) <br>
                    Long Put = Bearish (limited loss) <br>
                    Short Put = Bullish/Neutral (large downside)
                </div>
            `)}
            ${proTip('Before trading strategies, master the four building blocks. All complex strategies are just combinations of these positions.')}
        `
    },
    '1-3': {
        title: 'Payoff vs Profit Diagrams',
        content: `
            <h2>Payoff vs Profit Diagrams</h2>
            <p class="lesson-intro">A payoff diagram shows value at expiration. A profit diagram subtracts the premium paid or received.</p>
            ${levelGrid(
                list(['X-axis = price at expiration', 'Y-axis = payoff or profit', 'Break-even = where the line crosses zero']),
                list(['Payoff ignores premium; profit includes it', 'Premium shifts the whole curve', 'Know where the slope changes (strike)']),
                list(['Use multiple curves: today vs expiration', 'Map Greek exposure to slope/curvature', 'Stress-test beyond your strikes'])
            )}
            ${section('How to Draw by Hand', list([
                'Draw intrinsic value line(s).',
                'Add or subtract net premium to shift the line.',
                'Mark max loss, max profit, and breakevens.'
            ]))}
            ${exampleBox('Quick Example', '<p>Long call: flat loss at -premium, then rising line after strike.</p>')}
        `
    },
    '1-4': {
        title: 'Intrinsic vs Extrinsic Value',
        content: `
            <h2>Intrinsic vs Extrinsic Value</h2>
            <p class="lesson-intro">Option price = intrinsic value (today) + extrinsic value (time & volatility).</p>
            ${levelGrid(
                list(['Intrinsic = immediate exercise value', 'OTM options have zero intrinsic', 'Extrinsic = time + volatility']),
                list(['Extrinsic decays with time (theta)', 'Higher IV = higher extrinsic', 'ATM has the most time value']),
                list(['Compare extrinsic across strikes (skew)', 'Deep ITM options behave like stock', 'Know when extrinsic is overpriced'])
            )}
            ${section('Formula', '<div class="formula-box">Option Price = Intrinsic + Extrinsic</div>')}
            ${proTip('OTM options are 100% extrinsic. That means you are paying purely for probability and time.')}
        `
    },
    '1-5': {
        title: 'Reading the Options Chain',
        content: `
            <h2>Reading the Options Chain</h2>
            <p class="lesson-intro">The options chain is the market’s map. Learn to read price, volatility, and liquidity in one glance.</p>
            ${levelGrid(
                list(['Bid/ask shows trading cost', 'Volume vs open interest shows activity', 'IV is the market’s forecast']),
                list(['Delta helps you estimate ITM odds', 'Wide spreads signal low liquidity', 'Use mid-price carefully']),
                list(['Compare IV across strikes (skew)', 'Spot mispricings with parity checks', 'Check open interest for pin risk'])
            )}
            ${section('Chain Checklist', list([
                'Is the spread tight?',
                'Is there enough open interest?',
                'Is IV unusually high or low?',
                'Does volume confirm interest?'
            ]))}
        `
    },
    '1-6': {
        title: 'Exercise, Assignment, Expiration',
        content: `
            <h2>Exercise, Assignment, Expiration</h2>
            <p class="lesson-intro">Options can be exercised and assigned. If you sell options, you accept assignment risk.</p>
            ${levelGrid(
                list(['American options can be exercised early', 'Assignment can happen anytime', 'Expiration removes time value']),
                list(['Dividends can trigger early exercise on calls', 'Deep ITM puts are more likely assigned', 'Pin risk increases near expiry']),
                list(['Know your broker’s exercise policy', 'Manage short options before expiration', 'Avoid short legs through dividend dates'])
            )}
            ${riskNote('Short options can be assigned unexpectedly. Always know your margin requirements and capital obligations.')}
        `
    },

    // Module 2: Pricing & Parity
    '2-1': {
        title: 'Black-Scholes Intuition',
        content: `
            <h2>Black-Scholes Intuition</h2>
            <p class="lesson-intro">Black-Scholes values an option as the discounted expected payoff under risk-neutral probabilities.</p>
            ${levelGrid(
                list(['Inputs: spot, strike, time, volatility, rates, dividends', 'Outputs: theoretical price', 'Greeks are derivatives of price']),
                list(['d1 and d2 are standardized distances', 'N(d1) approximates delta', 'Discounting reflects time value of money']),
                list(['Model is a baseline; market prices embed risk premium', 'Use it to compare relative value', 'Focus on implied vol not absolute price'])
            )}
            ${section('Formula', '<div class="formula-box">C = S N(d₁) - K e^{-rT} N(d₂)</div>')}
        `
    },
    '2-2': {
        title: 'Model Assumptions & Limits',
        content: `
            <h2>Model Assumptions & Limits</h2>
            <p class="lesson-intro">The model assumes smooth, continuous markets. Real markets jump, gap, and skew.</p>
            ${levelGrid(
                list(['Constant volatility', 'No jumps', 'No transaction costs']),
                list(['Real markets have fat tails', 'IV changes with strikes and time', 'Liquidity is uneven']),
                list(['Skew and term structure are market signals', 'Use models that respect no-arb constraints', 'Stress-test beyond the model'])
            )}
            ${proTip('The model is a calculator, not a truth machine. Use it to understand relative value, not certainty.')}
        `
    },
    '2-3': {
        title: 'd1, d2, and Risk-Neutral',
        content: `
            <h2>d1, d2, and Risk-Neutral Thinking</h2>
            <p class="lesson-intro">d1 and d2 translate price distance into probability space. Risk-neutral probabilities are pricing tools, not real odds.</p>
            ${levelGrid(
                list(['N(d1) ≈ delta', 'N(d2) ≈ ITM probability', 'Higher volatility increases d1/d2 dispersion']),
                list(['Risk-neutral probability differs from real-world probability', 'Discounting uses risk-free rate', 'd1 > d2 due to volatility effect']),
                list(['Use d1/d2 to gauge sensitivity across strikes', 'Compare model-implied probabilities to your forecast', 'Discipline: do not treat N(d2) as gospel'])
            )}
        `
    },
    '2-4': {
        title: 'Put-Call Parity & Synthetics',
        content: `
            <h2>Put-Call Parity & Synthetics</h2>
            <p class="lesson-intro">Parity links calls, puts, stock, and cash. It’s the backbone of options pricing and synthetic positions.</p>
            ${levelGrid(
                list(['C - P = S - PV(K)', 'Violations imply arbitrage', 'Synthetics replicate stock']),
                list(['Long call + short put = synthetic long stock', 'Short call + long put = synthetic short stock', 'Parity anchors relative pricing']),
                list(['Parity shifts with dividends and rates', 'Use parity to compare fair value across strikes', 'Know assignment implications of synthetics'])
            )}
            ${section('Formula', '<div class="formula-box">Call - Put = Stock - PV(Strike)</div>')}
        `
    },
    '2-5': {
        title: 'Early Exercise & Dividends',
        content: `
            <h2>Early Exercise & Dividends</h2>
            <p class="lesson-intro">American options can be exercised early. Calls on non-dividend stocks rarely are, but dividends change the math.</p>
            ${levelGrid(
                list(['Early exercise destroys time value', 'Calls are rarely exercised early', 'Puts can be early-exercised when deep ITM']),
                list(['Dividend dates make early call exercise more likely', 'Track extrinsic value vs dividend amount', 'Assignment risk rises near ex-dividend']),
                list(['Model early exercise boundary for American puts', 'Understand carry: r - q matters', 'Short options near dividends = higher risk'])
            )}
            ${riskNote('If you are short calls ahead of dividends, assignment can happen overnight.')}
        `
    },
    '2-6': {
        title: 'Forwards, Carry, Rates',
        content: `
            <h2>Forwards, Carry, Rates</h2>
            <p class="lesson-intro">Rates and dividends shift fair value. Options are priced off the forward price, not spot.</p>
            ${levelGrid(
                list(['Forward price ≈ S e^{(r-q)T}', 'Rates raise call value, lower put value', 'Dividends do the opposite']),
                list(['Long-dated options are rate-sensitive', 'Carry cost shapes skew', 'Parity must include dividends']),
                list(['Model rate scenarios for LEAPS', 'Use forward price to pick strikes', 'Understand repo/borrow effects'])
            )}
        `
    },

    // Module 3: Greeks
    '3-1': {
        title: 'Delta: Directional Speed',
        content: `
            <h2>Delta (Δ): Directional Speed</h2>
            <p class="lesson-intro">Delta measures how much an option price moves for a $1 move in the underlying.</p>
            ${levelGrid(
                list(['Delta ranges 0–1 for calls, 0 to -1 for puts', 'ATM call ≈ 0.5', 'Hedge ratio = delta × shares']),
                list(['Delta changes with price (gamma)', 'Delta also changes with time and volatility', 'Use delta to size positions']),
                list(['Delta-neutral trading removes direction', 'Skew impacts delta hedging', 'Delta is not probability in real-world terms'])
            )}
            ${proTip('Delta is a speedometer, not a compass. It tells you how fast you’re moving, not where you will end.')}
        `
    },
    '3-2': {
        title: 'Gamma: Convexity',
        content: `
            <h2>Gamma (Γ): Convexity</h2>
            <p class="lesson-intro">Gamma measures how delta changes. It is the source of convexity and explosion risk.</p>
            ${levelGrid(
                list(['High gamma near ATM and near expiry', 'Long gamma benefits from movement', 'Short gamma suffers from movement']),
                list(['Gamma is highest when theta is most painful', 'You can scalp gamma with hedging', 'Gamma risk accelerates into expiry']),
                list(['Monitor gamma-dollar exposure', 'Use spreads to control gamma spikes', 'High gamma + low liquidity = danger'])
            )}
            ${exampleBox('Gamma Risk', '<p>ATM options near expiration can flip delta fast. That is why professionals reduce size into expiry.</p>')}
        `
    },
    '3-3': {
        title: 'Vega: Volatility Exposure',
        content: `
            <h2>Vega (ν): Volatility Exposure</h2>
            <p class="lesson-intro">Vega measures how option price changes with implied volatility.</p>
            ${levelGrid(
                list(['Long options = long vega', 'Short options = short vega', 'Vega is highest in longer-dated options']),
                list(['IV crush can hurt even if you are right on direction', 'Vega is not linear across strikes', 'Use vega to pick expiries']),
                list(['Trade volatility term structure, not just level', 'Separate vega risk from delta risk', 'Hedge vega with spreads'])
            )}
            ${proTip('If you buy options into earnings, you are mostly buying vega. Make sure the move beats the implied move.')}
        `
    },
    '3-4': {
        title: 'Theta: Time Decay',
        content: `
            <h2>Theta (Θ): Time Decay</h2>
            <p class="lesson-intro">Theta is the daily decay of option value. It is the “rent” paid by option buyers.</p>
            ${levelGrid(
                list(['Theta accelerates into expiration', 'ATM options have highest theta', 'Short options benefit from theta']),
                list(['Theta interacts with gamma (risk/reward tradeoff)', 'Short theta positions need movement', 'Calendar spreads can be theta-positive']),
                list(['Measure theta per dollar of risk', 'Avoid selling theta into event risk', 'Use theta as a pacing tool'])
            )}
            ${exampleBox('Theta Curve', '<p>Most decay happens in the final 30 days. That’s why 30–45 DTE is popular for income strategies.</p>')}
        `
    },
    '3-5': {
        title: 'Rho: Rates & Carry',
        content: `
            <h2>Rho (ρ): Rates & Carry</h2>
            <p class="lesson-intro">Rho measures sensitivity to interest rates, most relevant for long-dated options.</p>
            ${levelGrid(
                list(['Calls gain when rates rise', 'Puts lose when rates rise', 'Short-dated options have low rho']),
                list(['Rho becomes meaningful beyond 6–12 months', 'Dividends interact with rho', 'Carry drives forward price']),
                list(['Model multiple rate scenarios for LEAPS', 'Use forward to anchor strikes', 'Rho can dominate vega in long maturities'])
            )}
        `
    },
    '3-6': {
        title: 'Second-Order Greeks',
        content: `
            <h2>Second-Order Greeks</h2>
            <p class="lesson-intro">Beyond delta/gamma/vega, pros monitor cross-Greeks that describe how sensitivities change.</p>
            ${levelGrid(
                list(['Charm = delta decay over time', 'Vanna = delta vs volatility', 'Vomma = vega vs volatility']),
                list(['Speed = gamma change with price', 'Color = gamma change with time', 'These explain why hedges drift']),
                list(['Use vanna to manage skew risk', 'Charm drives delta bleed in calm markets', 'Second-order Greeks matter in large books'])
            )}
            ${proTip('If your delta keeps drifting even when price is flat, you are watching charm at work.')}
        `
    },

    // Module 4: Volatility & Surface
    '4-1': {
        title: 'Implied vs Realized Volatility',
        content: `
            <h2>Implied vs Realized Volatility</h2>
            <p class="lesson-intro">Implied vol is the market’s forecast. Realized vol is what actually happens.</p>
            ${levelGrid(
                list(['IV is backed out from option prices', 'Realized vol comes from historical moves', 'IV typically exceeds realized (risk premium)']),
                list(['Compare IV percentile to history', 'Use realized/IV spread to choose strategy', 'Know event vs non-event regimes']),
                list(['Volatility risk premium is not free money', 'Mean reversion is real but timing is hard', 'Combine IV data with catalysts'])
            )}
        `
    },
    '4-2': {
        title: 'Volatility Smile & Skew',
        content: `
            <h2>Volatility Smile & Skew</h2>
            <p class="lesson-intro">IV is not constant across strikes. Puts are often richer because markets fear crashes.</p>
            ${levelGrid(
                list(['Skew = higher IV for OTM puts', 'Smile = curved IV shape', 'Skew reflects tail risk']),
                list(['Selling skew = selling crash insurance', 'Risk reversals express skew views', 'Skew steepens in fear']),
                list(['Monitor skew changes for sentiment shifts', 'Use skew to choose spreads', 'Beware of short skew in crises'])
            )}
        `
    },
    '4-3': {
        title: 'Term Structure',
        content: `
            <h2>Volatility Term Structure</h2>
            <p class="lesson-intro">IV varies by expiration. Front-month can be rich or cheap relative to back months.</p>
            ${levelGrid(
                list(['Front-month often spikes into events', 'Back-month reflects longer-term risk', 'Calendars trade term structure']),
                list(['Contango = longer-term IV higher', 'Backwardation = near-term IV higher', 'Event risk distorts structure']),
                list(['Use term structure to time entry', 'Avoid selling front-month into heavy events', 'Trade vol spreads directly'])
            )}
        `
    },
    '4-4': {
        title: 'SVI Parameterization',
        content: `
            <h2>SVI Parameterization</h2>
            <p class="lesson-intro">SVI is a standard model to fit a smooth, arbitrage-aware volatility smile.</p>
            ${levelGrid(
                list(['SVI fits smile with a few parameters', 'Used by quants to model surfaces', 'Smooths noisy data']),
                list(['Helps detect mispriced strikes', 'Ensures convexity and no-arb shapes', 'Common in professional desks']),
                list(['Calibrate across expiries for a surface', 'Monitor parameter shifts as sentiment changes', 'Use for scenario pricing'])
            )}
        `
    },
    '4-5': {
        title: 'Arbitrage-Free Surfaces',
        content: `
            <h2>Arbitrage-Free Surfaces</h2>
            <p class="lesson-intro">A valid volatility surface must satisfy basic no-arbitrage constraints.</p>
            ${levelGrid(
                list(['Calendar spreads cannot be negative', 'Butterfly spreads cannot be negative', 'Call prices decrease with strike']),
                list(['Convexity in strike protects against butterfly arbitrage', 'Surface should be smooth but not flat', 'No-arb constraints are guardrails']),
                list(['Detect and avoid mispriced quotes', 'Use constraints in model calibration', 'Manage risk against surface shifts'])
            )}
        `
    },
    '4-6': {
        title: 'Event Vol & Crush',
        content: `
            <h2>Event Vol & Crush</h2>
            <p class="lesson-intro">Earnings, economic releases, and macro events inflate IV. After the event, IV often collapses.</p>
            ${levelGrid(
                list(['IV rises before events', 'IV drops after events', 'Moves must exceed implied move to profit long vol']),
                list(['Compare implied move to your forecast', 'Short premium into events is risky', 'Earnings gaps can overwhelm spreads']),
                list(['Use structures that define risk', 'Trade skew around events', 'Size down when gaps can bypass stops'])
            )}
        `
    },

    // Module 5: Strategy Building Blocks
    '5-1': {
        title: 'Vertical Spreads: Bull/Bear',
        content: `
            <h2>Vertical Spreads: Bull & Bear</h2>
            <p class="lesson-intro">Vertical spreads are the foundation of options strategy. They control cost and define risk.</p>
            ${levelGrid(
                list(['Bull call/bear put = debit spreads', 'Bull put/bear call = credit spreads', 'Risk is defined by strike width']),
                list(['Debit spreads are long delta', 'Credit spreads are short delta', 'Theta often offsets in verticals']),
                list(['Choose strikes based on expected move', 'Prefer liquid chains to reduce slippage', 'Adjust when delta shifts'])
            )}
        `
    },
    '5-2': {
        title: 'Credit Spreads & Probability',
        content: `
            <h2>Credit Spreads & Probability</h2>
            <p class="lesson-intro">Credit spreads profit from time decay and probability. You are selling the chance of a move.</p>
            ${levelGrid(
                list(['Max profit = credit', 'Max loss = width - credit', 'Probability improves with OTM strikes']),
                list(['Use delta as a probability proxy', 'Keep risk small relative to credit', 'Understand assignment risk']),
                list(['Evaluate expected value, not just win rate', 'Skew matters: put spreads carry tail risk', 'Set exit rules'])
            )}
        `
    },
    '5-3': {
        title: 'Straddles & Strangles',
        content: `
            <h2>Straddles & Strangles</h2>
            <p class="lesson-intro">These strategies trade volatility. They require movement or stillness, not directional bias.</p>
            ${levelGrid(
                list(['Long = bet on big move', 'Short = bet on stability', 'Breakevens depend on premium']),
                list(['Vega dominates into events', 'Gamma spikes near expiration', 'Short straddles are high risk']),
                list(['Compare implied vs expected move', 'Use defined-risk variants if needed', 'Plan exits before entry'])
            )}
        `
    },
    '5-4': {
        title: 'Butterflies & Iron Condors',
        content: `
            <h2>Butterflies & Iron Condors</h2>
            <p class="lesson-intro">These are range strategies with defined risk. They profit from price staying near a zone.</p>
            ${levelGrid(
                list(['Condors profit in a range', 'Butterflies target a pin', 'Both are short volatility']),
                list(['Profits often appear early', 'Gamma increases into expiry', 'Pin risk near short strikes']),
                list(['Size small and exit early', 'Manage delta if price drifts', 'Avoid heavy event weeks'])
            )}
        `
    },
    '5-5': {
        title: 'Calendars & Diagonals',
        content: `
            <h2>Calendars & Diagonals</h2>
            <p class="lesson-intro">Time spreads trade decay rates between expiries. They are sensitive to term structure and IV shifts.</p>
            ${levelGrid(
                list(['Sell near-term, buy longer-term', 'Profit near the short strike', 'Long vega exposure']),
                list(['Calendars are neutral; diagonals add direction', 'Best when front IV is rich', 'Manage around short expiry']),
                list(['Term structure is the edge', 'Avoid when term structure is flat', 'Use defined exit rules'])
            )}
        `
    },
    '5-6': {
        title: 'Risk Reversals & Collars',
        content: `
            <h2>Risk Reversals & Collars</h2>
            <p class="lesson-intro">These structures express directional bias while leveraging skew and financing.</p>
            ${levelGrid(
                list(['Risk reversal = sell put, buy call', 'Collar = long stock + long put + short call', 'Both are skew-aware']),
                list(['Risk reversals express bullish bias with limited premium', 'Collars cap upside for protection', 'Skew sets pricing']),
                list(['Use with disciplined risk limits', 'Watch assignment on short puts', 'Adjust strikes as trend changes'])
            )}
        `
    },
    '5-7': {
        title: 'Hedging & Gamma Scalping',
        content: `
            <h2>Hedging & Gamma Scalping</h2>
            <p class="lesson-intro">Professional traders hedge delta and harvest gamma by buying low and selling high.</p>
            ${levelGrid(
                list(['Long gamma = buy low, sell high', 'Short gamma = sell low, buy high', 'Hedging reduces directional risk']),
                list(['Gamma scalping works if realized vol > implied', 'Theta is the cost of gamma', 'Rebalance at set intervals']),
                list(['Use a risk budget for hedging', 'Don’t hedge too often (fees)', 'Track P&L attribution: delta vs theta'])
            )}
        `
    },

    // Module 6: Risk, Execution, Management
    '6-1': {
        title: 'Position Sizing & Risk Limits',
        content: `
            <h2>Position Sizing & Risk Limits</h2>
            <p class="lesson-intro">Risk management determines survival. Position size is the most powerful risk control.</p>
            ${levelGrid(
                list(['Define max loss before entry', 'Size by risk, not conviction', 'Use small size on undefined risk']),
                list(['Limit total portfolio Greeks', 'Avoid correlated exposure', 'Plan exit points']),
                list(['Use stress tests: gap risk + vol spike', 'Size down during uncertain regimes', 'Keep reserves for adjustments'])
            )}
        `
    },
    '6-2': {
        title: 'Liquidity, Spreads, Slippage',
        content: `
            <h2>Liquidity, Spreads, Slippage</h2>
            <p class="lesson-intro">Execution quality often decides performance. Spread cost is real and repeatable.</p>
            ${levelGrid(
                list(['Trade liquid underlyings', 'Use limit orders', 'Avoid wide spreads']),
                list(['Check open interest and volume', 'Expect slippage on multi-leg orders', 'Work the order mid-price']),
                list(['Use risk-adjusted P&L, not just theoretical P&L', 'Spread width is a hidden fee', 'Avoid illiquid strikes'])
            )}
        `
    },
    '6-3': {
        title: 'Adjustments, Rolls, Exits',
        content: `
            <h2>Adjustments, Rolls, Exits</h2>
            <p class="lesson-intro">Professional traders plan exits before entry. Adjustments are not magic; they are risk trades.</p>
            ${levelGrid(
                list(['Define profit targets', 'Define max loss', 'Avoid hope-based holding']),
                list(['Rolling = closing and opening a new trade', 'Adjustments can add risk', 'Lock profits when targets hit']),
                list(['Use scenario planning for adjustments', 'Avoid over-trading', 'Know when to take the loss'])
            )}
        `
    },
    '6-4': {
        title: 'Assignment & Pin Risk',
        content: `
            <h2>Assignment & Pin Risk</h2>
            <p class="lesson-intro">Short options can be assigned unexpectedly, especially near expiration or dividends.</p>
            ${levelGrid(
                list(['Assignment can happen anytime', 'Pin risk increases near strike', 'Know your broker rules']),
                list(['Close short legs before expiration', 'Avoid holding short calls through dividends', 'Monitor ITM shorts']),
                list(['Use risk checks on expiration day', 'Understand exercise by exception', 'Plan for after-hours moves'])
            )}
        `
    },
    '6-5': {
        title: 'Portfolio Greeks',
        content: `
            <h2>Portfolio Greeks</h2>
            <p class="lesson-intro">Single positions are easy. Portfolios are about net exposure across Greeks.</p>
            ${levelGrid(
                list(['Net delta = directional exposure', 'Net vega = volatility exposure', 'Net theta = time decay exposure']),
                list(['Offset risks with complementary positions', 'Avoid hidden concentration', 'Track exposure by expiry']),
                list(['Stress test for multi-factor shocks', 'Use scenario analysis', 'Reduce complexity when risk rises'])
            )}
        `
    },

    // Module 7: Strategy Library
    '7-1': {
        title: 'Directional Spreads',
        content: renderStrategyGroup('directional')
    },
    '7-2': {
        title: 'Stock Replacement & Income',
        content: renderStrategyGroup('stock_income')
    },
    '7-3': {
        title: 'Volatility Plays',
        content: renderStrategyGroup('volatility')
    },
    '7-4': {
        title: 'Range-Bound Premium Sellers',
        content: renderStrategyGroup('range')
    },
    '7-5': {
        title: 'Butterflies & Ratio Structures',
        content: renderStrategyGroup('butterflies')
    },
    '7-6': {
        title: 'Time Spreads',
        content: renderStrategyGroup('time')
    },

    // Module 8: Advanced Quant & Real-World
    '8-1': {
        title: 'Automatic Differentiation',
        content: `
            <h2>Automatic Differentiation (AD)</h2>
            <p class="lesson-intro">AD computes exact Greeks by carrying derivatives alongside values through the pricing engine.</p>
            ${levelGrid(
                list(['Finite differences are noisy', 'AD is fast and exact', 'Perfect for real-time pricing']),
                list(['AD scales well for many Greeks', 'Used in modern trading systems', 'Avoids step-size errors']),
                list(['Combine AD with SIMD for speed', 'Use for calibration loops', 'AD enables real-time risk dashboards'])
            )}
        `
    },
    '8-2': {
        title: 'Numerical Methods',
        content: `
            <h2>Numerical Methods</h2>
            <p class="lesson-intro">When no closed-form exists, use trees or Monte Carlo.</p>
            ${levelGrid(
                list(['Binomial trees handle early exercise', 'Monte Carlo handles path-dependence', 'Both are model-agnostic']),
                list(['Accuracy depends on steps/paths', 'Variance reduction improves speed', 'Greeks can be computed via pathwise methods']),
                list(['Use antithetic and control variates', 'Calibrate to market surfaces', 'Validate convergence'])
            )}
        `
    },
    '8-3': {
        title: 'Volatility Trading & Dispersion',
        content: `
            <h2>Volatility Trading & Dispersion</h2>
            <p class="lesson-intro">Advanced desks trade volatility itself: index vs single names, skew, and correlation.</p>
            ${levelGrid(
                list(['Index IV often richer than single stock IV', 'Dispersion sells index vol, buys single vols', 'Correlation drives results']),
                list(['Skew trades express crash risk views', 'Variance swaps isolate vol exposure', 'Correlation spikes in stress']),
                list(['Risk-manage correlation exposure', 'Model jump risk', 'Use options to shape tail risk'])
            )}
        `
    },
    '8-4': {
        title: 'Model Risk & Calibration',
        content: `
            <h2>Model Risk & Calibration</h2>
            <p class="lesson-intro">Models are approximations. Calibration and validation are where professional risk is managed.</p>
            ${levelGrid(
                list(['Calibrate to market prices, not theory', 'Model risk rises in stress', 'Overfitting is common']),
                list(['Use multiple models for sanity checks', 'Track residuals across strikes', 'Stress-test parameter shifts']),
                list(['Design guardrails and kill-switches', 'Use scenario shocks on surfaces', 'Maintain audit trails for changes'])
            )}
        `
    }
};

// Mini payoff chart rendering
let lessonCharts = new Map();

function destroyLessonCharts() {
    lessonCharts.forEach(chart => chart.destroy());
    lessonCharts.clear();
}

function calculateLegPayoff(spot, leg) {
    if (leg.type === 'stock') {
        const direction = leg.action === 'buy' ? 1 : -1;
        return direction * (spot - leg.strike) * (leg.quantity || 1);
    }

    let intrinsic = 0;
    if (leg.type === 'call') {
        intrinsic = Math.max(0, spot - leg.strike);
    } else {
        intrinsic = Math.max(0, leg.strike - spot);
    }

    const direction = leg.action === 'buy' ? 1 : -1;
    const premium = leg.premium || 0;
    const premiumEffect = leg.action === 'buy' ? -premium : premium;
    return (direction * intrinsic + premiumEffect) * (leg.quantity || 1);
}

function buildPayoffCurve(preset) {
    if (preset.customCurve) {
        const absMax = Math.max(...preset.customCurve.payoffs.map(val => Math.abs(val)));
        const clampLimit = Number.isFinite(absMax) ? Math.min(Math.max(absMax, 8), 20) : 15;
        const data = preset.customCurve.payoffs.map(val => Math.max(-clampLimit, Math.min(clampLimit, val)));

        return {
            labels: preset.customCurve.spots.map(s => s.toFixed(0)),
            data,
            yMin: -clampLimit,
            yMax: clampLimit
        };
    }

    const strikes = preset.legs.map(leg => leg.strike);
    const minStrike = Math.min(...strikes);
    const maxStrike = Math.max(...strikes);
    const range = (maxStrike - minStrike) || minStrike * 0.2;
    const start = Math.max(0, minStrike - range);
    const end = maxStrike + range;

    const labels = [];
    let data = [];
    const steps = 60;
    const step = (end - start) / steps;

    for (let i = 0; i <= steps; i++) {
        const spot = start + i * step;
        let total = 0;
        preset.legs.forEach(leg => {
            total += calculateLegPayoff(spot, leg);
        });
        labels.push(spot.toFixed(0));
        data.push(parseFloat(total.toFixed(2)));
    }

    const absMax = Math.max(...data.map(val => Math.abs(val)));
    const clampLimit = Number.isFinite(absMax) ? Math.min(Math.max(absMax, 8), 20) : 15;
    data = data.map(val => Math.max(-clampLimit, Math.min(clampLimit, val)));

    return { labels, data, yMin: -clampLimit, yMax: clampLimit };
}

function renderLessonCharts() {
    destroyLessonCharts();

    if (!window.Chart) return;

    document.querySelectorAll('.lesson-payoff-chart').forEach(canvas => {
        const presetId = canvas.dataset.strategy;
        const preset = strategyPresets[presetId];
        if (!preset) return;

        canvas.style.height = '200px';
        canvas.style.maxHeight = '200px';
        canvas.style.width = '100%';

        const curve = buildPayoffCurve(preset);

        const chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: curve.labels,
                datasets: [{
                    label: 'P/L per share',
                    data: curve.data,
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    borderWidth: 2,
                    tension: 0.15,
                    clip: 8,
                    pointRadius: 0,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                    y: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: '#334155' },
                        min: curve.yMin,
                        max: curve.yMax
                    }
                }
            }
        });

        lessonCharts.set(canvas, chart);
    });
}

function wirePresetButtons() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const presetId = btn.dataset.preset;
            const action = btn.dataset.action;

            if (action === 'copy') {
                const preset = strategyPresets[presetId];
                if (!preset) return;
                const legs = preset.legs.map(leg => `${leg.action} ${leg.quantity || 1} ${leg.type.toUpperCase()} @ ${leg.strike}`).join(' | ');
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(legs);
                    btn.textContent = 'Copied!';
                    setTimeout(() => { btn.textContent = 'Copy Legs'; }, 1500);
                } else {
                    window.prompt('Copy legs:', legs);
                }
                return;
            }

            if (window.openStrategyPreset) {
                window.openStrategyPreset(presetId);
            }
        });
    });
}

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

    // Render charts and buttons
    renderLessonCharts();
    wirePresetButtons();

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
