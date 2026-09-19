# 🌊 Aqualign: Order from Chaos

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![Python](https://img.shields.io/badge/python-3.8%2B-blue)
![PyTorch](https://img.shields.io/badge/PyTorch-2.0-orange)
[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://aqualign.streamlit.app/)
[![Watch the Demo](https://img.shields.io/badge/Watch-Demo-red)](https://youtu.be/6qFabs0kgFI)

> *“We don’t fight the ocean; we learn to dance with it.”*

---

## 📖 Executive Summary

**Aqualign** is a differentiable physics framework designed to solve the problem of ocean debris tracking and retrieval. Unlike traditional methods that rely on reactive patrols or static predictive models, Aqualign treats the ocean as a **continuous, differentiable vector field**. By leveraging gradient-based optimization through a custom physics engine, we enable autonomous vessels to "surf" chaotic currents - using the ocean's own energy to intercept debris clusters before they disperse.

This approach transforms ocean cleanup from a brute-force search problem into a control theory problem, achieving **50% higher collection efficiency** while reducing fuel consumption by **12%** in synthetic benchmarks.

---

## 🌍 The Challenge: A Moving Target

### The 8 Million Ton Problem
Every year, approximately **8 million tons** of plastic enter our oceans. This debris does not remain stationary. It is captured by the ocean's geostrophic currents - complex, chaotic systems defined by gyres, eddies, and jets.

### The Failure of Reactive Strategies
Current cleanup strategies are predominantly **reactive**:
1.  **Static Patrols**: Vessels survey grid sectors regardless of current dynamics.
2.  **Basic Prediction**: Models predict where trash *might* be, but vessels simply drive straight there, often fighting the current to get there.

This leads to a massive inefficiency: vessels burn fuel fighting currents to chase debris that is moving faster than they can anticipate. It is an energy-negative cycle.

---

## ⚙️ Technical Architecture

Aqualign solves this by inverting the paradigm: **Don't just predict the debris; control the vessel within the flow.** The core of our system is a differentiable simulation pipeline built on **PyTorch**, allowing us to backpropagate specific loss gradients *through time* to optimize vessel trajectories.

### 1. Differentiable Ocean Field (`src/ocean_field.py`)
We model the ocean not as a discrete grid (which breaks gradients) but as a **continuous vector field function** $F(x, y, t)$.
*   **Bilinear Interpolation**: We take discrete hydrographic data (current u, v vectors) and create a differentiable surface using PyTorch's `grid_sample` logic.
*   **Gradient Flow**: This ensures that for any position $p = (x, y)$, the velocity vector $v = F(p)$ is differentiable with respect to position. This is critical for the optimizer to "know" which direction leads to stronger or weaker currents.

### 2. Physics Engine & RK4 Integrator (`src/particle_simulator.py`)
Standard physics engines are "black boxes" - you put inputs in, get positions out. We wrote a custom **Fourth-Order Runge-Kutta (RK4)** integrator fully in PyTorch tensors.

$$ p_{t+1} = p_t + \frac{1}{6}(k_1 + 2k_2 + 2k_3 + k_4) \cdot \Delta t $$

Because every step of this integration is differentiable, we can unroll the simulation for $T$ timesteps (e.g., 72 hours). This yields a computational graph connecting the vessel's initial thrust control $u_0$ directly to its final position relative to the debris $p_T$. We can literally calculate:
> *$\frac{\partial \text{Distance}}{\partial \text{Thrust}}$: "How does changing my engine thrust at Hour 1 affect my distance to the traget at Hour 72?"*

### 3. Gradient Descent Control (`src/optimizer.py`)
We treat the route planning as an optimization problem, not a reinforcement learning problem. This avoids the sample inefficiency of RL. 
*   **Loss Function**:
    $$ \mathcal{L} = -\sum_{i} \text{Captured}(d_i, v) + \lambda \sum_{t} \|u_t\|^2 $$
    Where:
    *   $\text{Captured}$ is a soft Gaussian kernel (to make "capture" differentiable).
    *   $\|u_t\|^2$ is the fuel cost.
    *   $\lambda$ is the trade-off hyperparameter.

By minimizing $\mathcal{L}$ via **Adam**, the vessels naturally discover complex behaviors - like riding an eddy to gain speed or waiting for debris to come to them - without ever being explicitly programmed to do so.

---

## 📊 Results & Visualization

We benchmarked Aqualign on the "Double Gyre" dataset, a standard fluid dynamics test case representing chaotic ocean mixing.

![Simulation Comparison](visualizations/comparison.png)

### Analysis of Trajectories
The visualization above compares **Random Patrols** (Orange Dotted) vs. **Aqualign Optimization** (Blue Solid).

1.  **Naive Behavior (Orange)**:
    *   The random patrols move in relatively straight segments or random directions.
    *   Note how they often cross *against* the stream lines, burning fuel to fight the flow.
    *   They miss the dense clusters forming in the center of the gyres.

2.  **Optimized Behavior (Blue)**:
    *   **Curvature**: The Aqualign paths are highly curved. They are not straight lines. This is the optimizer exploiting the vorticity of the field.
    *   **Interception**: Notice how the blue paths tend to loop *into* the centers of the gyres where particles (white dots) naturally congregate.
    *   **Energy Efficiency**: By aligning with the velocity vectors (streamlines), these vessels maintain higher speeds with lower thrust input.

### Empirical Metrics
| Metric | Random Patrol | Aqualign | Improvement |
| :--- | :---: | :---: | :---: |
| **Recovery Rate** | 3.0% | **4.5%** | **+50%** |
| **Fuel Units** | 450.4 | **396.7** | **-12%** |
| **Compute Time** | N/A | 1.2s | Real-time |

---

## 🚀 Usage Guide

### Installation
```bash
git clone https://github.com/somewherelostt/Aqualign.git
cd Aqualign
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 1. Data Generation
Generate the synthetic ocean field (Double Gyre model).
```bash
python data/generate_data.py
```

### 2. Run Headless Simulation
Run the optimization loop in the terminal and save results.
```bash
python main.py
```
*Outputs: `visualizations/comparison.png`*

### 3. Interactive Dashboard
Launch the Streamlit app to tweak fleet size, horizon, and learning rates in real-time.
```bash
streamlit run dashboard.py
```

---

## 🤝 Acknowledgements

Built for the **Tesseract Hackathon**.
*   **Core Logic**: PyTorch Autograd
*   **Visualization**: Matplotlib & Streamlit
*   **Inspiration**: The urgent need for scalable, energy-positive environmental engineering.
