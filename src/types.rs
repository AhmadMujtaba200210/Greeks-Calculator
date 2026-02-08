//! Common types used throughout the library

/// Option type (Call or Put)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OptionType {
    Call,
    Put,
}

/// Market data for a single option
#[derive(Debug, Clone, Copy)]
pub struct OptionData {
    pub strike: f64,
    pub time_to_maturity: f64,
    pub implied_volatility: f64,
    pub option_type: OptionType,
}

/// Greeks for an option
#[derive(Debug, Clone, Copy, Default)]
pub struct Greeks {
    /// Option price
    pub price: f64,
    /// Delta: ∂V/∂S (sensitivity to underlying price)
    pub delta: f64,
    /// Gamma: ∂²V/∂S² (rate of change of delta)
    pub gamma: f64,
    /// Vega: ∂V/∂σ (sensitivity to volatility)
    pub vega: f64,
    /// Theta: ∂V/∂t (time decay)
    pub theta: f64,
    /// Rho: ∂V/∂r (sensitivity to interest rate)
    pub rho: f64,
}

impl Greeks {
    pub fn new(price: f64, delta: f64, gamma: f64, vega: f64, theta: f64, rho: f64) -> Self {
        Self {
            price,
            delta,
            gamma,
            vega,
            theta,
            rho,
        }
    }
}
