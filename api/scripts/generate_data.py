import numpy as np
import os

def generate_synthetic_data():
    """Generates synthetic gyre data and saves it to data/gulf_stream.npz"""
    width = 100
    height = 100
    scale = 0.5 # 100x100 grid * 0.5 = 50x50 km domain
    
    x = np.linspace(0, width * scale, width)
    y = np.linspace(0, height * scale, height)
    X, Y = np.meshgrid(x, y)
    
    # Generate Double Gyre
    center_x = width * scale / 2
    center_y = height * scale / 2
    
    norm_x = (X - center_x)
    norm_y = (Y - center_y)
    r = np.sqrt(norm_x**2 + norm_y**2)
    
    # Strength decays with distance
    strength = 2.0 * np.exp(-r / 15.0)
    
    # Counter-clockwise flow
    u_vel = -strength * norm_y
    v_vel = strength * norm_x
    
    # Add eddies
    u_vel += 0.3 * np.sin(0.4 * X) * np.cos(0.4 * Y)
    v_vel += 0.3 * np.cos(0.4 * X) * np.sin(0.4 * Y)
    
    # Save
    os.makedirs('data', exist_ok=True)
    np.savez('data/gulf_stream.npz', u=u_vel, v=v_vel, x=x, y=y)
    print("Saved data/gulf_stream.npz")
    print("Synthetic data generation complete.")

if __name__ == "__main__":
    generate_synthetic_data()
