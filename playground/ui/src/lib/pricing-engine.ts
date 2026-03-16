import initWasm, {
  calculate_binomial_wasm,
  calculate_greeks_wasm,
  calculate_mc_wasm,
} from "../../../public/pkg/greeks_calculator.js";
import { guardedPrice } from "../../../public/js/numericalGuards.js";
import { validateSurrogate } from "../../../public/js/surrogateGuard.js";
import type {
  PlaygroundParams,
  PricingExecution,
  PricingModelId,
  SurrogateSummary,
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

function syncWindowBindings() {
  window.wasmLoaded = wasmReady;
  window.calculate_greeks_wasm = calculate_greeks_wasm;
  window.calculate_binomial_wasm = calculate_binomial_wasm;
  window.calculate_mc_wasm = calculate_mc_wasm;
  window.wasm_bindings = {
    calculate_greeks_wasm,
    calculate_binomial_wasm,
    calculate_mc_wasm,
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
      return false;
    });

  return initPromise;
}

function getModelGreeks(
  pricingModel: PricingModelId,
  engineParams: EngineParams,
  purpose: "display" | "chart" = "display",
) {
  const { S, K, T, sigma, r, q, isCall } = engineParams;
  const chartMode = purpose === "chart";

  if (pricingModel === "ai_surrogate" && window.aiSurrogate?.ready) {
    return window.aiSurrogate.predictGreeks(S, K, T, sigma, r, q, isCall);
  }

  if (!wasmReady) {
    if (!window.calculator?.calculateGreeks) {
      throw new Error("No pricing backend is available.");
    }
    return window.calculator.calculateGreeks(S, K, T, sigma, r, q, isCall);
  }

  if (pricingModel === "binomial") {
    return calculate_binomial_wasm(S, K, T, sigma, r, q, isCall, chartMode ? 140 : 500);
  }

  if (pricingModel === "monte_carlo") {
    return calculate_mc_wasm(S, K, T, sigma, r, q, isCall, chartMode ? 8000 : 50000);
  }

  return calculate_greeks_wasm(S, K, T, sigma, r, q, isCall);
}

function mapSurrogateSummary(validation: any): SurrogateSummary | null {
  if (!validation?.recommendation) return null;
  return {
    recommendation: validation.recommendation,
    confidence: Number(validation.confidence ?? 0),
    message: String(validation.recommendationMessage ?? "AI surrogate domain check unavailable."),
  };
}

export async function priceOption(
  params: PlaygroundParams,
  purpose: "display" | "chart" = "display",
): Promise<PricingExecution> {
  await ensurePricingEngine();

  const engineParams = toEngineParams(params);
  const guarded = guardedPrice(engineParams, (nextParams: EngineParams) =>
    getModelGreeks(params.pricingModel, nextParams, purpose),
  );

  const surrogateSummary =
    params.pricingModel === "ai_surrogate" && window.aiSurrogate?.ready
      ? mapSurrogateSummary(validateSurrogate(engineParams, guarded.result))
      : null;

  return {
    result: guarded.result,
    warnings: guarded.warnings ?? [],
    wasmReady,
    surrogateSummary,
  };
}

export function getModelLabel(pricingModel: PricingModelId) {
  const labels: Record<PricingModelId, string> = {
    black_scholes: "Black-Scholes",
    binomial: "Binomial (CRR)",
    monte_carlo: "Monte Carlo",
    ai_surrogate: "AI Surrogate",
  };

  return labels[pricingModel];
}
