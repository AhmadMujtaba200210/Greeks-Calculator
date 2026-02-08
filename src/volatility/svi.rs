//! SVI (Stochastic Volatility Inspired) parameterization for volatility surfaces
//!
//! The SVI model parameterizes the implied variance as a function of log-moneyness:
//! w(k) = a + b * (ρ * (k - m) + sqrt((k - m)² + σ²))
//!
//! where k = ln(K/F) is the log-moneyness

/// SVI parameters for a single maturity slice
#[derive(Debug, Clone, Copy)]
pub struct SVIParams {
    /// a: vertical shift (controls ATM variance level)
    pub a: f64,
    /// b: slope of the wings
    pub b: f64,
    /// rho: correlation (controls skew, -1 < ρ < 1)
    pub rho: f64,
    /// m: horizontal shift (controls ATM position)
    pub m: f64,
    /// sigma: smoothness parameter (controls curvature)
    pub sigma: f64,
}

impl SVIParams {
    pub fn new(a: f64, b: f64, rho: f64, m: f64, sigma: f64) -> Self {
        Self { a, b, rho, m, sigma }
    }

    /// Calculate implied variance for a given log-moneyness
    #[inline]
    pub fn implied_variance(&self, log_moneyness: f64) -> f64 {
        let k_minus_m = log_moneyness - self.m;
        let sqrt_term = (k_minus_m * k_minus_m + self.sigma * self.sigma).sqrt();
        self.a + self.b * (self.rho * k_minus_m + sqrt_term)
    }

    /// Calculate implied volatility for a given log-moneyness and time to maturity
    #[inline]
    pub fn implied_volatility(&self, log_moneyness: f64, time_to_maturity: f64) -> f64 {
        let variance = self.implied_variance(log_moneyness);
        (variance / time_to_maturity).sqrt()
    }

    /// Check if parameters satisfy no-arbitrage constraints
    pub fn is_arbitrage_free(&self) -> bool {
        // Basic constraints for SVI
        // 1. a + b * sigma * sqrt(1 - rho²) >= 0 (non-negative variance)
        // 2. b >= 0
        // 3. -1 < rho < 1
        // 4. sigma > 0

        if self.b < 0.0 {
            return false;
        }

        if self.rho <= -1.0 || self.rho >= 1.0 {
            return false;
        }

        if self.sigma <= 0.0 {
            return false;
        }

        let min_variance = self.a + self.b * self.sigma * (1.0 - self.rho * self.rho).sqrt();
        if min_variance < 0.0 {
            return false;
        }

        true
    }

    /// Check butterfly arbitrage condition
    /// The density must be non-negative, which requires d²C/dK² >= 0
    pub fn check_butterfly_arbitrage(&self, log_moneyness: f64) -> bool {
        let k = log_moneyness - self.m;
        let sigma_sq = self.sigma * self.sigma;
        let k_sq = k * k;
        let sqrt_term = (k_sq + sigma_sq).sqrt();

        // First derivative of w with respect to k
        let dw_dk = self.b * (self.rho + k / sqrt_term);

        // Second derivative of w with respect to k
        let d2w_dk2 = self.b * sigma_sq / (sqrt_term * sqrt_term * sqrt_term);

        // For no butterfly arbitrage, we need specific conditions on derivatives
        // This is a simplified check - full implementation would be more complex
        d2w_dk2 >= 0.0 && dw_dk.abs() < 4.0
    }
}

/// SVI Jump-Wings parameterization (alternative, more intuitive)
#[derive(Debug, Clone, Copy)]
pub struct SVIJWParams {
    /// v_t: ATM total variance
    pub v_t: f64,
    /// psi: ATM skew
    pub psi: f64,
    /// p: slope of put wing
    pub p: f64,
    /// c: slope of call wing
    pub c: f64,
    /// v_tilde: minimum total variance
    pub v_tilde: f64,
}

impl SVIJWParams {
    /// Convert to standard SVI parameters
    pub fn to_svi(&self) -> SVIParams {
        let b = 0.5 * (self.c + self.p);
        let rho = 1.0 - (self.p / b);
        let beta = rho - 2.0 * self.psi * (self.v_t).sqrt() / b;
        let alpha = (self.v_tilde).sqrt() * (1.0 - beta * beta).sqrt();
        let m = (self.v_t - alpha * alpha) / (2.0 * b * (rho + beta));
        let sigma = alpha / (b * (1.0 - beta * beta).sqrt());
        let a = self.v_tilde - b * sigma * (1.0 - rho * rho).sqrt();

        SVIParams::new(a, b, rho, m, sigma)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_svi_basic() {
        let params = SVIParams::new(0.04, 0.1, -0.4, 0.0, 0.2);
        
        // At-the-money (k=0)
        let variance_atm = params.implied_variance(0.0);
        assert!(variance_atm > 0.0);
        
        // Check arbitrage-free
        assert!(params.is_arbitrage_free());
    }

    #[test]
    fn test_svi_symmetry() {
        let params = SVIParams::new(0.04, 0.1, 0.0, 0.0, 0.2); // rho = 0 for symmetry
        
        let var_pos = params.implied_variance(0.1);
        let var_neg = params.implied_variance(-0.1);
        
        // Should be symmetric when rho = 0
        assert_relative_eq!(var_pos, var_neg, epsilon = 1e-10);
    }

    #[test]
    fn test_arbitrage_constraints() {
        // Invalid: negative b
        let bad_params1 = SVIParams::new(0.04, -0.1, 0.0, 0.0, 0.2);
        assert!(!bad_params1.is_arbitrage_free());

        // Invalid: rho out of bounds
        let bad_params2 = SVIParams::new(0.04, 0.1, 1.5, 0.0, 0.2);
        assert!(!bad_params2.is_arbitrage_free());

        // Invalid: negative sigma
        let bad_params3 = SVIParams::new(0.04, 0.1, 0.0, 0.0, -0.2);
        assert!(!bad_params3.is_arbitrage_free());
    }
}
