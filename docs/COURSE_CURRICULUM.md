# Options Greeks Learning Course - Complete Curriculum

## 📚 Course Overview

This comprehensive course takes you from options basics to advanced Greeks trading strategies through 6 progressive modules with 24 lessons, interactive exercises, and real-world challenges.

**Total Duration:** 12-15 hours  
**Skill Level:** Beginner to Advanced  
**Prerequisites:** Basic understanding of stocks and financial markets

---

## 🎯 Learning Objectives

By the end of this course, you will be able to:

1. ✅ Understand options mechanics and payoff structures
2. ✅ Apply the Black-Scholes model to price options
3. ✅ Calculate and interpret all five Greeks (Delta, Gamma, Vega, Theta, Rho)
4. ✅ Construct and analyze volatility surfaces using SVI parameterization
5. ✅ Implement delta-neutral and gamma-scalping strategies
6. ✅ Manage options portfolio risk effectively
7. ✅ Use automatic differentiation for precise Greeks calculation

---

## 📖 Module 1: Introduction to Options (2 hours)

### Lesson 1.1: What are Options?
**Duration:** 30 minutes  
**Topics:**
- Definition and characteristics of options
- Rights vs obligations
- Premium, strike, and expiration
- Use cases: hedging, speculation, income

**Practice:**
- Interactive payoff diagram builder
- Calculate profit/loss scenarios

### Lesson 1.2: Call vs Put Options
**Duration:** 30 minutes  
**Topics:**
- Call option mechanics and payoff
- Put option mechanics and payoff
- Comparison and use cases
- Long vs short positions

**Practice:**
- Identify optimal option type for market views
- Calculate breakeven points

### Lesson 1.3: Payoff Diagrams
**Duration:** 30 minutes  
**Topics:**
- Constructing payoff diagrams
- Profit/loss at expiration
- Maximum profit and loss
- Breakeven analysis

**Interactive Exercise:**
- Build payoff diagrams for various strategies
- Visualize risk/reward profiles

### Lesson 1.4: Intrinsic vs Extrinsic Value
**Duration:** 30 minutes  
**Topics:**
- Intrinsic value calculation
- Time value (extrinsic value)
- Moneyness: ITM, ATM, OTM
- Value decay over time

**Practice:**
- Decompose option prices
- Analyze time value erosion

---

## 📐 Module 2: Black-Scholes Model (2.5 hours)

### Lesson 2.1: The Black-Scholes Formula
**Duration:** 45 minutes  
**Topics:**
- Historical context and assumptions
- The complete formula for calls and puts
- Understanding d₁ and d₂
- Model inputs and their impact

**Practice:**
- Calculate option prices by hand
- Verify with playground calculator

### Lesson 2.2: Model Assumptions
**Duration:** 30 minutes  
**Topics:**
- Constant volatility assumption
- Log-normal returns
- No transaction costs
- Continuous trading
- Limitations in real markets

**Discussion:**
- When Black-Scholes works well
- When it breaks down

### Lesson 2.3: d₁ and d₂ Explained
**Duration:** 45 minutes  
**Topics:**
- Probabilistic interpretation
- N(d₁) as hedge ratio
- N(d₂) as risk-neutral probability
- Geometric vs arithmetic interpretation

**Practice:**
- Calculate d₁ and d₂ for various scenarios
- Interpret probability meanings

### Lesson 2.4: Put-Call Parity
**Duration:** 30 minutes  
**Topics:**
- The parity relationship
- Arbitrage opportunities
- Synthetic positions
- Applications in trading

**Practice:**
- Verify put-call parity
- Create synthetic long stock

---

## 📊 Module 3: The Greeks (4 hours)

### Lesson 3.1: Delta - Price Sensitivity
**Duration:** 45 minutes  
**Topics:**
- Mathematical definition (∂V/∂S)
- Delta ranges for calls and puts
- Delta as hedge ratio
- Delta as probability
- Delta by moneyness

**Practice:**
- Calculate delta for various options
- Determine hedge ratios
- **Quiz:** Delta fundamentals (5 questions)

### Lesson 3.2: Gamma - Delta's Rate of Change
**Duration:** 45 minutes  
**Topics:**
- Mathematical definition (∂²V/∂S²)
- Gamma characteristics
- Gamma by moneyness and time
- Gamma risk for option sellers
- Gamma scalping strategy

**Practice:**
- Identify high-gamma scenarios
- Simulate gamma scalping
- **Exercise:** Hedging simulation

### Lesson 3.3: Vega - Volatility Sensitivity
**Duration:** 45 minutes  
**Topics:**
- Mathematical definition (∂V/∂σ)
- Vega characteristics
- Volatility trading
- Vega risk management
- Term structure of vega

**Practice:**
- Calculate P&L from volatility changes
- Build volatility trades
- **Exercise:** Volatility spike scenario

