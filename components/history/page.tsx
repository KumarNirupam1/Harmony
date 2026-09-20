"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { fetchMissions } from "@/lib/api";
import {
  clearMissions,
  loadMissions,
  mergeMissions,
  type SavedMission,
} from "@/lib/history";
import type { MissionMetrics } from "@/lib/types";

function effortSaved(metrics: MissionMetrics) {
  return (
    metrics.control_effort_saved_pct ??
    (metrics as MissionMetrics & { fuel_saved_pct?: number }).fuel_saved_pct ??
    (metrics as MissionMetrics & { fuel_saved?: number }).fuel_saved ??
    0
  );
}

export default function History() {
  const [rows, setRows] = useState<SavedMission[]>([]);
  const [source, setSource] = useState<"mixed" | "local">("mixed");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadMissions();
      const server = await fetchMissions();
      if (cancelled) return;
      setSource(server.length ? "mixed" : "local");
      setRows(mergeMissions(server, local));
    })().catch(() => {
      if (!cancelled) {
        setSource("local");
        setRows(loadMissions());
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pt-20 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.24em] text-accent uppercase">
              DynamoDB
            </p>
            <h1 className="font-display mt-2 text-5xl tracking-tight">Mission history</h1>
            <p className="mt-3 max-w-lg text-sm text-muted">
              Server runs land in DynamoDB and are merged with this browser&apos;s local
              mirror. Replay posts the same params — there is no get-by-id endpoint.
              {source === "local" ? " Showing the offline mirror only." : ""}
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={async () => {
              clearMissions();
              const server = await fetchMissions();
              setRows(mergeMissions(server, []));
              setSource(server.length ? "mixed" : "local");
            }}
          >
            Clear local
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="soft-card mt-10 px-8 py-16 text-center">
            <p className="font-display text-3xl">No missions yet</p>
            <p className="mt-2 text-sm text-muted">Run the planner once and it will land here.</p>
            <Link href="/planner" className="btn-primary mt-6">
              Open sandbox
            </Link>
          </div>
        ) : (
          <ul className="mt-10 grid gap-4">
            {rows.map((m) => (
              <li key={m.id} className="soft-card flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-sm font-medium">
                    {m.params.num_vessels} vessels · {m.params.horizon}h · seed {m.params.seed}
                    {m.params.objective ? ` · ${m.params.objective.replace(/_/g, " ")}` : ""}
                    {m.params.boundary_penalty ? " · boundary" : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(m.createdAt).toLocaleString()} · gain {m.metrics.efficiency_gain ?? 0}% ·
                    effort saved {effortSaved(m.metrics)}%
                  </p>
                </div>
                <Link href={`/planner/?id=${encodeURIComponent(m.id)}`} className="btn-ghost">
                  Replay in sandbox
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
