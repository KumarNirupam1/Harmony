"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { OptimizationChart } from "./optimization-chart";
import { CopilotPanel } from "./copilot-panel";
import { Footer } from "../landing/footer";
import { Navbar } from "../landing/navbar";

const OBJECTIVES: { id: Objective; label: string; blurb: string }[] = [
  { id: "balanced", label: "Balanced", blurb: "Capture and effort, both weighted" },
  { id: "max_collection", label: "Max collection", blurb: "Chase the debris hot spot" },
  { id: "min_control_effort", label: "Min control effort", blurb: "Ride the current, save fuel" },
];

const PRESETS: { label: string; blurb: string; values: Partial<MissionRequest> }[] = [
  {
    label: "Quick clean",
    blurb: "2 vessels · 2 days",
    values: { num_vessels: 2, horizon: 48, iterations: 80, learning_rate: 0.08, debris_count: 120, debris_spread: 8 },
  },
  {
    label: "Full sweep",
    blurb: "6 vessels · 6 days",
    values: { num_vessels: 6, horizon: 144, iterations: 300, learning_rate: 0.06, debris_count: 600, debris_spread: 20 },
  },
  {
    label: "Deep dive",
    blurb: "4 vessels · 7 days",
    values: { num_vessels: 4, horizon: 168, iterations: 600, learning_rate: 0.05, debris_count: 300, debris_spread: 12 },
  },
];

const STAGES = ["Configure", "Simulate", "Analyze"];

interface EngineChipProps {
  engine?: "backend" | "synthetic";
  latencyMs?: number;
}

function EngineChip({ engine, latencyMs }: EngineChipProps) {
  if (!engine) return null;
  const live = engine === "backend";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase ${live
        ? "border-[#2ea04355] bg-[#2ea04314] text-[var(--success)]"
        : "border-[#ffb45455] bg-[#ffb45414] text-[#ffb454]"
        }`}
    >
      <i
        className={`h-1.5 w-1.5 rounded-full ${live ? "bg-[var(--success)]" : "bg-[#ffb454]"}`}
        style={{ boxShadow: live ? "0 0 6px var(--success)" : "0 0 6px #ffb454" }}
      />
      {live ? `Live engine · ${latencyMs ?? "?"} ms` : "Offline simulator"}
    </span>
  );
}

function RequestChips({ params }: { params: MissionRequest }) {
  const chips = [
    { label: `${params.num_vessels} vessel${params.num_vessels === 1 ? "" : "s"}`, key: "v" },
    { label: `${params.horizon} h horizon`, key: "h" },
    { label: `${params.iterations} iters`, key: "i" },
    { label: `lr ${params.learning_rate}`, key: "lr" },
    { label: `seed ${params.seed}`, key: "s" },
    ...(params.objective && params.objective !== "balanced"
      ? [{ label: params.objective.replace(/_/g, " "), key: "o" }]
      : []),
    ...(params.boundary_penalty ? [{ label: "boundary", key: "b" }] : []),
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c.key}
          className="rounded-full border border-border bg-panel-2 px-2 py-0.5 font-mono text-[10px] text-muted"
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

function SectionLabel({
  step,
  kicker,
  title,
  aside,
}: {
  step?: number;
  kicker?: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {step != null && (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 font-mono text-xs font-bold text-accent">
            {step}
          </span>
        )}
        {kicker && (
          <span className="h-5 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-[var(--accent)]/40" />
        )}
        <div>
          {kicker && (
            <p className="text-[10px] font-semibold tracking-[0.22em] text-accent uppercase">
              {kicker}
            </p>
          )}
          <h2 className="font-display text-xl tracking-tight">{title}</h2>
        </div>
      </div>
      {aside && <div className="flex flex-wrap items-center gap-2">{aside}</div>}
    </div>
  );
}

type Status = "idle" | "running" | "success" | "error";

function PipelineBar({
  status,
  elapsed,
  onRun,
  onReset,
  onDownload,
}: {
  status: Status;
  elapsed: number;
  onRun: () => void;
  onReset: () => void;
  onDownload: () => void;
}) {
  const activeIdx = status === "running" ? 1 : status === "success" ? 2 : 0;

  return (
    <div className="z-30 rounded-2xl border border-border bg-panel-2 px-3 py-2 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="hidden text-[10px] font-semibold tracking-[0.22em] text-muted uppercase md:block">
            Mission flow
          </span>
          <div className="flex items-center gap-1">
            {STAGES.map((s, i) => (
              <Fragment key={s}>
                {i > 0 && (
                  <span
                    className={`hidden h-px w-5 sm:block ${i - 1 < activeIdx ? "bg-accent" : "bg-border"}`}
                  />
                )}
                <span className="flex items-center gap-1.5 rounded-full px-1 py-0.5">
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold transition ${i <= activeIdx
                      ? "bg-accent text-white shadow-[0_0_10px_rgba(39,179,255,0.5)]"
                      : "border border-border bg-panel-2 text-muted"
                      }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-[11px] font-semibold ${i <= activeIdx ? "text-foreground" : "text-muted"}`}
                  >
                    {s}
                  </span>
                </span>
              </Fragment>
            ))}
          </div>
          {status === "running" && (
            <span className="inline-flex items-center gap-2 font-mono text-[11px] text-accent">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-accent" />
              {(elapsed / 1000).toFixed(1)} s
            </span>
          )}
          {status === "error" && (
            <span className="text-[11px] font-semibold text-[#ff7a59]">Failed — retry above</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary justify-center" onClick={onRun}>
            {status === "running" ? `Running · ${(elapsed / 1000).toFixed(1)} s` : status === "success" ? "Run again" : "Run mission"}
          </button>
          <button type="button" className="btn-ghost justify-center" onClick={onReset}>
            New
          </button>
          <button
            type="button"
            className="btn-ghost justify-center disabled:opacity-40"
            disabled={status !== "success"}
            onClick={onDownload}
          >
            Download
          </button>
          <Link href="/history" className="btn-ghost justify-center">
            History
          </Link>
        </div>
      </div>
    </div>
  );
}

