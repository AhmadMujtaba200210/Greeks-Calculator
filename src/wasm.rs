use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use crate::pricing::{
    calculate_greeks, calculate_price, binomial_greeks, binomial_greeks_with_config,
    binomial_price_with_config, mc_greeks, mc_greeks_with_diagnostics, BinomialConfig,
    BinomialMethod, BlackScholesParams, ExerciseStyle, MonteCarloConfig,
};
use crate::types::{Greeks, OptionType};
use crate::volatility::{SVIParams, VolatilitySurface};

#[derive(Serialize, Deserialize, Clone)]
pub struct WasmGreeks {
    pub price: f64,
    pub delta: f64,
    pub gamma: f64,
    pub vega: f64,
    pub theta: f64,
    pub rho: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GreekUnits {
    pub price: String,
    pub delta: String,
    pub gamma: String,
    pub vega: String,
    pub theta: String,
    pub rho: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PricingWarning {
    pub severity: String,
    pub code: String,
    pub message: String,
    pub technical: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct EngineMetadata {
    pub model: String,
    pub method: String,
    pub exercise_style: String,
    pub assumption_set: String,
    pub steps: Option<usize>,
    pub paths: Option<usize>,
    pub estimator: Option<String>,
    pub latency_ms: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ModelDiagnostics {
    pub standard_error: Option<f64>,
    pub ci95: Option<[f64; 2]>,
    pub benchmark_status: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct MetricError {
    pub absolute: f64,
    pub relative: f64,
    pub status: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ReferenceComparison {
    pub reference_model: String,
    pub price_error_pct: Option<f64>,
    pub greek_errors: BTreeMap<String, MetricError>,
    pub status: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PricingEnvelope {
    pub result: WasmGreeks,
    pub units: GreekUnits,
    pub warnings: Vec<PricingWarning>,
    pub diagnostics: ModelDiagnostics,
    pub reference_comparison: Option<ReferenceComparison>,
    pub engine_metadata: EngineMetadata,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ModelQuotePayload {
    pub result: WasmGreeks,
    pub model: String,
    pub method: String,
    pub exercise_style: String,
    pub assumption_set: String,
    pub steps: u32,
    pub paths: u32,
    pub estimator: String,
    pub latency_ms: f64,
    pub standard_error: f64,
    pub ci95_low: f64,
    pub ci95_high: f64,
    pub has_ci: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ComparisonReference {
    pub model: String,
    pub price: f64,
    pub delta: f64,
    pub gamma: f64,
    pub vega: f64,
    pub theta: f64,
    pub rho: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ComparisonModel {
    pub name: String,
    pub result: WasmGreeks,
    pub errors: BTreeMap<String, MetricError>,
    pub overall_status: String,
    pub diagnostics: ModelDiagnostics,
    pub engine_metadata: EngineMetadata,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ComparisonPayload {
    pub reference: ComparisonReference,
    pub models: Vec<ComparisonModel>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BinomialConvergencePoint {
    pub steps: usize,
    pub crr_price: f64,
    pub leisen_reimer_price: f64,
    pub crr_error: f64,
    pub leisen_reimer_error: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct MonteCarloConvergencePoint {
    pub paths: usize,
    pub mean_price: f64,
    pub estimated_se: f64,
    pub ci95: [f64; 2],
    pub abs_error: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ConvergencePayload {
    pub model: String,
    pub reference_price: f64,
    pub binomial: Vec<BinomialConvergencePoint>,
    pub monte_carlo: Vec<MonteCarloConvergencePoint>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SurfaceSlicePayload {
    pub label: String,
    pub strikes: Vec<f64>,
    pub vols: Vec<f64>,
    pub is_arbitrage_free: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SurfaceGridPayload {
    pub label: String,
    pub x: Vec<f64>,
    pub y: Vec<f64>,
    pub z: Vec<Vec<f64>>,
    pub is_arbitrage_free: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BenchmarkModelSummary {
    pub pass: u32,
    pub warning: u32,
    pub fail: u32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BenchmarkCaseResult {
    pub case_id: String,
    pub description: String,
    pub models: BTreeMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BenchmarkReport {
    pub total_cases: usize,
    pub results: Vec<BenchmarkCaseResult>,
    pub summary: BTreeMap<String, BenchmarkModelSummary>,
}

#[derive(Debug, Clone, Copy)]
enum PlaygroundModel {
    BlackScholes,
    Binomial,
    MonteCarlo,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Purpose {
    Display,
    Chart,
}

#[derive(Deserialize)]
struct BenchmarkEnvelope {
    cases: Vec<BenchmarkCase>,
}

#[derive(Deserialize)]
struct BenchmarkCase {
    id: String,
    description: String,
    params: BenchmarkParams,
    #[serde(rename = "isCall")]
    is_call: bool,
    expected: BenchmarkExpected,
    tolerance: BenchmarkTolerance,
}

#[derive(Deserialize)]
struct BenchmarkParams {
    #[serde(rename = "S")]
    spot: f64,
    #[serde(rename = "K")]
    strike: f64,
    #[serde(rename = "T")]
    maturity: f64,
    #[serde(rename = "r")]
    rate: f64,
    #[serde(rename = "q")]
    dividend: f64,
    sigma: f64,
}

#[derive(Deserialize)]
struct BenchmarkExpected {
    price: f64,
    delta: f64,
    gamma: f64,
    vega: f64,
    theta: f64,
    rho: f64,
}

#[derive(Deserialize)]
struct BenchmarkTolerance {
    price: f64,
    greeks: f64,
}

fn units() -> GreekUnits {
    GreekUnits {
        price: "USD premium".to_string(),
        delta: "per $1 spot move".to_string(),
        gamma: "delta change per $1 spot move".to_string(),
        vega: "per 1% implied volatility move".to_string(),
        theta: "per day".to_string(),
        rho: "per 1% rate move".to_string(),
    }
}

fn to_wasm_greeks(greeks: Greeks) -> WasmGreeks {
    WasmGreeks {
        price: greeks.price,
        delta: greeks.delta,
        gamma: greeks.gamma,
        vega: greeks.vega,
        theta: greeks.theta,
        rho: greeks.rho,
    }
}

fn to_option_type(is_call: bool) -> OptionType {
    if is_call {
        OptionType::Call
    } else {
        OptionType::Put
    }
}

fn parse_model_key(model_key: &str) -> PlaygroundModel {
    match model_key {
        "binomial" => PlaygroundModel::Binomial,
        "monte_carlo" => PlaygroundModel::MonteCarlo,
        _ => PlaygroundModel::BlackScholes,
    }
}

fn parse_purpose(purpose: &str) -> Purpose {
    if purpose == "chart" {
        Purpose::Chart
    } else {
        Purpose::Display
    }
}

fn metric_error(actual: f64, reference: f64) -> MetricError {
    let absolute = (actual - reference).abs();
    let divisor = reference.abs().max(1e-4);
    let relative = absolute / divisor;
    let status = if absolute < 1e-4 || relative < 0.001 {
        "pass"
    } else if relative < 0.01 {
        "warn"
    } else {
        "fail"
    };
    MetricError {
        absolute,
        relative,
        status: status.to_string(),
    }
}

fn push_warning(
    warnings: &mut Vec<PricingWarning>,
    severity: &str,
    code: &str,
    message: &str,
    technical: impl Into<Option<String>>,
) {
    warnings.push(PricingWarning {
        severity: severity.to_string(),
        code: code.to_string(),
        message: message.to_string(),
        technical: technical.into(),
    });
}

fn build_pricing_warnings(
    params: &BlackScholesParams,
    model: PlaygroundModel,
    diagnostics: &ModelDiagnostics,
) -> Vec<PricingWarning> {
    let mut warnings = Vec::new();

    if params.time_to_maturity <= 1.0 / 365.0 {
        push_warning(
            &mut warnings,
            "warning",
            "NEAR_EXPIRY",
            "Expiry is within one day. Greeks can move discontinuously.",
            Some(format!("T={:.6} years", params.time_to_maturity)),
        );
    }

    if params.volatility < 0.01 {
        push_warning(
            &mut warnings,
            "warning",
            "LOW_VOL",
            "Volatility is close to zero, so time value and Vega compress sharply.",
            Some(format!("sigma={:.4}", params.volatility)),
        );
    }

    if params.risk_free_rate < 0.0 {
        push_warning(
            &mut warnings,
            "info",
            "NEGATIVE_RATE",
            "Negative rates are supported, but lattice convergence can slow in stressed regimes.",
            Some(format!("r={:.4}", params.risk_free_rate)),
        );
    }

    if matches!(model, PlaygroundModel::MonteCarlo) {
        push_warning(
            &mut warnings,
            "info",
            "SIMULATION_ESTIMATE",
            "Monte Carlo prices are statistical estimates under geometric Brownian motion.",
            Some("Read the confidence interval before comparing it to analytical models.".to_string()),
        );

        if diagnostics.standard_error.unwrap_or(0.0) > 0.05 {
            push_warning(
                &mut warnings,
                "warning",
                "WIDE_CI",
                "The Monte Carlo confidence interval is still wide for this parameter set.",
                diagnostics
                    .ci95
                    .map(|interval| format!("95% CI [{:.4}, {:.4}]", interval[0], interval[1])),
            );
        }
    }

    warnings
}

fn build_reference_comparison(model: PlaygroundModel, result: Greeks, reference: Greeks) -> Option<ReferenceComparison> {
    if matches!(model, PlaygroundModel::BlackScholes) {
        return None;
    }

    let mut greek_errors = BTreeMap::new();
    let price_error = metric_error(result.price, reference.price);
    greek_errors.insert("delta".to_string(), metric_error(result.delta, reference.delta));
    greek_errors.insert("gamma".to_string(), metric_error(result.gamma, reference.gamma));
    greek_errors.insert("vega".to_string(), metric_error(result.vega, reference.vega));
    greek_errors.insert("theta".to_string(), metric_error(result.theta, reference.theta));
    greek_errors.insert("rho".to_string(), metric_error(result.rho, reference.rho));

    let mut status = price_error.status.clone();
    if greek_errors.values().any(|entry| entry.status == "fail") || status == "fail" {
        status = "fail".to_string();
    } else if greek_errors.values().any(|entry| entry.status == "warn") || status == "warn" {
        status = "warn".to_string();
    }

    Some(ReferenceComparison {
        reference_model: "Black-Scholes".to_string(),
        price_error_pct: Some(price_error.relative * 100.0),
        greek_errors,
        status,
    })
}

fn default_binomial_config(purpose: Purpose) -> BinomialConfig {
    match purpose {
        Purpose::Chart => BinomialConfig::chart_default(),
        Purpose::Display => BinomialConfig::trader_default(),
    }
}

fn default_mc_config(purpose: Purpose) -> MonteCarloConfig {
    match purpose {
        Purpose::Chart => MonteCarloConfig::chart_default(),
        Purpose::Display => MonteCarloConfig::trader_default(),
    }
}

fn execute_model(
    params: &BlackScholesParams,
    option_type: OptionType,
    model: PlaygroundModel,
    purpose: Purpose,
) -> (Greeks, EngineMetadata, ModelDiagnostics) {
    let start_ms = now_millis();
    let elapsed_ms = || (now_millis() - start_ms).max(0.0);

    match model {
        PlaygroundModel::BlackScholes => {
            let result = calculate_greeks(params, option_type);
            let metadata = EngineMetadata {
                model: "Black-Scholes".to_string(),
                method: "Closed-form".to_string(),
                exercise_style: "European".to_string(),
                assumption_set: "European vanilla under Black-Scholes-Merton assumptions".to_string(),
                steps: None,
                paths: None,
                estimator: Some("Analytical".to_string()),
                latency_ms: elapsed_ms(),
            };
            let diagnostics = ModelDiagnostics {
                standard_error: None,
                ci95: None,
                benchmark_status: "pass".to_string(),
            };
            (result, metadata, diagnostics)
        }
        PlaygroundModel::Binomial => {
            let config = default_binomial_config(purpose);
            let result = binomial_greeks_with_config(params, option_type, config);
            let metadata = EngineMetadata {
                model: "Binomial".to_string(),
                method: match config.method {
                    BinomialMethod::Crr => "CRR".to_string(),
                    BinomialMethod::LeisenReimer => "Leisen-Reimer".to_string(),
                },
                exercise_style: "European".to_string(),
                assumption_set: "European vanilla lattice approximation".to_string(),
                steps: Some(config.steps),
                paths: None,
                estimator: Some("Repricing with central-difference Greeks".to_string()),
                latency_ms: elapsed_ms(),
            };
            let diagnostics = ModelDiagnostics {
                standard_error: None,
                ci95: None,
                benchmark_status: "pass".to_string(),
            };
            (result, metadata, diagnostics)
        }
        PlaygroundModel::MonteCarlo => {
            let config = default_mc_config(purpose);
            let (result, mc_diagnostics) = mc_greeks_with_diagnostics(params, option_type, config);
            let metadata = EngineMetadata {
                model: "Monte Carlo".to_string(),
                method: "GBM Terminal Sampling".to_string(),
                exercise_style: "European".to_string(),
                assumption_set: "European vanilla simulation under geometric Brownian motion".to_string(),
                steps: None,
                paths: Some(config.num_paths),
                estimator: Some("Antithetic variates + terminal-stock control variate".to_string()),
                latency_ms: elapsed_ms(),
            };
            let diagnostics = ModelDiagnostics {
                standard_error: Some(mc_diagnostics.standard_error),
                ci95: Some([mc_diagnostics.ci95_low, mc_diagnostics.ci95_high]),
                benchmark_status: if mc_diagnostics.standard_error < 0.05 {
                    "pass".to_string()
                } else {
                    "warn".to_string()
                },
            };
            (result, metadata, diagnostics)
        }
    }
}

fn scenario_surface(params: &BlackScholesParams) -> VolatilitySurface {
    let mut surface = VolatilitySurface::new();
    let maturities = [
        0.25_f64.max((params.time_to_maturity * 0.5).max(0.1)),
        params.time_to_maturity.max(0.25),
        (params.time_to_maturity * 1.75).max(1.0),
    ];

    for (index, maturity) in maturities.into_iter().enumerate() {
        let atm_vol = (params.volatility * (0.92 + index as f64 * 0.08)).clamp(0.05, 1.25);
        let atm_total_var = (atm_vol * atm_vol * maturity).max(1e-4);
        let rho = -0.35 + index as f64 * 0.05;
        let sigma = 0.22 + index as f64 * 0.03;
        let b = (0.08 + index as f64 * 0.015) * atm_total_var.sqrt().max(0.05);
        let a = (atm_total_var - b * sigma).max(1e-5);
        surface.add_slice(maturity, SVIParams::new(a, b, rho, 0.0, sigma));
    }

    surface
}

fn price_metric(actual: f64, expected: f64, tolerance: f64) -> String {
    let abs_error = (actual - expected).abs();
    if abs_error <= tolerance {
        "pass".to_string()
    } else if abs_error <= tolerance * 2.0 {
        "warning".to_string()
    } else {
        "fail".to_string()
    }
}

fn to_json_js<T: Serialize>(value: &T) -> JsValue {
    JsValue::from_str(&serde_json::to_string(value).unwrap())
}

#[cfg(target_arch = "wasm32")]
fn now_millis() -> f64 {
    js_sys::Date::now()
}

#[cfg(not(target_arch = "wasm32"))]
fn now_millis() -> f64 {
    0.0
}

#[wasm_bindgen]
pub fn calculate_greeks_wasm(
    spot: f64,
    strike: f64,
    maturity: f64,
    volatility: f64,
    rate: f64,
    dividend: f64,
    is_call: bool,
) -> JsValue {
    let params = BlackScholesParams::new(spot, strike, maturity, volatility, rate, dividend);
    let result = calculate_greeks(&params, to_option_type(is_call));
    serde_wasm_bindgen::to_value(&to_wasm_greeks(result)).unwrap()
}

#[wasm_bindgen]
pub fn calculate_binomial_wasm(
    spot: f64,
    strike: f64,
    maturity: f64,
    volatility: f64,
    rate: f64,
    dividend: f64,
    is_call: bool,
    steps: usize,
) -> JsValue {
    let params = BlackScholesParams::new(spot, strike, maturity, volatility, rate, dividend);
    let result = binomial_greeks(&params, to_option_type(is_call), steps);
    serde_wasm_bindgen::to_value(&to_wasm_greeks(result)).unwrap()
}

#[wasm_bindgen]
pub fn calculate_mc_wasm(
    spot: f64,
    strike: f64,
    maturity: f64,
    volatility: f64,
    rate: f64,
    dividend: f64,
    is_call: bool,
    num_paths: usize,
) -> JsValue {
    let params = BlackScholesParams::new(spot, strike, maturity, volatility, rate, dividend);
    let result = mc_greeks(&params, to_option_type(is_call), num_paths);
    serde_wasm_bindgen::to_value(&to_wasm_greeks(result)).unwrap()
}

#[wasm_bindgen]
pub fn calculate_model_quote_wasm(
    spot: f64,
    strike: f64,
    maturity: f64,
    volatility: f64,
    rate: f64,
    dividend: f64,
    is_call: bool,
    model_key: &str,
    purpose: &str,
) -> JsValue {
    let params = BlackScholesParams::new(spot, strike, maturity, volatility, rate, dividend);
    let option_type = to_option_type(is_call);
    let model = parse_model_key(model_key);
    let purpose = parse_purpose(purpose);
    let (result, metadata, diagnostics) = execute_model(&params, option_type, model, purpose);

    to_json_js(&ModelQuotePayload {
        result: to_wasm_greeks(result),
        model: metadata.model,
        method: metadata.method,
        exercise_style: metadata.exercise_style,
        assumption_set: metadata.assumption_set,
        steps: metadata.steps.unwrap_or_default() as u32,
        paths: metadata.paths.unwrap_or_default() as u32,
        estimator: metadata.estimator.unwrap_or_default(),
        latency_ms: metadata.latency_ms,
        standard_error: diagnostics.standard_error.unwrap_or(0.0),
        ci95_low: diagnostics.ci95.map(|interval| interval[0]).unwrap_or(0.0),
        ci95_high: diagnostics.ci95.map(|interval| interval[1]).unwrap_or(0.0),
        has_ci: diagnostics.ci95.is_some(),
    })
}

#[wasm_bindgen]
pub fn calculate_model_wasm(
    spot: f64,
    strike: f64,
    maturity: f64,
    volatility: f64,
    rate: f64,
    dividend: f64,
    is_call: bool,
    model_key: &str,
    purpose: &str,
) -> JsValue {
    let params = BlackScholesParams::new(spot, strike, maturity, volatility, rate, dividend);
    let option_type = to_option_type(is_call);
    let model = parse_model_key(model_key);
    let purpose = parse_purpose(purpose);
    let (result, metadata, diagnostics) = execute_model(&params, option_type, model, purpose);
    let reference = calculate_greeks(&params, option_type);
    let reference_comparison = build_reference_comparison(model, result, reference);
    let warnings = build_pricing_warnings(&params, model, &diagnostics);
    let envelope = PricingEnvelope {
        result: to_wasm_greeks(result),
        units: units(),
        diagnostics: ModelDiagnostics {
            benchmark_status: if let Some(reference_status) = reference_comparison.as_ref() {
                reference_status.status.clone()
            } else {
                diagnostics.benchmark_status.clone()
            },
            ..diagnostics
        },
        warnings,
        reference_comparison,
        engine_metadata: metadata,
    };
    to_json_js(&envelope)
}

#[wasm_bindgen]
pub fn calculate_cross_model_comparison_wasm(
    spot: f64,
    strike: f64,
    maturity: f64,
    volatility: f64,
    rate: f64,
    dividend: f64,
    is_call: bool,
    purpose: &str,
) -> JsValue {
    let params = BlackScholesParams::new(spot, strike, maturity, volatility, rate, dividend);
    let option_type = to_option_type(is_call);
    let purpose = parse_purpose(purpose);
    let reference = calculate_greeks(&params, option_type);

    let reference_payload = ComparisonReference {
        model: "Black-Scholes".to_string(),
        price: reference.price,
        delta: reference.delta,
        gamma: reference.gamma,
        vega: reference.vega,
        theta: reference.theta,
        rho: reference.rho,
    };

    let mut models = Vec::new();
    for model in [PlaygroundModel::Binomial, PlaygroundModel::MonteCarlo] {
        let (result, metadata, diagnostics) = execute_model(&params, option_type, model, purpose);
        let errors = BTreeMap::from([
            ("price".to_string(), metric_error(result.price, reference.price)),
            ("delta".to_string(), metric_error(result.delta, reference.delta)),
            ("gamma".to_string(), metric_error(result.gamma, reference.gamma)),
            ("vega".to_string(), metric_error(result.vega, reference.vega)),
            ("theta".to_string(), metric_error(result.theta, reference.theta)),
            ("rho".to_string(), metric_error(result.rho, reference.rho)),
        ]);

        let overall_status = if errors.values().any(|entry| entry.status == "fail") {
            "fail".to_string()
        } else if errors.values().any(|entry| entry.status == "warn") {
            "warn".to_string()
        } else {
            "pass".to_string()
        };

        models.push(ComparisonModel {
            name: if matches!(model, PlaygroundModel::Binomial) {
                "Binomial (Leisen-Reimer)".to_string()
            } else {
                "Monte Carlo".to_string()
            },
            result: to_wasm_greeks(result),
            errors,
            overall_status,
            diagnostics,
            engine_metadata: metadata,
        });
    }

    to_json_js(&ComparisonPayload {
        reference: reference_payload,
        models,
    })
}

#[wasm_bindgen]
pub fn calculate_convergence_diagnostics_wasm(
    spot: f64,
    strike: f64,
    maturity: f64,
    volatility: f64,
    rate: f64,
    dividend: f64,
    is_call: bool,
    model_key: &str,
) -> JsValue {
    let params = BlackScholesParams::new(spot, strike, maturity, volatility, rate, dividend);
    let option_type = to_option_type(is_call);
    let reference_price = calculate_price(&params, option_type);
    let model = parse_model_key(model_key);

    let binomial = if matches!(model, PlaygroundModel::Binomial) {
        [11, 25, 51, 101, 151, 251, 401]
            .into_iter()
            .map(|steps| {
                let crr_cfg = BinomialConfig::new(steps, BinomialMethod::Crr, ExerciseStyle::European);
                let lr_cfg = BinomialConfig::new(steps, BinomialMethod::LeisenReimer, ExerciseStyle::European);
                let crr_price = binomial_price_with_config(&params, option_type, crr_cfg);
                let leisen_reimer_price = binomial_price_with_config(&params, option_type, lr_cfg);
                BinomialConvergencePoint {
                    steps,
                    crr_price,
                    leisen_reimer_price,
                    crr_error: (crr_price - reference_price).abs(),
                    leisen_reimer_error: (leisen_reimer_price - reference_price).abs(),
                }
            })
            .collect()
    } else {
        Vec::new()
    };

    let monte_carlo = if matches!(model, PlaygroundModel::MonteCarlo) {
        [500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000]
            .into_iter()
            .map(|paths| {
                let (estimate, diagnostics) =
                    mc_greeks_with_diagnostics(&params, option_type, MonteCarloConfig::new(paths));
                MonteCarloConvergencePoint {
                    paths,
                    mean_price: estimate.price,
                    estimated_se: diagnostics.standard_error,
                    ci95: [diagnostics.ci95_low, diagnostics.ci95_high],
                    abs_error: (estimate.price - reference_price).abs(),
                }
            })
            .collect()
    } else {
        Vec::new()
    };

    to_json_js(&ConvergencePayload {
        model: match model {
            PlaygroundModel::BlackScholes => "black_scholes".to_string(),
            PlaygroundModel::Binomial => "binomial".to_string(),
            PlaygroundModel::MonteCarlo => "monte_carlo".to_string(),
        },
        reference_price,
        binomial,
        monte_carlo,
    })
}

#[wasm_bindgen]
pub fn calculate_surface_slice_wasm(
    spot: f64,
    strike: f64,
    maturity: f64,
    volatility: f64,
    rate: f64,
    dividend: f64,
) -> JsValue {
    let params = BlackScholesParams::new(spot, strike, maturity, volatility, rate, dividend);
    let surface = scenario_surface(&params);
    let mut strikes = Vec::new();
    let mut vols = Vec::new();

    let start = strike * 0.7;
    let end = strike * 1.3;
    let step = (end - start) / 15.0;
    let maturity_for_slice = maturity.max(0.25);

    for index in 0..=15 {
        let k = start + index as f64 * step;
        strikes.push(k);
        vols.push(
            surface
                .get_implied_volatility(k, spot, maturity_for_slice)
                .unwrap_or(volatility)
                * 100.0,
        );
    }

    to_json_js(&SurfaceSlicePayload {
        label: "Scenario SVI slice".to_string(),
        strikes,
        vols,
        is_arbitrage_free: surface.is_arbitrage_free(),
    })
}

#[wasm_bindgen]
pub fn calculate_surface_grid_wasm(
    spot: f64,
    strike: f64,
    maturity: f64,
    volatility: f64,
    rate: f64,
    dividend: f64,
) -> JsValue {
    let params = BlackScholesParams::new(spot, strike, maturity, volatility, rate, dividend);
    let surface = scenario_surface(&params);
    let mut x = Vec::new();
    let mut y = Vec::new();
    let mut z = Vec::new();

    let spot_min = strike * 0.6;
    let spot_max = strike * 1.4;
    let time_min = 0.1;
    let time_max = maturity.max(1.25);
    let points = 18;

    for index in 0..points {
        x.push(spot_min + (spot_max - spot_min) * index as f64 / (points - 1) as f64);
    }

    for index in 0..points {
        let time = time_min + (time_max - time_min) * index as f64 / (points - 1) as f64;
        y.push(time);
        let row = x
            .iter()
            .map(|spot_point| {
                surface
                    .get_implied_volatility(strike, *spot_point, time)
                    .unwrap_or(volatility)
                    * 100.0
            })
            .collect::<Vec<_>>();
        z.push(row);
    }

    to_json_js(&SurfaceGridPayload {
        label: "Scenario SVI surface".to_string(),
        x,
        y,
        z,
        is_arbitrage_free: surface.is_arbitrage_free(),
    })
}

#[wasm_bindgen]
pub fn run_benchmark_suite_wasm(payload: JsValue) -> JsValue {
    let envelope: BenchmarkEnvelope = serde_wasm_bindgen::from_value(payload).unwrap_or(BenchmarkEnvelope { cases: vec![] });
    let mut summary = BTreeMap::from([
        (
            "black_scholes".to_string(),
            BenchmarkModelSummary {
                pass: 0,
                warning: 0,
                fail: 0,
            },
        ),
        (
            "binomial".to_string(),
            BenchmarkModelSummary {
                pass: 0,
                warning: 0,
                fail: 0,
            },
        ),
        (
            "monte_carlo".to_string(),
            BenchmarkModelSummary {
                pass: 0,
                warning: 0,
                fail: 0,
            },
        ),
    ]);

    let mut results = Vec::new();

    for case in envelope.cases {
        let params = BlackScholesParams::new(
            case.params.spot,
            case.params.strike,
            case.params.maturity,
            case.params.sigma,
            case.params.rate,
            case.params.dividend,
        );
        let option_type = to_option_type(case.is_call);
        let expected = Greeks::new(
            case.expected.price,
            case.expected.delta,
            case.expected.gamma,
            case.expected.vega,
            case.expected.theta,
            case.expected.rho,
        );

        let model_outputs = [
            ("black_scholes", calculate_greeks(&params, option_type)),
            (
                "binomial",
                binomial_greeks_with_config(&params, option_type, BinomialConfig::trader_default()),
            ),
            (
                "monte_carlo",
                mc_greeks_with_diagnostics(&params, option_type, MonteCarloConfig::new(25_000)).0,
            ),
        ];

        let mut statuses = BTreeMap::new();
        for (key, actual) in model_outputs {
            let checks = [
                price_metric(actual.price, expected.price, case.tolerance.price),
                price_metric(actual.delta, expected.delta, case.tolerance.greeks),
                price_metric(actual.gamma, expected.gamma, case.tolerance.greeks),
                price_metric(actual.vega, expected.vega, case.tolerance.greeks),
                price_metric(actual.theta, expected.theta, case.tolerance.greeks),
                price_metric(actual.rho, expected.rho, case.tolerance.greeks),
            ];
            let status = if checks.iter().any(|value| value == "fail") {
                "fail"
            } else if checks.iter().any(|value| value == "warning") {
                "warning"
            } else {
                "pass"
            };
            statuses.insert(key.to_string(), status.to_string());

            if let Some(entry) = summary.get_mut(key) {
                match status {
                    "pass" => entry.pass += 1,
                    "warning" => entry.warning += 1,
                    _ => entry.fail += 1,
                }
            }
        }

        results.push(BenchmarkCaseResult {
            case_id: case.id,
            description: case.description,
            models: statuses,
        });
    }

    to_json_js(&BenchmarkReport {
        total_cases: results.len(),
        results,
        summary,
    })
}
