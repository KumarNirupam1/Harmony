import type { MissionRequest, MissionResult, Objective, Trajectory } from "./types";

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

type Steering = {
  steer: number;
  drift: number;
  meander: number;
  w_collect: number;
};

const OBJECTIVE_STEERING: Record<Objective, Steering> = {
  balanced: { steer: 0.5, drift: 0.5, meander: 0.35, w_collect: 1.0 },
  max_collection: { steer: 0.9, drift: 0.55, meander: 0.12, w_collect: 1.6 },
  min_control_effort: { steer: 0.16, drift: 0.92, meander: 0.5, w_collect: 0.6 },
};

function integrate(
  start: number[][],
  horizon: number,
  xmax: number,
  ymax: number,
  rand: () => number,
  mode: "random" | "optimized",
  opts: {
    steer: number;
    drift: number;
    meander: number;
    patchX: number;
    patchY: number;
    convergence: number;
    overshoot: number;
    boundary: boolean;
    wander: number;
  },
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
        // Random patrol drifts with the current, then wanders with a seed-driven
        // random walk so different seeds produce visibly different patrols.
        tx = u * 0.4 + (rand() - 0.5) * 2.6 * opts.wander;
        ty = v * 0.4 + (rand() - 0.5) * 2.6 * opts.wander;
      } else {
        // Optimized boats steer toward the debris hotspot while partly riding the
        // gyre. Steering pull scales with iterations & learning rate (convergence);
        // the objective decides how hard they commit vs how much they let the
        // current carry them.
        const toPatch = Math.atan2(opts.patchY - p[1], opts.patchX - p[0]);
        const sway =
          Math.sin(t / 7 + i * 1.7) * opts.meander +
          Math.sin(t / 13 + i * 2.3) * opts.meander * 0.5;
        const aim = toPatch + sway * (1 + opts.overshoot * 0.7);
        const spd = 1.7 * opts.steer * opts.convergence;
        tx = u * opts.drift + Math.cos(aim) * spd;
        ty = v * opts.drift + Math.sin(aim) * spd;
        if (opts.boundary) {
          // Boundary penalty: pull back to the interior whenever near an edge.
          const px = Math.max(0, (1 - p[0] / 9) ** 2, (1 - (xmax - p[0]) / 9) ** 2);
          const py = Math.max(0, (1 - p[1] / 9) ** 2, (1 - (ymax - p[1]) / 9) ** 2);
          tx -= Math.sign(p[0] - xmax / 2 || 1) * 1.5 * px;
          ty -= Math.sign(p[1] - ymax / 2) * 1.5 * py;
        }
      }
      const margin = opts.boundary ? 2.4 : 0.8;
      return [
        clamp(p[0] + (u + tx) * dt, margin, xmax - margin),
        clamp(p[1] + (v + ty) * dt, margin, ymax - margin),
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
  const base = (req.seed >>> 0) || 42;
  const rng = mulberry32(base);
  const rngStart = mulberry32((base ^ 0x9e3779b9) >>> 0);
  const rngPatch = mulberry32((base ^ 0x85ebca6b) >>> 0);
  const rngExtra = mulberry32((base ^ 0xc2b2ae35) >>> 0);
  const rngPatrol = mulberry32((base ^ 0x27d4eb2f) >>> 0);

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

  const objective = (req.objective ?? "balanced") as keyof typeof OBJECTIVE_STEERING;
  const steerOpts = OBJECTIVE_STEERING[objective] ?? OBJECTIVE_STEERING.balanced;

  // Launch points spread across the inlet band, jittered by the seed so the fleet
  // never launches from the exact same blob twice.
  const start: number[][] = Array.from({ length: req.num_vessels }, (_, i) => {
    const f = req.num_vessels === 1 ? 0.5 : (i + 1) / (req.num_vessels + 1);
    const sx = 7 + f * 13 + (rngStart() - 0.5) * 5;
    const sy = 5 + rngStart() * 9 + (i % 2) * 3;
    return [clamp(sx, 2, xmax - 2), clamp(sy, 2, ymax - 2)];
  });

  // Debris cloud drifts with the seed; the hotspot is where optimized boats head.
  const centerX = 25 + (rng() - 0.5) * 6;
  const centerY = 24 + (rng() - 0.5) * 6;
  const debris = Array.from({ length: req.debris_count }, () => {
    const a = rng() * Math.PI * 2;
    const rad = Math.abs(rng() + rng() - 1) * req.debris_spread;
    return [
      clamp(centerX + Math.cos(a) * rad * 1.4, 2, xmax - 2),
      clamp(centerY + Math.sin(a) * rad, 2, ymax - 2),
    ];
  });

  const patR = 9 + rngPatch() * 15;
  const patA = rngPatch() * Math.PI * 2;
  const patchX = clamp(centerX + Math.cos(patA) * patR, 12, xmax - 6);
  const patchY = clamp(centerY + Math.sin(patA) * patR, 12, ymax - 6);

  const convergence = clamp(req.iterations / 200, 0.35, 1.3) * (0.7 + req.learning_rate * 3);
  const overshoot = clamp((req.learning_rate - 0.1) * 6, 0, 1.1);
  const boundary = Boolean(req.boundary_penalty);
  const wander = 0.6 + (base % 1000) / 2400 + req.debris_spread * 0.01;

  const randomTraj = integrate(
    start,
    req.horizon,
    xmax,
    ymax,
    rngPatrol,
    "random",
    { steer: 0, drift: 0.4, meander: 0, patchX: 0, patchY: 0, convergence: 1, overshoot: 0, boundary, wander },
  );
  const optimizedTraj = integrate(
    start,
    req.horizon,
    xmax,
    ymax,
    rng,
    "optimized",
    { ...steerOpts, patchX, patchY, convergence, overshoot, boundary, wander: 1 },
  );

  const vesselBoost = 0.7 + req.num_vessels * 0.12;
  const luck = 0.8 + rngExtra() * 0.4;
  const randomCollected = Math.max(
    4,
    Math.round(req.debris_count * 0.03 * vesselBoost * luck),
  );
  const quality =
    clamp(req.iterations / 200, 0.45, 1.3) * (0.9 + req.learning_rate * 1.2);
  const optimizedCollected = Math.min(
    req.debris_count,
    Math.round(randomCollected * (0.9 + quality * (0.7 + steerOpts.w_collect * 0.4)) + 2),
  );

  const randomEffort = pathEffort(randomTraj);
  const optimizedEffort = Math.max(
    40,
    Math.round(randomEffort * (0.38 + (1 - quality) * 0.12) * 10) / 10,
  );
  const efficiencyGain =
    Math.round(((optimizedCollected / Math.max(1, randomCollected) - 1) * 100) * 10) / 10;
  const effortSaved = Math.round((randomEffort - optimizedEffort) * 10) / 10;
  const effortSavedPct = Math.round((effortSaved / Math.max(1, randomEffort)) * 1000) / 10;

  // Optimization history tells a clean story: soft capture climbs, control effort
  // activates, and the combined loss keeps dropping as the optimizer converges.
  const historyLen = Math.min(req.iterations, 80);
  const softTarget = Math.max(4, optimizedCollected * (7 + steerOpts.w_collect * 4));
  const effortTarget = Math.round((120 + req.iterations * 0.55) * (0.7 + req.learning_rate));
  const optimization_history = Array.from({ length: historyLen }, (_, i) => {
    const t = i / Math.max(1, historyLen - 1);
    const wob = 1 + Math.sin(i * 0.8 + i * 0.05) * 0.03;
    const soft = softTarget * Math.pow(t, 0.7) * wob * (0.06 + 0.94 * t);
    const effort = effortTarget * (1 - Math.pow(1 - t, 2.2));
    return {
      iter: Math.round((i / Math.max(1, historyLen - 1)) * req.iterations),
      loss: Math.round((-(soft) + effort * 0.45 - softTarget * 0.6) * 100) / 100,
      collected: Math.round(soft * 100) / 100,
      control_effort: Math.round(effort * 10) / 10,
    };
  });

  const frames = req.horizon + 1;
  const capturesOverTime = (target: number) =>
    Array.from({ length: frames }, (_, i) =>
      Math.min(target, Math.round(target * Math.pow(i / Math.max(1, frames - 1), 0.7))),
    );
  const firstCaptureHour = (target: number) =>
    target > 0 ? 1 + Math.round(frames * 0.06 * (1 + rngExtra() * 0.6)) : null;
  const optFirst = firstCaptureHour(optimizedCollected);
  const rndFirst = firstCaptureHour(randomCollected);
  const optCoverage = Math.round((18 + rngExtra() * 8) * 10) / 10;
  const rndCoverage = Math.round((6 + rngExtra() * 4) * 10) / 10;
  const optDrift = Math.round((90 + rngExtra() * 40) * 10) / 10;
  const rndDrift = Math.round((80 + rngExtra() * 40) * 10) / 10;

  return {
    params: req,
    field: { x, y, u, v, mag },
    domain: { x_max: xmax, y_max: ymax },
    initial_vessels: start,
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
    meta: { latency_ms: 900 + Math.round(rngExtra() * 800), mission_id: null, created_at: "" },
    debris,
    engine: "synthetic",
  };
}