### Lesson 3.4: Theta - Time Decay
**Duration:** 45 minutes  
**Topics:**
- Mathematical definition (∂V/∂t)
- Theta characteristics
- Time decay acceleration
- Theta vs Gamma relationship
- Income strategies using theta

**Practice:**
- Calculate daily theta decay
- Analyze time decay curves
- **Exercise:** Theta decay simulation

### Lesson 3.5: Rho - Interest Rate Sensitivity
**Duration:** 30 minutes  
**Topics:**
- Mathematical definition (∂V/∂r)
- Rho characteristics
- When rho matters
- LEAPS and interest rate risk

**Practice:**
- Calculate rho for long-dated options
- Assess interest rate impact

### Lesson 3.6: Greeks Relationships
**Duration:** 30 minutes  
**Topics:**
- Greeks interdependencies
- Portfolio Greeks
- Greeks hedging strategies
- Multi-dimensional risk

**Practice:**
- Calculate portfolio Greeks
- Design multi-Greek hedges

---

## 🌊 Module 4: Volatility Surface (2.5 hours)

### Lesson 4.1: Implied Volatility
**Duration:** 45 minutes  
**Topics:**
- Definition and calculation
- Historical vs implied volatility
- VIX index
- IV rank and percentile
- Trading high vs low IV

**Practice:**
- Compare historical and implied vol
- Interpret VIX levels
- **Exercise:** IV analysis

### Lesson 4.2: The Volatility Smile
**Duration:** 45 minutes  
**Topics:**
- Smile vs skew patterns
- Market explanations
- Supply and demand factors
- Crash premium
- Smile dynamics

**Interactive:**
- Visualize volatility smiles
- Compare across markets

### Lesson 4.3: SVI Parameterization
**Duration:** 45 minutes  
**Topics:**
- SVI formula and parameters
- Parameter interpretation (a, b, ρ, m, σ)
- Fitting SVI to market data
- Advantages over other models

**Practice:**
- Fit SVI parameters
- Analyze parameter changes
- **Exercise:** Build volatility surface

### Lesson 4.4: Arbitrage-Free Surfaces
**Duration:** 45 minutes  
**Topics:**
- Butterfly arbitrage
- Calendar spread arbitrage
- Arbitrage constraints
- Validating surfaces
- Real-world violations

**Practice:**
- Check arbitrage conditions
- Identify violations
- **Challenge:** Fix arbitrage violations

---

## 💼 Module 5: Trading Strategies (3 hours)

### Lesson 5.1: Delta Hedging
**Duration:** 45 minutes  
**Topics:**
- Delta-neutral positions
- Dynamic hedging
- Rebalancing frequency
- Transaction costs
- P&L attribution

**Practice:**
- Calculate hedge ratios
- Simulate dynamic hedging
- **Exercise:** Perfect hedge challenge

### Lesson 5.2: Gamma Scalping
**Duration:** 45 minutes  
**Topics:**
- Long gamma positions
- Rebalancing mechanics
- Profit from realized volatility
- Costs and breakeven
- Optimal rebalancing

**Practice:**
- Execute gamma scalping
- Calculate breakeven volatility
- **Challenge:** 5-day gamma scalping

### Lesson 5.3: Volatility Trading
**Duration:** 45 minutes  
**Topics:**
- Long vs short volatility
- Straddles and strangles
- Volatility arbitrage
- Dispersion trading
- Variance swaps

**Practice:**
- Build volatility strategies
- Analyze risk/reward
- **Exercise:** Earnings volatility trade

### Lesson 5.4: Spreads and Combinations
**Duration:** 45 minutes  
**Topics:**
- Vertical spreads
- Calendar spreads
- Diagonal spreads
- Iron condors
- Butterflies

**Practice:**
- Construct spread strategies
- Analyze Greeks profiles
- **Challenge:** Multi-leg strategy builder

---

## 🚀 Module 6: Advanced Topics (2.5 hours)

### Lesson 6.1: Automatic Differentiation
**Duration:** 45 minutes  
**Topics:**
- Dual numbers theory
- Forward-mode AD
- Reverse-mode AD
- Implementation in code
- Advantages over finite differences

**Practice:**
- Implement simple AD
- Compare AD vs finite differences
- **Exercise:** Calculate Greeks with AD

### Lesson 6.2: Numerical Methods
**Duration:** 45 minutes  
**Topics:**
- Finite difference methods
- Monte Carlo simulation
- Binomial trees
- American options
- Exotic options

**Practice:**
- Implement binomial tree
- Price American options
- **Exercise:** Monte Carlo Greeks

### Lesson 6.3: Risk Management
**Duration:** 45 minutes  
**Topics:**
- Portfolio Greeks
- Scenario analysis
- Stress testing
- VaR and CVaR
- Position limits

**Practice:**
- Calculate portfolio risk
- Run stress scenarios
- **Challenge:** Risk management simulation

### Lesson 6.4: Real-World Applications
**Duration:** 45 minutes  
**Topics:**
- Market making
- Proprietary trading
- Hedging corporate exposure
- Structured products
- Performance attribution

