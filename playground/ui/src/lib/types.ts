export type PricingModelId =
  | "black_scholes"
  | "binomial"
  | "monte_carlo"
  | "ai_surrogate";

export type VizId =
  | "price"
  | "greeks"
  | "volatility"
  | "time"
  | "comparison"
  | "convergence"
  | "surface3d"
  | "diagnostics";

export type InsightTabId = "signal" | "validation" | "reference" | "math";

export type ScenarioPresetId =
  | "atm_call"
  | "atm_put"
  | "itm_call"
  | "otm_put"
  | "high_vol"
  | "short_dte";

export type OptionType = "call" | "put";
export type HealthState = "pass" | "warn" | "fail";

export type PlaygroundParams = {
  optionType: OptionType;
  pricingModel: PricingModelId;
  spot: number;
  strike: number;
  maturity: number;
  volatility: number;
  rate: number;
  dividend: number;
};

export type PlaygroundUiState = {
  activeViz: VizId;
  activeInsightTab: InsightTabId;
  activePreset: ScenarioPresetId | null;
  mobileControlsOpen: boolean;
};

export type GreeksResult = {
  price: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
};

export type GuardWarning = {
  severity: "info" | "warning" | "critical";
  code: string;
  message: string;
  technical?: string;
};

export type ValidationRow = {
  model: string;
  price: number;
  errorPct: number | null;
  status: HealthState;
};

export type QuickFact = {
  label: string;
  value: string;
};

export type AdviceCard = {
  type: "danger" | "warning" | "info" | "success" | "neutral";
  title: string;
  text: string;
};

export type CitationEntry = {
  key: string;
  method: string;
  primary?: string;
  secondary?: string;
  textbook?: string;
  implementationNote?: string;
};

export type SurrogateSummary = {
  recommendation: "trustworthy" | "caution" | "unreliable";
  confidence: number;
  message: string;
};

export type ComparisonModelBlock = {
  name: string;
  result: GreeksResult;
  errors?: {
    price?: {
      relative?: number;
    };
  };
  overallStatus?: "pass" | "warning" | "fail";
};

export type ComparisonPayload = {
  reference: (GreeksResult & { model?: string }) | null;
  models: ComparisonModelBlock[];
  convergence?: {
    binomial?: Array<{ steps: number; price: number }>;
    monteCarlo?: Array<{ paths: number; price: number; standardError?: number }>;
  };
};

export type PlaygroundComputed = {
  price: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
  intrinsicValue: number;
  timeValue: number;
  moneynessPct: number;
  modelLabel: string;
  warnings: GuardWarning[];
  validationRows: ValidationRow[];
  health: {
    domain: HealthState;
    stability: HealthState;
    overall: HealthState;
  };
  quickFacts: QuickFact[];
  advice: AdviceCard | null;
  citations: CitationEntry[];
  comparison: ComparisonPayload | null;
  surrogateSummary: SurrogateSummary | null;
};

export type PricingExecution = {
  result: GreeksResult;
  warnings: GuardWarning[];
  wasmReady: boolean;
  surrogateSummary: SurrogateSummary | null;
};
