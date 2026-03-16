import { CITATIONS } from "../../../public/js/citations.js";
import { runCrossModelComparison } from "../../../public/js/validation.js";
import type {
  AdviceCard,
  CitationEntry,
  ComparisonPayload,
  GreeksResult,
  GuardWarning,
  HealthState,
  PlaygroundComputed,
  PlaygroundParams,
  PricingExecution,
  PricingModelId,
  ValidationRow,
} from "@/lib/types";
import { getModelLabel, toEngineParams } from "@/lib/pricing-engine";

function toStatusValue(status: HealthState) {
  return status === "fail" ? 2 : status === "warn" ? 1 : 0;
}

function maxStatus(...states: HealthState[]): HealthState {
  const worst = states.reduce((acc, state) => Math.max(acc, toStatusValue(state)), 0);
  return worst === 2 ? "fail" : worst === 1 ? "warn" : "pass";
}

function statusFromError(errorPct: number | null): HealthState {
  if (errorPct === null || Number.isNaN(errorPct)) return "warn";
  if (Math.abs(errorPct) >= 5) return "fail";
  if (Math.abs(errorPct) >= 1) return "warn";
  return "pass";
}

function getComparisonName(model: PricingModelId) {
  const names: Record<PricingModelId, string> = {
    black_scholes: "Black-Scholes",
    binomial: "Binomial Tree",
    monte_carlo: "Monte Carlo",
    ai_surrogate: "AI Surrogate",
  };
  return names[model];
}

function buildAdvice(params: PlaygroundParams, greeks: GreeksResult): AdviceCard {
  const { spot, strike, maturity, volatility, optionType } = params;
  const moneyness = spot / strike;
  const isCall = optionType === "call";
  const daysToExpiry = maturity * 365;

  if (volatility > 1.0) {
    return {
      type: "danger",
      title: "Extreme Volatility",
      text: "IV is above 100%. Premiums are expensive and dispersion risk is elevated.",
    };
  }

  if (greeks.gamma > 0.05 && daysToExpiry < 30) {
    return {
      type: "danger",
      title: "High Gamma Risk",
      text: "Small spot moves will flip Delta quickly. Expect fast P&L changes near expiry.",
    };
  }

  if (daysToExpiry < 21 && Math.abs(greeks.theta) > 0.05) {
    return {
      type: "warning",
      title: "Theta Acceleration",
      text: `Time decay is steepening. You are bleeding about $${Math.abs(greeks.theta * 100).toFixed(2)} per day per contract.`,
    };
  }

  if (isCall && moneyness < 0.85) {
    return {
      type: "warning",
      title: "Deep OTM Call",
      text: "Leverage is high, but probability of expiring worthless is also high. Keep size disciplined.",
    };
  }

  if (!isCall && moneyness > 1.15) {
    return {
      type: "warning",
      title: "Deep OTM Put",
      text: "This hedge has low probability of finishing ITM and can stay overpriced into fear regimes.",
    };
  }

  if (greeks.vega > 0.15) {
    return {
      type: "info",
      title: "High Vega Exposure",
      text: "Volatility changes matter here. A 1-point IV move can rival a directional move in P&L impact.",
    };
  }

  if ((isCall && moneyness > 1.1) || (!isCall && moneyness < 0.9)) {
    return {
      type: "success",
      title: "Stock Replacement",
      text: "Delta is high enough that this contract behaves like synthetic stock with lower capital usage.",
    };
  }

  return {
    type: "neutral",
    title: "Standard Exposure",
    text: "Profile is balanced. Track spot, time decay, and implied volatility together.",
  };
}

function buildCitations(pricingModel: PricingModelId): CitationEntry[] {
  const keysByModel: Record<PricingModelId, string[]> = {
    black_scholes: ["black_scholes", "greeks_analytical"],
    binomial: ["binomial_crr", "greeks_finite_diff"],
    monte_carlo: ["monte_carlo_gbm", "greeks_finite_diff"],
    ai_surrogate: ["ai_surrogate", "greeks_finite_diff"],
  };

  return keysByModel[pricingModel]
    .map((key) => {
      const citation = (CITATIONS as Record<string, any>)[key];
      if (!citation) return null;
      return {
        key,
        method: citation.method,
        primary: citation.primary,
        secondary: citation.secondary,
        textbook: citation.textbook,
        implementationNote: citation.implementationNote,
      } satisfies CitationEntry;
    })
    .filter(Boolean) as CitationEntry[];
}

