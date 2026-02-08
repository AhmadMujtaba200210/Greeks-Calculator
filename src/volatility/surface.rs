//! Volatility surface construction and management

use crate::volatility::svi::SVIParams;
use std::collections::BTreeMap;

/// Volatility surface storing SVI parameters for multiple maturities
#[derive(Debug, Clone)]
pub struct VolatilitySurface {
    /// Map from time to maturity to SVI parameters
    slices: BTreeMap<OrderedFloat, SVIParams>,
}

/// Wrapper for f64 to use as BTreeMap key
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
struct OrderedFloat(f64);

impl Eq for OrderedFloat {}

impl Ord for OrderedFloat {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.0.partial_cmp(&other.0).unwrap_or(std::cmp::Ordering::Equal)
    }
}

impl VolatilitySurface {
    /// Create a new empty volatility surface
    pub fn new() -> Self {
        Self {
            slices: BTreeMap::new(),
        }
    }

    /// Add a maturity slice with SVI parameters
    pub fn add_slice(&mut self, time_to_maturity: f64, params: SVIParams) {
        self.slices.insert(OrderedFloat(time_to_maturity), params);
    }

    /// Get implied volatility for a given strike, spot, and time to maturity
    pub fn get_implied_volatility(&self, strike: f64, spot: f64, time_to_maturity: f64) -> Option<f64> {
        // Calculate log-moneyness
        let log_moneyness = (strike / spot).ln();

        // Find the appropriate maturity slice(s)
        let key = OrderedFloat(time_to_maturity);

        // Exact match
        if let Some(params) = self.slices.get(&key) {
            return Some(params.implied_volatility(log_moneyness, time_to_maturity));
        }

        // Interpolate between two nearest maturities
        self.interpolate_volatility(log_moneyness, time_to_maturity)
    }

    /// Interpolate volatility between maturities
    fn interpolate_volatility(&self, log_moneyness: f64, time_to_maturity: f64) -> Option<f64> {
        // Find surrounding maturities
        let mut before = None;
        let mut after = None;

        for (&t, _) in self.slices.iter() {
            if t.0 <= time_to_maturity {
                before = Some(t);
            }
            if t.0 >= time_to_maturity && after.is_none() {
                after = Some(t);
            }
        }

        match (before, after) {
            (Some(t1), Some(t2)) if t1 != t2 => {
                // Linear interpolation in total variance
                let params1 = self.slices.get(&t1)?;
                let params2 = self.slices.get(&t2)?;

                let var1 = params1.implied_variance(log_moneyness);
                let var2 = params2.implied_variance(log_moneyness);

                // Interpolate total variance linearly
                let weight = (time_to_maturity - t1.0) / (t2.0 - t1.0);
                let interpolated_variance = var1 + weight * (var2 - var1);

                Some((interpolated_variance / time_to_maturity).sqrt())
            }
            (Some(t), _) | (_, Some(t)) => {
                // Use the single available maturity
                let params = self.slices.get(&t)?;
                Some(params.implied_volatility(log_moneyness, time_to_maturity))
            }
            _ => None,
        }
    }

    /// Check if the entire surface is arbitrage-free
    pub fn is_arbitrage_free(&self) -> bool {
        // Check each slice
        for params in self.slices.values() {
            if !params.is_arbitrage_free() {
                return false;
            }
        }

        // Check calendar spread arbitrage (total variance should be increasing)
        let mut prev_t = None;
        for (&t, params) in self.slices.iter() {
            if let Some(prev_time) = prev_t {
                // For a given strike, total variance should increase with time
                // This is a simplified check at k=0 (ATM)
                let prev_params = self.slices.get(&prev_time).unwrap();
                let prev_var = prev_params.implied_variance(0.0);
                let curr_var = params.implied_variance(0.0);

                if curr_var < prev_var {
                    return false;
                }
            }
            prev_t = Some(t);
        }

        true
    }

    /// Get number of maturity slices
    pub fn num_slices(&self) -> usize {
        self.slices.len()
    }
}

impl Default for VolatilitySurface {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_surface_creation() {
        let mut surface = VolatilitySurface::new();
        
        let params1 = SVIParams::new(0.04, 0.1, -0.4, 0.0, 0.2);
        let params2 = SVIParams::new(0.05, 0.12, -0.3, 0.0, 0.25);
        
        surface.add_slice(0.25, params1); // 3 months
        surface.add_slice(1.0, params2);  // 1 year
        
        assert_eq!(surface.num_slices(), 2);
    }

    #[test]
    fn test_exact_maturity_lookup() {
        let mut surface = VolatilitySurface::new();
        let params = SVIParams::new(0.04, 0.1, -0.4, 0.0, 0.2);
        surface.add_slice(1.0, params);
        
        let vol = surface.get_implied_volatility(100.0, 100.0, 1.0);
        assert!(vol.is_some());
        assert!(vol.unwrap() > 0.0);
    }

    #[test]
    fn test_interpolation() {
        let mut surface = VolatilitySurface::new();
        
        let params1 = SVIParams::new(0.04, 0.1, -0.4, 0.0, 0.2);
        let params2 = SVIParams::new(0.05, 0.12, -0.3, 0.0, 0.25);
        
        surface.add_slice(0.25, params1);
        surface.add_slice(1.0, params2);
        
        // Interpolate at 6 months
        let vol = surface.get_implied_volatility(100.0, 100.0, 0.5);
        assert!(vol.is_some());
    }
}
