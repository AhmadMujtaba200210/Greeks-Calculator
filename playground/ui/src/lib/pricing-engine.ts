import initWasm, {
  calculate_binomial_wasm,
  calculate_convergence_diagnostics_wasm,
  calculate_cross_model_comparison_wasm,
  calculate_greeks_wasm,
  calculate_mc_wasm,
  calculate_model_wasm,
  calculate_surface_grid_wasm,
  calculate_surface_slice_wasm,
  run_benchmark_suite_wasm,
} from "../../../public/pkg/greeks_calculator.js";
import type {
  BenchmarkReport,
  ComparisonPayload,
  ConvergencePayload,
  PlaygroundParams,
  PricingExecution,
  PricingModelId,
  SurfaceGridPayload,
  SurfaceSlicePayload,
  SurrogateLabSummary,
} from "@/lib/types";

type EngineParams = {
  S: number;
  K: number;
  T: number;
  sigma: number;
  r: number;
  q: number;
  isCall: boolean;
};

let wasmReady = false;
let initPromise: Promise<boolean> | null = null;

function toHealthState(value: string | null | undefined) {
  if (value === "fail" || value === "destructive") return "fail" as const;
  if (value === "warn" || value === "warning") return "warn" as const;
  return "pass" as const;
}

function parsePayload<T extends Record<string, unknown>>(value: unknown): T {
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }
  return (value ?? {}) as T;
}

function fromShape<T>(value: Record<string, unknown> | null | undefined, snake: string, camel: string, fallback: T): T {
  if (!value) return fallback;
  const direct = value[camel];
  if (direct !== undefined) return direct as T;
  const raw = value[snake];
  return raw !== undefined ? (raw as T) : fallback;
}

function normalizeGreeks(raw: Record<string, unknown> | null | undefined) {
  return {
    price: Number(fromShape(raw, "price", "price", 0)),
    delta: Number(fromShape(raw, "delta", "delta", 0)),
    gamma: Number(fromShape(raw, "gamma", "gamma", 0)),
    vega: Number(fromShape(raw, "vega", "vega", 0)),
    theta: Number(fromShape(raw, "theta", "theta", 0)),
    rho: Number(fromShape(raw, "rho", "rho", 0)),
  };
}

function normalizeUnits(raw: Record<string, unknown> | null | undefined) {
  return {
    price: String(fromShape(raw, "price", "price", "USD premium")),
    delta: String(fromShape(raw, "delta", "delta", "per $1 spot move")),
    gamma: String(fromShape(raw, "gamma", "gamma", "delta change per $1 spot move")),
    vega: String(fromShape(raw, "vega", "vega", "per 1% implied volatility move")),
    theta: String(fromShape(raw, "theta", "theta", "per day")),
    rho: String(fromShape(raw, "rho", "rho", "per 1% rate move")),
  };
}

function normalizeDiagnostics(raw: Record<string, unknown> | null | undefined) {
  return {
    standard_error: fromShape<number | null>(raw, "standard_error", "standard_error", null),
    ci95: fromShape<[number, number] | null>(raw, "ci95", "ci95", null),
    benchmark_status: toHealthState(fromShape<string | null>(raw, "benchmark_status", "benchmark_status", null)),
  };
}

function normalizeEngineMetadata(raw: Record<string, unknown> | null | undefined) {
  return {
    model: String(fromShape(raw, "model", "model", "Unknown")),
    method: String(fromShape(raw, "method", "method", "Unavailable")),
    exercise_style: String(fromShape(raw, "exercise_style", "exercise_style", "European")),
    assumption_set: String(
      fromShape(raw, "assumption_set", "assumption_set", "European vanilla under stated assumptions"),
    ),
    steps: fromShape<number | null>(raw, "steps", "steps", null),
    paths: fromShape<number | null>(raw, "paths", "paths", null),
    estimator: fromShape<string | null>(raw, "estimator", "estimator", null),
    latency_ms: Number(fromShape(raw, "latency_ms", "latency_ms", 0)),
  };
}

function normalizeMetricError(raw: Record<string, unknown> | null | undefined) {
  return {
    absolute: Number(fromShape(raw, "absolute", "absolute", 0)),
    relative: Number(fromShape(raw, "relative", "relative", 0)),
    status: toHealthState(fromShape<string | null>(raw, "status", "status", null)),
  };
}

function normalizeReferenceComparison(raw: Record<string, unknown> | null | undefined) {
  if (!raw) return null;
  const greekErrorsRaw = fromShape<Record<string, Record<string, unknown>> | null>(
    raw,
    "greek_errors",
    "greekErrors",
    null,
  );

  return {
    reference_model: String(fromShape(raw, "reference_model", "reference_model", "Black-Scholes")),
    price_error_pct: fromShape<number | null>(raw, "price_error_pct", "price_error_pct", null),
    greek_errors: Object.fromEntries(
      Object.entries(greekErrorsRaw ?? {}).map(([key, value]) => [key, normalizeMetricError(value)]),
    ),
    status: toHealthState(fromShape<string | null>(raw, "status", "status", null)),
  };
}