export function buildValidationRows(comparison: ComparisonPayload | null): ValidationRow[] {
  if (!comparison?.reference) {
    return [{ model: "Validation unavailable", price: 0, errorPct: null, status: "warn" }];
  }

  const rows: ValidationRow[] = [
    {
      model: "BS Analytical",
      price: comparison.reference.price,
      errorPct: null,
      status: "pass",
    },
  ];

  comparison.models.forEach((model) => {
    const errorPct = Number.isFinite(model.errors?.price?.relative)
      ? (model.errors?.price?.relative ?? 0) * 100
      : null;
    rows.push({
      model: model.name,
      price: model.result.price,
      errorPct,
      status: statusFromError(errorPct),
    });
  });

  return rows;
}

function getSelectedComparisonStatus(
  pricingModel: PricingModelId,
  comparison: ComparisonPayload | null,
): HealthState {
  if (pricingModel === "black_scholes") return "pass";
  const block = comparison?.models.find((entry) => entry.name.includes(getComparisonName(pricingModel)));
  if (!block) return "warn";
  const errorPct = Number.isFinite(block.errors?.price?.relative)
    ? (block.errors?.price?.relative ?? 0) * 100
    : null;
  return statusFromError(errorPct);
}

function getWarningStatus(warnings: GuardWarning[]): HealthState {
  if (warnings.some((warning) => warning.severity === "critical")) return "fail";
  if (warnings.some((warning) => warning.severity === "warning")) return "warn";
  return "pass";
}

function getDomainStatus(params: PlaygroundParams, execution: PricingExecution, warnings: GuardWarning[]) {
  if (params.pricingModel === "ai_surrogate" && execution.surrogateSummary) {
    if (execution.surrogateSummary.recommendation === "unreliable") return "fail";
    if (execution.surrogateSummary.recommendation === "caution") return "warn";
    return "pass";
  }
  return getWarningStatus(warnings);
}

function normalizeComparison(comparison: any): ComparisonPayload | null {
  if (!comparison) return null;
  return {
    reference: comparison.reference ?? null,
    models: comparison.models ?? [],
    convergence: comparison.convergence ?? undefined,
  };
}

export function buildPlaygroundComputed(
  params: PlaygroundParams,
  execution: PricingExecution,
): PlaygroundComputed {
  const result = execution.result;
  const intrinsicValue =
    params.optionType === "call"
      ? Math.max(0, params.spot - params.strike)
      : Math.max(0, params.strike - params.spot);
  const timeValue = result.price - intrinsicValue;
  const moneynessPct = (params.spot / params.strike) * 100;
  const comparison = normalizeComparison(runCrossModelComparison(toEngineParams(params)));
  const validationRows = buildValidationRows(comparison);
  const domain = getDomainStatus(params, execution, execution.warnings);
  const stability = getSelectedComparisonStatus(params.pricingModel, comparison);
  const overall = maxStatus(domain, stability);
  const daysToExpiry = Math.round(params.maturity * 365);
  const moneynessLabel =
    moneynessPct > 105 ? "In the money" : moneynessPct < 95 ? "Out of the money" : "At the money";

  return {
    ...result,
    intrinsicValue,
    timeValue,
    moneynessPct,
    modelLabel: getModelLabel(params.pricingModel),
    warnings: execution.warnings,
    validationRows,
    health: {
      domain,
      stability,
      overall,
    },
    quickFacts: [
      { label: "Days to expiry", value: String(daysToExpiry) },
      { label: "Moneyness", value: moneynessLabel },
      { label: "Volatility", value: `${(params.volatility * 100).toFixed(1)}%` },
      { label: "Carry", value: `${((params.rate - params.dividend) * 100).toFixed(2)}%` },
    ],
    advice: buildAdvice(params, result),
    citations: buildCitations(params.pricingModel),
    comparison,
    surrogateSummary: execution.surrogateSummary,
  };
}
