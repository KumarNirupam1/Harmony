import torch
import numpy as np
import matplotlib.pyplot as plt
import os
from .ocean_field import OceanField
from .optimizer import RouteOptimizer
from .particle_simulator import ParticleSimulator

def run_comparison():
    print("Initializing Aqualign Comparison...")
    device = "cpu"
    field = OceanField(device=device)
    
    # Configuration
    num_vessels = 3
    steps = 72
    dt = 1.0
    SEED = 42
    
    # Initial State
    # Vessels start at different locations
    initial_vessels = torch.tensor([
        [10.0, 10.0],
        [10.0, 40.0],
        [40.0, 10.0]
    ], device=device)
    
    # Debris Field (Random cluster)
    torch.manual_seed(SEED)
    debris_center = torch.tensor([25.0, 25.0], device=device)
    # Widen spread so vessels can sense it
    debris_pos = debris_center + torch.randn(200, 2, device=device) * 15.0
    
    # --- STRATEGY 1: Random Patrol ---
    print("\n--- Running Random Patrol ---")
    random_controls = torch.randn(steps, num_vessels, 2, device=device)
    
    v_pos = initial_vessels.clone()
    d_pos = debris_pos.clone()
    random_traj = [v_pos.cpu().numpy()]
    random_fuel = torch.sum(random_controls**2).item()
    
    # Capture radius for evaluation
    CAPTURE_RADIUS = 1.0
    
    # Track collected status (boolean mask)
    random_collected_mask = torch.zeros(len(d_pos), dtype=torch.bool, device=device)
    
    for t in range(steps):
        d_pos = ParticleSimulator.advect_particles(d_pos, field.get_velocity, dt)
        
        v_current = field.get_velocity(v_pos)
        thrust = 1.0 * torch.tanh(random_controls[t])
        v_pos = ParticleSimulator.step_vessels(v_pos, v_current, thrust, dt)
        random_traj.append(v_pos.cpu().numpy())
        
        # Check capture
        diff = v_pos.unsqueeze(1) - d_pos.unsqueeze(0) # (3, M, 2)
        dists = torch.norm(diff, dim=2) # (3, M)
        min_dists, _ = dists.min(dim=0) # (M,)
        caught = min_dists < CAPTURE_RADIUS
        random_collected_mask = random_collected_mask | caught
        
    random_count = random_collected_mask.sum().item()
    
    # --- STRATEGY 2: Aqualign (Optimized) ---
    print("\n--- Running Aqualign Optimization ---")
    optimizer = RouteOptimizer(field, num_vessels, steps, dt)
    
    # Tune Training
    optimizer.run_optimization(initial_vessels, debris_pos, iterations=300, lr=0.1)
    
    # Simulate Final Result
    final_controls = optimizer.controls.detach()
    v_pos = initial_vessels.clone()
    d_pos = debris_pos.clone()
    opt_traj = [v_pos.cpu().numpy()]
    opt_fuel = torch.sum(final_controls**2).item()
    
    opt_collected_mask = torch.zeros(len(d_pos), dtype=torch.bool, device=device)
    
    for t in range(steps):
        d_pos = ParticleSimulator.advect_particles(d_pos, field.get_velocity, dt)
        
        v_current = field.get_velocity(v_pos)
        thrust = 1.5 * torch.tanh(final_controls[t]) 
        v_pos = ParticleSimulator.step_vessels(v_pos, v_current, thrust, dt)
        opt_traj.append(v_pos.cpu().numpy())
        
        diff = v_pos.unsqueeze(1) - d_pos.unsqueeze(0) 
        dists = torch.norm(diff, dim=2) 
        min_dists, _ = dists.min(dim=0)
        caught = min_dists < CAPTURE_RADIUS
        opt_collected_mask = opt_collected_mask | caught
        
    opt_count = opt_collected_mask.sum().item()
    
    # --- Results & Visualization ---
    
    results = {
        "random_collected": random_count,
        "random_fuel": random_fuel,
        "opt_collected": opt_count,
        "opt_fuel": opt_fuel
    }
    
    print("\nResults:")
    print(f"Random: Collected={random_count}/{len(d_pos)}, Fuel={random_fuel:.1f}")
    print(f"Aqualign: Collected={opt_count}/{len(d_pos)}, Fuel={opt_fuel:.1f}")
    
    os.makedirs('results', exist_ok=True)
    np.savez('results/comparison_metrics.npz', **results)
    
    plot_comparison(field, initial_vessels, debris_pos, random_traj, opt_traj, results)

def plot_comparison(field, start_pos, debris_pos, rand_path, opt_path, results):
    import matplotlib.gridspec as gridspec
    
    fig = plt.figure(figsize=(15, 6))
    gs = gridspec.GridSpec(1, 3, width_ratios=[1, 1, 1])
    
    # Common background
    x = field.x_np
    y = field.y_np
    X, Y = np.meshgrid(x, y) # Create meshgrid for plotting
    U = field.u_np
    V = field.v_np
    mag = np.sqrt(U**2 + V**2)
    
    rand_path = np.array(rand_path) # (T, 3, 2)
    opt_path = np.array(opt_path)
    
    # Plot 1: Random
    ax1 = plt.subplot(gs[0])
    ax1.set_title("Random Patrol")
    ax1.pcolormesh(X, Y, mag, cmap='Blues', alpha=0.3, shading='auto')
    ax1.quiver(X[::5, ::5], Y[::5, ::5], U[::5, ::5], V[::5, ::5], color='gray', alpha=0.3)
    ax1.scatter(debris_pos.cpu()[:, 0], debris_pos.cpu()[:, 1], c='red', s=5, alpha=0.5)
    for i in range(3):
        ax1.plot(rand_path[:, i, 0], rand_path[:, i, 1], 'k--', alpha=0.7)
    ax1.set_xlim(0, 50); ax1.set_ylim(0, 50)
    
    # Plot 2: Optimized
    ax2 = plt.subplot(gs[1])
    ax2.set_title("Aqualign Optimized")
    ax2.pcolormesh(X, Y, mag, cmap='Blues', alpha=0.3, shading='auto')
    ax2.quiver(X[::5, ::5], Y[::5, ::5], U[::5, ::5], V[::5, ::5], color='gray', alpha=0.3)
    ax2.scatter(debris_pos.cpu()[:, 0], debris_pos.cpu()[:, 1], c='red', s=5, alpha=0.5)
    for i in range(3):
        ax2.plot(opt_path[:, i, 0], opt_path[:, i, 1], 'g-', linewidth=2)
    ax2.set_xlim(0, 50); ax2.set_ylim(0, 50)
    
    # Plot 3: Metrics
    ax3 = plt.subplot(gs[2])
    ax3.set_title("Performance Metrics")
    
    labels = ['Random', 'Aqualign']
    collected = [results['random_collected'], results['opt_collected']]
    fuel = [results['random_fuel'], results['opt_fuel']]
    
    x = np.arange(len(labels))
    width = 0.35
    
    ax3.bar(x - width/2, collected, width, label='Debris Collected', color='green')
    ax3.bar(x + width/2, fuel, width, label='Fuel Usage', color='orange')
    
    ax3.set_xticks(x)
    ax3.set_xticklabels(labels)
    ax3.legend()
    ax3.grid(axis='y', alpha=0.3)
    
    os.makedirs('visualizations', exist_ok=True)
    plt.savefig('visualizations/comparison.png')
    print("Saved visualizations/comparison.png")

if __name__ == "__main__":
    run_comparison()
