//! High-Performance Options Greeks Calculator
//!
//! A low-latency engine for calculating option Greeks with real-time volatility surface construction.
//! 
//! # Features
//! - Custom automatic differentiation engine using dual numbers
//! - SVI volatility surface parameterization with arbitrage-free constraints
//! - Black-Scholes pricing with exact Greeks via AD
//! - Optimized for sub-millisecond performance
//!
//! # Example
//! ```
//! use greeks_calculator::pricing::{BlackScholesParams, calculate_greeks};
//! use greeks_calculator::types::OptionType;
//!
//! let params = BlackScholesParams::new(
//!     100.0,  // spot price
//!     100.0,  // strike price
//!     1.0,    // time to maturity (years)
//!     0.2,    // volatility (20%)
//!     0.05,   // risk-free rate (5%)
//!     0.0,    // dividend yield
//! );
//!
//! let greeks = calculate_greeks(&params, OptionType::Call);
//! println!("Price: {:.4}, Delta: {:.4}, Gamma: {:.4}", 
//!          greeks.price, greeks.delta, greeks.gamma);
//! ```

pub mod ad;
pub mod pricing;
pub mod types;
pub mod volatility;
pub mod wasm;

pub use types::{Greeks, OptionData, OptionType};
pub use pricing::{BlackScholesParams, calculate_greeks};
pub use volatility::{SVIParams, VolatilitySurface};
