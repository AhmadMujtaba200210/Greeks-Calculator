//! Options pricing module

pub mod black_scholes;

pub use black_scholes::{BlackScholesParams, calculate_greeks};
