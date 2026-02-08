use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use greeks_calculator::pricing::{BlackScholesParams, calculate_greeks};
use greeks_calculator::types::OptionType;

fn bench_single_greeks(c: &mut Criterion) {
    let params = BlackScholesParams::new(100.0, 100.0, 1.0, 0.25, 0.05, 0.0);
    
    c.bench_function("single_greeks_calculation", |b| {
        b.iter(|| {
            calculate_greeks(black_box(&params), black_box(OptionType::Call))
        });
    });
}

fn bench_option_chain(c: &mut Criterion) {
    let mut group = c.benchmark_group("option_chain");
    
    for chain_size in [10, 50, 100, 200].iter() {
        let strikes: Vec<f64> = (0..*chain_size).map(|i| 80.0 + i as f64 * 0.5).collect();
        
        group.bench_with_input(BenchmarkId::from_parameter(chain_size), chain_size, |b, _| {
            b.iter(|| {
                for &strike in &strikes {
                    let params = BlackScholesParams::new(100.0, strike, 1.0, 0.25, 0.05, 0.0);
                    let _ = calculate_greeks(black_box(&params), black_box(OptionType::Call));
                }
            });
        });
    }
    
    group.finish();
}

fn bench_different_maturities(c: &mut Criterion) {
    let mut group = c.benchmark_group("maturities");
    
    for &maturity in &[0.083, 0.25, 0.5, 1.0, 2.0] {
        group.bench_with_input(
            BenchmarkId::from_parameter(format!("{:.2}y", maturity)),
            &maturity,
            |b, &t| {
                let params = BlackScholesParams::new(100.0, 100.0, t, 0.25, 0.05, 0.0);
                b.iter(|| {
                    calculate_greeks(black_box(&params), black_box(OptionType::Call))
                });
            },
        );
    }
    
    group.finish();
}

criterion_group!(benches, bench_single_greeks, bench_option_chain, bench_different_maturities);
criterion_main!(benches);
