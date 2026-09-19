import torch
import torch.nn as nn
from .ocean_field import OceanField
from .particle_simulator import ParticleSimulator

class RouteOptimizer(nn.Module):
    def __init__(self, field: OceanField, num_vessels=3, steps=72, dt=1.0):
        super().__init__()
        self.field = field
        self.num_vessels = num_vessels
        self.steps = steps
        self.dt = dt
        self.device = field.device
        
        # Learnable parameters: Controls for 3 vessels over 72 steps
        # Shape: (Steps, NumVessels, 2)
        self.controls = nn.Parameter(torch.zeros(steps, num_vessels, 2, device=self.device))
        
    def forward(self, initial_vessel_pos, initial_debris_pos):
        """
        Args:
            initial_vessel_pos: (NumVessels, 2)
            initial_debris_pos: (M, 2)
        """
        vessel_pos = initial_vessel_pos.clone() # (3, 2)
        debris_pos = initial_debris_pos.clone() # (M, 2)
        
        total_collected = 0.0
        
        # Hyperparameters
        sigma = 5.0 # Capture radius (soft)
        
        for t in range(self.steps):
            # 1. Advect Debris (Passive)
            debris_pos = ParticleSimulator.advect_particles(debris_pos, self.field.get_velocity, self.dt)
            
            # 2. Move Vessels (Active)
            # Get current at vessel positions
            v_current = self.field.get_velocity(vessel_pos)
            
            # Get thrust for this step: (3, 2)
            # Use tanh to limit max thrust to 1.5 units
            raw_thrust = self.controls[t]
            thrust = 1.5 * torch.tanh(raw_thrust)
            
            vessel_pos = ParticleSimulator.step_vessels(vessel_pos, v_current, thrust, self.dt)
            
            # 3. Collection Reward
            # Compute distance matrix between Vessels (3) and Debris (M)
            # v: (3, 1, 2)
            # d: (1, M, 2)
            # diff: (3, M, 2)
            diff = vessel_pos.unsqueeze(1) - debris_pos.unsqueeze(0)
            dists_sq = torch.sum(diff**2, dim=2) # (3, M)
            
            # Soft count: exp(-dist^2 / 2sigma^2)
            # Max over vessels (a debris is collected by the closest/best coverage vessel)
            # Sum prob of collection from all vessels (differentiable OR)
            # prob = 1 - prod(1 - p_i) approx sum(p_i) for small p
            # Let's just sum affinities for gradients
            
            affinities = torch.exp(-dists_sq / (2 * sigma**2)) # (3, M)
            step_collection = affinities.sum() 
            
            total_collected = total_collected + step_collection

        # Loss Components
        loss_collection = -total_collected
        
        # Fuel Cost: Sum of squared thrust
        # meaningful controls are tanh(param), strictly we should penalize that output
        # But penalizing parameter is cleaner for optimization surface
        loss_fuel = torch.sum(self.controls ** 2)
        
        w_coll = 1.0
        # Fuel weight set low to encourage active tracking of debris
        w_fuel = 0.001 
        
        loss = w_coll * loss_collection + w_fuel * loss_fuel
        
        logs = {
            "loss": loss.item(),
            "collected_metric": total_collected.item(),
            "fuel_metric": loss_fuel.item()
        }
        
        return loss, logs

    def run_optimization(self, initial_vessel_pos, initial_debris_pos, iterations=100, lr=0.1):
        optimizer = torch.optim.Adam(self.parameters(), lr=lr)
        history = []
        
        print(f"Optimizing {self.num_vessels} vessels over {self.steps} hours...")
        
        for i in range(iterations):
            optimizer.zero_grad()
            loss, logs = self.forward(initial_vessel_pos, initial_debris_pos)
            loss.backward()
            optimizer.step()
            
            history.append(logs)
            if i % 20 == 0:
                print(f"Iter {i}: Loss={logs['loss']:.2f}, Coll={logs['collected_metric']:.2f}, Fuel={logs['fuel_metric']:.2f}")
                
        return history
