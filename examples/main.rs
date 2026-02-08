use greeks_calculator::pricing::{BlackScholesParams, calculate_greeks};
use greeks_calculator::types::OptionType;
use greeks_calculator::volatility::{SVIParams, VolatilitySurface};
use std::time::Instant;

fn main() {
    println!("=== High-Performance Options Greeks Calculator ===\n");

    // Example 1: Single option Greeks calculation
    println!("Example 1: Calculate Greeks for a single ATM call option");
    println!("-----------------------------------------------------------");
    
    let params = BlackScholesParams::new(
        100.0,  // spot price
        100.0,  // strike price (ATM)
        1.0,    // 1 year to maturity
        0.25,   // 25% implied volatility
        0.05,   // 5% risk-free rate
        0.02,   // 2% dividend yield
    );

    let start = Instant::now();
    let greeks = calculate_greeks(&params, OptionType::Call);
    let duration = start.elapsed();

    println!("  Spot: ${:.2}", params.spot);
    println!("  Strike: ${:.2}", params.strike);
    println!("  Time to Maturity: {:.2} years", params.time_to_maturity);
    println!("  Volatility: {:.1}%", params.volatility * 100.0);
    println!("  Risk-free Rate: {:.1}%", params.risk_free_rate * 100.0);
    println!("\nResults:");
    println!("  Price:  ${:.4}", greeks.price);
    println!("  Delta:  {:.4}", greeks.delta);
    println!("  Gamma:  {:.4}", greeks.gamma);
    println!("  Vega:   {:.4}", greeks.vega);
    println!("  Theta:  {:.4}", greeks.theta);
    println!("  Rho:    {:.4}", greeks.rho);
    println!("\nCalculation time: {:.2?}", duration);

    // Example 2: Option chain calculation
    println!("\n\nExample 2: Calculate Greeks for an entire option chain");
    println!("-----------------------------------------------------------");
    
    let spot = 100.0;
    let strikes: Vec<f64> = (80..=120).step_by(2).map(|s| s as f64).collect();
    let num_strikes = strikes.len();
    
    println!("  Number of strikes: {}", num_strikes);
    println!("  Strike range: ${:.0} - ${:.0}", strikes[0], strikes[strikes.len() - 1]);
    
    let start = Instant::now();
    let chain_greeks: Vec<_> = strikes.iter().map(|&strike| {
        let params = BlackScholesParams::new(spot, strike, 0.5, 0.20, 0.05, 0.0);
        calculate_greeks(&params, OptionType::Call)
    }).collect();
    let duration = start.elapsed();
    
    println!("\nSample results (first 5 strikes):");
    println!("  Strike    Price     Delta     Gamma     Vega");
    println!("  ------    -----     -----     -----     ----");
    for (i, (&strike, greeks)) in strikes.iter().zip(chain_greeks.iter()).take(5).enumerate() {
        println!("  ${:>5.0}   ${:>6.3}    {:>5.3}    {:>5.4}   {:>5.3}",
                 strike, greeks.price, greeks.delta, greeks.gamma, greeks.vega);
    }
    
    println!("\nTotal calculation time: {:.2?}", duration);
    println!("Average time per option: {:.2?}", duration / num_strikes as u32);
    println!("Throughput: {:.0} options/second", num_strikes as f64 / duration.as_secs_f64());

    // Example 3: Volatility surface construction
    println!("\n\nExample 3: Volatility surface with SVI parameterization");
    println!("-----------------------------------------------------------");
    
    let mut surface = VolatilitySurface::new();
    
    // Add SVI parameters for different maturities
    // 1 month
    surface.add_slice(1.0/12.0, SVIParams::new(0.04, 0.10, -0.40, 0.00, 0.20));
    // 3 months
    surface.add_slice(0.25, SVIParams::new(0.045, 0.11, -0.35, 0.00, 0.22));
    // 6 months
    surface.add_slice(0.5, SVIParams::new(0.05, 0.12, -0.30, 0.00, 0.25));
    // 1 year
    surface.add_slice(1.0, SVIParams::new(0.055, 0.13, -0.25, 0.00, 0.28));
    
    println!("  Number of maturity slices: {}", surface.num_slices());
    println!("  Arbitrage-free: {}", surface.is_arbitrage_free());
    
    println!("\n  Sample implied volatilities:");
    println!("  Maturity   Strike   Implied Vol");
    println!("  --------   ------   -----------");
    
    for &maturity in &[0.25, 0.5, 1.0] {
        for &strike in &[90.0, 100.0, 110.0] {
            if let Some(vol) = surface.get_implied_volatility(strike, spot, maturity) {
                println!("  {:>4.2} yr    ${:>5.0}    {:>5.2}%",
                         maturity, strike, vol * 100.0);
            }
        }
    }

    // Example 4: Performance benchmark
    println!("\n\nExample 4: Performance benchmark (1000 calculations)");
    println!("-----------------------------------------------------------");
    
    let iterations = 1000;
    let params = BlackScholesParams::new(100.0, 100.0, 1.0, 0.25, 0.05, 0.0);
    
    let start = Instant::now();
    for _ in 0..iterations {
        let _ = calculate_greeks(&params, OptionType::Call);
    }
    let duration = start.elapsed();
    
    let avg_time = duration / iterations;
    println!("  Total time: {:.2?}", duration);
    println!("  Average time per calculation: {:.2?}", avg_time);
    println!("  Throughput: {:.0} calculations/second", iterations as f64 / duration.as_secs_f64());
    
    if avg_time.as_micros() < 1000 {
        println!("\n  ✓ Target achieved: <1ms per calculation!");
    } else {
        println!("\n  ⚠ Target not met: {:.2?} per calculation", avg_time);
    }

    println!("\n=== Demo Complete ===");
}
