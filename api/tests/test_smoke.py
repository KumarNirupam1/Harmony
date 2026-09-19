"""Smoke tests for the Harmony backend contract (no AWS needed).

These run a small mission (short horizon + few iterations) so CI stays fast,
and assert the frozen API shape the frontend depends on.
"""
from app.explain import explain_mission
from app.runner import MissionParams, run_mission


def _quick_params() -> MissionParams:
    return MissionParams(num_vessels=2, horizon=24, iterations=20, debris_count=50, seed=7)


def test_run_mission_contract_shape():
    result = run_mission(_quick_params())
    assert result["params"]["debris_count"] == 50
    assert result["debris"] and len(result["debris"]) == 50
    assert result["domain"]["x_max"] == 50.0
    for key in ("x", "y", "u", "v", "mag"):
        assert key in result["field"]

    for strat in ("random", "optimized"):
        s = result[strat]
        assert s["collected"] >= 0
        assert s["control_effort"] >= 0.0
        # captures_over_time: length horizon + 1, monotonic, <= collected
        cot = s["captures_over_time"]
        assert len(cot) == 25
        assert cot[-1] == s["collected"]
        assert all(b >= a for a, b in zip(cot, cot[1:]))
        assert len(s["trajectory"]) == 25

    m = result["metrics"]
    for key in (
        "random_collected",
        "optimized_collected",
        "random_control_effort",
        "optimized_control_effort",
        "control_effort_saved_pct",
        "efficiency_gain",
        "coverage_pct",
        "random_coverage_pct",
        "first_capture_hour",
        "current_assisted_distance",
        "total_debris",
    ):
        assert key in m, f"metrics missing {key}"
    assert len(result["optimization_history"]) == 20
    assert "control_effort" in result["optimization_history"][0]


def test_explain_falls_back_to_static_without_key():
    out = explain_mission(
        {"num_vessels": 3, "horizon": 72},
        {"optimized_collected": 7, "total_debris": 200, "efficiency_gain": 16.7, "control_effort_saved_pct": 63.5},
    )
    assert out["source"] == "static"
    assert "7 of 200" in out["explanation"]


def test_run_is_deterministic_for_seed():
    a = run_mission(_quick_params())
    b = run_mission(_quick_params())
    assert a["metrics"]["optimized_collected"] == b["metrics"]["optimized_collected"]
    assert a["optimization_history"][-1]["loss"] == b["optimization_history"][-1]["loss"]


def test_objective_presets_and_boundary_flag():
    base = _quick_params()
    base.objective = "max_collection"
    base.boundary_penalty = True
    result = run_mission(base)
    # objective flag survives the params echo AND the optimizer runs with it
    assert result["params"]["objective"] == "max_collection"
    assert result["params"]["boundary_penalty"] is True
    assert len(result["optimization_history"]) == 20


def test_unknown_objective_falls_back_to_balanced():
    p = _quick_params()
    p.objective = "does-not-exist"
    result = run_mission(p)
    assert result["optimization_history"][-1]["loss"] != float("inf")