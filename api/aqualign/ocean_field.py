import torch
import numpy as np
import os

class OceanField:
    """
    Differentiable Ocean Environment.
    Loads velocity data and provides bilinear interpolation for particle advection.
    """
    def __init__(self, data_path: str = 'data/gulf_stream.npz', device: str = 'cpu'):
        self.device = device
        
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Ocean data not found at {data_path}")
            
        data = np.load(data_path)
        self.u_np = data['u']
        self.v_np = data['v']
        self.x_np = data['x']
        self.y_np = data['y']
        
        # Convert to torch
        self.u = torch.tensor(self.u_np, dtype=torch.float32, device=device)
        self.v = torch.tensor(self.v_np, dtype=torch.float32, device=device)
        
        # Metadata
        self.height, self.width = self.u.shape
        self.x_max = self.x_np.max()
        self.y_max = self.y_np.max()
        
        # Create grid for interpolation
        # grid_sample expects (N, C, H, W)
        self.grid_u = self.u.unsqueeze(0).unsqueeze(0)
        self.grid_v = self.v.unsqueeze(0).unsqueeze(0)

    def __repr__(self):
        return f"OceanField(shape={self.u.shape}, device={self.device})"

    def get_velocity(self, pos):
        """
        Bilinear interpolation.
        pos: (N, 2) tensor [x, y]
        """
        # Normalize to [-1, 1]
        # x range [0, x_max] -> [-1, 1]
        # norm = 2 * (val / max) - 1
        
        norm_x = 2 * (pos[:, 0] / self.x_max) - 1
        norm_y = 2 * (pos[:, 1] / self.y_max) - 1
        
        grid_sample_pos = torch.stack((norm_x, norm_y), dim=1).reshape(1, 1, -1, 2)
        
        # Sampling
        u_interp = torch.nn.functional.grid_sample(self.grid_u, grid_sample_pos, align_corners=True).view(-1)
        v_interp = torch.nn.functional.grid_sample(self.grid_v, grid_sample_pos, align_corners=True).view(-1)
        
        return torch.stack((u_interp, v_interp), dim=1)
