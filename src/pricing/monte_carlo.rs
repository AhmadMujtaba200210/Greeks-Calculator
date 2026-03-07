//! Monte Carlo option pricing using Geometric Brownian Motion (GBM)

use crate::pricing::black_scholes::BlackScholesParams;
use crate::types::{Greeks, OptionType};
use rand_distr::{StandardNormal, Distribution};
use rayon::prelude::*;

/// Calculates option price and Greeks using Monte Carlo simulation
/// Uses antithetic variates for variance reduction
pub fn calculate_greeks(params: &BlackScholesParams, option_type: OptionType, num_paths: usize) -> Greeks {
    let BlackScholesParams {
        spot,
        strike,
        time_to_maturity,
        volatility,
        risk_free_rate: r,
        dividend_yield: q,
    } = *params;

    if time_to_maturity <= 0.0 || num_paths == 0 {
        let payoff = match option_type {
            OptionType::Call => (spot - strike).max(0.0),
            OptionType::Put => (strike - spot).max(0.0),
        };
        return Greeks::new(payoff, 0.0, 0.0, 0.0, 0.0, 0.0);
    }

    let discount = (-r * time_to_maturity).exp();

    // Bump sizes for Greeks
    let ds = spot * 0.01;
    let dvol = 0.01;
    let dt = 1.0 / 365.0; 
    let dr = 0.0001;

    // Simulate paths in parallel using Rayon
    // We compute the price and bumped prices simultaneously for each path to share random numbers
    // This dramatically reduces variance of the computed Greeks
    
    // We do num_paths/2 iterations because we use antithetic variates (Z and -Z)
    let iter_count = (num_paths / 2).max(1);
    
    // Sums: [price, price_up, price_down, vega_up, theta_up, rho_up]
    let sums: [f64; 6] = (0..iter_count)
        .into_par_iter()
        .map_init(
            || rand::thread_rng(),
            |rng, _| {
                // Generate standard normal
                let z: f64 = StandardNormal.sample(rng);
                
                // Helper to compute payoff for a given Z
                let calc_payoff = |s: f64, v: f64, t: f64, rate: f64, yield_q: f64, z_val: f64| -> f64 {
                    let d = (rate - yield_q - 0.5 * v * v) * t;
                    let v_st = v * t.sqrt();
                    let s_t = s * (d + v_st * z_val).exp();
                    match option_type {
                        OptionType::Call => (s_t - strike).max(0.0),
                        OptionType::Put => (strike - s_t).max(0.0),
                    }
                };

                // Base scenario
                let p1 = calc_payoff(spot, volatility, time_to_maturity, r, q, z);
                let p2 = calc_payoff(spot, volatility, time_to_maturity, r, q, -z); // Antithetic
                let price_sum = p1 + p2;

                // Delta/Gamma bumps (Spot bumped up and down)
                let pup1 = calc_payoff(spot + ds, volatility, time_to_maturity, r, q, z);
                let pup2 = calc_payoff(spot + ds, volatility, time_to_maturity, r, q, -z);
                let price_up_sum = pup1 + pup2;

                let pdn1 = calc_payoff(spot - ds, volatility, time_to_maturity, r, q, z);
                let pdn2 = calc_payoff(spot - ds, volatility, time_to_maturity, r, q, -z);
                let price_dn_sum = pdn1 + pdn2;

                // Vega bump (Vol bumped)
                let vup1 = calc_payoff(spot, volatility + dvol, time_to_maturity, r, q, z);
                let vup2 = calc_payoff(spot, volatility + dvol, time_to_maturity, r, q, -z);
                let vega_up_sum = vup1 + vup2;

                // Theta bump (Time reduced by 1 day)
                let tup1 = if time_to_maturity > dt { calc_payoff(spot, volatility, time_to_maturity - dt, r, q, z) } else { 0.0 };
                let tup2 = if time_to_maturity > dt { calc_payoff(spot, volatility, time_to_maturity - dt, r, q, -z) } else { 0.0 };
                let theta_up_sum = tup1 + tup2;

                // Rho bump (Rate bumped)
                let rup1 = calc_payoff(spot, volatility, time_to_maturity, r + dr, q, z);
                let rup2 = calc_payoff(spot, volatility, time_to_maturity, r + dr, q, -z);
                let rho_up_sum = rup1 + rup2;

                [
                    price_sum, 
                    price_up_sum, 
                    price_dn_sum, 
                    vega_up_sum, 
                    theta_up_sum, 
                    rho_up_sum
                ]
            },
        )
        .reduce(
            || [0.0; 6],
            |mut a, b| {
                for i in 0..6 {
                    a[i] += b[i];
                }
                a
            },
        );

    // Total actual paths is iter_count * 2
    let n = (iter_count * 2) as f64;
    
    let price = (sums[0] / n) * discount;
    let price_up = (sums[1] / n) * discount;
    let price_dn = (sums[2] / n) * discount;
    let price_vega_up = (sums[3] / n) * discount;
    let price_theta_up = (sums[4] / n) * (-r * (time_to_maturity - dt).max(0.0)).exp();
    let price_rho_up = (sums[5] / n) * (-(r + dr) * time_to_maturity).exp();

    // Compute Greeks using finite differences of the expectations
    let delta = (price_up - price_dn) / (2.0 * ds);
    let gamma = (price_up - 2.0 * price + price_dn) / (ds * ds);
    let vega = (price_vega_up - price) / dvol;
    let theta = if time_to_maturity > dt { (price_theta_up - price) / dt } else { 0.0 };
    let rho = (price_rho_up - price) / dr;

    Greeks::new(price, delta, gamma, vega, theta, rho)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mc_call_atm() {
        let params = BlackScholesParams::new(100.0, 100.0, 1.0, 0.2, 0.05, 0.0);
        // Using enough paths to get a stable estimate
        let greeks = calculate_greeks(&params, OptionType::Call, 100_000);
        println!("Monte Carlo Greeks: {:?}", greeks);
        
        // BS price is ~10.45, MC should be close
        assert!((greeks.price - 10.45).abs() < 0.2);
        assert!(greeks.delta > 0.4 && greeks.delta < 0.7);
        assert!(greeks.gamma > 0.0);
        assert!(greeks.vega > 0.0);
    }
}
