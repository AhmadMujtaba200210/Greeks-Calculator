# High-Performance Options Greeks Calculator & Interactive Playground

**A comprehensive platform featuring a sub-microsecond Rust pricing engine and an interactive educational playground.**

---

## 🚀 Quick Start: Run the App

Want to jump straight into the **Interactive Playground**?

### 1. Prerequisites
- **Python 3.x** (pre-installed on most systems)

### 2. Run the Server
Open your terminal and run:

```bash
cd playground
python3 server.py
```

### 3. Open in Browser
The app will automatically open. If not, visit:  
👉 **[http://localhost:8085](http://localhost:8085)**

> **Note:** The playground runs entirely in your browser using a JavaScript engine for demonstration. The high-performance Rust engine (described below) is currently a standalone library.

---

## 🌟 Features

### 🎮 Interactive Playground
A web-based platform to learn, practice, and visualize options concepts.
- **Live Calculator:** Real-time pricing and Greeks (Delta, Gamma, Vega, Theta, Rho).
- **Visualizations:** Interactive charts for Price vs. Spot, Greeks, and 3D-like Volatility Surfaces.
- **Learn Mode:** 6-module course covering Black-Scholes, Greeks, and volatility.
- **Practice & Challenges:** Test your skills with quizzes and trading scenarios (e.g., "The Perfect Hedge").

### 🦀 High-Performance Rust Engine
A low-latency library for financial institutions and algorithmic trading.
- **Multiple Pricing Models:**
  - **Black-Scholes (Analytical):** Instant exact pricing for European options.
  - **Binomial Tree (CRR):** Discrete-time model with early exercise pricing for American options.
  - **Monte Carlo (GBM):** Stochastic simulation with Antithetic Variates for variance reduction.
- **Speed:** ~190 nanoseconds per calculation (5.2 million options/sec) for Analytical models.
- **Exactness:** Uses **Automatic Differentiation (AD)** for precise Greeks (no finite difference errors for Delta/Vega).
- **Advanced Volatility:** Implements **SVI (Stochastic Volatility Inspired)** parameterization for arbitrage-free surfaces.
- **AI Surrogate Model:** Neural network approximation for accelerating complex option pricing.
- **WASM Integration:** Compiled to WebAssembly for direct high-performance use within the browser.
- **Safety:** Pure Rust with zero-cost abstractions.

---

## 🛠️ Rust Engine Setup (Backend Library)

Located in the `src/` directory. Requires **Rust** installed.

**Setup:**
```bash
# Install Rust if needed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build the project
cargo build --release
```

**Run Examples:**
```bash
# Run the main demo with performance benchmarks
cargo run --release --example main
```

**Run Tests:**
```bash
# Run all 15 unit tests
cargo test
```

**Run Benchmarks:**
```bash
# Run rigorous performance tests
cargo bench
```

---

## 🔢 Mathematical Foundations

This project implements three sophisticated mathematical techniques to achieve its performance and accuracy.

### 1. Pricing Models

This project spans several sophisticated pricing methodologies to handle both European and American options efficiently.

#### European Options (Black-Scholes)
The Black-Scholes formula prices European options under the assumption of constant volatility and log-normal asset returns.

- **Call Option Price:** $C(S, K, T, \sigma, r, q) = S e^{-qT} N(d_1) - K e^{-rT} N(d_2)$
- **Put Option Price:** $P(S, K, T, \sigma, r, q) = K e^{-rT} N(-d_2) - S e^{-qT} N(-d_1)$

#### American Options (Binomial Tree)
The Cox-Ross-Rubinstein (CRR) discrete-time model evaluates the option price at distinct time steps, working backward from expiration. Crucially, it checks for early exercise value at every node, making it the standard for American options handling dividends.

#### Path-Dependent & Exotic (Monte Carlo Simulation)
A stochastic engine that models thousands of possible future price paths using Geometric Brownian Motion (GBM). To maximize performance, we utilize **Antithetic Variates**, slicing the standard error without doubling the computational load.

#### AI Surrogate Model (Neural Net Approximation)
A feed-forward Neural Network trained on millions of Black-Scholes data points. This acts as an ultra-fast surrogate to approximate complex surfaces where traditional models become computationally prohibitive.

---

### 2. The Greeks: Sensitivity Analysis

Greeks measure how sensitive an option's price is to various market factors.

#### Delta (Δ): Sensitivity to Underlying Price
$$\Delta = \frac{\partial V}{\partial S}$$
**Intuition**: How much the option price changes when the stock moves $1. Also approximates the probability of finishing in-the-money.

#### Gamma (Γ): Rate of Change of Delta
$$\Gamma = \frac{\partial^2 V}{\partial S^2}$$
**Intuition**: The curvature of the option's value. High gamma means delta changes rapidly, requiring frequent re-hedging. Highest for ATM options.

#### Vega (ν): Sensitivity to Volatility
$$\nu = \frac{\partial V}{\partial \sigma}$$
**Intuition**: How much the price changes for a 1% change in implied volatility. Options are "long volatility".

#### Theta (Θ): Time Decay
$$\Theta = \frac{\partial V}{\partial T}$$
**Intuition**: How much value the option loses each day. "Time decay" accelerates as expiration approaches.

#### Rho (ρ): Sensitivity to Interest Rates
$$\rho = \frac{\partial V}{\partial r}$$
**Intuition**: Sensitivity to interest rate changes. Important for long-dated options (LEAPS).

---

### 3. Automatic Differentiation (AD)

Automatic differentiation (AD) computes derivatives exactly by applying the chain rule to every operation in the program code.

#### Dual Numbers
We use **Dual Numbers** ($x + x'\epsilon$ where $\epsilon^2 = 0$) to carry derivatives.

**Function Application:**
$$f(a + a'\epsilon) = f(a) + a' f'(a) \epsilon$$

**Why it's better than Finite Differences:**
- **Exact**: No approximation error.
- **Fast**: Computes value and derivative in a single pass (~1.5-2x cost of value only).
- **Robust**: No need to tune step sizes (epsilon) like in bump-and-reprice methods.

**Code Example:**
```rust
let s_dual = Dual::variable(spot);  // spot + 1·ε
let price = black_scholes_call(s_dual, ...);
// price.deriv contains the exact Delta
```

---

### 4. SVI Volatility Surface

The SVI (Stochastic Volatility Inspired) model parameterizes the implied variance to fit the market's "volatility smile".

**SVI Formula:**
$$w(k) = a + b (\rho (k - m) + \sqrt{(k - m)^2 + \sigma^2})$$

**Parameters:**
- $a$: Vertical shift (level)
- $b$: Slope of wings
- $\rho$: Skew (-1 to 1)
- $m$: Horizontal shift (ATM location)
- $\sigma$: Curvature (smoothness)

**Arbitrage-Free Constraints:**
To prevent risk-free profits, the surface must satisfy strict mathematical conditions (non-negative variance, positive slope, triangle inequality). Our implementation validates these automatically.

---

## 🚀 Performance Benchmarks

This Rust implementation is optimized for extreme low latency.

| Operation | Time per Option | Throughput |
|-----------|-----------------|------------|
| Single Greeks Calc | **~190 ns** | **5.2M / sec** |
| Full Chain (100 strikes) | **~34 µs** | - |

**Why So Fast?**
1. **Zero-cost abstractions**: Rust's compiler optimizations.
2. **Stack allocation**: No heap memory usage in the hot path.
3. **Efficient Math**: Abramowitz & Stegun approximations and pre-computed constants.

---

## 📂 Project Structure

```bash
.
├── playground/          # 🌐 Interactive Web App (Frontend/Server)
│   ├── public/          # HTML/CSS/JS assets
│   ├── server.py        # Python server script
│   └── exercises.js     # Interactive content
├── src/                 # 🦀 Rust Core Library (Backend Engine)
│   ├── ad/              # Automatic Differentiation
│   ├── pricing/         # Black-Scholes Logic
│   └── volatility/      # SVI Surface
├── examples/            # Demo scripts
└── benches/             # Performance benchmarks
```

---

## 📜 License

MIT License - Free to use and modify.
