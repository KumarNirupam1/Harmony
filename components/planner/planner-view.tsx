"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { fetchMissions, runMission } from "@/lib/api";
import { findMission, loadMissions, mergeMissions, saveMission } from "@/lib/history";
import {
  DEFAULT_MISSION,
  type MissionRequest,
  type MissionResult,
  type Objective,
} from "@/lib/types";
import { MissionCanvas } from "../playground/mission-canvas";
import { KpiStrip } from "./kpi-strip";
import { LossSparkline } from "./loss-sparkline";
import { CopilotPanel } from "./copilot-panel";
import { Footer } from "../landing/footer";
import { Navbar } from "../landing/navbar";

const OBJECTIVES: { id: Objective; label: string }[] = [
  { id: "balanced", label: "Balanced" },
  { id: "max_collection", label: "Max collection" },
  { id: "min_control_effort", label: "Min control effort" },
];

export function PlannerView() {
  const [form, setForm] = useState<MissionRequest>(DEFAULT_MISSION);
  const [mission, setMission] = useState<MissionResult | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [chromeHidden, setChromeHidden] = useState(false);
  const started = useRef(0);
  const replayed = useRef(false);

  const maxFrame = Math.max(0, (mission?.random.trajectory.length ?? 1) - 1);

  useEffect(() => {
    if (status !== "running") return;
    started.current = performance.now();
    const id = window.setInterval(() => {
      setElapsed(Math.round(performance.now() - started.current));
    }, 80);
    return () => window.clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (!mission || !playing || status !== "success") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (now - last > 140) {
        last = now;
        setFrame((f) => (f >= maxFrame ? 0 : f + 0.35));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mission, playing, status, maxFrame]);

  async function execute(req: MissionRequest) {
    setForm(req);
    setStatus("running");
    setError("");
    setElapsed(0);
    const t0 = performance.now();
    try {
      const result = await runMission(req);
      const wait = 900 - (performance.now() - t0);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      setMission(result);
      setFrame(0);
      setPlaying(true);
      setStatus("success");
      saveMission(result.params, result.metrics, result.meta?.mission_id);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not run this mission.");
    }
  }

  useEffect(() => {
    if (replayed.current) return;
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    replayed.current = true;
    let cancelled = false;
    (async () => {
      const local = loadMissions();
      let row = findMission(id, local);
      if (!row) {
        row = findMission(id, mergeMissions(await fetchMissions(), local));
      }
      if (!row || cancelled) return;
      await execute({ ...DEFAULT_MISSION, ...row.params });
    })().catch(() => {
      /* offline replay still uses mock via execute */
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function reset() {
    setMission(null);
    setStatus("idle");
    setError("");
    setFrame(0);
    setForm(DEFAULT_MISSION);
  }

  function download() {
    if (!mission) return;
    const blob = new Blob([JSON.stringify(mission, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `harmony-mission-${mission.params.seed}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const fields = useMemo(
    () =>
      [
        { key: "num_vessels", label: "Vessels", min: 1, max: 6, step: 1 },
        { key: "horizon", label: "Horizon (h)", min: 12, max: 168, step: 1 },
        { key: "iterations", label: "Iterations", min: 20, max: 600, step: 10 },
        { key: "learning_rate", label: "Learning rate", min: 0.01, max: 0.5, step: 0.01 },
        { key: "seed", label: "Seed", min: 0, max: 1000000, step: 1 },
        { key: "debris_count", label: "Debris count", min: 50, max: 1000, step: 10 },
        { key: "debris_spread", label: "Debris spread", min: 1, max: 50, step: 0.5 },
      ] as const,
    [],
  );

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      {!chromeHidden && <Navbar />}

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-10 pb-10 sm:px-6">
        {!chromeHidden && (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-accent uppercase">
                Sandbox
              </p>
              <h1 className="font-display mt-1 text-4xl tracking-tight">Mission planner</h1>
              <p className="mt-2 max-w-xl text-sm text-muted">
                Configure a fleet, pick an objective, run the differentiable solver, then
                scrub Harmony against a random patrol on the same current field.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/history" className="btn-ghost">
                History
              </Link>
              <button type="button" className="btn-ghost" onClick={() => setChromeHidden(true)}>
                Hide chrome
              </button>
            </div>
          </div>
        )}

        {chromeHidden && (
          <button
            type="button"
            className="btn-ghost mb-4 self-end"
            onClick={() => setChromeHidden(false)}
          >
            Show chrome
          </button>
        )}

        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="soft-card h-fit p-5">
            <p className="text-sm font-semibold">Mission request</p>
            <p className="mt-1 text-xs text-muted">Posted to `POST /mission` · tens of seconds on Lambda</p>

            <p className="mt-4 text-[11px] tracking-[0.16em] text-muted uppercase">Objective</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {OBJECTIVES.map((opt) => {
                const active = (form.objective ?? "balanced") === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase ${
                      active
                        ? "bg-accent text-white"
                        : "border border-border bg-panel text-muted"
                    }`}
                    onClick={() => setForm((prev) => ({ ...prev, objective: opt.id }))}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-panel-2 px-3 py-2.5 text-xs">
              <span>
                <span className="font-medium text-foreground">Boundary penalty</span>
                <span className="mt-0.5 block text-muted">Keep boats inside the domain</span>
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--accent)]"
                checked={Boolean(form.boundary_penalty)}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, boundary_penalty: e.target.checked }))
                }
              />
            </label>

            <div className="mt-4 space-y-3">
              {fields.map((f) => (
                <label key={f.key} className="block text-xs">
                  <span className="flex items-center justify-between text-muted">
                    {f.label}
                    <span className="font-mono text-foreground">{form[f.key]}</span>
                  </span>
                  <input
                    className="mt-1 w-full accent-[var(--accent)]"
                    type="range"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={form[f.key]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))
                    }
                  />
                </label>
              ))}
            </div>

            <button
              type="button"
              className="btn-primary mt-5 w-full justify-center disabled:opacity-50"
              disabled={status === "running"}
              onClick={() => execute(form)}
            >
              {status === "running" ? `Running · ${elapsed} ms` : "Run mission"}
            </button>
            <div className="mt-2 flex gap-2">
              <button type="button" className="btn-ghost flex-1 justify-center" onClick={reset}>
                + New mission
              </button>
              <button
                type="button"
                className="btn-ghost flex-1 justify-center disabled:opacity-40"
                disabled={!mission}
                onClick={download}
              >
                Download
              </button>
            </div>

            {status === "error" && (
              <p className="mt-4 rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-200">
                {error}{" "}
                <button className="underline" type="button" onClick={() => execute(form)}>
                  Retry
                </button>
              </p>
            )}

            <div className="mt-6 space-y-3 rounded-2xl bg-panel-2 p-3 text-xs leading-5 text-muted">
              <p>
                <strong className="text-foreground">Learn.</strong> Differentiable physics
                unrolls RK4 advection, then backprops capture vs control effort through every
                hour.
              </p>
              <p>
                <strong className="text-foreground">History is in DynamoDB.</strong> Successful
                runs persist server-side and mirror in this browser for offline replay.
              </p>
            </div>
          </aside>

          <div className="flex min-h-[560px] flex-col gap-4">
            <div className="soft-card relative min-h-[480px] flex-1 overflow-hidden p-3">
              {status === "idle" && (
                <div className="relative grid h-full min-h-[480px] place-items-center overflow-hidden rounded-[22px] px-8 text-center">
                  <Image
                    src="/fleet.jpg"
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover opacity-35"
                  />
                  <div className="absolute inset-0 bg-background/55 dark:bg-background/70" />
                  <div className="relative">
                    <p className="font-display text-3xl">Ready when you are</p>
                    <p className="mt-2 max-w-md text-sm text-muted">
                      Hit Run mission. The intercept map shows Harmony boats against a
                      random patrol on the same gyre — even if the API is offline.
                    </p>
                  </div>
                </div>
              )}
              {status === "running" && (
                <div className="grid h-full min-h-[480px] place-items-center">
                  <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <p className="mt-4 text-sm text-muted">Solving intercept routes… {elapsed} ms</p>
                  </div>
                </div>
              )}
              {mission && status === "success" && (
                <MissionCanvas mission={mission} frame={frame} className="h-[520px]" />
              )}
            </div>

            {mission && status === "success" && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" className="btn-primary" onClick={() => setPlaying((p) => !p)}>
                    {playing ? "Pause" : "Play"}
                  </button>
                  <input
                    className="h-1.5 min-w-[180px] flex-1 accent-[var(--accent)]"
                    type="range"
                    min={0}
                    max={maxFrame}
                    value={Math.min(maxFrame, Math.floor(frame))}
                    onChange={(e) => {
                      setPlaying(false);
                      setFrame(Number(e.target.value));
                    }}
                  />
                </div>
                <KpiStrip metrics={mission.metrics} active />
                <div className="soft-card p-5">
                  <LossSparkline history={mission.optimization_history} />
                </div>
                <CopilotPanel params={mission.params} metrics={mission.metrics} />
              </>
            )}
          </div>
        </div>
      </main>

      {!chromeHidden && <Footer />}
    </div>
  );
}
