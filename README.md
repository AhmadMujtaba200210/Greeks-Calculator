# High-Performance Options Greeks Calculator & Integrated Playground

**A professional-grade options analysis suite featuring a sub-microsecond Rust pricing engine, an AI surrogate model, and an advanced interactive strategy builder.**

---

## 🚀 Quick Start: Run the Suite

Experience the **Integrated Playground** powered by high-performance WebAssembly.

### 1. Prerequisites
- **Python 3.x** (for hosting the web environment)

### 2. Launch the Application
Open your terminal and run:

```bash
cd playground
python3 server.py
```

### 3. Access in Browser
The app will automatically launch. If not, visit:  
👉 **[http://localhost:8085](http://localhost:8085)**

> **Note:** The playground now leverages the **Rust Engine via WebAssembly (WASM)**, providing near-native pricing speeds for Monte Carlo and Binomial models directly in your browser.

---

## 🌟 Key Features

### 🏢 Strategy Builder (Live Terminal)
Construct and Stress-Test complex multi-leg portfolios.
- **Multi-Leg Interface**: Build Iron Condors, Butterflies, and Custom Spreads with ease.
- **Scenario Sandbox**: A "Time Machine" for your trades. Adjust Spot, IV, and Time to see future P&L.
- **Trade Thesis Wizard**: A structured workflow ensuring every trade has a catalyst and objective.
- **Probability Overlays**: Visualized expected outcomes based on log-normal price distributions.

### 🎮 Interactive Playground
A sophisticated environment for real-time Greeks analysis.
- **Quad-Model Engine**: Seamlessly switch between Black-Scholes, Binomial Tree, Monte Carlo, and **AI Surrogate (Neural Net)** models.
- **Visualizations**: 7+ dynamic charts including 3D Volatility Surfaces and Model Convergence.
- **Trader's Advice**: Real-time risk alerts for "Gamma Risk", "Theta Cliffs", and "Vega Exposure".

### 🦀 High-Performance Rust Backend
The core library, optimized for extreme low latency.
- **Speed**: ~190 nanoseconds per analytical calculation (5.2M options/sec).
- **Precision**: Uses **Automatic Differentiation (AD)** for exact Greeks—no finite difference errors.
- **Advanced Quant**: Implements SVI (Stochastic Volatility Inspired) surface parameterization.
- **Liquidity Lab**: Educational models to estimate slippage and execution quality.

---

## 🛠️ Rust Library Usage (Backend)

Located in the `src/` directory.

```bash
# Build the project
cargo build --release

# Run comprehensive benchmarks
cargo bench

# Run interactive demo
cargo run --release --example main
```

---

## 🔢 Mathematical Architecture

### 1. Pricing Hierarchy
- **Analytical**: Black-Scholes for European exact solutions.
- **Discrete**: 500-step Binomial Tree (CRR) for American early exercise.
- **Stochastic**: 50,000-path Monte Carlo for complex paths, utilizing **Antithetic Variates**.
- **AI Surrogate**: Multi-Layer Perceptron (MLP) trained to approximate surfaces at zero computational cost.

### 2. The Greeks & AD
We utilize **Forward-Mode Automatic Differentiation** using Dual Numbers ($x + x'\epsilon$) to compute sensitivities exactly.
- **Delta (Δ)**: Price sensitivity.
- **Gamma (Γ)**: Curvature/Convexity.
- **Vega (ν)**: Volatility sensitivity.
- **Theta (Θ)**: Time decay.
- **Rho (ρ)**: Rate sensitivity.

---

## 📂 Project Structure

```bash
.
├── playground/          # 🌐 Integrated Web Application
│   ├── public/          # 🎨 UI & Frontend Assets
│   │   ├── pkg/         # 🦀 Compiled WASM Backend
│   │   ├── js/
│   │   │   ├── app.js       # Main Orchestrator
│   │   │   ├── strategy.js  # Builder & Scenario Engine
│   │   │   ├── advice.js    # Risk Logic
│   │   │   └── ai_model.js  # Neural Net Surrogate
│   ├── server.py        # Python Launch Script
├── src/                 # 🦀 Rust Core Engine (Native Library)
│   ├── ad/              # Automatic Differentiation Core
│   ├── pricing/         # Numerical & Analytical Models
│   └── volatility/      # SVI Surface Fitting
└── examples/            # Native Benchmarks & Demos
```

---

## 📜 License

MIT License - Open for personal and commercial use.
