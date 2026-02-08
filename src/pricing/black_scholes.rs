//! Black-Scholes option pricing with automatic differentiation for Greeks

use crate::ad::{norm_cdf, Dual};
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

/// Calculate d1 parameter for Black-Scholes
#[inline]
fn d1(s: Dual, k: f64, t: f64, sigma: Dual, r: f64, q: f64) -> Dual {
    let numerator = (s / k).ln() + Dual::constant((r - q + 0.5 * sigma.value * sigma.value) * t);
    let denominator = sigma * Dual::constant(t.sqrt());
    numerator / denominator
}

/// Calculate d2 parameter for Black-Scholes
#[inline]
fn d2(d1: Dual, sigma: Dual, t: f64) -> Dual {
    d1 - sigma * Dual::constant(t.sqrt())
}

/// Price a European call option using Black-Scholes
#[inline]
fn call_price(s: Dual, k: f64, t: f64, sigma: Dual, r: f64, q: f64) -> Dual {
    let d1_val = d1(s, k, t, sigma, r, q);
    let d2_val = d2(d1_val, sigma, t);
    
    let discount_factor = Dual::constant((-r * t).exp());
    let forward_discount = Dual::constant((-q * t).exp());
    
    s * forward_discount * norm_cdf(d1_val) - Dual::constant(k) * discount_factor * norm_cdf(d2_val)
}

/// Price a European put option using Black-Scholes
#[inline]
fn put_price(s: Dual, k: f64, t: f64, sigma: Dual, r: f64, q: f64) -> Dual {
    let d1_val = d1(s, k, t, sigma, r, q);
    let d2_val = d2(d1_val, sigma, t);
    
    let discount_factor = Dual::constant((-r * t).exp());
    let forward_discount = Dual::constant((-q * t).exp());
    
    Dual::constant(k) * discount_factor * norm_cdf(-d2_val) - s * forward_discount * norm_cdf(-d1_val)
}

/// Calculate option price and all Greeks using automatic differentiation
pub fn calculate_greeks(params: &BlackScholesParams, option_type: OptionType) -> Greeks {
    let BlackScholesParams {
        spot,
        strike,
        time_to_maturity,
        volatility,
        risk_free_rate,
        dividend_yield,
    } = *params;

    // Calculate Delta: derivative with respect to spot
    let s_dual = Dual::variable(spot);
    let sigma_const = Dual::constant(volatility);
    let price_for_delta = match option_type {
        OptionType::Call => call_price(s_dual, strike, time_to_maturity, sigma_const, risk_free_rate, dividend_yield),
        OptionType::Put => put_price(s_dual, strike, time_to_maturity, sigma_const, risk_free_rate, dividend_yield),
    };
    let price = price_for_delta.value;
    let delta = price_for_delta.deriv;

    // Calculate Gamma: second derivative with respect to spot using finite difference
    let ds = 0.01; // Small bump for finite difference
    let s_up = Dual::variable(spot + ds);
    let s_down = Dual::variable(spot - ds);
    
    let delta_up = match option_type {
        OptionType::Call => call_price(s_up, strike, time_to_maturity, sigma_const, risk_free_rate, dividend_yield).deriv,
        OptionType::Put => put_price(s_up, strike, time_to_maturity, sigma_const, risk_free_rate, dividend_yield).deriv,
    };
    
    let delta_down = match option_type {
        OptionType::Call => call_price(s_down, strike, time_to_maturity, sigma_const, risk_free_rate, dividend_yield).deriv,
        OptionType::Put => put_price(s_down, strike, time_to_maturity, sigma_const, risk_free_rate, dividend_yield).deriv,
    };
    
    let gamma = (delta_up - delta_down) / (2.0 * ds);

    // Calculate Vega: derivative with respect to volatility
    let s_const = Dual::constant(spot);
    let sigma_dual = Dual::variable(volatility);
    let price_for_vega = match option_type {
        OptionType::Call => call_price(s_const, strike, time_to_maturity, sigma_dual, risk_free_rate, dividend_yield),
        OptionType::Put => put_price(s_const, strike, time_to_maturity, sigma_dual, risk_free_rate, dividend_yield),
    };
    let vega = price_for_vega.deriv;

    // Calculate Theta: derivative with respect to time (negative for time decay)
    let theta = calculate_theta(params, option_type);

    // Calculate Rho: derivative with respect to risk-free rate
    let rho = calculate_rho(params, option_type);

    Greeks::new(price, delta, gamma, vega, theta, rho)
}

