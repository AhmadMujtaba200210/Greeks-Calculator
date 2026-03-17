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

export type GreekUnits = {
  price: string;
  delta: string;
  gamma: string;
  vega: string;
  theta: string;
  rho: string;
};

export type ModelDiagnostics = {
  standard_error: number | null;
  ci95: [number, number] | null;
  benchmark_status: HealthState;
};

export type EngineMetadata = {
  model: string;
  method: string;
  exercise_style: string;
  assumption_set: string;
  steps: number | null;
  paths: number | null;
  estimator: string | null;
  latency_ms: number;
};

export type MetricError = {
  absolute: number;
  relative: number;
  status: HealthState;
};

export type ReferenceComparison = {
  reference_model: string;
  price_error_pct: number | null;
  greek_errors: Record<string, MetricError>;
  status: HealthState;
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

export type SurrogateLabSummary = {
  currentPriceErrorPct: number | null;
  currentDeltaErrorPct: number | null;
  meanAbsPriceErrorPct: number;
  maxAbsPriceErrorPct: number;
  sampleCount: number;
  message: string;
};

export type ComparisonModelBlock = {
  name: string;
  result: GreeksResult;
  errors: Record<string, MetricError>;
  overallStatus: HealthState;
  diagnostics: ModelDiagnostics;
  engineMetadata: EngineMetadata;
};

export type ComparisonReference = GreeksResult & { model: string };

export type ComparisonPayload = {
  reference: ComparisonReference | null;
  models: ComparisonModelBlock[];
};

export type BinomialConvergencePoint = {
  steps: number;
  crr_price: number;
  leisen_reimer_price: number;
  crr_error: number;
  leisen_reimer_error: number;
};

export type MonteCarloConvergencePoint = {
  paths: number;
  mean_price: number;
  estimated_se: number;
  ci95: [number, number];
  abs_error: number;
};

export type ConvergencePayload = {
  model: string;
  reference_price: number;
  binomial: BinomialConvergencePoint[];
  monte_carlo: MonteCarloConvergencePoint[];
};

export type SurfaceSlicePayload = {
  label: string;
  strikes: number[];
  vols: number[];
  is_arbitrage_free: boolean;
};

export type SurfaceGridPayload = {
  label: string;
  x: number[];
  y: number[];
  z: number[][];
  is_arbitrage_free: boolean;
};

export type BenchmarkReport = {
  total_cases: number;
  results: Array<{
    case_id: string;
    description: string;
    models: Record<string, "pass" | "warning" | "fail">;
  }>;
  summary: Record<string, { pass: number; warning: number; fail: number }>;
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
  units: GreekUnits;
  diagnostics: ModelDiagnostics;
  engineMetadata: EngineMetadata;
  referenceComparison: ReferenceComparison | null;
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
  surrogateLab: SurrogateLabSummary | null;
};

export type PricingExecution = {
  result: GreeksResult;
  warnings: GuardWarning[];
  units: GreekUnits;
  diagnostics: ModelDiagnostics;
  engineMetadata: EngineMetadata;
  referenceComparison: ReferenceComparison | null;
  comparison: ComparisonPayload | null;
  wasmReady: boolean;
  surrogateLab: SurrogateLabSummary | null;
};
