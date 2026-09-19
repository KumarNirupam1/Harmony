import type { MissionRequest, MissionMetrics } from "./types";

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

export function saveMission(params: MissionRequest, metrics: MissionMetrics) {
  const next: SavedMission = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    params,
    metrics,
  };
  const all = [next, ...loadMissions()].slice(0, 12);
  localStorage.setItem(KEY, JSON.stringify(all));
  return next;
}

export function clearMissions() {
  localStorage.removeItem(KEY);
}
