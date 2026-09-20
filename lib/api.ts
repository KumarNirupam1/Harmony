import { generateMockMission } from "./mock-mission";
import type { MissionMetrics, MissionRequest, MissionResult, SavedMissionSummary } from "./types";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export function apiBase() {
  return API_BASE;
}

export function staticExplanation(params: MissionRequest, metrics: MissionMetrics): string {
  const vessels = params.num_vessels ?? "?";
  const collected = metrics.optimized_collected ?? "?";
  const total = metrics.total_debris ?? "?";
  const gain = metrics.efficiency_gain;
  const saved = metrics.control_effort_saved_pct;
  const first = metrics.first_capture_hour;
  const parts = [
    `A fleet of ${vessels} vessels intercepted ${collected} of ${total} pieces of debris by learning to ride the ocean currents instead of motoring across them.`,
  ];
  if (gain != null) {
    parts.push(`That is a ${gain}% recovery gain over a random patrol on the same field.`);
  }
  if (saved != null) {
    parts.push(`Meanwhile, control effort fell ${saved}% — targeted routing does the work.`);
  }
  if (first != null) {
    parts.push(`The first catch came as early as hour ${first}.`);
  }
  return parts.join(" ");
}

export async function runMission(body: MissionRequest): Promise<MissionResult> {
  try {
    const res = await fetch(`${API_BASE}/mission`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let detail = `mission failed: ${res.status}`;
      try {
        const payload = (await res.json()) as { detail?: unknown };
        if (typeof payload.detail === "string") detail = payload.detail;
        else if (payload.detail) detail = JSON.stringify(payload.detail);
      } catch {
        /* keep status text */
      }
      throw new Error(detail);
    }

    const data = (await res.json()) as MissionResult;
    if (!data.debris?.length) {
      data.debris = generateMockMission(body).debris;
    }
    data.engine = "backend";
    data.initial_vessels ??= data.random.trajectory[0];
    return data;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("mission failed")) {
      throw error;
    }
    const mock = generateMockMission(body);
    mock.engine = "synthetic";
    return mock;
  }
}

export type ExplainResult = {
  explanation: string;
  source: "openai" | "static";
};

export async function explainMission(
  params: MissionRequest,
  metrics: MissionMetrics,
): Promise<ExplainResult> {
  const fallback: ExplainResult = {
    explanation: staticExplanation(params, metrics),
    source: "static",
  };
  try {
    const res = await fetch(`${API_BASE}/api/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ params, metrics }),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { explanation?: string; source?: string };
    if (typeof data.explanation !== "string" || !data.explanation.trim()) return fallback;
    return {
      explanation: data.explanation.trim(),
      source: data.source === "openai" ? "openai" : "static",
    };
  } catch {
    return fallback;
  }
}

export async function fetchMissions(): Promise<SavedMissionSummary[]> {
  try {
    const res = await fetch(`${API_BASE}/api/missions`);
    if (!res.ok) return [];
    const data = (await res.json()) as { missions?: SavedMissionSummary[] };
    return Array.isArray(data.missions) ? data.missions : [];
  } catch {
    return [];
  }
}
