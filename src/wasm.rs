use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use crate::pricing::{BlackScholesParams, calculate_greeks};
use crate::types::OptionType;

#[derive(Serialize, Deserialize)]
pub struct WasmGreeks {
    pub price: f64,
    pub delta: f64,
    pub gamma: f64,
    pub vega: f64,
    pub theta: f64,
    pub rho: f64,
}

#[wasm_bindgen]
pub fn calculate_greeks_wasm(
    spot: f64,
    strike: f64,
    maturity: f64,
    volatility: f64,
    rate: f64,
    dividend: f64,
    is_call: bool,
) -> JsValue {
    let params = BlackScholesParams::new(
        spot,
        strike,
        maturity,
        volatility,
        rate,
        dividend,
    );

    let option_type = if is_call {
        OptionType::Call
    } else {
        OptionType::Put
    };

    let result = calculate_greeks(&params, option_type);

    let wasm_result = WasmGreeks {
        price: result.price,
        delta: result.delta,
        gamma: result.gamma,
        vega: result.vega,
        theta: result.theta,
        rho: result.rho,
    };

    serde_wasm_bindgen::to_value(&wasm_result).unwrap()
}
