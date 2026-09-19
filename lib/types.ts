export type Objective = "balanced" | "max_collection" | "min_control_effort";

export type MissionRequest = {
  num_vessels: number;
  horizon: number;
  iterations: number;
  learning_rate: number;
  seed: number;
  debris_count: number;
  debris_spread: number;
  objective?: Objective;
  boundary_penalty?: boolean;
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
  control_effort: number;
  captures_over_time: number[]; // cumulative unique captures per frame (length horizon + 1)
  first_capture_hour: number | null;
  coverage_pct: number;
  current_assisted_distance: number;
  trajectory: Trajectory;
};

export type MissionMetrics = {
  random_collected: number;
  optimized_collected: number;
  random_unique_captures: number;
  unique_captures: number;
  random_control_effort: number;
  optimized_control_effort: number;
  control_effort_saved: number;
  control_effort_saved_pct: number;
  efficiency_gain: number;
  coverage_pct: number;
  random_coverage_pct: number;
  first_capture_hour: number | null;
  random_first_capture_hour: number | null;
  current_assisted_distance: number;
  random_current_assisted_distance: number;
  total_debris: number;
};

export type OptimizationStep = {
  iter: number;
  loss: number;
  collected: number;
  control_effort: number;
};

export type MissionMeta = {
  latency_ms: number;
  mission_id: string | null;
  created_at: string;
};

export type MissionResult = {
  params: MissionRequest;
  field: VelocityField;
  domain: { x_max: number; y_max: number };
  random: StrategyResult;
  optimized: StrategyResult;
  metrics: MissionMetrics;
  optimization_history: OptimizationStep[];
  meta: MissionMeta;
  debris: number[][];
};

export type SavedMissionSummary = {
  missionId: string;
  createdAt: string;
  params: MissionRequest;
  metrics: MissionMetrics;
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