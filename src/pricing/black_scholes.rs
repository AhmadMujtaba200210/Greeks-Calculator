//! Black-Scholes-Merton pricing with normalized Greek conventions.

use crate::ad::{norm_cdf, norm_pdf, Dual};
use crate::types::{Greeks, OptionType};

/// Black-Scholes pricing parameters
#[derive(Debug, Clone, Copy)]
pub struct BlackScholesParams {
    pub spot: f64,
    pub strike: f64,
    pub time_to_maturity: f64,
    pub volatility: f64,
    pub risk_free_rate: f64,
    pub dividend_yield: f64,
}

impl BlackScholesParams {
    pub fn new(
        spot: f64,
        strike: f64,
        time_to_maturity: f64,
        volatility: f64,
        risk_free_rate: f64,
        dividend_yield: f64,
    ) -> Self {
        Self {
            spot,
            strike,
            time_to_maturity,
            volatility,
            risk_free_rate,
            dividend_yield,
        }
    }
}

#[inline]
pub fn norm_cdf_f64(x: f64) -> f64 {
    norm_cdf(Dual::constant(x)).value
}

#[inline]
pub fn norm_pdf_f64(x: f64) -> f64 {
    norm_pdf(Dual::constant(x)).value
}

#[inline]
pub fn calculate_d1_d2(params: &BlackScholesParams) -> Option<(f64, f64)> {
    if params.time_to_maturity <= 0.0 || params.volatility <= 0.0 || params.spot <= 0.0 || params.strike <= 0.0 {
        return None;
    }

    let sqrt_t = params.time_to_maturity.sqrt();
    let variance = params.volatility * params.volatility;
    let d1 = ((params.spot / params.strike).ln()
        + (params.risk_free_rate - params.dividend_yield + 0.5 * variance) * params.time_to_maturity)
        / (params.volatility * sqrt_t);
    let d2 = d1 - params.volatility * sqrt_t;
    Some((d1, d2))
}

#[inline]
fn intrinsic_forward_price(params: &BlackScholesParams, option_type: OptionType) -> (f64, f64) {
    let t = params.time_to_maturity.max(0.0);
    let discount = (-params.risk_free_rate * t).exp();
    let carry = (-params.dividend_yield * t).exp();
    let forward_intrinsic = params.spot * carry - params.strike * discount;
    let price = match option_type {
        OptionType::Call => forward_intrinsic.max(0.0),
        OptionType::Put => (-forward_intrinsic).max(0.0),
    };
    (price, forward_intrinsic)
}

pub fn calculate_price(params: &BlackScholesParams, option_type: OptionType) -> f64 {
    if let Some((d1, d2)) = calculate_d1_d2(params) {
        let discount = (-params.risk_free_rate * params.time_to_maturity).exp();
        let carry = (-params.dividend_yield * params.time_to_maturity).exp();
        return match option_type {
            OptionType::Call => {
                params.spot * carry * norm_cdf_f64(d1) - params.strike * discount * norm_cdf_f64(d2)
            }
            OptionType::Put => {
                params.strike * discount * norm_cdf_f64(-d2) - params.spot * carry * norm_cdf_f64(-d1)
            }
        };
    }

    intrinsic_forward_price(params, option_type).0
}

/// Calculate option price and all Greeks using the desk conventions:
/// - theta: per day
/// - vega: per 1 percentage-point vol move
/// - rho: per 1 percentage-point rate move
pub fn calculate_greeks(params: &BlackScholesParams, option_type: OptionType) -> Greeks {
    if let Some((d1, d2)) = calculate_d1_d2(params) {
        let discount = (-params.risk_free_rate * params.time_to_maturity).exp();
        let carry = (-params.dividend_yield * params.time_to_maturity).exp();
        let sqrt_t = params.time_to_maturity.sqrt();
        let pdf_d1 = norm_pdf_f64(d1);
        let cdf_d1 = norm_cdf_f64(d1);
        let cdf_d2 = norm_cdf_f64(d2);

        let price = calculate_price(params, option_type);
        let delta = match option_type {
            OptionType::Call => carry * cdf_d1,
            OptionType::Put => carry * (cdf_d1 - 1.0),
        };
        let gamma = (carry * pdf_d1) / (params.spot * params.volatility * sqrt_t);
        let vega = (params.spot * carry * sqrt_t * pdf_d1) / 100.0;

        let theta_annual = match option_type {
            OptionType::Call => {
                -(params.spot * carry * pdf_d1 * params.volatility) / (2.0 * sqrt_t)
                    - params.risk_free_rate * params.strike * discount * cdf_d2
                    + params.dividend_yield * params.spot * carry * cdf_d1
            }
            OptionType::Put => {
                -(params.spot * carry * pdf_d1 * params.volatility) / (2.0 * sqrt_t)
                    + params.risk_free_rate * params.strike * discount * norm_cdf_f64(-d2)
                    - params.dividend_yield * params.spot * carry * norm_cdf_f64(-d1)
            }
        };
        let theta = theta_annual / 365.0;

        let rho = match option_type {
            OptionType::Call => (params.strike * params.time_to_maturity * discount * cdf_d2) / 100.0,
            OptionType::Put => {
                -(params.strike * params.time_to_maturity * discount * norm_cdf_f64(-d2)) / 100.0
            }
        };

        return Greeks::new(price, delta, gamma, vega, theta, rho);
    }

    let (price, forward_intrinsic) = intrinsic_forward_price(params, option_type);
    let carry = (-params.dividend_yield * params.time_to_maturity.max(0.0)).exp();
    let delta = match option_type {
        OptionType::Call => {
            if forward_intrinsic > 0.0 {
                carry
            } else {
                0.0
            }
        }
        OptionType::Put => {
            if forward_intrinsic < 0.0 {
                -carry
            } else {
                0.0
            }
        }
    };

    Greeks::new(price, delta, 0.0, 0.0, 0.0, 0.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_call_option_atm() {
        let params = BlackScholesParams::new(100.0, 100.0, 1.0, 0.2, 0.05, 0.0);
        let greeks = calculate_greeks(&params, OptionType::Call);

        assert_relative_eq!(greeks.price, 10.4506, epsilon = 0.01);
        assert_relative_eq!(greeks.delta, 0.6368, epsilon = 0.01);
        assert_relative_eq!(greeks.gamma, 0.0188, epsilon = 0.001);
        assert_relative_eq!(greeks.vega, 0.3752, epsilon = 0.01);
        assert_relative_eq!(greeks.theta, -0.0176, epsilon = 0.001);
        assert_relative_eq!(greeks.rho, 0.5323, epsilon = 0.01);
    }

    #[test]
    fn test_put_call_parity() {
        let params = BlackScholesParams::new(100.0, 100.0, 1.0, 0.2, 0.05, 0.0);
        let call = calculate_greeks(&params, OptionType::Call);
        let put = calculate_greeks(&params, OptionType::Put);
        let parity_rhs = params.spot - params.strike * (-params.risk_free_rate * params.time_to_maturity).exp();
        assert_relative_eq!(call.price - put.price, parity_rhs, epsilon = 1e-4);
    }

    #[test]
    fn test_zero_vol_forward_intrinsic() {
        let params = BlackScholesParams::new(105.0, 100.0, 0.5, 0.0, 0.03, 0.01);
        let call = calculate_greeks(&params, OptionType::Call);
        assert!(call.price >= 0.0);
        assert!(call.gamma.abs() < 1e-12);
        assert!(call.vega.abs() < 1e-12);
    }
}