function normalizeWarning(raw: Record<string, unknown> | null | undefined) {
  const severity = String(fromShape(raw, "severity", "severity", "info"));
  return {
    severity: severity === "warning" || severity === "critical" ? severity : "info",
    code: String(fromShape(raw, "code", "code", "UNKNOWN")),
    message: String(fromShape(raw, "message", "message", "")),
    technical: fromShape<string | undefined>(raw, "technical", "technical", undefined),
  };
}

function normalizeComparison(comparison: Record<string, unknown> | null | undefined): ComparisonPayload {
  const referenceRaw = fromShape<Record<string, unknown> | null>(comparison, "reference", "reference", null);
  const modelsRaw = fromShape<Array<Record<string, unknown>>>(comparison, "models", "models", []);
  return {
    reference: referenceRaw
      ? {
          model: String(fromShape(referenceRaw, "model", "model", "Black-Scholes")),
          ...normalizeGreeks(referenceRaw),
        }
      : null,
    models: modelsRaw.map((model) => {
      const errorsRaw = fromShape<Record<string, Record<string, unknown>> | null>(model, "errors", "errors", null);
      return {
        name: String(fromShape(model, "name", "name", "Unknown")),
        result: normalizeGreeks(fromShape(model, "result", "result", {})),
        errors: Object.fromEntries(
          Object.entries(errorsRaw ?? {}).map(([key, value]) => [key, normalizeMetricError(value)]),
        ),
        overallStatus: toHealthState(fromShape(model, "overall_status", "overallStatus", null)),
        diagnostics: normalizeDiagnostics(fromShape(model, "diagnostics", "diagnostics", {})),
        engineMetadata: normalizeEngineMetadata(fromShape(model, "engine_metadata", "engineMetadata", {})),
      };
    }),
  };
}

function normalizeExecution(execution: Record<string, unknown> | null | undefined): PricingExecution {
  return {
    result: normalizeGreeks(fromShape(execution, "result", "result", {})),
    warnings: fromShape<Array<Record<string, unknown>>>(execution, "warnings", "warnings", []).map((warning) =>
      normalizeWarning(warning),
    ),
    units: normalizeUnits(fromShape(execution, "units", "units", {})),
    diagnostics: normalizeDiagnostics(fromShape(execution, "diagnostics", "diagnostics", {})),
    engineMetadata: normalizeEngineMetadata(fromShape(execution, "engine_metadata", "engineMetadata", {})),
    referenceComparison: normalizeReferenceComparison(
      fromShape(execution, "reference_comparison", "referenceComparison", null),
    ),
    comparison: null,
    wasmReady: false,
    surrogateLab: null,
  };
}

function normalizeConvergence(raw: Record<string, unknown> | null | undefined): ConvergencePayload {
  return {
    model: String(fromShape(raw, "model", "model", "")),
    reference_price: Number(fromShape(raw, "reference_price", "reference_price", 0)),
    binomial: fromShape<Array<Record<string, unknown>>>(raw, "binomial", "binomial", []).map((entry) => ({
      steps: Number(fromShape(entry, "steps", "steps", 0)),
      crr_price: Number(fromShape(entry, "crr_price", "crr_price", 0)),
      leisen_reimer_price: Number(fromShape(entry, "leisen_reimer_price", "leisen_reimer_price", 0)),
      crr_error: Number(fromShape(entry, "crr_error", "crr_error", 0)),
      leisen_reimer_error: Number(fromShape(entry, "leisen_reimer_error", "leisen_reimer_error", 0)),
    })),
    monte_carlo: fromShape<Array<Record<string, unknown>>>(raw, "monte_carlo", "monte_carlo", []).map((entry) => ({
      paths: Number(fromShape(entry, "paths", "paths", 0)),
      mean_price: Number(fromShape(entry, "mean_price", "mean_price", 0)),
      estimated_se: Number(fromShape(entry, "estimated_se", "estimated_se", 0)),
      ci95: fromShape<[number, number]>(entry, "ci95", "ci95", [0, 0]),
      abs_error: Number(fromShape(entry, "abs_error", "abs_error", 0)),
    })),
  };
}

function normalizeSurfaceSlice(raw: Record<string, unknown> | null | undefined): SurfaceSlicePayload {
  return {
    label: String(fromShape(raw, "label", "label", "Scenario slice")),
    strikes: fromShape<number[]>(raw, "strikes", "strikes", []),
    vols: fromShape<number[]>(raw, "vols", "vols", []),
    is_arbitrage_free: Boolean(fromShape(raw, "is_arbitrage_free", "is_arbitrage_free", false)),
  };
}

