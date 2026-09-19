import { generateMockMission } from "./mock-mission";
import type { MissionRequest, MissionResult } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function apiBase() {
  return API_BASE;
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
    return data;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("mission failed")) {
      throw error;
    }
    return generateMockMission(body);
  }
}
