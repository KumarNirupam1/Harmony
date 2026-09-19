import streamlit as st
import torch
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from src.ocean_field import OceanField
from src.particle_simulator import ParticleSimulator
from src.optimizer import RouteOptimizer
import os

# --- Visual Styling ---
st.set_page_config(
    page_title="Aqualign | Ocean Cleanup",
    page_icon="🌊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for "Scientific" feel
st.markdown("""
<style>
    /* Minimalist Dark Theme */
    .stApp {
        background-color: #0E1117;
        color: #FAFAFA;
    }
    
    /* Elegant Typography */
    h1, h2, h3 {
        font_family: 'SF Pro Display', sans-serif;
        color: #E0E0E0 !important;
        font-weight: 600;
    }
    
    h1 {
        font-size: 2.5rem;
        border-bottom: 2px solid #3366ff;
        padding-bottom: 10px;
        display: inline-block;
    }
    
    /* Clean Sidebar */
    [data-testid="stSidebar"] {
        background-color: #161B22;
        border-right: 1px solid #30363D;
    }
    
    /* Professional Metrics */
    div[data-testid="stMetric"] {
        background-color: #161B22;
        padding: 15px;
        border-radius: 8px;
        border: 1px solid #30363D;
    }
    [data-testid="stMetricValue"] {
        font-size: 28px !important;
        color: #58A6FF !important;
    }
    [data-testid="stMetricLabel"] {
        font-size: 14px !important;
        color: #8B949E !important;
    }
    
    /* Button Styling */
    .stButton>button {
        background-color: #238636;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 500;
    }
    .stButton>button:hover {
        background-color: #2EA043;
    }
</style>
""", unsafe_allow_html=True)

# --- Sidebar ---
with st.sidebar:
    st.markdown("## ⚙️ Control Panel")
    
    st.markdown("### Fleet Configuration")
    num_vessels = st.slider("Number of Vessels", 1, 5, 3)
    time_horizon = st.slider("Simulation Horizon (Hours)", 24, 96, 72)
    
    st.markdown("### Optimization Parameters")
    opt_iterations = st.number_input("Gradient Iterations", 50, 500, 200, step=50)
    learning_rate = st.number_input("Learning Rate", 0.01, 0.5, 0.1, step=0.01)

    st.markdown("---")
    
    if st.button("Initialize & Run Simulation", type="primary", use_container_width=True):
        run_sim = True
    else:
        run_sim = False
        
    st.markdown("---")
    st.caption("**Aqualign v1.0**\n\nBuilt for Tesseract Hackathon\nPowered by PyTorch & Differentiable Physics")

# --- Main Layout ---
st.title("Aqualign")
st.markdown("#### Autonomous Ocean Cleanup Optimization")
st.markdown("Comparing **Stochastic Patrols** vs. **Gradient-Based Trajectory Optimization** in a synthetic double-gyre ocean field.")
st.markdown("---")

# --- Logic ---
@st.cache_resource
def load_field():
    if not os.path.exists("data/gulf_stream.npz"):
        st.error("Data file `data/gulf_stream.npz` not found! Generate it first.")
        return None
    return OceanField(device='cpu')

field = load_field()

if run_sim and field:
    with st.status("Running Differentiable Simulation...", expanded=True) as status:
        st.write("🌊 Loading Ocean Vector Field...")
        device = 'cpu'
        dt = 1.0
        steps = time_horizon
        
        # Initial State
        initial_vessels = torch.tensor([[10.0, 10.0 + i*5.0] for i in range(num_vessels)], device=device)
        
        torch.manual_seed(42)
        debris_center = torch.tensor([25.0, 25.0], device=device)
        debris_pos = debris_center + torch.randn(200, 2, device=device) * 15.0
        
        st.write("🐢 Simulating Random Patrol Baseline...")
        # Random Patrol
        random_controls = torch.randn(steps, num_vessels, 2, device=device)
        v_pos = initial_vessels.clone()
        d_pos = debris_pos.clone()
        random_traj = [v_pos.numpy().copy()]
        random_collected_mask = torch.zeros(len(d_pos), dtype=torch.bool, device=device)
        CAPTURE_RADIUS = 1.0
        
        for t in range(steps):
            d_pos = ParticleSimulator.advect_particles(d_pos, field.get_velocity, dt)
            v_current = field.get_velocity(v_pos)
            thrust = 1.0 * torch.tanh(random_controls[t])
            v_pos = ParticleSimulator.step_vessels(v_pos, v_current, thrust, dt)
            random_traj.append(v_pos.numpy().copy())
            
            diff = v_pos.unsqueeze(1) - d_pos.unsqueeze(0)
            dists = torch.norm(diff, dim=2)
            min_dists, _ = dists.min(dim=0)
            random_collected_mask |= (min_dists < CAPTURE_RADIUS)
            
        random_count = random_collected_mask.sum().item()
        random_fuel = torch.sum(random_controls**2).item()
        
        st.write("⚡ Optimizing Aqualign Trajectories...")
        # Deep Optimization
        optimizer = RouteOptimizer(field, num_vessels, steps, dt)
        optimizer.run_optimization(initial_vessels, debris_pos, iterations=opt_iterations, lr=learning_rate)
        
        final_controls = optimizer.controls.detach()
        v_pos = initial_vessels.clone()
        d_pos = debris_pos.clone()
        opt_traj = [v_pos.numpy().copy()]
        opt_collected_mask = torch.zeros(len(d_pos), dtype=torch.bool, device=device)
        
        for t in range(steps):
            d_pos = ParticleSimulator.advect_particles(d_pos, field.get_velocity, dt)
            v_current = field.get_velocity(v_pos)
            thrust = 1.5 * torch.tanh(final_controls[t]) 
            v_pos = ParticleSimulator.step_vessels(v_pos, v_current, thrust, dt)
            opt_traj.append(v_pos.numpy().copy())
            
            diff = v_pos.unsqueeze(1) - d_pos.unsqueeze(0)
            dists = torch.norm(diff, dim=2)
            min_dists, _ = dists.min(dim=0)
            opt_collected_mask |= (min_dists < CAPTURE_RADIUS)
            
        opt_count = opt_collected_mask.sum().item()
        opt_fuel = torch.sum(final_controls**2).item()
        
        status.update(label="Simulation Complete!", state="complete", expanded=False)

    # --- Results Dashboard ---
    st.markdown("---")
    
    # 1. KPI Cards
    kpi1, kpi2, kpi3, kpi4 = st.columns(4)
    
    with kpi1:
        st.metric("Random Debris", f"{random_count}", help="Debris collected by random patrol")
    with kpi2:
        st.metric("Aqualign Debris", f"{opt_count}", delta=f"{opt_count - random_count}", help="Debris collected by Aqualign")
    with kpi3:
        st.metric("Aqualign Fuel", f"{opt_fuel:.0f}", delta=f"{random_fuel - opt_fuel:.0f}", delta_color="inverse", help="Fuel units consumed")
    with kpi4:
         efficiency_gain = ((opt_count / max(1, random_count)) - 1) * 100
         st.metric("Efficiency Gain", f"+{efficiency_gain:.1f}%", delta="High Impact")

    # 2. Main Visualization
    st.subheader(f"Trajectory Analysis (T={time_horizon}h)")
    
    # Professional Scientific Plot Style
    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Very dark grey background for contrast (GitHub Dark Dimmed style)
    bg_color = '#0d1117'
    fig.patch.set_facecolor(bg_color)
    ax.set_facecolor(bg_color)
    
    # Ocean Field (Subtle Slate Blue)
    x = np.linspace(0, 50, 25)
    y = np.linspace(0, 50, 25)
    X, Y = np.meshgrid(x, y)
    grid_pos = torch.tensor(np.stack([X, Y], axis=-1), dtype=torch.float32).reshape(-1, 2)
    vel = field.get_velocity(grid_pos).detach().numpy()
    U = vel[:, 0].reshape(25, 25)
    V = vel[:, 1].reshape(25, 25)
    
    # Subtle streamplot
    ax.streamplot(X, Y, U, V, color='#30363d', linewidth=0.8, density=0.8, arrowsize=0.6)
    
    # Trajectories
    random_traj = np.array(random_traj)
    opt_traj = np.array(opt_traj)
    
    # Plot Paths
    for i in range(num_vessels):
        # Random: Muted coral/orange, dashed
        ax.plot(random_traj[:, i, 0], random_traj[:, i, 1], 
                color='#F0883E', linestyle=':', linewidth=1.5, alpha=0.8, 
                label='Random Patrol' if i==0 else "")
                
        # Aqualign: Sharp Electric Blue, solid
        ax.plot(opt_traj[:, i, 0], opt_traj[:, i, 1], 
                color='#58A6FF', linewidth=2.0, alpha=0.9, 
                label='Aqualign Optimization' if i==0 else "")
                
        # Endpoints
        ax.scatter(opt_traj[-1, i, 0], opt_traj[-1, i, 1], c='#58A6FF', s=30, zorder=5)

    # Debris: Clean white dots
    ax.scatter(d_pos[:, 0].numpy(), d_pos[:, 1].numpy(), c='#FAFAFA', s=10, alpha=0.6, label='Debris Field', marker='.')
    
    # Scientific grid and boundaries
    ax.set_xlim(0, 50)
    ax.set_ylim(0, 50)
    ax.set_aspect('equal')
    ax.grid(True, color='#30363d', linestyle='--', linewidth=0.5, alpha=0.3)
    ax.set_xticks([])
    ax.set_yticks([])
    
    # Clean Legend
    leg = ax.legend(loc='upper right', frameon=True, facecolor='#161B22', edgecolor='#30363D', fontsize='small')
    for text in leg.get_texts():
        text.set_color("#C9D1D9")
        
    st.pyplot(fig, use_container_width=True)

else:
    # Empty State - Professional
    st.info("👈 Please initialize the simulation using the control panel.")