function normalizeSurfaceGrid(raw: Record<string, unknown> | null | undefined): SurfaceGridPayload {
  return {
    label: String(fromShape(raw, "label", "label", "Scenario surface")),
    x: fromShape<number[]>(raw, "x", "x", []),
    y: fromShape<number[]>(raw, "y", "y", []),
    z: fromShape<number[][]>(raw, "z", "z", []),
    is_arbitrage_free: Boolean(fromShape(raw, "is_arbitrage_free", "is_arbitrage_free", false)),
  };
}

function normalizeBenchmarkReport(raw: Record<string, unknown> | null | undefined): BenchmarkReport {
  const results = fromShape<Array<Record<string, unknown>>>(raw, "results", "results", []);
  const summary = fromShape<Record<string, Record<string, unknown>>>(raw, "summary", "summary", {});

  return {
    total_cases: Number(fromShape(raw, "total_cases", "total_cases", 0)),
    results: results.map((result) => ({
      case_id: String(fromShape(result, "case_id", "case_id", "")),
      description: String(fromShape(result, "description", "description", "")),
      models: Object.fromEntries(
        Object.entries(fromShape<Record<string, string>>(result, "models", "models", {})).map(([key, value]) => [
          key,
          value === "warning" ? "warning" : value === "fail" ? "fail" : "pass",
        ]),
      ),
    })),
    summary: Object.fromEntries(
      Object.entries(summary).map(([key, value]) => [
        key,
        {
          pass: Number(fromShape(value, "pass", "pass", 0)),
          warning: Number(fromShape(value, "warning", "warning", 0)),
          fail: Number(fromShape(value, "fail", "fail", 0)),
        },
      ]),
    ),
  };
}

function syncWindowBindings() {
  window.wasmLoaded = wasmReady;
  window.calculate_greeks_wasm = calculate_greeks_wasm;
  window.calculate_binomial_wasm = calculate_binomial_wasm;
  window.calculate_mc_wasm = calculate_mc_wasm;
  window.calculate_model_wasm = calculate_model_wasm as any;
  window.calculate_cross_model_comparison_wasm = calculate_cross_model_comparison_wasm as any;
  window.calculate_convergence_diagnostics_wasm = calculate_convergence_diagnostics_wasm as any;
  window.calculate_surface_slice_wasm = calculate_surface_slice_wasm as any;
  window.calculate_surface_grid_wasm = calculate_surface_grid_wasm as any;
  window.run_benchmark_suite_wasm = run_benchmark_suite_wasm as any;
  window.wasm_bindings = {
    calculate_greeks_wasm,
    calculate_binomial_wasm,
    calculate_mc_wasm,
    calculate_model_wasm: calculate_model_wasm as any,
    calculate_cross_model_comparison_wasm: calculate_cross_model_comparison_wasm as any,
    calculate_convergence_diagnostics_wasm: calculate_convergence_diagnostics_wasm as any,
    calculate_surface_slice_wasm: calculate_surface_slice_wasm as any,
    calculate_surface_grid_wasm: calculate_surface_grid_wasm as any,
    run_benchmark_suite_wasm: run_benchmark_suite_wasm as any,
  };
}

export function toEngineParams(params: PlaygroundParams): EngineParams {
  return {
    S: params.spot,
    K: params.strike,
    T: params.maturity,
    sigma: params.volatility,
    r: params.rate,
    q: params.dividend,
    isCall: params.optionType === "call",
  };
}

export async function ensurePricingEngine() {
  if (initPromise) return initPromise;

  initPromise = initWasm()
    .then(() => {
      wasmReady = true;
      syncWindowBindings();
      return true;
    })
    .catch((error) => {
      console.error("Failed to initialize pricing WASM bundle:", error);
      wasmReady = false;
      syncWindowBindings();
      throw error;
    });

  return initPromise;
}

function getPrimaryModel(model: PricingModelId) {
  return model === "ai_surrogate" ? "black_scholes" : model;
}

