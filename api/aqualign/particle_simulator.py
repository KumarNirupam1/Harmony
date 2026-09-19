import torch

class ParticleSimulator:
    """
    Handles differentiable physics for particles and vessels.
    Supports Runge-Kutta 4 (RK4) and Euler integration schemes.
    """
    @staticmethod
    def advect_particles(positions: torch.Tensor, 
                         velocity_field_func, 
                         dt: float, 
                         method: str = "rk4"):
        """
        Advect particles using a differentiable ODE solver.
        
        Args:
            positions: (N, 2) tensor
            velocity_field_func: Callable(pos) -> vel
            dt: Time step
            
        Returns:
            new_pos: (N, 2)
        """
        if method == "rk4":
            k1 = velocity_field_func(positions)
            k2 = velocity_field_func(positions + k1 * dt * 0.5)
            k3 = velocity_field_func(positions + k2 * dt * 0.5)
            k4 = velocity_field_func(positions + k3 * dt)
            
            new_pos = positions + (k1 + 2*k2 + 2*k3 + k4) * (dt / 6.0)
        else:
            # Euler
            vel = velocity_field_func(positions)
            new_pos = positions + vel * dt
            
        return new_pos

    @staticmethod
    def step_vessels(positions: torch.Tensor, 
                     current_velocity: torch.Tensor, 
                     control_thrust: torch.Tensor, 
                     dt: float):
        """
        Updates vessel positions.
        
        Args:
            positions: (B, 2) - B vessels
            current_velocity: (B, 2)
            control_thrust: (B, 2)
            dt: float
            
        Returns:
            new_pos: (B, 2)
        """
        # Kinematic model: Velocity = Current + Thrust
        total_vel = current_velocity + control_thrust
        new_pos = positions + total_vel * dt
        
        return new_pos
