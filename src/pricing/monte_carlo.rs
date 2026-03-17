//! Monte Carlo pricing under geometric Brownian motion.

use crate::pricing::black_scholes::BlackScholesParams;
use crate::types::{Greeks, OptionType};
use rand_distr::{Distribution, StandardNormal};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct MonteCarloConfig {
    pub num_paths: usize,
    pub antithetic: bool,
}

impl MonteCarloConfig {
    pub fn new(num_paths: usize) -> Self {
        Self {
            num_paths: num_paths.max(2),
            antithetic: true,
        }
    }

    pub fn trader_default() -> Self {
        Self::new(50_000)
    }

    pub fn chart_default() -> Self {
        Self::new(8_000)
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct MonteCarloDiagnostics {
    pub standard_error: f64,
    pub ci95_low: f64,
    pub ci95_high: f64,
    pub used_antithetic: bool,
    pub used_control_variate: bool,
    pub control_beta: f64,
    pub effective_samples: usize,
}

#[derive(Debug, Clone, Copy)]
struct MomentSums {
    count: usize,
    sum_x: f64,
    sum_x2: f64,
    sum_y: f64,
    sum_y2: f64,
    sum_xy: f64,
}

impl MomentSums {
    fn zero() -> Self {
        Self {
            count: 0,
            sum_x: 0.0,
            sum_x2: 0.0,
            sum_y: 0.0,
            sum_y2: 0.0,
            sum_xy: 0.0,
        }
    }

    fn push(&mut self, x: f64, y: f64) {
        self.count += 1;
        self.sum_x += x;
        self.sum_x2 += x * x;
        self.sum_y += y;
        self.sum_y2 += y * y;
        self.sum_xy += x * y;
    }

    fn combine(mut self, other: Self) -> Self {
        self.count += other.count;
        self.sum_x += other.sum_x;
        self.sum_x2 += other.sum_x2;
        self.sum_y += other.sum_y;
        self.sum_y2 += other.sum_y2;
        self.sum_xy += other.sum_xy;
        self
    }
}

fn intrinsic(spot: f64, strike: f64, option_type: OptionType) -> f64 {
    match option_type {
        OptionType::Call => (spot - strike).max(0.0),
        OptionType::Put => (strike - spot).max(0.0),
    }
}

fn terminal_spot(params: &BlackScholesParams, z: f64) -> f64 {
    let t = params.time_to_maturity.max(0.0);
    let drift = (params.risk_free_rate - params.dividend_yield - 0.5 * params.volatility * params.volatility) * t;
    let diffusion = params.volatility * t.sqrt() * z;
    params.spot * (drift + diffusion).exp()
}

fn discounted_payoff(params: &BlackScholesParams, option_type: OptionType, z: f64) -> (f64, f64) {
    let terminal = terminal_spot(params, z);
    let discount = (-params.risk_free_rate * params.time_to_maturity.max(0.0)).exp();
    let payoff = intrinsic(terminal, params.strike, option_type);
    (discount * payoff, discount * terminal)
}

fn estimate_price_stats(
    params: &BlackScholesParams,
    option_type: OptionType,
    config: MonteCarloConfig,
) -> (f64, MonteCarloDiagnostics) {
    if params.time_to_maturity <= 0.0 || config.num_paths == 0 {
        let payoff = intrinsic(params.spot, params.strike, option_type);
        return (
            payoff,
            MonteCarloDiagnostics {
                standard_error: 0.0,
                ci95_low: payoff,
                ci95_high: payoff,
                used_antithetic: config.antithetic,
                used_control_variate: false,
                control_beta: 0.0,
                effective_samples: 1,
            },
        );
    }

    let pair_count = if config.antithetic {
        (config.num_paths / 2).max(1)
    } else {
        config.num_paths.max(1)
    };

    let sums = (0..pair_count)
        .into_par_iter()
        .map_init(
            rand::thread_rng,
            |rng, _| {
                let z: f64 = StandardNormal.sample(rng);
                let mut moments = MomentSums::zero();

                if config.antithetic {
                    let (price_a, control_a) = discounted_payoff(params, option_type, z);
                    let (price_b, control_b) = discounted_payoff(params, option_type, -z);
                    moments.push((price_a + price_b) * 0.5, (control_a + control_b) * 0.5);
                } else {
                    let (price, control) = discounted_payoff(params, option_type, z);
                    moments.push(price, control);
                }

                moments
            },
        )
        .reduce(MomentSums::zero, MomentSums::combine);

    let n = sums.count.max(1) as f64;
    let mean_x = sums.sum_x / n;
    let mean_y = sums.sum_y / n;
    let var_y = ((sums.sum_y2 / n) - mean_y * mean_y).max(0.0);
    let cov_xy = (sums.sum_xy / n) - mean_x * mean_y;
    let beta = if var_y > 1e-12 { cov_xy / var_y } else { 0.0 };
    let expected_control = params.spot * (-params.dividend_yield * params.time_to_maturity).exp();
    let adjusted_mean = mean_x - beta * (mean_y - expected_control);

    let var_x = ((sums.sum_x2 / n) - mean_x * mean_x).max(0.0);
    let adjusted_var = (var_x + beta * beta * var_y - 2.0 * beta * cov_xy).max(0.0);
    let standard_error = (adjusted_var / n).sqrt();
    let ci_half_width = 1.96 * standard_error;

    (
        adjusted_mean,
        MonteCarloDiagnostics {
            standard_error,
            ci95_low: adjusted_mean - ci_half_width,
            ci95_high: adjusted_mean + ci_half_width,
            used_antithetic: config.antithetic,
            used_control_variate: beta.abs() > 1e-12,
            control_beta: beta,
            effective_samples: sums.count.max(1),
        },
    )
}

pub fn calculate_greeks_with_diagnostics(
    params: &BlackScholesParams,
    option_type: OptionType,
    config: MonteCarloConfig,
) -> (Greeks, MonteCarloDiagnostics) {
    let (price, diagnostics) = estimate_price_stats(params, option_type, config);

    if params.time_to_maturity <= 0.0 {
        return (Greeks::new(price, 0.0, 0.0, 0.0, 0.0, 0.0), diagnostics);
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
    let (price_up, _) = estimate_price_stats(&spot_up, option_type, config);
    let (price_down, _) = estimate_price_stats(&spot_down, option_type, config);
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
    let (vega_up, _) = estimate_price_stats(&vol_up, option_type, config);
    let (vega_down, _) = estimate_price_stats(&vol_down, option_type, config);
    let vega = (vega_up - vega_down) / (2.0 * dv) / 100.0;

    let theta = if params.time_to_maturity > dt {
        let sooner = BlackScholesParams::new(
            params.spot,
            params.strike,
            params.time_to_maturity - dt,
            params.volatility,
            params.risk_free_rate,
            params.dividend_yield,
        );
        let (price_later, _) = estimate_price_stats(&sooner, option_type, config);
        price_later - price
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
    let (rho_up, _) = estimate_price_stats(&rate_up, option_type, config);
    let (rho_down, _) = estimate_price_stats(&rate_down, option_type, config);
    let rho = (rho_up - rho_down) / (2.0 * dr) / 100.0;

    (Greeks::new(price, delta, gamma, vega, theta, rho), diagnostics)
}

/// Backward-compatible wrapper used by the legacy bindings.
pub fn calculate_greeks(params: &BlackScholesParams, option_type: OptionType, num_paths: usize) -> Greeks {
    calculate_greeks_with_diagnostics(params, option_type, MonteCarloConfig::new(num_paths)).0
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pricing::black_scholes;

    #[test]
    fn test_mc_call_atm() {
        let params = BlackScholesParams::new(100.0, 100.0, 1.0, 0.2, 0.05, 0.0);
        let (greeks, diagnostics) =
            calculate_greeks_with_diagnostics(&params, OptionType::Call, MonteCarloConfig::new(100_000));
        let bs = black_scholes::calculate_greeks(&params, OptionType::Call);

        assert!((greeks.price - bs.price).abs() < 0.25);
        assert!(diagnostics.standard_error > 0.0);
        assert!(diagnostics.ci95_low < diagnostics.ci95_high);
    }
}
