import type { MissionRequest, MissionMetrics, SavedMissionSummary } from "./types";

const KEY = "harmony-missions";

export type SavedMission = {
  id: string;
  createdAt: string;
  params: MissionRequest;
  metrics: MissionMetrics;
};

export function loadMissions(): SavedMission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedMission[]) : [];
  } catch {
    return [];
  }
}

export function saveMission(
  params: MissionRequest,
  metrics: MissionMetrics,
  missionId?: string | null,
) {
  const next: SavedMission = {
    id: missionId || crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    params,
    metrics,
  };
  const rest = loadMissions().filter((row) => row.id !== next.id);
  const all = [next, ...rest].slice(0, 24);
  localStorage.setItem(KEY, JSON.stringify(all));
  return next;
}

export function clearMissions() {
  localStorage.removeItem(KEY);
}

export function mergeMissions(
  server: SavedMissionSummary[],
  local: SavedMission[] = loadMissions(),
): SavedMission[] {
  const mapped: SavedMission[] = server.map((row) => ({
    id: row.missionId,
    createdAt: row.createdAt,
    params: row.params,
    metrics: row.metrics,
  }));
  const byId = new Map<string, SavedMission>();
  for (const row of [...mapped, ...local]) {
    if (row.id && !byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function findMission(id: string, rows: SavedMission[]): SavedMission | undefined {
  return rows.find((row) => row.id === id);
}
