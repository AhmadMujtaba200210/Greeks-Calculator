import type { GreeksResult } from "@/lib/types";

declare global {
  interface Window {
    Chart?: any;
    Plotly?: any;
    aiSurrogate?: {
      ready: boolean;
      predictGreeks: (
        spot: number,
        strike: number,
        maturity: number,
        volatility: number,
        rate: number,
        dividend: number,
        isCall: boolean,
      ) => GreeksResult;
    };
    calculator?: {
      calculateGreeks: (
        spot: number,
        strike: number,
        maturity: number,
        volatility: number,
        rate: number,
        dividend: number,
        isCall: boolean,
      ) => GreeksResult;
      calculatePrice: (
        spot: number,
        strike: number,
        maturity: number,
        volatility: number,
        rate: number,
        dividend: number,
        isCall: boolean,
      ) => number;
    };
    wasmLoaded?: boolean;
    wasm_bindings?: {
      calculate_greeks_wasm: (
        spot: number,
        strike: number,
        maturity: number,
        volatility: number,
        rate: number,
        dividend: number,
        isCall: boolean,
      ) => GreeksResult;
      calculate_binomial_wasm: (
        spot: number,
        strike: number,
        maturity: number,
        volatility: number,
        rate: number,
        dividend: number,
        isCall: boolean,
        steps: number,
      ) => GreeksResult;
      calculate_mc_wasm: (
        spot: number,
        strike: number,
        maturity: number,
        volatility: number,
        rate: number,
        dividend: number,
        isCall: boolean,
        paths: number,
      ) => GreeksResult;
    };
    calculate_greeks_wasm?: Window["wasm_bindings"]["calculate_greeks_wasm"];
    calculate_binomial_wasm?: Window["wasm_bindings"]["calculate_binomial_wasm"];
    calculate_mc_wasm?: Window["wasm_bindings"]["calculate_mc_wasm"];
    currentConvergenceChart?: any;
  }
}

export {};