export function PlannerView() {
  const [form, setForm] = useState<MissionRequest>(DEFAULT_MISSION);
  const [mission, setMission] = useState<MissionResult | null>(null);
  const [status, setStatus] = useState<Status>("idle");
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
        { key: "horizon", label: "Horizon", min: 12, max: 168, step: 1 },
        { key: "iterations", label: "Iterations", min: 20, max: 600, step: 10 },
        { key: "learning_rate", label: "Learning rate", min: 0.01, max: 0.5, step: 0.01 },
        { key: "seed", label: "Seed", min: 0, max: 1000000, step: 1 },
        { key: "debris_count", label: "Debris count", min: 50, max: 1000, step: 10 },
        { key: "debris_spread", label: "Debris spread", min: 1, max: 50, step: 0.5 },
      ] as const,
    [],
  );

  const shown = mission?.params ?? form;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      {!chromeHidden && <Navbar />}

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-24 pb-10 sm:px-6">
        {!chromeHidden && (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-accent uppercase">
                Sandbox
              </p>
              <h1 className="font-display mt-1 text-4xl tracking-tight">Mission planner</h1>
              <p className="mt-2 max-w-xl text-sm text-muted">
                Pick a fleet, an objective and a seed, then watch the differentiable solver learn
                a route that beats a random patrol on the same gyre.
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setChromeHidden((c) => !c)}
            >
              {chromeHidden ? "Show chrome" : "Hide chrome"}
            </button>
          </div>
        )}

        {!chromeHidden && (
          <PipelineBar
            status={status}
            elapsed={elapsed}
            onRun={() => execute(shown)}
            onReset={reset}
            onDownload={download}
          />
        )}

        {!chromeHidden && (
          <div className="soft-card mt-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                  Step 1 · Configure
                </p>
                <h2 className="font-display mt-1 text-2xl tracking-tight">Mission setup</h2>
                <p className="mt-1 text-xs text-muted">
                  New seeds spawn fresh trash drifts — every run reproduces exactly by its seed.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, boundary_penalty: !prev.boundary_penalty }))}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${form.boundary_penalty
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border bg-panel text-muted hover:border-accent/40"
                    }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${form.boundary_penalty ? "bg-accent" : "bg-border"}`}
                  />
                  Boundary penalty
                </button>
                {status === "success" && mission && (
                  <EngineChip engine={mission.engine} latencyMs={mission.meta?.latency_ms} />
                )}
                <button
                  type="button"
                  className="btn-primary justify-center disabled:opacity-50"
                  disabled={status === "running"}
                  onClick={() => execute(shown)}
                >
                  {status === "running" ? `Running · ${(elapsed / 1000).toFixed(1)} s` : "Run mission"}
                </button>
              </div>
            </div>

            {status === "error" && (
              <div className="mt-4 rounded-2xl border border-[#ff7a5955] bg-[#ff7a5914] px-3 py-2.5 text-xs leading-5 text-[#ff7a59]">
                <span className="font-semibold">Could not solve this mission.</span>{" "}
                {error || "The Lambda is throttled or unreachable."}{" "}
                <button
                  className="font-semibold underline underline-offset-2"
                  type="button"
                  onClick={() => execute(shown)}
                >
                  Retry →
                </button>
              </div>
            )}

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-panel p-3">
                <p className="text-[11px] tracking-[0.16em] text-muted uppercase">Start from a preset</p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="rounded-xl border border-border bg-panel-2 px-2 py-1.5 text-left transition hover:border-accent/50 hover:bg-accent/10"
                      title={p.blurb}
                      onClick={() => setForm((prev) => ({ ...prev, ...p.values }))}
                    >
                      <span className="block text-[11px] font-semibold text-foreground">{p.label}</span>
                      <span className="block text-[9px] text-muted">{p.blurb}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-panel p-3">
                <p className="text-[11px] tracking-[0.16em] text-muted uppercase">Objective</p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {OBJECTIVES.map((opt) => {
                    const active = (form.objective ?? "balanced") === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={opt.blurb}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-4 py-3 text-[11px] font-semibold transition ${active
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-panel-2 text-muted hover:border-accent/40"
                          }`}
                        onClick={() => setForm((prev) => ({ ...prev, objective: opt.id }))}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${active ? "bg-accent" : "bg-border"}`}
                        />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border pt-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
              {fields.map((f) => (
                <label key={f.key} className="block text-[10px]">
                  <span className="flex items-center justify-between gap-2 text-muted uppercase tracking-wider">
                    <span>{f.label}</span>
                    <span className="font-mono text-foreground normal-case">{form[f.key]}</span>
                  </span>
                  <input
                    className="mt-1.5 w-full accent-[var(--accent)]"
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
          </div>
        )}

        <div className="mt-4 flex min-h-[560px] flex-col gap-5">
          <div className="soft-card p-4">
            <SectionLabel
              step={2}
              kicker="Simulation"
              title="Fleet replay"
              aside={
                status === "success" && mission ? (
                  <RequestChips params={shown} />
                ) : status === "running" ? (
                  <span className="font-mono text-[11px] text-muted">unrolling the gyre…</span>
                ) : undefined
              }
            />
            <div className="relative mt-3 min-h-[480px] overflow-hidden rounded-[22px]">
              {status === "idle" && (
                <div className="relative grid h-full min-h-[480px] place-items-center overflow-hidden rounded-[22px] px-8 py-10 text-center">
                  <Image
                    src="/fleet.jpg"
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover opacity-30"
                  />
                  <div className="absolute inset-0 bg-background/60 dark:bg-background/70" />
                  <div className="relative w-full max-w-lg">
                    <p className="font-display text-3xl">Ready when you are</p>
                    <p className="mt-2 text-sm text-muted">
                      Everything is set up above — hit Run mission and the fleet will launch fresh
                      each time.
                    </p>
                    <div className="mt-6 grid gap-2 text-left sm:grid-cols-3">
                      {STAGES.map((s, i) => (
                        <div
                          key={s}
                          className="rounded-2xl border border-border bg-panel/80 p-3 backdrop-blur-sm"
                        >
                          <span className="font-mono text-[10px] text-accent">0{i + 1}</span>
                          <p className="mt-0.5 text-xs font-semibold text-foreground">{s}</p>
                          <p className="mt-1 text-[10px] leading-4 text-muted">
                            {i === 0
                              ? "Fleet, objective & seed — all in the band above."
                              : i === 1
                                ? "Adam solves the route. Watch boats steer to the hot spot."
                                : "KPI bar, convergence chart and the Copilot verdict."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {status === "running" && (
                <div className="grid h-full min-h-[480px] place-items-center">
                  <div className="w-full max-w-sm px-6 text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <p className="mt-4 text-sm font-medium text-foreground">
                      Downloading storm track… {(elapsed / 1000).toFixed(1)} s
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Unrolling {shown.horizon} hours of gyre for {shown.num_vessels} vessels
                      across {shown.iterations} optimizer iterations.
                    </p>
                    <div className="mt-4 h-1 overflow-hidden rounded-full bg-foreground/10">
                      <div className="h-full w-[40%] animate-pulse rounded-full bg-accent" />
                    </div>
                  </div>
                </div>
              )}
              {mission && status === "success" && (
                <MissionCanvas mission={mission} frame={frame} className="h-[540px]" />
              )}
            </div>

            {mission && status === "success" && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-panel-2 px-3 py-2.5">
                <span className="text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">
                  Playback
                </span>
                <button
                  type="button"
                  className="btn-primary px-3 py-1.5 text-xs"
                  onClick={() => setPlaying((p) => !p)}
                >
                  {playing ? "Pause" : "Play"}
                </button>
                <input
                  className="h-1.5 min-w-[140px] flex-1 accent-[var(--accent)]"
                  type="range"
                  min={0}
                  max={maxFrame}
                  value={Math.min(maxFrame, Math.floor(frame))}
                  onChange={(e) => {
                    setPlaying(false);
                    setFrame(Number(e.target.value));
                  }}
                />
                <span className="font-mono text-[11px] text-muted">
                  t = {Math.min(mission.params.horizon, Math.floor(frame))} h
                </span>
              </div>
            )}
          </div>

          {mission && status === "success" && (
            <>
              <SectionLabel step={3} kicker="Replay complete" title="Mission results" />
              <KpiStrip metrics={mission.metrics} active />

              <div className="soft-card p-5">
                <SectionLabel step={4} kicker="Gradient through time" title="Convergence" />
                <div className="mt-2">
                  <OptimizationChart
                    history={mission.optimization_history}
                    metrics={mission.metrics}
                  />
                </div>
              </div>

              <CopilotPanel params={mission.params} metrics={mission.metrics} />
            </>
          )}
        </div>
      </main>

      {!chromeHidden && <Footer />}
    </div>
  );
}