# Interactive Options Greeks Playground

A web-based interactive platform for learning and experimenting with options pricing, Greeks, and volatility surfaces.

## Features

- **📊 Live Greeks Calculator**: Real-time calculation of all option Greeks (Delta, Gamma, Vega, Theta, Rho).
- **📈 Interactive Visualizations**:
  - Price vs Spot charts
  - Greeks vs Spot charts
  - Volatility Surface visualization
  - Time Decay curves
- **📚 Comprehensive Course**: 6-module curriculum covering everything from basics to advanced AD strategies.
- **🎮 Practice Exercises**: Quizzes and interactive tools to test your knowledge.
- **🛡️ Trading Challenges**: Real-world scenarios to apply your skills.

## Quick Start

### 1. Prerequisites
- Python 3.x installed on your system.

### 2. Run the Playground
Open a terminal in the `playground` directory and run:

```bash
python3 server.py
# OR
./server.py
```

### 3. Access the App
The server will start and automatically try to open your browser to:
[http://localhost:8085](http://localhost:8085)

## Project Structure

```
playground/
├── public/              # Static web files
│   ├── index.html       # Main entry point
│   ├── styles.css       # Styling
│   ├── app.js           # Main logic
│   ├── calculator.js    # Black-Scholes engine
│   ├── lessons.js       # Course content
│   └── exercises.js     # Practice exercises
└── server.py            # Simple Python HTTP server
```

## Usage Guide

1. **Playground Tab**: Use the sliders to adjust Spot, Strike, Volatility, Time, and Rates. Watch how the Greeks and charts update instantly.
2. **Learn Tab**: Select a module from the sidebar to read lessons.
3. **Practice Tab**: Take the Delta Quiz or try other exercises.
4. **Challenges**: Test your skills with the "Perfect Hedge" challenge.

## Compatibility
Works in all modern browsers (Chrome, Firefox, Safari, Edge). JavaScript must be enabled.
