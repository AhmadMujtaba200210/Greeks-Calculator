use super::dual::Dual;
use std::f64::consts::{E, PI, SQRT_2};

/// Mathematical operations for dual numbers

impl Dual {
    /// Exponential function: exp(f)' = f' * exp(f)
    #[inline]
    pub fn exp(self) -> Self {
        let exp_val = self.value.exp();
        Self {
            value: exp_val,
            deriv: self.deriv * exp_val,
        }
    }

    /// Natural logarithm: ln(f)' = f' / f
    #[inline]
    pub fn ln(self) -> Self {
        Self {
            value: self.value.ln(),
            deriv: self.deriv / self.value,
        }
    }

    /// Square root: sqrt(f)' = f' / (2 * sqrt(f))
    #[inline]
    pub fn sqrt(self) -> Self {
        let sqrt_val = self.value.sqrt();
        Self {
            value: sqrt_val,
            deriv: self.deriv / (2.0 * sqrt_val),
        }
    }

    /// Power function: (f^n)' = n * f^(n-1) * f'
    #[inline]
    pub fn powf(self, n: f64) -> Self {
        let pow_val = self.value.powf(n);
        Self {
            value: pow_val,
            deriv: self.deriv * n * self.value.powf(n - 1.0),
        }
    }

    /// Square: f² = f * f
    #[inline]
    pub fn powi2(self) -> Self {
        Self {
            value: self.value * self.value,
            deriv: 2.0 * self.value * self.deriv,
        }
    }

    /// Absolute value (non-differentiable at 0, but we handle it)
    #[inline]
    pub fn abs(self) -> Self {
        if self.value >= 0.0 {
            self
        } else {
            -self
        }
    }

    /// Maximum of two dual numbers
    #[inline]
    pub fn max(self, other: Self) -> Self {
        if self.value >= other.value {
            self
        } else {
            other
        }
    }

    /// Minimum of two dual numbers
    #[inline]
    pub fn min(self, other: Self) -> Self {
        if self.value <= other.value {
            self
        } else {
            other
        }
    }
}

/// Error function approximation (needed for normal CDF)
/// Using Abramowitz and Stegun approximation
#[inline]
pub fn erf(x: Dual) -> Dual {
    // erf'(x) = 2/sqrt(π) * exp(-x²)
    let t = 1.0 / (1.0 + 0.5 * x.value.abs());
    
    let tau = t * (-x.value * x.value - 1.26551223 +
                    t * (1.00002368 +
                    t * (0.37409196 +
                    t * (0.09678418 +
                    t * (-0.18628806 +
                    t * (0.27886807 +
                    t * (-1.13520398 +
                    t * (1.48851587 +
                    t * (-0.82215223 +
                    t * 0.17087277)))))))));
    
    let erf_val = if x.value >= 0.0 {
        1.0 - tau.exp()
    } else {
        tau.exp() - 1.0
    };
    
    // Derivative: erf'(x) = 2/sqrt(π) * exp(-x²)
    let erf_deriv = (2.0 / PI.sqrt()) * (-x.value * x.value).exp() * x.deriv;
    
    Dual {
        value: erf_val,
        deriv: erf_deriv,
    }
}

/// Standard normal cumulative distribution function
/// N(x) = 0.5 * (1 + erf(x / sqrt(2)))
#[inline]
pub fn norm_cdf(x: Dual) -> Dual {
    let scaled = x / SQRT_2;
    let erf_result = erf(scaled);
    (erf_result + 1.0) * 0.5
}

/// Standard normal probability density function
/// φ(x) = 1/sqrt(2π) * exp(-x²/2)
#[inline]
pub fn norm_pdf(x: Dual) -> Dual {
    let coeff = 1.0 / (2.0 * PI).sqrt();
    let exp_term = (-x.powi2() / 2.0).exp();
    Dual::constant(coeff) * exp_term
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_exp() {
        let x = Dual::variable(2.0);
        let result = x.exp();
        assert_relative_eq!(result.value, E.powf(2.0), epsilon = 1e-10);
        assert_relative_eq!(result.deriv, E.powf(2.0), epsilon = 1e-10);
    }

    #[test]
    fn test_ln() {
        let x = Dual::variable(E);
        let result = x.ln();
        assert_relative_eq!(result.value, 1.0, epsilon = 1e-10);
        assert_relative_eq!(result.deriv, 1.0 / E, epsilon = 1e-10);
    }

    #[test]
    fn test_sqrt() {
        let x = Dual::variable(4.0);
        let result = x.sqrt();
        assert_relative_eq!(result.value, 2.0, epsilon = 1e-10);
        assert_relative_eq!(result.deriv, 0.25, epsilon = 1e-10);
    }

    #[test]
    fn test_norm_cdf() {
        let x = Dual::variable(0.0);
        let result = norm_cdf(x);
        assert_relative_eq!(result.value, 0.5, epsilon = 1e-6);
    }

    #[test]
    fn test_chain_rule() {
        // Test f(x) = exp(x²)
        // f'(x) = 2x * exp(x²)
        let x = Dual::variable(2.0);
        let x_squared = x.powi2();
        let result = x_squared.exp();
        
        assert_relative_eq!(result.value, E.powf(4.0), epsilon = 1e-10);
        assert_relative_eq!(result.deriv, 4.0 * E.powf(4.0), epsilon = 1e-10);
    }
}