**Case Studies:**
- Real trading examples
- Historical market events
- Lessons learned

---

## 🎮 Practice Exercises

### Quizzes (6 total)
1. **Delta Quiz** - 5 questions on delta fundamentals
2. **Gamma Quiz** - 5 questions on gamma and hedging
3. **Vega Quiz** - 5 questions on volatility
4. **Black-Scholes Quiz** - 10 questions on pricing
5. **Volatility Surface Quiz** - 5 questions on IV and surfaces
6. **Strategies Quiz** - 10 questions on trading strategies

### Hands-On Exercises (8 total)
1. **Greeks Calculator** - Calculate Greeks for various scenarios
2. **Volatility Surface Builder** - Construct and validate surfaces
3. **Hedging Simulation** - Maintain delta-neutral position
4. **Gamma Scalping** - Execute rebalancing strategy
5. **Strategy Builder** - Create multi-leg strategies
6. **Scenario Analysis** - Analyze P&L under different conditions
7. **AD Implementation** - Code automatic differentiation
8. **Risk Dashboard** - Build portfolio risk monitor

---

## 🏆 Trading Challenges

### Challenge 1: The Perfect Hedge (Easy)
**Objective:** Achieve delta neutrality  
**Scenario:** 100 call options, calculate and execute hedge  
**Success Criteria:** Portfolio delta < 0.01

### Challenge 2: Volatility Spike (Medium)
**Objective:** Profit from IV expansion  
**Scenario:** Earnings announcement, IV jumps 20%  
**Success Criteria:** Positive P&L > $5,000

### Challenge 3: Gamma Scalping (Hard)
**Objective:** Execute profitable gamma scalping over 5 days  
**Scenario:** Dynamic market with realistic transaction costs  
**Success Criteria:** Positive P&L after all costs

### Challenge 4: Earnings Trade (Hard)
**Objective:** Design strategy for volatility crush  
**Scenario:** Stock at $100, earnings in 3 days  
**Success Criteria:** Profit from IV collapse

### Challenge 5: Portfolio Rebalancing (Expert)
**Objective:** Manage multi-position portfolio  
**Scenario:** 10 different options, maintain risk limits  
**Success Criteria:** All Greeks within limits, positive P&L

---

## 📈 Learning Path Recommendations

### Path 1: Beginner (Focus on fundamentals)
**Duration:** 8-10 hours
1. Module 1: Introduction to Options
2. Module 2: Black-Scholes Model
3. Module 3: The Greeks (Lessons 3.1-3.4)
4. Practice: All quizzes
5. Challenge 1: The Perfect Hedge

### Path 2: Intermediate (Add volatility and strategies)
**Duration:** 12-14 hours
1. Complete Path 1
2. Module 3: Complete all lessons
3. Module 4: Volatility Surface
4. Module 5: Trading Strategies (Lessons 5.1-5.2)
5. Practice: Exercises 1-4
6. Challenges 1-2

### Path 3: Advanced (Full course)
**Duration:** 15-18 hours
1. All 6 modules
2. All practice exercises
3. All 5 challenges
4. Build custom strategies
5. Implement AD from scratch

---

## 🎓 Certification

Complete all modules, exercises, and challenges to earn your **Options Greeks Master Certificate**!

**Requirements:**
- ✅ Complete all 24 lessons
- ✅ Pass all 6 quizzes with 80%+ score
- ✅ Complete all 8 hands-on exercises
- ✅ Successfully complete at least 3 challenges
- ✅ Build one custom trading strategy

---

## 📚 Additional Resources

### Recommended Reading
1. **Options, Futures, and Other Derivatives** - John Hull
2. **The Volatility Surface** - Jim Gatheral
3. **Dynamic Hedging** - Nassim Taleb
4. **Option Volatility and Pricing** - Sheldon Natenberg

### Online Resources
- CBOE Options Institute
- Khan Academy - Options Trading
- QuantLib documentation
- Papers on SSRN

### Practice Platforms
- This interactive playground
- Paper trading accounts
- Options strategy simulators

---

## 💡 Tips for Success

1. **Practice Regularly:** Use the playground daily to build intuition
2. **Start Simple:** Master basic concepts before advanced topics
3. **Visualize:** Use charts to understand Greek behavior
4. **Real Examples:** Follow real market options data
5. **Ask Questions:** Engage with the community
6. **Build Projects:** Implement your own calculator
7. **Stay Current:** Markets evolve, keep learning

---

## 🔄 Course Updates

This course is continuously updated with:
- New lessons and exercises
- Real-world case studies
- Latest market developments
- Community-requested topics
- Bug fixes and improvements

**Last Updated:** February 2026  
**Version:** 1.0

---

## 📞 Support

Need help? Have questions?
- Review lesson materials
- Try practice exercises
- Check the FAQ section
- Experiment in the playground

Happy Learning! 🚀
