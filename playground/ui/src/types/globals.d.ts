import type {
  BenchmarkReport,
  ComparisonPayload,
  ConvergencePayload,
  GreeksResult,
  PricingExecution,
  SurfaceGridPayload,
  SurfaceSlicePayload,
} from "@/lib/types";

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
      calculate_model_wasm: (
        spot: number,
        strike: number,
        maturity: number,
        volatility: number,
        rate: number,
        dividend: number,
        isCall: boolean,
        modelKey: string,
        purpose: string,
      ) => PricingExecution;
      calculate_cross_model_comparison_wasm: (
        spot: number,
        strike: number,
        maturity: number,
        volatility: number,
        rate: number,
        dividend: number,
        isCall: boolean,
        purpose: string,
      ) => ComparisonPayload;
      calculate_convergence_diagnostics_wasm: (
        spot: number,
        strike: number,
        maturity: number,
        volatility: number,
        rate: number,
        dividend: number,
        isCall: boolean,
        modelKey: string,
      ) => ConvergencePayload;
      calculate_surface_slice_wasm: (
        spot: number,
        strike: number,
        maturity: number,
        volatility: number,
        rate: number,
        dividend: number,
      ) => SurfaceSlicePayload;
      calculate_surface_grid_wasm: (
        spot: number,
        strike: number,
        maturity: number,
        volatility: number,
        rate: number,
        dividend: number,
      ) => SurfaceGridPayload;
      run_benchmark_suite_wasm: (payload: unknown) => BenchmarkReport;
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
    calculate_model_wasm?: Window["wasm_bindings"]["calculate_model_wasm"];
    calculate_cross_model_comparison_wasm?: Window["wasm_bindings"]["calculate_cross_model_comparison_wasm"];
    calculate_convergence_diagnostics_wasm?: Window["wasm_bindings"]["calculate_convergence_diagnostics_wasm"];
    calculate_surface_slice_wasm?: Window["wasm_bindings"]["calculate_surface_slice_wasm"];
    calculate_surface_grid_wasm?: Window["wasm_bindings"]["calculate_surface_grid_wasm"];
    run_benchmark_suite_wasm?: Window["wasm_bindings"]["run_benchmark_suite_wasm"];
    calculate_greeks_wasm?: Window["wasm_bindings"]["calculate_greeks_wasm"];
    calculate_binomial_wasm?: Window["wasm_bindings"]["calculate_binomial_wasm"];
    calculate_mc_wasm?: Window["wasm_bindings"]["calculate_mc_wasm"];
    currentConvergenceChart?: any;
  }
}

export {};
