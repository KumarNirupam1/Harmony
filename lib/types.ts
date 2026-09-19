export type MissionRequest = {
  num_vessels: number;
  horizon: number;
  iterations: number;
  learning_rate: number;
  seed: number;
  debris_count: number;
  debris_spread: number;
};

export type Trajectory = number[][][]; // [time][vessel][x, y]

export type VelocityField = {
  x: number[];
  y: number[];
  u: number[][];
  v: number[][];
  mag: number[][];
};

export type StrategyResult = {
  collected: number;
  fuel: number;
  trajectory: Trajectory;
};

export type MissionMetrics = {
  random_collected: number;
  optimized_collected: number;
  random_fuel: number;
  optimized_fuel: number;
  efficiency_gain: number;
  fuel_saved: number;
  fuel_saved_pct: number;
  total_debris: number;
};

export type OptimizationStep = {
  iter: number;
  loss: number;
  collected: number;
  fuel: number;
};

export type MissionResult = {
  params: MissionRequest;
  field: VelocityField;
  domain: { x_max: number; y_max: number };
  random: StrategyResult;
  optimized: StrategyResult;
  metrics: MissionMetrics;
  optimization_history: OptimizationStep[];
  meta: { latency_ms: number };
  debris: number[][];
};

export const DEFAULT_MISSION: MissionRequest = {
  num_vessels: 3,
  horizon: 72,
  iterations: 200,
  learning_rate: 0.1,
  seed: 42,
  debris_count: 200,
  debris_spread: 15,
};
