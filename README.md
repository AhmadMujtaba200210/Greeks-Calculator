# Greeks Calculator

Greeks Calculator is an options analytics workspace built around a Rust pricing engine, a browser-delivered WASM runtime, and a redesigned Playground UI implemented as a React + Tailwind + shadcn island inside the existing static app shell.

## What Is In The App

- Playground: interactive option pricing, Greeks, charts, validation, diagnostics, and references.
- Builder: multi-leg strategy construction, scenario analysis, presets, thesis workflow, and comparison views.
- Learn, Practice, Challenges, and Theory: educational and workflow modules that still run on the legacy static shell.
- Rust core: pricing, Greeks, volatility, and benchmarkable numerical routines in `src/`.

## Stack

- Rust core library in `src/`
- WASM bundle served from `playground/public/pkg/`
- Static app shell in `playground/public/`
- React Playground source in `playground/ui/`
- Playwright UI tests in `tests/ui/`
- Math smoke tests in `tests/math/`

## Requirements

- Node.js 18+ and npm
- Python 3
- Rust toolchain if you need to work on the core engine or rebuild WASM

## Quick Start

Install the Playground UI dependencies once:

```bash
npm install --prefix playground/ui
```

Start the integrated app from the repository root:

```bash
npm start
```

Open [http://localhost:8085](http://localhost:8085).

`npm start` builds the React Playground into `playground/public/playground-ui/` and then serves the full app through `playground/server.py`.

## Common Commands

Run the app without rebuilding the Playground bundle:

```bash
npm run serve
```

Build the Playground UI manually:

```bash
npm run build:playground-ui
```

Watch and rebuild the Playground UI while you edit React files:

```bash
npm run dev:playground-ui
```

In another terminal, serve the app:

```bash
npm run serve
```

Run the UI test suite:

```bash
npm test
```

Run only the browser regression suite:

```bash
npm run test:ui
```

Run only the math smoke tests:

```bash
npm run test:math
```

## Rust Commands

Build the Rust core:

```bash
cargo build --release
```

Run Rust tests:

```bash
cargo test
```

Run benchmarks:

```bash
cargo bench
```

Run the example binary:

```bash
cargo run --release --example main
```

## Architecture Notes

- The app is still served as static files from `playground/public/`.
- The redesigned Playground is not rendered by legacy DOM code anymore. It mounts into `#playground-app-root` from the built React bundle in `playground/public/playground-ui/`.
- Builder and the other product sections remain on the legacy HTML/CSS/JS stack.
- The React Playground consumes the existing pricing and guard logic through shared adapter modules rather than reimplementing the math.

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
│   └── ui/
│       ├── src/app/
│       ├── src/components/ui/
│       └── src/lib/
├── src/
├── tests/
│   ├── math/
│   └── ui/
├── benches/
└── examples/
```

## Notes For Contributors

- If you change files under `playground/ui/src/`, rebuild the Playground bundle before using the integrated app unless you are running the watch script.
- If you change Rust pricing code or WASM bindings, the browser bundle under `playground/public/pkg/` may also need to be regenerated.
- The top-level navigation and non-Playground sections still depend on the legacy files under `playground/public/js/`.

## License

MIT
