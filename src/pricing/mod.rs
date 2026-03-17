//! Options pricing module

pub mod black_scholes;
pub mod binomial;
pub mod monte_carlo;

pub use black_scholes::{BlackScholesParams, calculate_greeks, calculate_price};
// Export specific calculators for the WASM bridge
pub use binomial::{
    calculate_greeks as binomial_greeks, calculate_greeks_with_config as binomial_greeks_with_config,
    calculate_price_with_config as binomial_price_with_config, BinomialConfig, BinomialMethod,
    ExerciseStyle,
};
pub use monte_carlo::{
    calculate_greeks as mc_greeks, calculate_greeks_with_diagnostics as mc_greeks_with_diagnostics,
    MonteCarloConfig, MonteCarloDiagnostics,
};
