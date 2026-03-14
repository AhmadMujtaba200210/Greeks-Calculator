
import math
from scipy.stats import norm

def bs_calculation(S, K, T, sigma, r, q, is_call):
    if T <= 0:
        price = max(0, S - K) if is_call else max(0, K - S)
        return {
            "price": round(price, 6),
            "delta": round(1.0 if is_call and S > K else 0.0, 6) if S != K else 0.5,
            "gamma": 0.0,
            "vega": 0.0,
            "theta": 0.0,
            "rho": 0.0
        }
    
    # Handle sigma = 0 or very small
    if sigma < 1e-6:
        sigma = 1e-6

    d1 = (math.log(S / K) + (r - q + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    
    n_d1 = norm.cdf(d1)
    n_d2 = norm.cdf(d2)
    n_neg_d1 = norm.cdf(-d1)
    n_neg_d2 = norm.cdf(-d2)
    phi_d1 = norm.pdf(d1)

    if is_call:
        price = S * math.exp(-q * T) * n_d1 - K * math.exp(-r * T) * n_d2
        delta = math.exp(-q * T) * n_d1
        rho = (K * T * math.exp(-r * T) * n_d2) / 100.0
        theta = (-(S * math.exp(-q * T) * phi_d1 * sigma) / (2 * math.sqrt(T)) - r * K * math.exp(-r * T) * n_d2 + q * S * math.exp(-q * T) * n_d1) / 365.0
    else:
        price = K * math.exp(-r * T) * n_neg_d2 - S * math.exp(-q * T) * n_neg_d1
        delta = math.exp(-q * T) * (n_d1 - 1)
        rho = (-K * T * math.exp(-r * T) * n_neg_d2) / 100.0
        theta = (-(S * math.exp(-q * T) * phi_d1 * sigma) / (2 * math.sqrt(T)) + r * K * math.exp(-r * T) * n_neg_d2 - q * S * math.exp(-q * T) * n_neg_d1) / 365.0

    gamma = (math.exp(-q * T) * phi_d1) / (S * sigma * math.sqrt(T))
    vega = (S * math.exp(-q * T) * math.sqrt(T) * phi_d1) / 100.0

    return {
        "price": round(price, 6),
        "delta": round(delta, 6),
        "gamma": round(gamma, 6),
        "vega": round(vega, 6),
        "theta": round(theta, 6),
        "rho": round(rho, 6)
    }

cases = [
    # STANDARD
    ("STD_01", "standard", "ATM call, no dividends", 100, 100, 1.0, 0.20, 0.05, 0.0, True),
    ("STD_02", "standard", "ATM put, no dividends", 100, 100, 1.0, 0.20, 0.05, 0.0, False),
    ("STD_03", "standard", "ITM call, no dividends", 110, 100, 1.0, 0.20, 0.05, 0.0, True),
    ("STD_04", "standard", "OTM call, no dividends", 90, 100, 1.0, 0.20, 0.05, 0.0, True),
    ("STD_05", "standard", "ITM put, no dividends", 90, 100, 1.0, 0.20, 0.05, 0.0, False),
    ("STD_06", "standard", "OTM put, no dividends", 110, 100, 1.0, 0.20, 0.05, 0.0, False),
    ("STD_07", "standard", "ATM call with dividend", 100, 100, 1.0, 0.20, 0.05, 0.02, True),
    ("STD_08", "standard", "ATM put with dividend", 100, 100, 1.0, 0.20, 0.05, 0.02, False),
    
    # DEEP MONEY
    ("DEEP_01", "deep money", "Deep ITM call", 200, 100, 1.0, 0.20, 0.05, 0.0, True),
    ("DEEP_02", "deep money", "Deep OTM call", 50, 100, 1.0, 0.20, 0.05, 0.0, True),
    ("DEEP_03", "deep money", "Deep ITM put", 50, 100, 1.0, 0.20, 0.05, 0.0, False),
    ("DEEP_04", "deep money", "Deep OTM put", 200, 100, 1.0, 0.20, 0.05, 0.0, False),
    
    # EDGE CASES
    ("EDGE_01", "edge cases", "Near expiry call", 100, 100, 0.001, 0.20, 0.05, 0.0, True),
    ("EDGE_02", "edge cases", "Near expiry put", 100, 100, 0.001, 0.20, 0.05, 0.0, False),
    ("EDGE_03", "edge cases", "Long dated call", 100, 100, 5.0, 0.20, 0.05, 0.0, True),
    ("EDGE_04", "edge cases", "Long dated put", 100, 100, 5.0, 0.20, 0.05, 0.0, False),
    ("EDGE_05", "edge cases", "Low vol call", 100, 100, 1.0, 0.01, 0.05, 0.0, True),
    ("EDGE_06", "edge cases", "High vol call", 100, 100, 1.0, 1.50, 0.05, 0.0, True),
    ("EDGE_07", "edge cases", "Negative rate call", 100, 100, 1.0, 0.20, -0.005, 0.0, True),
    ("EDGE_08", "edge cases", "Negative rate put", 100, 100, 1.0, 0.20, -0.005, 0.0, False),
    
    # REALISTIC
    ("REAL_01", "realistic", "AAPL-like call", 180, 185, 0.0822, 0.25, 0.053, 0.005, True),
    ("REAL_02", "realistic", "SPX-like put", 5200, 5000, 0.25, 0.15, 0.053, 0.014, False),
    ("REAL_03", "realistic", "TSLA-like call", 250, 300, 0.5, 0.55, 0.053, 0.0, True),
    ("REAL_04", "realistic", "High-div stock call", 50, 50, 1.0, 0.30, 0.05, 0.06, True),
    ("REAL_05", "realistic", "Penny time call", 100, 100, 0.01, 0.05, 0.001, 0.0, True),
]

import json

output = {
    "benchmark_version": "1.0",
    "conventions": {
        "theta": "per-day (annual/365)",
        "vega": "per-1%-vol-change (annual/100)",
        "rho": "per-1%-rate-change (annual/100)"
    },
    "cases": []
}

for case in cases:
    id_tag, cat, desc, S, K, T, sigma, r, q, is_call = case
    expected = bs_calculation(S, K, T, sigma, r, q, is_call)
    output["cases"].append({
        "id": id_tag,
        "category": cat,
        "description": desc,
        "params": { "S": S, "K": K, "T": T, "r": r, "q": q, "sigma": sigma },
        "optionType": "call" if is_call else "put",
        "isCall": is_call,
        "expected": expected,
        "tolerance": { "price": 0.01, "greeks": 0.005 },
        "notes": ""
    })

print(json.dumps(output, indent=2))
