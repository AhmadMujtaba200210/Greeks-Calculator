const fs = require('fs');
const vm = require('vm');

function loadCalculator() {
  const code = fs.readFileSync('playground/public/js/calculator.js', 'utf8') +
    '\n;globalThis.BlackScholesCalculator = BlackScholesCalculator;';
  const sandbox = { Math };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'calculator.js' });
  return new sandbox.BlackScholesCalculator();
}

const calculator = loadCalculator();

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function approx(a, b, tol = 1e-6) {
  return Math.abs(a - b) <= tol;
}

function finite(x) {
  return Number.isFinite(x) && !Number.isNaN(x);
}

function parityCheck(S, K, T, sigma, r, q) {
  const call = calculator.calculatePrice(S, K, T, sigma, r, q, true);
  const put = calculator.calculatePrice(S, K, T, sigma, r, q, false);
  const lhs = call + K * Math.exp(-r * T);
  const rhs = put + S * Math.exp(-q * T);
  assert(Math.abs(lhs - rhs) < 1e-6, `Put-call parity failed: diff=${Math.abs(lhs - rhs)}`);
}

function boundsCheck(S, K, T, sigma, r, q) {
  const call = calculator.calculatePrice(S, K, T, sigma, r, q, true);
  const put = calculator.calculatePrice(S, K, T, sigma, r, q, false);
  const dfR = Math.exp(-r * T);
  const dfQ = Math.exp(-q * T);
  const callLower = Math.max(0, S * dfQ - K * dfR);
  const callUpper = S * dfQ;
  const putLower = Math.max(0, K * dfR - S * dfQ);
  const putUpper = K * dfR;
  assert(call >= callLower - 1e-6, 'Call below lower bound');
  assert(call <= callUpper + 1e-6, 'Call above upper bound');
  assert(put >= putLower - 1e-6, 'Put below lower bound');
  assert(put <= putUpper + 1e-6, 'Put above upper bound');
}

function greeksCheck(S, K, T, sigma, r, q) {
  const call = calculator.calculateGreeks(S, K, T, sigma, r, q, true);
  const put = calculator.calculateGreeks(S, K, T, sigma, r, q, false);

  [call, put].forEach((g) => {
    assert(finite(g.price), 'Price not finite');
    assert(finite(g.delta), 'Delta not finite');
    assert(finite(g.gamma), 'Gamma not finite');
    assert(finite(g.vega), 'Vega not finite');
    assert(finite(g.theta), 'Theta not finite');
    assert(finite(g.rho), 'Rho not finite');
  });

  assert(call.delta >= -1e-6 && call.delta <= 1 + 1e-6, 'Call delta out of bounds');
  assert(put.delta >= -1 - 1e-6 && put.delta <= 1e-6, 'Put delta out of bounds');
  assert(call.gamma >= -1e-8, 'Gamma negative');
  assert(call.vega >= -1e-8, 'Vega negative');
}

function monotonicityCheck() {
  const S = 100, K = 100, T = 0.5, sigma = 0.3, r = 0.03, q = 0.0;
  const call1 = calculator.calculatePrice(S, K, T, sigma, r, q, true);
  const call2 = calculator.calculatePrice(S + 1, K, T, sigma, r, q, true);
  assert(call2 >= call1 - 1e-6, 'Call not increasing with S');

  const callK1 = calculator.calculatePrice(S, K, T, sigma, r, q, true);
  const callK2 = calculator.calculatePrice(S, K + 1, T, sigma, r, q, true);
  assert(callK2 <= callK1 + 1e-6, 'Call not decreasing with K');

  const putK1 = calculator.calculatePrice(S, K, T, sigma, r, q, false);
  const putK2 = calculator.calculatePrice(S, K + 1, T, sigma, r, q, false);
  assert(putK2 >= putK1 - 1e-6, 'Put not increasing with K');
}

function nearZeroTimeCheck() {
  const S = 100, K = 100, T = 1e-6, sigma = 0.2, r = 0.05, q = 0.0;
  const call = calculator.calculatePrice(S, K, T, sigma, r, q, true);
  const put = calculator.calculatePrice(S, K, T, sigma, r, q, false);
  const intrinsicCall = Math.max(0, S - K * Math.exp(-r * T));
  const intrinsicPut = Math.max(0, K * Math.exp(-r * T) - S);
  assert(Math.abs(call - intrinsicCall) < 1e-3, 'Near-zero T call not near intrinsic');
  assert(Math.abs(put - intrinsicPut) < 1e-3, 'Near-zero T put not near intrinsic');
}

function extremeVolCheck() {
  const S = 100, K = 100, T = 1, sigma = 5.0, r = 0.01, q = 0.0;
  const call = calculator.calculatePrice(S, K, T, sigma, r, q, true);
  const put = calculator.calculatePrice(S, K, T, sigma, r, q, false);
  assert(finite(call) && finite(put), 'Extreme vol produced non-finite prices');
  boundsCheck(S, K, T, sigma, r, q);
}

function deepMoneynessCheck() {
  const deepITM = calculator.calculateGreeks(200, 100, 0.1, 0.2, 0.05, 0, true);
  const deepOTM = calculator.calculateGreeks(10, 100, 0.1, 0.2, 0.05, 0, true);
  assert(deepITM.delta > 0.99, 'Deep ITM delta not near 1');
  assert(deepOTM.delta < 0.01, 'Deep OTM delta not near 0');
}

function randomParityAndBounds() {
  for (let i = 0; i < 10; i++) {
    const S = 50 + Math.random() * 150;
    const K = 50 + Math.random() * 150;
    const T = 0.05 + Math.random() * 2;
    const sigma = 0.05 + Math.random() * 1.0;
    const r = Math.random() * 0.1;
    const q = Math.random() * 0.05;
    parityCheck(S, K, T, sigma, r, q);
    boundsCheck(S, K, T, sigma, r, q);
    greeksCheck(S, K, T, sigma, r, q);
  }
}

function rangeOutputCheck() {
  const range = calculator.calculateGreeksRange(100, 1, 0.2, 0.03, 0.0, true, 80, 120, 25);
  assert(Array.isArray(range) && range.length === 25, 'Greeks range length mismatch');
  range.forEach(row => {
    assert(finite(row.price) && finite(row.delta), 'Range output contains non-finite values');
  });
}

// Execute tests
parityCheck(100, 100, 1, 0.2, 0.05, 0.0);
monotonicityCheck();
nearZeroTimeCheck();
extremeVolCheck();
deepMoneynessCheck();
randomParityAndBounds();
rangeOutputCheck();

console.log('Math edge-case suite passed');
