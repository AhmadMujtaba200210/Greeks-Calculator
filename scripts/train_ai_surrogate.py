#!/usr/bin/env python3
"""
AI Surrogate Model Trainer for Black-Scholes
Generates a dataset of Call Option prices using Black-Scholes, trains a lightweight Neural Network (MLP),
and exports the architecture and weights to a JSON file for the JavaScript frontend.
"""

import numpy as np
import json
try:
    from sklearn.neural_network import MLPRegressor
    from sklearn.preprocessing import StandardScaler
    from scipy.stats import norm
except ImportError:
    print("Please install scikit-learn, numpy, and scipy: pip install scikit-learn numpy scipy")
    exit(1)

def black_scholes_call(S, K, T, r, sigma):
    if T <= 0: return max(0.0, S - K)
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    return S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)

def generate_data(num_samples=10000):
    np.random.seed(42)
    # Ranges: S ~ [50, 150], K ~ [50, 150], T ~ [0.1, 2.0], vol ~ [0.05, 0.8], r ~ [0.0, 0.1]
    S = np.random.uniform(50, 150, num_samples)
    K = np.random.uniform(50, 150, num_samples)
    T = np.random.uniform(0.1, 2.0, num_samples)
    vol = np.random.uniform(0.05, 0.8, num_samples)
    r = np.random.uniform(0.0, 0.1, num_samples)
    
    # We will use Moneyness (S/K), T, vol, r as inputs to make the model scale-invariant
    moneyness = S / K
    
    X = np.column_stack((moneyness, T, vol, r))
    
    # Target: Price / K (Scale invariant price)
    y = np.array([black_scholes_call(s, k, t, rr, v) / k for s, k, t, rr, v in zip(S, K, T, r, vol)])
    return X, y

def train_and_export():
    print("Generating dataset...")
    X, y = generate_data(50000)
    
    print("Scaling features...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train a very small Neural Net (2 hidden layers of 16 neurons)
    print("Training MLP Surrogate Model...")
    mlp = MLPRegressor(hidden_layer_sizes=(16, 16), activation='relu', max_iter=500, random_state=42)
    mlp.fit(X_scaled, y)
    
    score = mlp.score(X_scaled, y)
    print(f"Model R^2 Score: {score:.5f}")
    
    # Extract weights and biases
    model_data = {
        "scaler": {
            "mean": scaler.mean_.tolist(),
            "scale": scaler.scale_.tolist()
        },
        "weights": [w.tolist() for w in mlp.coefs_],
        "biases": [b.tolist() for b in mlp.intercepts_]
    }
    
    output_path = "playground/public/js/ai_weights.json"
    with open(output_path, "w") as f:
        json.dump(model_data, f)
        
    print(f"Successfully exported model weights to {output_path}")

if __name__ == "__main__":
    train_and_export()
