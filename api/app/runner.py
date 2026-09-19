"""Headless simulation runner.

Reuses the Aqualign differentiable-physics engine (api/aqualign) and returns
JSON-safe results so the web app can render animated trajectories and KPIs.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict

import torch

from aqualign.ocean_field import OceanField
from aqualign.optimizer import RouteOptimizer
from aqualign.particle_simulator import ParticleSimulator


REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = os.environ.get(
    "AQUALIGN_DATA", str(REPO_ROOT / "data" / "gulf_stream.npz")
)
CAPTURE_RADIUS = 1.0


@dataclass
class MissionParams:
    num_vessels: int = 3
    horizon: int = 72
    iterations: int = 200
    learning_rate: float = 0.1
    seed: int = 42
    debris_count: int = 200
    debris_spread: float = 15.0


def _field_sample(field: OceanField, grid: int = 25) -> Dict:
    """Return a downsampled copy of the velocity field for the front-end overlay."""
    xs = torch.linspace(0.0, field.x_max, grid)
    ys = torch.linspace(0.0, field.y_max, grid)
    X, Y = torch.meshgrid(xs, ys, indexing="ij")
    pos = torch.stack([X.reshape(-1), Y.reshape(-1)], dim=1).to(field.device)
    vel = field.get_velocity(pos).detach().cpu()
    mag = vel.norm(dim=1)
    return {
        "x": xs.cpu().tolist(),
        "y": ys.cpu().tolist(),
        "u": vel[:, 0].reshape(grid, grid).tolist(),
        "v": vel[:, 1].reshape(grid, grid).tolist(),
        "mag": mag.reshape(grid, grid).tolist(),
    }


def _simulate_strategy(
    field: OceanField,
    controls: torch.Tensor,
    thrust_scale: float,
    vessels: torch.Tensor,
    debris: torch.Tensor,
    horizon: int,
    dt: float,
) -> Dict:
    """Roll out a control sequence and report trajectories + capture stats."""
    v_pos = vessels.clone()
    d_pos = debris.clone()
    trajectory = [v_pos.detach().cpu().numpy().tolist()]
    captured_mask = torch.zeros(len(d_pos), dtype=torch.bool, device=d_pos.device)
    debris_tracks = [d_pos.detach().cpu().numpy().tolist()]

    for t in range(horizon):
        d_pos = ParticleSimulator.advect_particles(d_pos, field.get_velocity, dt, method="rk4")
        v_current = field.get_velocity(v_pos)
        thrust = thrust_scale * torch.tanh(controls[t])
        v_pos = ParticleSimulator.step_vessels(v_pos, v_current, thrust, dt)
        trajectory.append(v_pos.detach().cpu().numpy().tolist())
        debris_tracks.append(d_pos.detach().cpu().numpy().tolist())

        diff = v_pos.unsqueeze(1) - d_pos.unsqueeze(0)
        dists = torch.norm(diff, dim=2)
        min_dists, _ = dists.min(dim=0)
        captured_mask = captured_mask | (min_dists < CAPTURE_RADIUS)

    return {
        "collected": int(captured_mask.sum().item()),
        "fuel": float(torch.sum(controls ** 2).item()),
        "trajectory": trajectory,          # (T, num_vessels, 2)
        "debris_tracks": debris_tracks,    # (T, M, 2) — useful for a scrubber
    }


def run_mission(params: MissionParams = MissionParams()) -> Dict:
    """Run Random Patrol vs Aqualign optimization. Returns JSON-safe result."""
    device = "cpu"
    dt = 1.0
    torch.manual_seed(params.seed)

    field = OceanField(DATA_PATH, device=device)
    steps = params.horizon

    initial_vessels = torch.tensor(
        [[10.0, 10.0 + i * 5.0] for i in range(params.num_vessels)], device=device
    )
    debris_center = torch.tensor([25.0, 25.0], device=device)
    debris = debris_center + torch.randn(params.debris_count, 2, device=device) * params.debris_spread

    # ---- Random patrol baseline ----
    random_controls = torch.randn(steps, params.num_vessels, 2, device=device)
    random = _simulate_strategy(field, random_controls, 1.0, initial_vessels, debris, steps, dt)

    # ---- Aqualign gradient optimization ----
    opt = RouteOptimizer(field, params.num_vessels, steps, dt)
    history = opt.run_optimization(initial_vessels, debris, iterations=params.iterations, lr=params.learning_rate)
    final_controls = opt.controls.detach()
    optimized = _simulate_strategy(field, final_controls, 1.5, initial_vessels, debris, steps, dt)

    efficiency_gain = ((optimized["collected"] / max(1, random["collected"])) - 1) * 100
    fuel_saved = random["fuel"] - optimized["fuel"]
    fuel_saved_pct = (fuel_saved / max(1.0, random["fuel"])) * 100

    return {
        "params": asdict(params),
        "field": _field_sample(field),
        "domain": {"x_max": float(field.x_max), "y_max": float(field.y_max)},
        "initial_vessels": initial_vessels.cpu().tolist(),
        "random": random,
        "optimized": optimized,
        "metrics": {
            "random_collected": random["collected"],
            "optimized_collected": optimized["collected"],
            "random_fuel": random["fuel"],
            "optimized_fuel": optimized["fuel"],
            "efficiency_gain": round(efficiency_gain, 1),
            "fuel_saved": round(fuel_saved, 1),
            "fuel_saved_pct": round(fuel_saved_pct, 1),
            "total_debris": params.debris_count,
        },
        "optimization_history": [
            {"iter": i, "loss": h["loss"], "collected": h["collected_metric"], "fuel": h["fuel_metric"]}
            for i, h in enumerate(history)
        ],
    }