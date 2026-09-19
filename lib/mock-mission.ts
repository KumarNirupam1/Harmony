import type { MissionRequest, MissionResult, Trajectory } from "./types";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gyre(x: number, y: number, xmax: number, ymax: number) {
  const xn = (x / xmax) * 2;
  const yn = y / ymax;
  const A = 0.22;
  const f = xn;
  const u = -Math.PI * A * Math.sin(Math.PI * f) * Math.cos(Math.PI * yn);
  const v = Math.PI * A * Math.cos(Math.PI * f) * Math.sin(Math.PI * yn);
  return [u * 6.2, v * 6.2] as const;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function integrate(
  start: number[][],
  horizon: number,
  xmax: number,
  ymax: number,
  rand: () => number,
  mode: "random" | "optimized",
): Trajectory {
  const frames: Trajectory = [start.map((p) => [...p])];
  let pos = start.map((p) => [...p]);
  const dt = 0.55;

  for (let t = 0; t < horizon; t++) {
    pos = pos.map((p, i) => {
      const [u, v] = gyre(p[0], p[1], xmax, ymax);
      let tx = 0;
      let ty = 0;
      if (mode === "random") {
        tx = (rand() - 0.5) * 2.4;
        ty = (rand() - 0.5) * 2.4;
      } else {
        const targetX = 18 + ((i + 1) / (start.length + 1)) * 14;
        const targetY = 28 + Math.sin(t / 9 + i) * 6;
        tx = (targetX - p[0]) * 0.045;
        ty = (targetY - p[1]) * 0.045;
      }
      return [
        clamp(p[0] + (u + tx) * dt, 0.8, xmax - 0.8),
        clamp(p[1] + (v + ty) * dt, 0.8, ymax - 0.8),
      ];
    });
    frames.push(pos.map((p) => [...p]));
  }
  return frames;
}

function pathEffort(traj: Trajectory) {
  let effort = 0;
  for (let t = 1; t < traj.length; t++) {
    for (let v = 0; v < traj[t].length; v++) {
      const dx = traj[t][v][0] - traj[t - 1][v][0];
      const dy = traj[t][v][1] - traj[t - 1][v][1];
      const [u, velV] = gyre(traj[t - 1][v][0], traj[t - 1][v][1], 50, 50);
      const thrust = Math.hypot(dx - u * 0.55, dy - velV * 0.55);
      effort += thrust * thrust * 8;
    }
  }
  return Math.round(effort * 10) / 10;
}

export function generateMockMission(req: MissionRequest): MissionResult {
  const rand = mulberry32(req.seed);
  const xmax = 50;
  const ymax = 50;
  const n = 25;
  const x = Array.from({ length: n }, (_, i) => (i / (n - 1)) * xmax);
  const y = Array.from({ length: n }, (_, i) => (i / (n - 1)) * ymax);
  const u: number[][] = [];
  const v: number[][] = [];
  const mag: number[][] = [];

  for (let j = 0; j < n; j++) {
    const ur: number[] = [];
    const vr: number[] = [];
    const mr: number[] = [];
    for (let i = 0; i < n; i++) {
      const vel = gyre(x[i], y[j], xmax, ymax);
      ur.push(vel[0]);
      vr.push(vel[1]);
      mr.push(Math.hypot(vel[0], vel[1]));
    }
    u.push(ur);
    v.push(vr);
    mag.push(mr);
  }

  const start: number[][] = Array.from({ length: req.num_vessels }, (_, i) => [
    6 + ((i + 0.5) / req.num_vessels) * 10,
    5 + rand() * 3,
  ]);

  const debris = Array.from({ length: req.debris_count }, () => {
    const a = rand() * Math.PI * 2;
    const r = Math.abs(rand() + rand() - 1) * req.debris_spread;
    return [clamp(25 + Math.cos(a) * r * 1.4, 2, 48), clamp(26 + Math.sin(a) * r, 2, 48)];
  });

  const randomTraj = integrate(start, req.horizon, xmax, ymax, rand, "random");
  const optimizedTraj = integrate(start, req.horizon, xmax, ymax, rand, "optimized");

  const quality = clamp(req.iterations / 200, 0.45, 1.25) * (0.85 + req.learning_rate);
  const vesselBoost = 0.7 + req.num_vessels * 0.12;
  const randomCollected = Math.max(
    4,
    Math.round(req.debris_count * 0.03 * vesselBoost + rand() * 3),
  );
  const optimizedCollected = Math.min(
    req.debris_count,
    Math.round(randomCollected * (1.35 + quality * 0.35) + 2),
  );

  const randomEffort = pathEffort(randomTraj);
  const optimizedEffort = Math.max(40, Math.round(randomEffort * (0.38 + (1 - quality) * 0.12) * 10) / 10);
  const efficiencyGain =
    Math.round(((optimizedCollected / Math.max(1, randomCollected) - 1) * 100) * 10) / 10;
  const effortSaved = Math.round((randomEffort - optimizedEffort) * 10) / 10;
  const effortSavedPct = Math.round((effortSaved / Math.max(1, randomEffort)) * 1000) / 10;

  const historyLen = Math.min(req.iterations, 80);
  const optimization_history = Array.from({ length: historyLen }, (_, i) => {
    const t = i / Math.max(1, historyLen - 1);
    const collected = 120 + t * (optimizedCollected * 12);
    const effort = 40 + (1 - t) * 90;
    return {
      iter: Math.round((i / Math.max(1, historyLen - 1)) * req.iterations),
      loss: Math.round((-collected + effort * 0.4) * 100) / 100,
      collected: Math.round(collected * 100) / 100,
      control_effort: Math.round(effort * 10) / 10,
    };
  });

  const frames = req.horizon + 1;
  const capturesOverTime = (target: number) =>
    Array.from({ length: frames }, (_, i) =>
      Math.min(target, Math.round(target * Math.pow(i / Math.max(1, frames - 1), 0.7))),
    );
  const firstCaptureHour = (target: number) =>
    target > 0 ? 1 + Math.round(frames * 0.08 * (1 + rand() * 0.5)) : null;
  const optFirst = firstCaptureHour(optimizedCollected);
  const rndFirst = firstCaptureHour(randomCollected);
  const optCoverage = Math.round((18 + rand() * 8) * 10) / 10;
  const rndCoverage = Math.round((6 + rand() * 4) * 10) / 10;
  const optDrift = Math.round((90 + rand() * 40) * 10) / 10;
  const rndDrift = Math.round((80 + rand() * 40) * 10) / 10;

  return {
    params: req,
    field: { x, y, u, v, mag },
    domain: { x_max: xmax, y_max: ymax },
    random: {
      collected: randomCollected,
      control_effort: randomEffort,
      captures_over_time: capturesOverTime(randomCollected),
      first_capture_hour: rndFirst,
      coverage_pct: rndCoverage,
      current_assisted_distance: rndDrift,
      trajectory: randomTraj,
    },
    optimized: {
      collected: optimizedCollected,
      control_effort: optimizedEffort,
      captures_over_time: capturesOverTime(optimizedCollected),
      first_capture_hour: optFirst,
      coverage_pct: optCoverage,
      current_assisted_distance: optDrift,
      trajectory: optimizedTraj,
    },
    metrics: {
      random_collected: randomCollected,
      optimized_collected: optimizedCollected,
      random_unique_captures: randomCollected,
      unique_captures: optimizedCollected,
      random_control_effort: randomEffort,
      optimized_control_effort: optimizedEffort,
      control_effort_saved: effortSaved,
      control_effort_saved_pct: effortSavedPct,
      efficiency_gain: efficiencyGain,
      coverage_pct: optCoverage,
      random_coverage_pct: rndCoverage,
      first_capture_hour: optFirst,
      random_first_capture_hour: rndFirst,
      current_assisted_distance: optDrift,
      random_current_assisted_distance: rndDrift,
      total_debris: req.debris_count,
    },
    optimization_history,
    meta: { latency_ms: 1800 + Math.round(rand() * 900), mission_id: null, created_at: "" },
    debris,
  };
}
