use greeks_calculator::pricing::{BlackScholesParams, calculate_greeks, binomial_greeks, mc_greeks};
use greeks_calculator::types::OptionType;
use approx::assert_relative_eq;

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
