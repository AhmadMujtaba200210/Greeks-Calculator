use greeks_calculator::pricing::{
    calculate_greeks, binomial_greeks, binomial_greeks_with_config, mc_greeks, mc_greeks_with_diagnostics,
    BinomialConfig, BinomialMethod, BlackScholesParams, ExerciseStyle, MonteCarloConfig,
};
use greeks_calculator::types::OptionType;
use approx::assert_relative_eq;
use serde::Deserialize;

// Hull, Options, Futures, and Other Derivatives, 8th Ed.
// Example 14.1 (pg 308) - Black-Scholes Call
#[test]
fn text_book_hull_black_scholes() {
    // S0 = 42, K = 40, r = 0.10, sigma = 0.20, T = 0.5 (6 months)
    let params = BlackScholesParams::new(42.0, 40.0, 0.5, 0.20, 0.10, 0.0);
    
    let call_greeks = calculate_greeks(&params, OptionType::Call);
    let put_greeks = calculate_greeks(&params, OptionType::Put);

    // D1 should be ~ 0.7693
    // D2 should be ~ 0.6278
    // Call Price should be ~ 4.76
    assert_relative_eq!(call_greeks.price, 4.759, epsilon = 0.005);
    
    // Put Price should be ~ 0.81
    assert_relative_eq!(put_greeks.price, 0.808, epsilon = 0.005);
}

// Model-to-Model consistency: Binomial converges to Black-Scholes
#[test]
fn binomial_converges_to_black_scholes() {
    let params = BlackScholesParams::new(100.0, 100.0, 1.0, 0.20, 0.05, 0.01);
    
    let exact_bs = calculate_greeks(&params, OptionType::Call);
    
    // Low step count = less accurate
    let crr_50 = binomial_greeks(&params, OptionType::Call, 50);
    let error_50 = (exact_bs.price - crr_50.price).abs();

    // High step count = more accurate
    let crr_500 = binomial_greeks(&params, OptionType::Call, 500);
    let error_500 = (exact_bs.price - crr_500.price).abs();

    assert!(error_500 < error_50, "500 steps should be more accurate than 50 steps via convergence");
    assert!(error_500 < 0.05, "500 steps should be within 5 cents of BS exact price");
}

// Model-to-Model consistency: Monte Carlo converges to Black-Scholes
#[test]
fn monte_carlo_converges_to_black_scholes() {
    let params = BlackScholesParams::new(100.0, 105.0, 0.5, 0.30, 0.04, 0.0);
    
    let exact_bs = calculate_greeks(&params, OptionType::Put);
    
    let mc_price = mc_greeks(&params, OptionType::Put, 100_000).price;
    
    let error = (exact_bs.price - mc_price).abs();

    // Law of large numbers guarantees convergence 
    assert!(error < 0.1, "100k paths should be within 10 cents for an OTM put");
}

#[derive(Deserialize)]
struct BenchmarkFile {
    cases: Vec<BenchmarkCase>,
}

#[derive(Deserialize)]
struct BenchmarkCase {
    id: String,
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

#[test]
fn benchmark_cases_match_black_scholes_conventions() {
    let benchmarks: BenchmarkFile = serde_json::from_str(include_str!("../benchmarks.json")).expect("valid benchmark json");
    let selected = ["STD_01", "STD_02", "STD_07", "STD_08"];

    for case in benchmarks.cases.iter().filter(|entry| selected.contains(&entry.id.as_str())) {
        let params = BlackScholesParams::new(
            case.params.spot,
            case.params.strike,
            case.params.maturity,
            case.params.sigma,
            case.params.rate,
            case.params.dividend,
        );
        let actual = calculate_greeks(&params, if case.is_call { OptionType::Call } else { OptionType::Put });

        assert!(
            (actual.price - case.expected.price).abs() <= case.tolerance.price,
            "{} price drifted beyond tolerance",
            case.id
        );
        assert!((actual.delta - case.expected.delta).abs() <= case.tolerance.greeks, "{} delta drifted", case.id);
        assert!((actual.gamma - case.expected.gamma).abs() <= case.tolerance.greeks, "{} gamma drifted", case.id);
        assert!((actual.vega - case.expected.vega).abs() <= case.tolerance.greeks, "{} vega drifted", case.id);
        assert!((actual.theta - case.expected.theta).abs() <= case.tolerance.greeks, "{} theta drifted", case.id);
        assert!((actual.rho - case.expected.rho).abs() <= case.tolerance.greeks, "{} rho drifted", case.id);
    }
}

#[test]
fn leisen_reimer_is_at_least_as_good_as_crr_on_standard_grid() {
    let scenarios = [
        BlackScholesParams::new(100.0, 100.0, 1.0, 0.2, 0.05, 0.0),
        BlackScholesParams::new(95.0, 100.0, 0.5, 0.35, 0.03, 0.0),
        BlackScholesParams::new(110.0, 100.0, 1.5, 0.18, 0.04, 0.01),
    ];

    for params in scenarios {
        let bs = calculate_greeks(&params, OptionType::Call);
        let crr = binomial_greeks_with_config(
            &params,
            OptionType::Call,
            BinomialConfig::new(101, BinomialMethod::Crr, ExerciseStyle::European),
        );
        let lr = binomial_greeks_with_config(
            &params,
            OptionType::Call,
            BinomialConfig::new(101, BinomialMethod::LeisenReimer, ExerciseStyle::European),
        );

        assert!(
            (lr.price - bs.price).abs() <= (crr.price - bs.price).abs() + 1e-8,
            "LR should not underperform CRR materially on {:?}",
            params
        );
    }
}

#[test]
fn monte_carlo_confidence_interval_covers_black_scholes_reference() {
    let params = BlackScholesParams::new(100.0, 100.0, 1.0, 0.2, 0.05, 0.0);
    let bs = calculate_greeks(&params, OptionType::Call);
    let (_mc, diagnostics) = mc_greeks_with_diagnostics(&params, OptionType::Call, MonteCarloConfig::new(50_000));

    assert!(diagnostics.standard_error > 0.0);
    assert!(diagnostics.ci95_low <= bs.price);
    assert!(diagnostics.ci95_high >= bs.price);
}
