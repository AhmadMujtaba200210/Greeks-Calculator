# Greeks Calculator

Greeks Calculator is an options analytics workspace with a Rust pricing core, a WASM browser runtime, and a Playground UI built as a React + Tailwind + shadcn island inside the existing static shell.

## Current Status

- Production-facing pricing flow is Rust/WASM-first.
- The main Playground models are:
  - Black-Scholes
  - Binomial (Leisen-Reimer default, CRR retained for convergence diagnostics)
  - Monte Carlo
- The AI surrogate is not a main pricer anymore. It is exposed as an experimental research view only.
- Surface, convergence, benchmark, and comparison views are now Rust-backed.

## Pricing Conventions

The Playground uses one explicit set of Greek units across the desk:

- `price`: USD premium
- `delta`: per `$1` spot move
- `gamma`: delta change per `$1` spot move
- `vega`: per `1%` implied volatility move
- `theta`: per day
- `rho`: per `1%` rate move

## What Is In The App

- `Playground`: single-option pricing, Greeks, diagnostics, convergence, surface views, validation, and references
- `Builder`: multi-leg strategy construction, presets, comparison, thesis workflow, and payoff analysis
- `Learn`, `Practice`, `Challenges`, `Theory`: legacy static sections that remain outside the React Playground

## Stack

- Rust core: [`src/`](/Users/mujtaba/Library/CloudStorage/OneDrive-NortheasternUniversity/vibe_coding/Greeks%20Calculator/src)
- WASM package: [`playground/public/pkg/`](/Users/mujtaba/Library/CloudStorage/OneDrive-NortheasternUniversity/vibe_coding/Greeks%20Calculator/playground/public/pkg)
- Static shell: [`playground/public/`](/Users/mujtaba/Library/CloudStorage/OneDrive-NortheasternUniversity/vibe_coding/Greeks%20Calculator/playground/public)
- React Playground: [`playground/ui/`](/Users/mujtaba/Library/CloudStorage/OneDrive-NortheasternUniversity/vibe_coding/Greeks%20Calculator/playground/ui)
- Browser tests: [`tests/ui/`](/Users/mujtaba/Library/CloudStorage/OneDrive-NortheasternUniversity/vibe_coding/Greeks%20Calculator/tests/ui)
- Math smoke tests: [`tests/math/`](/Users/mujtaba/Library/CloudStorage/OneDrive-NortheasternUniversity/vibe_coding/Greeks%20Calculator/tests/math)
- Rust validation tests: [`tests/pricing_validation.rs`](/Users/mujtaba/Library/CloudStorage/OneDrive-NortheasternUniversity/vibe_coding/Greeks%20Calculator/tests/pricing_validation.rs)

## Requirements

- Node.js 18+ and npm
- Python 3
- Rust toolchain
- `wasm-pack` if you change Rust/WASM bindings

## Quick Start

Install the frontend dependencies once:

```bash
npm install
npm install --prefix playground/ui
```

Start the app from the repo root:

```bash
npm start
```

Open [http://localhost:8085](http://localhost:8085).

`npm start` builds the React Playground bundle and then serves the integrated app through [`playground/server.py`](/Users/mujtaba/Library/CloudStorage/OneDrive-NortheasternUniversity/vibe_coding/Greeks%20Calculator/playground/server.py).

## Common Commands

Serve without rebuilding the Playground bundle:

```bash
npm run serve
```

Build the React Playground bundle:

```bash
npm run build:playground-ui
```

Watch the Playground bundle while editing React files:

```bash
npm run dev:playground-ui
```

In a second terminal:

```bash
npm run serve
```

Run math smoke tests:

```bash
npm run test:math
```

Run browser regression tests:

```bash
npm run test:ui
```

Run the full app test suite:

```bash
npm test
```

## Rust And WASM Workflow

If you change Rust pricing code only:

```bash
cargo test --lib --tests
```

If you change Rust pricing code that is consumed in the browser, rebuild the WASM package:

```bash
wasm-pack build --target web --out-dir playground/public/pkg
```

Recommended verification after Rust/WASM changes:

```bash
cargo test --lib --tests
npm run test:math
npm run test:ui
```

## Architecture Notes

- The app is still served as static files from [`playground/public/`](/Users/mujtaba/Library/CloudStorage/OneDrive-NortheasternUniversity/vibe_coding/Greeks%20Calculator/playground/public).
- The React Playground mounts into `#playground-app-root` inside [`playground/public/index.html`](/Users/mujtaba/Library/CloudStorage/OneDrive-NortheasternUniversity/vibe_coding/Greeks%20Calculator/playground/public/index.html).
- Classical pricing logic runs in Rust and is consumed in the browser through WASM bindings in [`src/wasm.rs`](/Users/mujtaba/Library/CloudStorage/OneDrive-NortheasternUniversity/vibe_coding/Greeks%20Calculator/src/wasm.rs).
- The Playground adapter layer lives in [`playground/ui/src/lib/pricing-engine.ts`](/Users/mujtaba/Library/CloudStorage/OneDrive-NortheasternUniversity/vibe_coding/Greeks%20Calculator/playground/ui/src/lib/pricing-engine.ts).
- The volatility surface shown in the Playground is a Rust scenario SVI surface, not a live-calibrated market surface.
- The surrogate is intentionally labeled experimental and is not presented as an equal trading model.

## Project Layout

```text
.
├── playground/
│   ├── public/
│   │   ├── index.html
│   │   ├── js/
│   │   ├── pkg/
│   │   └── playground-ui/
│   ├── server.py
│   ├── README.md
│   └── ui/
│       ├── src/app/
│       ├── src/components/ui/
│       └── src/lib/
├── src/
├── tests/
│   ├── math/
│   ├── ui/
│   └── pricing_validation.rs
├── benches/
└── examples/
```

## Contributor Notes

- If you change files under [`playground/ui/src/`](/Users/mujtaba/Library/CloudStorage/OneDrive-NortheasternUniversity/vibe_coding/Greeks%20Calculator/playground/ui/src), rebuild the Playground bundle before manual testing unless the watch script is running.
- If you change files under [`src/`](/Users/mujtaba/Library/CloudStorage/OneDrive-NortheasternUniversity/vibe_coding/Greeks%20Calculator/src), rebuild the WASM package before checking the browser app.
- [`playground/public/js/app.js`](/Users/mujtaba/Library/CloudStorage/OneDrive-NortheasternUniversity/vibe_coding/Greeks%20Calculator/playground/public/js/app.js) still owns navigation and non-Playground bootstrapping.

## License

MIT
