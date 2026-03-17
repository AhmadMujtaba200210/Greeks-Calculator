//! Binomial lattice pricing for European vanilla options.

use crate::pricing::black_scholes::BlackScholesParams;
use crate::types::{Greeks, OptionType};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ExerciseStyle {
    European,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BinomialMethod {
    Crr,
    LeisenReimer,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct BinomialConfig {
    pub steps: usize,
    pub method: BinomialMethod,
    pub exercise_style: ExerciseStyle,
}

impl BinomialConfig {
    pub fn new(steps: usize, method: BinomialMethod, exercise_style: ExerciseStyle) -> Self {
        Self {
            steps: steps.max(3),
            method,
            exercise_style,
        }
    }

    pub fn trader_default() -> Self {
        Self::new(251, BinomialMethod::LeisenReimer, ExerciseStyle::European)
    }

    pub fn chart_default() -> Self {
        Self::new(121, BinomialMethod::LeisenReimer, ExerciseStyle::European)
    }
}

#[derive(Debug, Clone, Copy)]
struct TreeSpec {
    steps: usize,
    up: f64,
    down: f64,
    prob_up: f64,
    discount: f64,
}

fn intrinsic(spot: f64, strike: f64, option_type: OptionType) -> f64 {
    match option_type {
        OptionType::Call => (spot - strike).max(0.0),
        OptionType::Put => (strike - spot).max(0.0),
    }
}

fn peizer_pratt_inverse(x: f64, n: usize) -> f64 {
    let n = n as f64;
    let denom = n + 1.0 / 3.0 + 0.1 / (n + 1.0);
    let exponent = -((x / denom).powi(2)) * (n + 1.0 / 6.0);
    0.5 + x.signum() * 0.5 * (1.0 - exponent.exp()).sqrt()
}

fn build_tree_spec(params: &BlackScholesParams, config: BinomialConfig) -> TreeSpec {
    let steps = match config.method {
        BinomialMethod::LeisenReimer if config.steps % 2 == 0 => config.steps + 1,
        _ => config.steps,
    }
    .max(3);

    let dt = params.time_to_maturity.max(1.0 / 365.0) / steps as f64;
    let growth = ((params.risk_free_rate - params.dividend_yield) * dt).exp();
    let discount = (-params.risk_free_rate * dt).exp();

    match config.method {
        BinomialMethod::Crr => {
            let up = (params.volatility * dt.sqrt()).exp();
            let down = 1.0 / up;
            let prob_up = ((growth - down) / (up - down)).clamp(1e-10, 1.0 - 1e-10);
            TreeSpec {
                steps,
                up,
                down,
                prob_up,
                discount,
            }
        }
        BinomialMethod::LeisenReimer => {
            let sigma = params.volatility.max(1e-6);
            let sqrt_t = params.time_to_maturity.max(1.0 / 365.0).sqrt();
            let d1 = ((params.spot / params.strike).ln()
                + (params.risk_free_rate - params.dividend_yield + 0.5 * sigma * sigma)
                    * params.time_to_maturity.max(1.0 / 365.0))
                / (sigma * sqrt_t);
            let d2 = d1 - sigma * sqrt_t;

            let p = peizer_pratt_inverse(d2, steps).clamp(1e-10, 1.0 - 1e-10);
            let p_prime = peizer_pratt_inverse(d1, steps).clamp(1e-10, 1.0 - 1e-10);
            let up = growth * (p_prime / p);
            let down = (growth - p * up) / (1.0 - p);

            TreeSpec {
                steps,
                up,
                down,
                prob_up: p,
                discount,
            }
        }
    }
}

pub fn calculate_price_with_config(
    params: &BlackScholesParams,
    option_type: OptionType,
    config: BinomialConfig,
) -> f64 {
    if params.time_to_maturity <= 0.0 || params.steps_are_invalid(config.steps) {
        return intrinsic(params.spot, params.strike, option_type);
    }

    let spec = build_tree_spec(params, config);
    let mut values = vec![0.0; spec.steps + 1];

    for i in 0..=spec.steps {
        let spot_t = params.spot * spec.up.powi((spec.steps - i) as i32) * spec.down.powi(i as i32);
        values[i] = intrinsic(spot_t, params.strike, option_type);
    }

    for step in (0..spec.steps).rev() {
        for i in 0..=step {
            let continuation =
                spec.discount * (spec.prob_up * values[i] + (1.0 - spec.prob_up) * values[i + 1]);
            values[i] = continuation;
        }
    }

    values[0]
}

pub fn calculate_greeks_with_config(
    params: &BlackScholesParams,
    option_type: OptionType,
    config: BinomialConfig,
) -> Greeks {
    let price = calculate_price_with_config(params, option_type, config);

    if params.time_to_maturity <= 0.0 {
        return Greeks::new(price, 0.0, 0.0, 0.0, 0.0, 0.0);
    }

    let ds = (params.spot * 0.01).max(0.5);
    let dv = 0.01;
    let dr = 0.0001;
    let dt = 1.0 / 365.0;

    let spot_up = BlackScholesParams::new(
        params.spot + ds,
        params.strike,
        params.time_to_maturity,
        params.volatility,
        params.risk_free_rate,
        params.dividend_yield,
    );
    let spot_down = BlackScholesParams::new(
        (params.spot - ds).max(0.01),
        params.strike,
        params.time_to_maturity,
        params.volatility,
        params.risk_free_rate,
        params.dividend_yield,
    );

    let price_up = calculate_price_with_config(&spot_up, option_type, config);
    let price_down = calculate_price_with_config(&spot_down, option_type, config);
    let delta = (price_up - price_down) / (spot_up.spot - spot_down.spot);
    let gamma = (price_up - 2.0 * price + price_down) / ds.powi(2);

    let vol_up = BlackScholesParams::new(
        params.spot,
        params.strike,
        params.time_to_maturity,
        params.volatility + dv,
        params.risk_free_rate,
        params.dividend_yield,
    );
    let vol_down = BlackScholesParams::new(
        params.spot,
        params.strike,
        params.time_to_maturity,
        (params.volatility - dv).max(0.0001),
        params.risk_free_rate,
        params.dividend_yield,
    );
    let vega = (calculate_price_with_config(&vol_up, option_type, config)
        - calculate_price_with_config(&vol_down, option_type, config))
        / (2.0 * dv)
        / 100.0;

    let theta = if params.time_to_maturity > dt {
        let sooner = BlackScholesParams::new(
            params.spot,
            params.strike,
            params.time_to_maturity - dt,
            params.volatility,
            params.risk_free_rate,
            params.dividend_yield,
        );
        calculate_price_with_config(&sooner, option_type, config) - price
    } else {
        0.0
    };

    let rate_up = BlackScholesParams::new(
        params.spot,
        params.strike,
        params.time_to_maturity,
        params.volatility,
        params.risk_free_rate + dr,
        params.dividend_yield,
    );
    let rate_down = BlackScholesParams::new(
        params.spot,
        params.strike,
        params.time_to_maturity,
        params.volatility,
        params.risk_free_rate - dr,
        params.dividend_yield,
    );
    let rho = (calculate_price_with_config(&rate_up, option_type, config)
        - calculate_price_with_config(&rate_down, option_type, config))
        / (2.0 * dr)
        / 100.0;

    Greeks::new(price, delta, gamma, vega, theta, rho)
}

/// Backward-compatible CRR wrapper used by the legacy bindings.
pub fn calculate_greeks(params: &BlackScholesParams, option_type: OptionType, steps: usize) -> Greeks {
    calculate_greeks_with_config(
        params,
        option_type,
        BinomialConfig::new(steps, BinomialMethod::Crr, ExerciseStyle::European),
    )
}

trait StepValidity {
    fn steps_are_invalid(&self, steps: usize) -> bool;
}

impl StepValidity for BlackScholesParams {
    fn steps_are_invalid(&self, steps: usize) -> bool {
        self.spot <= 0.0 || self.strike <= 0.0 || self.volatility < 0.0 || steps == 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pricing::black_scholes;

    #[test]
    fn test_binomial_call_atm() {
        let params = BlackScholesParams::new(100.0, 100.0, 1.0, 0.2, 0.05, 0.0);
        let greeks = calculate_greeks_with_config(
            &params,
            OptionType::Call,
            BinomialConfig::new(251, BinomialMethod::LeisenReimer, ExerciseStyle::European),
        );

        let bs = black_scholes::calculate_greeks(&params, OptionType::Call);
        assert!((greeks.price - bs.price).abs() < 0.03);
        assert!(greeks.delta > 0.4 && greeks.delta < 0.8);
        assert!(greeks.gamma > 0.0);
        assert!(greeks.vega > 0.0);
    }

    #[test]
    fn test_leisen_reimer_beats_crr_on_standard_case() {
        let params = BlackScholesParams::new(100.0, 100.0, 1.0, 0.2, 0.05, 0.0);
        let bs = black_scholes::calculate_greeks(&params, OptionType::Call);
        let crr = calculate_greeks_with_config(
            &params,
            OptionType::Call,
            BinomialConfig::new(101, BinomialMethod::Crr, ExerciseStyle::European),
        );
        let lr = calculate_greeks_with_config(
            &params,
            OptionType::Call,
            BinomialConfig::new(101, BinomialMethod::LeisenReimer, ExerciseStyle::European),
        );

        assert!((lr.price - bs.price).abs() <= (crr.price - bs.price).abs());
    }
}
