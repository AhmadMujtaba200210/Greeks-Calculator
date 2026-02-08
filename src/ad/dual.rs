use std::ops::{Add, Sub, Mul, Div, Neg};

/// Dual number for automatic differentiation
/// Represents a value and its derivative: f(x) + f'(x)ε where ε² = 0
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Dual {
    /// The value of the function
    pub value: f64,
    /// The derivative of the function
    pub deriv: f64,
}

impl Dual {
    /// Create a new dual number
    #[inline]
    pub fn new(value: f64, deriv: f64) -> Self {
        Self { value, deriv }
    }

    /// Create a constant (derivative = 0)
    #[inline]
    pub fn constant(value: f64) -> Self {
        Self { value, deriv: 0.0 }
    }

    /// Create a variable (derivative = 1)
    #[inline]
    pub fn variable(value: f64) -> Self {
        Self { value, deriv: 1.0 }
    }

    /// Get the value
    #[inline]
    pub fn value(&self) -> f64 {
        self.value
    }

    /// Get the derivative
    #[inline]
    pub fn deriv(&self) -> f64 {
        self.deriv
    }
}

// Arithmetic operations using the chain rule

impl Add for Dual {
    type Output = Self;

    /// (f + g)' = f' + g'
    #[inline]
    fn add(self, rhs: Self) -> Self::Output {
        Self {
            value: self.value + rhs.value,
            deriv: self.deriv + rhs.deriv,
        }
    }
}

impl Add<f64> for Dual {
    type Output = Self;

    #[inline]
    fn add(self, rhs: f64) -> Self::Output {
        Self {
            value: self.value + rhs,
            deriv: self.deriv,
        }
    }
}

impl Add<Dual> for f64 {
    type Output = Dual;

    #[inline]
    fn add(self, rhs: Dual) -> Self::Output {
        Dual {
            value: self + rhs.value,
            deriv: rhs.deriv,
        }
    }
}

impl Sub for Dual {
    type Output = Self;

    /// (f - g)' = f' - g'
    #[inline]
    fn sub(self, rhs: Self) -> Self::Output {
        Self {
            value: self.value - rhs.value,
            deriv: self.deriv - rhs.deriv,
        }
    }
}

impl Sub<f64> for Dual {
    type Output = Self;

    #[inline]
    fn sub(self, rhs: f64) -> Self::Output {
        Self {
            value: self.value - rhs,
            deriv: self.deriv,
        }
    }
}

impl Sub<Dual> for f64 {
    type Output = Dual;

    #[inline]
    fn sub(self, rhs: Dual) -> Self::Output {
        Dual {
            value: self - rhs.value,
            deriv: -rhs.deriv,
        }
    }
}

impl Mul for Dual {
    type Output = Self;

    /// (f * g)' = f' * g + f * g'
    #[inline]
    fn mul(self, rhs: Self) -> Self::Output {
        Self {
            value: self.value * rhs.value,
            deriv: self.deriv * rhs.value + self.value * rhs.deriv,
        }
    }
}

impl Mul<f64> for Dual {
    type Output = Self;

    #[inline]
    fn mul(self, rhs: f64) -> Self::Output {
        Self {
            value: self.value * rhs,
            deriv: self.deriv * rhs,
        }
    }
}

impl Mul<Dual> for f64 {
    type Output = Dual;

    #[inline]
    fn mul(self, rhs: Dual) -> Self::Output {
        Dual {
            value: self * rhs.value,
            deriv: self * rhs.deriv,
        }
    }
}

impl Div for Dual {
    type Output = Self;

    /// (f / g)' = (f' * g - f * g') / g²
    #[inline]
    fn div(self, rhs: Self) -> Self::Output {
        let g_squared = rhs.value * rhs.value;
        Self {
            value: self.value / rhs.value,
            deriv: (self.deriv * rhs.value - self.value * rhs.deriv) / g_squared,
        }
    }
}

impl Div<f64> for Dual {
    type Output = Self;

    #[inline]
    fn div(self, rhs: f64) -> Self::Output {
        Self {
            value: self.value / rhs,
            deriv: self.deriv / rhs,
        }
    }
}

impl Div<Dual> for f64 {
    type Output = Dual;

    #[inline]
    fn div(self, rhs: Dual) -> Self::Output {
        let g_squared = rhs.value * rhs.value;
        Dual {
            value: self / rhs.value,
            deriv: -self * rhs.deriv / g_squared,
        }
    }
}

impl Neg for Dual {
    type Output = Self;

    #[inline]
    fn neg(self) -> Self::Output {
        Self {
            value: -self.value,
            deriv: -self.deriv,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_basic_arithmetic() {
        let x = Dual::variable(3.0);
        let y = Dual::variable(2.0);

        // Addition
        let sum = x + y;
        assert_relative_eq!(sum.value, 5.0);
        assert_relative_eq!(sum.deriv, 2.0);

        // Subtraction
        let diff = x - y;
        assert_relative_eq!(diff.value, 1.0);
        assert_relative_eq!(diff.deriv, 0.0);

        // Multiplication: (3x)(2x) = 6x², derivative = 12x
        let prod = x * y;
        assert_relative_eq!(prod.value, 6.0);
        assert_relative_eq!(prod.deriv, 5.0); // 3*1 + 2*1

        // Division
        let quot = x / y;
        assert_relative_eq!(quot.value, 1.5);
    }

    #[test]
    fn test_constant_operations() {
        let x = Dual::variable(5.0);
        let c = 3.0;

        let result = x * c;
        assert_relative_eq!(result.value, 15.0);
        assert_relative_eq!(result.deriv, 3.0);
    }
}