function buildSurrogateLabSummary(params: PlaygroundParams): SurrogateLabSummary | null {
  if (!window.aiSurrogate?.ready) return null;

  const engineParams = toEngineParams(params);
  const isCall = engineParams.isCall;
  const currentRust = calculate_greeks_wasm(engineParams.S, engineParams.K, engineParams.T, engineParams.sigma, engineParams.r, engineParams.q, isCall);
  const currentAi = window.aiSurrogate.predictGreeks(
    engineParams.S,
    engineParams.K,
    engineParams.T,
    engineParams.sigma,
    engineParams.r,
    engineParams.q,
    isCall,
  );

  const spots = [0.85, 1.0, 1.15].map((multiple) => params.spot * multiple);
  const maturities = [Math.max(params.maturity * 0.5, 0.1), params.maturity, Math.max(params.maturity * 1.5, 0.25)];
  const vols = [Math.max(params.volatility * 0.75, 0.05), params.volatility, Math.min(params.volatility * 1.25, 1.5)];

  let sampleCount = 0;
  let totalAbsPriceErrorPct = 0;
  let maxAbsPriceErrorPct = 0;

  for (const spot of spots) {
    for (const maturity of maturities) {
      for (const volatility of vols) {
        const rust = calculate_greeks_wasm(spot, params.strike, maturity, volatility, params.rate, params.dividend, isCall);
        const ai = window.aiSurrogate.predictGreeks(spot, params.strike, maturity, volatility, params.rate, params.dividend, isCall);
        const errorPct = Math.abs(ai.price - rust.price) / Math.max(Math.abs(rust.price), 1e-4) * 100;
        sampleCount += 1;
        totalAbsPriceErrorPct += errorPct;
        maxAbsPriceErrorPct = Math.max(maxAbsPriceErrorPct, errorPct);
      }
    }
  }

  const currentPriceErrorPct = Math.abs(currentAi.price - currentRust.price) / Math.max(Math.abs(currentRust.price), 1e-4) * 100;
  const currentDeltaErrorPct = Math.abs(currentAi.delta - currentRust.delta) / Math.max(Math.abs(currentRust.delta), 1e-4) * 100;

  return {
    currentPriceErrorPct,
    currentDeltaErrorPct,
    meanAbsPriceErrorPct: sampleCount > 0 ? totalAbsPriceErrorPct / sampleCount : 0,
    maxAbsPriceErrorPct,
    sampleCount,
    message: "Experimental surrogate vs Rust Black-Scholes on a small scenario grid. Keep it research-only.",
  };
}

export async function priceOption(
  params: PlaygroundParams,
  purpose: "display" | "chart" = "display",
): Promise<PricingExecution> {
  await ensurePricingEngine();

  if (!wasmReady) {
    throw new Error("Rust/WASM pricing engine is unavailable.");
  }

  const engineParams = toEngineParams(params);
  const primaryModel = getPrimaryModel(params.pricingModel);
  const execution = normalizeExecution(
    parsePayload(
      calculate_model_wasm(
        engineParams.S,
        engineParams.K,
        engineParams.T,
        engineParams.sigma,
        engineParams.r,
        engineParams.q,
        engineParams.isCall,
        primaryModel,
        purpose,
      ),
    ),
  );

  const comparison = normalizeComparison(
    parsePayload(
      calculate_cross_model_comparison_wasm(
        engineParams.S,
        engineParams.K,
        engineParams.T,
        engineParams.sigma,
        engineParams.r,
        engineParams.q,
        engineParams.isCall,
        purpose,
      ),
    ),
  );

  return {
    ...execution,
    comparison,
    wasmReady,
    surrogateLab: purpose === "display" ? buildSurrogateLabSummary(params) : null,
  };
}

export async function getConvergenceDiagnostics(
  params: PlaygroundParams,
  model: Extract<PricingModelId, "binomial" | "monte_carlo">,
): Promise<ConvergencePayload> {
  await ensurePricingEngine();
  const engineParams = toEngineParams(params);
  return normalizeConvergence(
    parsePayload(
      calculate_convergence_diagnostics_wasm(
        engineParams.S,
        engineParams.K,
        engineParams.T,
        engineParams.sigma,
        engineParams.r,
        engineParams.q,
        engineParams.isCall,
        model,
      ),
    ),
  );
}

export async function getSurfaceSlice(params: PlaygroundParams): Promise<SurfaceSlicePayload> {
  await ensurePricingEngine();
  return normalizeSurfaceSlice(
    parsePayload(
      calculate_surface_slice_wasm(
        params.spot,
        params.strike,
        params.maturity,
        params.volatility,
        params.rate,
        params.dividend,
      ),
    ),
  );
}

export async function getSurfaceGrid(params: PlaygroundParams): Promise<SurfaceGridPayload> {
  await ensurePricingEngine();
  return normalizeSurfaceGrid(
    parsePayload(
      calculate_surface_grid_wasm(
        params.spot,
        params.strike,
        params.maturity,
        params.volatility,
        params.rate,
        params.dividend,
      ),
    ),
  );
}

export async function runBenchmarkSuite(payload: unknown): Promise<BenchmarkReport> {
  await ensurePricingEngine();
  return normalizeBenchmarkReport(parsePayload(run_benchmark_suite_wasm(payload)));
}

export function getModelLabel(pricingModel: PricingModelId) {
  const labels: Record<PricingModelId, string> = {
    black_scholes: "Black-Scholes",
    binomial: "Binomial (Leisen-Reimer)",
    monte_carlo: "Monte Carlo",
    ai_surrogate: "AI Surrogate Lab",
  };

  return labels[pricingModel];
}
