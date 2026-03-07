//! Options pricing module

pub mod black_scholes;
pub mod binomial;
pub mod monte_carlo;

pub use black_scholes::{BlackScholesParams, calculate_greeks};
// Export specific calculators for the WASM bridge
pub use binomial::calculate_greeks as binomial_greeks;
pub use monte_carlo::calculate_greeks as mc_greeks;
