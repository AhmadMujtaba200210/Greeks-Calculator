//! Binomial Tree option pricing model (Cox-Ross-Rubinstein)

use crate::pricing::black_scholes::BlackScholesParams;
use crate::types::{Greeks, OptionType};

/// Calculates option price and Greeks using the Cox-Ross-Rubinstein Binomial Tree model
/// Returns proxy Greeks computed from the tree structure
pub fn calculate_greeks(params: &BlackScholesParams, option_type: OptionType, steps: usize) -> Greeks {
    let BlackScholesParams {
        spot,
        strike,
        time_to_maturity,
        volatility,
        risk_free_rate: r,
        dividend_yield: q,
    } = *params;

    if time_to_maturity <= 0.0 || steps == 0 {
        let payoff = match option_type {
            OptionType::Call => (spot - strike).max(0.0),
            OptionType::Put => (strike - spot).max(0.0),
        };
        return Greeks::new(payoff, 0.0, 0.0, 0.0, 0.0, 0.0);
    }

    let dt = time_to_maturity / (steps as f64);
    let u = (volatility * dt.sqrt()).exp();
    let d = 1.0 / u;
    
    // Risk-neutral probability
    let p = ((r - q) * dt).exp();
    let p_up = (p - d) / (u - d);
    let p_down = 1.0 - p_up;
    
    // Discount factor per step
    let discount = (-r * dt).exp();

    // Need up to steps + 1 nodes
    // Optimize by only storing the current and next price arrays
    let mut v = vec![0.0; steps + 1];

    // Initialize terminal payoffs at t = T
    for i in 0..=steps {
        let s_t = spot * u.powi((steps - i) as i32) * d.powi(i as i32);
        v[i] = match option_type {
            OptionType::Call => (s_t - strike).max(0.0),
            OptionType::Put => (strike - s_t).max(0.0),
        };
    }

    // Step backwards through the tree
    // We will save information at early steps to compute Greeks
    let mut v_step2 = vec![0.0; 3]; // Option values at step 2
    let mut v_step1 = vec![0.0; 2]; // Option values at step 1

    for step in (0..steps).rev() {
        for i in 0..=step {
            // Continuation value
            let continuation = discount * (p_up * v[i] + p_down * v[i + 1]);
            // For American options we'd take max(payoff, continuation) here, but we are doing European
            v[i] = continuation;
        }

        // Save states for Greeks calculation
        if step == 2 {
            v_step2[0] = v[0]; // Up-Up
            v_step2[1] = v[1]; // Up-Down (same as Down-Up)
            v_step2[2] = v[2]; // Down-Down
        } else if step == 1 {
            v_step1[0] = v[0]; // Up
            v_step1[1] = v[1]; // Down
        }
    }

    let price = v[0];

    // Compute Proxy Greeks from the tree
    // Delta = (V_up - V_down) / (S_up - S_down)
    let s_up = spot * u;
    let s_down = spot * d;
    let delta = (v_step1[0] - v_step1[1]) / (s_up - s_down);

    // Gamma = difference of deltas
    let s_up_up = spot * u * u;
    let s_down_down = spot * d * d;
    let delta_up = (v_step2[0] - v_step2[1]) / (s_up_up - spot);
    let delta_down = (v_step2[1] - v_step2[2]) / (spot - s_down_down);
    let gamma = (delta_up - delta_down) / ((s_up_up - s_down_down) / 2.0);

    // Theta = (V(S, t+2dt) - V(S, t)) / 2dt
    // We proxy V(S, t+2dt) with v_step2[1] (the node where stock price goes up then down, approx returning to spot)
    let theta = (v_step2[1] - price) / (2.0 * dt);

    // Vega - we use a bump and reprice approach for vega since the tree nodes depend heavily on vol
    // It's more accurate to just rebuild a small tree or use finite difference
    let dr = 0.0001;
    let v_bumpr = pricing_tree_value(spot, strike, time_to_maturity, volatility, r + dr, q, steps, option_type);
    let rho = (v_bumpr - price) / dr;

    let dsigma = 0.0001;
    let v_bumpvol = pricing_tree_value(spot, strike, time_to_maturity, volatility + dsigma, r, q, steps, option_type);
    let vega = (v_bumpvol - price) / dsigma;

    Greeks::new(price, delta, gamma, vega, theta, rho)
}

/// Helper for Vega/Rho calculation (just returns European price)
fn pricing_tree_value(spot: f64, strike: f64, t: f64, vol: f64, r: f64, q: f64, steps: usize, opt_type: OptionType) -> f64 {
    let dt = t / (steps as f64);
    let u = (vol * dt.sqrt()).exp();
    let d = 1.0 / u;
    
    let p = ((r - q) * dt).exp();
    let p_up = (p - d) / (u - d);
    let p_down = 1.0 - p_up;
    let discount = (-r * dt).exp();

    let mut v = vec![0.0; steps + 1];
    for i in 0..=steps {
        let s_t = spot * u.powi((steps - i) as i32) * d.powi(i as i32);
        v[i] = match opt_type {
            OptionType::Call => (s_t - strike).max(0.0),
            OptionType::Put => (strike - s_t).max(0.0),
        };
    }

    for step in (0..steps).rev() {
        for i in 0..=step {
            v[i] = discount * (p_up * v[i] + p_down * v[i + 1]);
        }
    }
    v[0]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_binomial_call_atm() {
        let params = BlackScholesParams::new(100.0, 100.0, 1.0, 0.2, 0.05, 0.0);
        let greeks = calculate_greeks(&params, OptionType::Call, 500);
        println!("Binomial Greeks: {:?}", greeks);
        
        assert!(greeks.price > 10.0 && greeks.price < 11.0); // BS price is ~10.45
        assert!(greeks.delta > 0.4 && greeks.delta < 0.7);
        assert!(greeks.gamma > 0.0);
        assert!(greeks.vega > 0.0);
    }
}