/// Calculate Theta using finite difference (small time step)
fn calculate_theta(params: &BlackScholesParams, option_type: OptionType) -> f64 {
    let dt = 1.0 / 365.0; // One day
    
    let price_now = match option_type {
        OptionType::Call => call_price(
            Dual::constant(params.spot),
            params.strike,
            params.time_to_maturity,
            Dual::constant(params.volatility),
            params.risk_free_rate,
            params.dividend_yield,
        ).value,
        OptionType::Put => put_price(
            Dual::constant(params.spot),
            params.strike,
            params.time_to_maturity,
            Dual::constant(params.volatility),
            params.risk_free_rate,
            params.dividend_yield,
        ).value,
    };
    
    let price_later = match option_type {
        OptionType::Call => call_price(
            Dual::constant(params.spot),
            params.strike,
            params.time_to_maturity - dt,
            Dual::constant(params.volatility),
            params.risk_free_rate,
            params.dividend_yield,
        ).value,
        OptionType::Put => put_price(
            Dual::constant(params.spot),
            params.strike,
            params.time_to_maturity - dt,
            Dual::constant(params.volatility),
            params.risk_free_rate,
            params.dividend_yield,
        ).value,
    };
    
    (price_later - price_now) / dt
}

/// Calculate Rho using finite difference (small rate change)
fn calculate_rho(params: &BlackScholesParams, option_type: OptionType) -> f64 {
    let dr = 0.0001; // 1 basis point
    
    let price_base = match option_type {
        OptionType::Call => call_price(
            Dual::constant(params.spot),
            params.strike,
            params.time_to_maturity,
            Dual::constant(params.volatility),
            params.risk_free_rate,
            params.dividend_yield,
        ).value,
        OptionType::Put => put_price(
            Dual::constant(params.spot),
            params.strike,
            params.time_to_maturity,
            Dual::constant(params.volatility),
            params.risk_free_rate,
            params.dividend_yield,
        ).value,
    };
    
    let price_bumped = match option_type {
        OptionType::Call => call_price(
            Dual::constant(params.spot),
            params.strike,
            params.time_to_maturity,
            Dual::constant(params.volatility),
            params.risk_free_rate + dr,
            params.dividend_yield,
        ).value,
        OptionType::Put => put_price(
            Dual::constant(params.spot),
            params.strike,
            params.time_to_maturity,
            Dual::constant(params.volatility),
            params.risk_free_rate + dr,
            params.dividend_yield,
        ).value,
    };
    
    (price_bumped - price_base) / dr
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_call_option_atm() {
        let params = BlackScholesParams::new(
            100.0, // spot
            100.0, // strike (ATM)
            1.0,   // 1 year
            0.2,   // 20% vol
            0.05,  // 5% risk-free rate
            0.0,   // no dividend
        );

        let greeks = calculate_greeks(&params, OptionType::Call);
        
        // ATM call should have delta around 0.5
        assert!(greeks.delta > 0.4 && greeks.delta < 0.6);
        
        // Gamma should be positive
        assert!(greeks.gamma > 0.0);
        
        // Vega should be positive
        assert!(greeks.vega > 0.0);
        
        // Price should be positive
        assert!(greeks.price > 0.0);
    }

    #[test]
    fn test_put_call_parity() {
        let params = BlackScholesParams::new(
            100.0, 100.0, 1.0, 0.2, 0.05, 0.0
        );

        let call_greeks = calculate_greeks(&params, OptionType::Call);
        let put_greeks = calculate_greeks(&params, OptionType::Put);
        
        // Put-call parity: C - P = S - K * exp(-rT)
        let parity_lhs = call_greeks.price - put_greeks.price;
        let parity_rhs = params.spot - params.strike * (-params.risk_free_rate * params.time_to_maturity).exp();
        
        assert_relative_eq!(parity_lhs, parity_rhs, epsilon = 1e-6);
    }
}
