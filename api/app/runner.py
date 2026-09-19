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

OBJECTIVES = {
    "balanced": {"w_collection": 1.0, "w_fuel": 0.001},
    "max_collection": {"w_collection": 1.0, "w_fuel": 0.0001},
    "min_control_effort": {"w_collection": 0.8, "w_fuel": 0.02},
}


@dataclass
class MissionParams:
    num_vessels: int = 3
    horizon: int = 72
    iterations: int = 200
    learning_rate: float = 0.1
    seed: int = 42
    debris_count: int = 200
    debris_spread: float = 15.0
    objective: str = "balanced"
    boundary_penalty: bool = False


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

    grid_w = int(field.x_max) + 1
    grid_h = int(field.y_max) + 1
    covered = torch.zeros(grid_w, grid_h, dtype=torch.bool, device=d_pos.device)
    captures_over_time: list = []
    current_drift = 0.0
    first_capture = None

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

        xi = v_pos[:, 0].round().long().clamp(0, grid_w - 1)
        yi = v_pos[:, 1].round().long().clamp(0, grid_h - 1)
        covered[xi, yi] = True
        current_drift += float(v_current.norm(dim=1).sum().item())

        c = int(captured_mask.sum().item())
        captures_over_time.append(c)
        if first_capture is None and c > 0:
            first_capture = t + 1

    coverage_pct = (float(covered.sum().item()) / float(grid_w * grid_h)) * 100.0
    return {
        "collected": int(captured_mask.sum().item()),
        "control_effort": float(torch.sum(controls ** 2).item()),
        "captures_over_time": captures_over_time,   # cumulative per frame (T)
        "first_capture_hour": first_capture,
        "coverage_pct": round(coverage_pct, 2),
        "current_assisted_distance": round(current_drift, 2),  # ocean drift, domain units
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
    debris = debris.clamp(0.5, 49.5)  # keep spawn points inside the 0–50 domain for the UI

    # ---- Random patrol baseline ----
    random_controls = torch.randn(steps, params.num_vessels, 2, device=device)
    random = _simulate_strategy(field, random_controls, 1.0, initial_vessels, debris, steps, dt)

    # ---- Aqualign gradient optimization ----
    weights = OBJECTIVES.get(params.objective, OBJECTIVES["balanced"])
    opt = RouteOptimizer(
        field,
        params.num_vessels,
        steps,
        dt,
        w_collection=weights["w_collection"],
        w_fuel=weights["w_fuel"],
        boundary_penalty=params.boundary_penalty,
    )
    history = opt.run_optimization(initial_vessels, debris, iterations=params.iterations, lr=params.learning_rate)
    final_controls = opt.controls.detach()
    optimized = _simulate_strategy(field, final_controls, 1.5, initial_vessels, debris, steps, dt)

    efficiency_gain = ((optimized["collected"] / max(1, random["collected"])) - 1) * 100
    effort_saved = random["control_effort"] - optimized["control_effort"]
    effort_saved_pct = (effort_saved / max(1.0, random["control_effort"])) * 100

    return {
        "params": asdict(params),
        "field": _field_sample(field),
        "domain": {"x_max": float(field.x_max), "y_max": float(field.y_max)},
        "initial_vessels": initial_vessels.cpu().tolist(),
        "debris": debris.cpu().tolist(),  # [M, 2] start positions — front-end renders these
        "random": random,
        "optimized": optimized,
        "metrics": {
            "random_collected": random["collected"],
            "optimized_collected": optimized["collected"],
            "random_unique_captures": random["collected"],
            "unique_captures": optimized["collected"],
            "random_control_effort": random["control_effort"],
            "optimized_control_effort": optimized["control_effort"],
            "control_effort_saved": round(effort_saved, 1),
            "control_effort_saved_pct": round(effort_saved_pct, 1),
            "efficiency_gain": round(efficiency_gain, 1),
            "coverage_pct": optimized["coverage_pct"],
            "random_coverage_pct": random["coverage_pct"],
            "first_capture_hour": optimized["first_capture_hour"],
            "random_first_capture_hour": random["first_capture_hour"],
            "current_assisted_distance": optimized["current_assisted_distance"],
            "random_current_assisted_distance": random["current_assisted_distance"],
            "total_debris": params.debris_count,
        },
        "optimization_history": [
            {"iter": i, "loss": h["loss"], "collected": h["collected_metric"], "control_effort": h["fuel_metric"]}
            for i, h in enumerate(history)
        ],
    }