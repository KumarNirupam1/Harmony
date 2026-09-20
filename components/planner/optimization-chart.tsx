"use client";

import { useMemo, useState } from "react";
import type { MissionMetrics, OptimizationStep } from "@/lib/types";

function norm(v: number, min: number, max: number) {
  if (max - min < 1e-9) return 0.5;
  return (v - min) / (max - min);
}

function rangeOf(values: number[], fallbackMax: number) {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!isFinite(min) || !isFinite(max)) return { min: 0, max: fallbackMax };
  if (min === max) max = min === 0 ? max + fallbackMax : max * 1.1;
  return { min, max };
}

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

const COLORS = {
  loss: "#ff7a59",
  capture: "#27b3ff",
  effort: "#ffb454",
};

const W = 640;
const H = 260;
const PX = 30;
const PT = 22;
const PW = W - PX - 58;
const PH = H - PT - 54;

type SeriesKey = "loss" | "capture" | "effort";

const SERIES: { key: SeriesKey; label: string; hint: string }[] = [
  { key: "loss", label: "Loss", hint: "lower is better" },
  { key: "capture", label: "Soft capture", hint: "higher is better" },
  { key: "effort", label: "Control effort", hint: "thrust that engages" },
];

export function OptimizationChart({
  history,
  metrics,
}: {
  history: OptimizationStep[];
  metrics: MissionMetrics;
}) {
  const [cursor, setCursor] = useState<number | null>(null);

  const model = useMemo(() => {
    const vals = {
      loss: history.map((s) => s.loss),
      capture: history.map((s) => s.collected),
      effort: history.map((s) => s.control_effort),
    };
    const ranges = {
      loss: rangeOf(vals.loss, 1),
      capture: rangeOf(vals.capture, 1),
      effort: rangeOf(vals.effort, 1),
    };
    const N = Math.max(1, history.length - 1);

    const make = (key: SeriesKey, dash?: string) => {
      const src = vals[key];
      const r = ranges[key];
      const pts = src.map((raw, i) => ({
        raw,
        x: PX + (i / N) * PW,
        y: PT + (1 - norm(raw, r.min, r.max)) * PH,
      }));
      const line = smoothPath(pts);
      const last = pts[pts.length - 1];
      return {
        dash,
        pts,
        last,
        line,
        area: `${line} L${last.x.toFixed(2)},${(PT + PH).toFixed(2)} L${pts[0].x.toFixed(
          2,
        )},${(PT + PH).toFixed(2)} Z`,
        lastRaw: src[src.length - 1] ?? 0,
        at: (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))],
      };
    };

    const loss = make("loss");
    const capture = make("capture");
    const effort = make("effort", "6 4");

    const firstLoss = vals.loss[0] ?? 0;
    const lastLoss = vals.loss[vals.loss.length - 1] ?? 0;
    const lossDrop = Math.abs(firstLoss) > 1e-9 ? ((firstLoss - lastLoss) / Math.abs(firstLoss)) * 100 : 0;

    const firstCap = vals.capture[0] ?? 0;
    const lastCap = vals.capture[vals.capture.length - 1] ?? 0;
    const captureTimes = Math.abs(firstCap) > 1e-9 ? lastCap / Math.abs(firstCap) : null;
    const capturePts = lastCap - firstCap;

    return {
      loss,
      capture,
      effort,
      ranges,
      N,
      length: history.length,
      iterations: history[history.length - 1]?.iter ?? 0,
      finalLoss: lastLoss,
      lossDrop,
      captureTimes,
      capturePts,
    };
  }, [history]);

  if (history.length < 2) return null;

  const cursorIdx = cursor != null ? Math.max(0, Math.min(model.length - 1, cursor)) : 0;
  const cursorVisible = cursor != null;
  const cx = PX + (cursorIdx / Math.max(1, model.length - 1)) * PW;
  const axisMid = Math.round(model.iterations / 2);
  const iterate = (k: SeriesKey) =>
    history[cursorIdx]?.[
      k === "loss" ? "loss" : k === "capture" ? "collected" : "control_effort"
    ] ?? 0;

  const labelBox = (k: SeriesKey) => ({
    k,
    x: model[k].last.x + 8,
    ny: Math.max(PT, Math.min(H - 8, model[k].last.y)),
    text: model[k].lastRaw.toFixed(0),
  });
  const sortedLabels = (["loss", "capture", "effort"] as SeriesKey[])
    .map(labelBox)
    .sort((a, b) => a.ny - b.ny);
  const usedSlots: number[] = [];
  const labelSlots = sortedLabels.map((e) => {
    let y = e.ny;
    for (const s of usedSlots) {
      if (Math.abs(y - s) < 13) y = Math.min(H - 8, s + 13);
    }
    usedSlots.push(y);
    return { ...e, y };
  });

  return (
    <div className="rise-in">
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
            Gradient through time
          </p>
          <h3 className="font-display mt-1 text-3xl tracking-tight">Optimizer convergence</h3>
          <p className="mt-1.5 max-w-lg text-sm leading-6 text-muted">
            Adam replays the whole mission every iteration, backprops where the route was
            wasteful, and nudges thrust. These three traces are the heartbeat of that loop.
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {SERIES.map((s) => {
              const dash = s.key === "effort";
              return (
                <span
                  key={s.key}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel-2 py-1 pr-2.5 pl-1.5 text-[11px]"
                >
                  <i
                    className="h-1.5 w-4 rounded-full"
                    style={{
                      background: dash
                        ? `repeating-linear-gradient(90deg, ${COLORS[s.key]} 0 5px, transparent 5px 8px)`
                        : COLORS[s.key],
                    }}
                  />
                  <span className="font-medium" style={{ color: COLORS[s.key] }}>
                    {s.label}
                  </span>
                  <span className="text-muted">· {s.hint}</span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:self-center">
          <div className="rounded-2xl border border-border bg-panel p-3 text-center">
            <p className="text-[10px] tracking-widest text-muted uppercase">Loss</p>
            <p className="mt-0.5 font-mono text-lg" style={{ color: COLORS.loss }}>
              {model.lossDrop > 0.5 ? `−${model.lossDrop.toFixed(0)}%` : "flat"}
            </p>
            <p className="text-[10px] text-muted">vs iter 0</p>
          </div>
          <div className="rounded-2xl border border-border bg-panel p-3 text-center">
            <p className="text-[10px] tracking-widest text-muted uppercase">Capture</p>
            <p className="mt-0.5 font-mono text-lg" style={{ color: COLORS.capture }}>
              {model.captureTimes != null
                ? `×${model.captureTimes.toFixed(1)}`
                : `+${model.capturePts.toFixed(0)}`}
            </p>
            <p className="text-[10px] text-muted">soft affinity</p>
          </div>
          <div className="rounded-2xl border border-border bg-panel p-3 text-center">
            <p className="text-[10px] tracking-widest text-muted uppercase">Effort</p>
            <p className="mt-0.5 font-mono text-lg" style={{ color: COLORS.effort }}>
              {model.effort.lastRaw.toFixed(0)}
            </p>
            <p className="text-[10px] text-muted">final raw</p>
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full touch-none select-none"
        role="img"
        aria-label="Optimizer history: loss, soft capture and control effort over iterations"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          if (!rect.width) return;
          const mx = (e.clientX - rect.left) * (W / rect.width);
          if (mx < PX || mx > PX + PW) {
            setCursor(null);
            return;
          }
          setCursor(Math.round(((mx - PX) / PW) * (model.length - 1)));
        }}
        onMouseLeave={() => setCursor(null)}
      >
        <defs>
          <linearGradient id="capFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.capture} stopOpacity="0.32" />
            <stop offset="100%" stopColor={COLORS.capture} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lossFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.loss} stopOpacity="0.16" />
            <stop offset="100%" stopColor={COLORS.loss} stopOpacity="0" />
          </linearGradient>
          <filter id="chartGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((g) => {
          const gy = PT + (1 - g) * PH;
          return (
            <line
              key={g}
              x1={PX}
              x2={PX + PW}
              y1={gy}
              y2={gy}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray={g === 0 || g === 1 ? "" : "3 6"}
            />
          );
        })}

        <text x={PX} y={PT - 8} fill="var(--muted)" fontSize="10">
          high
        </text>
        <text x={PX} y={PT + PH + 14} fill="var(--muted)" fontSize="10">
          low
        </text>
        <text x={PX} y={H - 18} fill="var(--muted)" fontSize="10">
          iter 0
        </text>
        <text x={PX + PW / 2} y={H - 18} fill="var(--muted)" fontSize="10" textAnchor="middle">
          iter {axisMid}
        </text>
        <text x={PX + PW} y={H - 18} fill="var(--muted)" fontSize="10" textAnchor="end">
          iter {model.iterations}
        </text>

        <path d={model.loss.area} fill="url(#lossFill)" />
        <path d={model.capture.area} fill="url(#capFill)" />

        <path
          d={model.loss.line}
          fill="none"
          stroke={COLORS.loss}
          strokeWidth="2"
          strokeLinecap="round"
          style={{ ["--draw" as string]: "1200", animationDelay: "0.05s" }}
          className="chart-draw"
        />
        <path
          d={model.effort.line}
          fill="none"
          stroke={COLORS.effort}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 4"
          style={{ ["--draw" as string]: "1200", animationDelay: "0.16s" }}
          className="chart-draw"
        />
        <path
          d={model.capture.line}
          fill="none"
          stroke={COLORS.capture}
          strokeWidth="2.6"
          strokeLinecap="round"
          filter="url(#chartGlow)"
          style={{ ["--draw" as string]: "1200" }}
          className="chart-draw"
        />

        {(["loss", "capture", "effort"] as SeriesKey[]).map((k) => (
          <g key={k}>
            <circle cx={model[k].pts[0].x} cy={model[k].pts[0].y} r="2.2" fill={COLORS[k]} opacity="0.9" />
            <circle
              cx={model[k].last.x}
              cy={model[k].last.y}
              r="3.4"
              fill={`${COLORS[k]}22`}
              stroke={COLORS[k]}
              strokeWidth="2"
            />
          </g>
        ))}

        {labelSlots.map((e) => (
          <g key={`label-${e.k}`}>
            {Math.abs(e.y - e.ny) > 1 && (
              <line
                x1={e.x}
                x2={e.x}
                y1={e.ny}
                y2={e.y}
                stroke={COLORS[e.k]}
                strokeWidth="1"
                opacity="0.6"
              />
            )}
            <text
              x={e.x}
              y={e.y + 3}
              fontSize="11"
              fontWeight="700"
              fill={COLORS[e.k]}
              stroke="var(--background)"
              strokeWidth="3"
              paintOrder="stroke"
            >
              {e.text}
            </text>
          </g>
        ))}

        {cursorVisible && (
          <g>
            <line
              x1={cx}
              x2={cx}
              y1={PT}
              y2={PT + PH}
              stroke="var(--foreground)"
              strokeWidth="1"
              opacity="0.4"
              strokeDasharray="2 3"
            />
            {(["loss", "capture", "effort"] as SeriesKey[]).map((k) => (
              <circle
                key={k}
                cx={cx}
                cy={model[k].at(cursorIdx).y}
                r="4"
                fill={COLORS[k]}
                stroke="var(--panel)"
                strokeWidth="1.6"
              />
            ))}
          </g>
        )}
      </svg>

      <input
        type="range"
        aria-label="Scrub optimizer iterations"
        className="mt-1 w-full accent-[var(--accent)]"
        min={0}
        max={model.length - 1}
        step={1}
        value={cursorVisible ? cursorIdx : 0}
        onChange={(e) => setCursor(Number(e.target.value))}
      />

      {cursorVisible && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-panel px-3 py-2 font-mono text-[11px]">
          <span className="text-muted">iter {history[cursorIdx]?.iter}</span>
          {(["loss", "capture", "effort"] as SeriesKey[]).map((k) => (
            <span key={k} style={{ color: COLORS[k] }}>
              {iterate(k).toFixed(1)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 grid gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-4">
        <div className="bg-panel-2 px-3 py-2">
          <p className="text-[10px] tracking-widest text-muted uppercase">Hard capture</p>
          <p className="font-mono text-sm text-foreground">
            {metrics.optimized_collected ?? 0}
            <span className="text-muted"> / {metrics.total_debris ?? "?"}</span>
          </p>
        </div>
        <div className="bg-panel-2 px-3 py-2">
          <p className="text-[10px] tracking-widest text-muted uppercase">vs random</p>
          <p className="font-mono text-sm text-foreground">
            {metrics.efficiency_gain != null
              ? `${metrics.efficiency_gain >= 0 ? "+" : ""}${metrics.efficiency_gain.toFixed(1)}%`
              : "—"}
          </p>
        </div>
        <div className="bg-panel-2 px-3 py-2">
          <p className="text-[10px] tracking-widest text-muted uppercase">Effort saved</p>
          <p className="font-mono text-sm text-foreground">
            {metrics.control_effort_saved_pct?.toFixed(1) ?? "0"}%
          </p>
        </div>
        <div className="bg-panel-2 px-3 py-2">
          <p className="text-[10px] tracking-widest text-muted uppercase">Final loss</p>
          <p className="font-mono text-sm text-foreground">{model.finalLoss.toFixed(1)}</p>
        </div>
      </div>

      <details className="group mt-3 rounded-2xl border border-border bg-panel p-3 open:bg-panel-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-md bg-accent/15 text-[10px] font-bold text-accent">
              ?
            </span>
            How to read this chart
          </span>
          <span className="text-muted transition group-open:rotate-180">▾</span>
        </summary>
        <div className="mt-3 space-y-2.5 text-xs leading-5 text-muted">
          <p>
            <strong className="text-foreground">What this chart does.</strong> Adam runs the whole
            mission again and again. Each run (one <em>iter</em>) replays the full storm track,
            measures how much debris the fleet would grab and how much thrust it burned, and then
            nudges the thrust plan — the <em>gradient through time</em>. Trace those nudges and
            you get these three curves.
          </p>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <p className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-4 shrink-0 rounded-full" style={{ background: COLORS.loss }} />
              <span>
                <strong className="text-foreground">Loss</strong> — one number for how bad the
                current plan is: too little capture or too much burn. Falling means the plan is
                getting better.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-4 shrink-0 rounded-full" style={{ background: COLORS.capture }} />
              <span>
                <strong className="text-foreground">Soft capture</strong> — proximity score of the
                route to all debris. Rising means boats sweep closer to more tangles.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span
                className="mt-1.5 h-1.5 w-4 shrink-0 rounded-full"
                style={{ background: `repeating-linear-gradient(90deg, ${COLORS.effort} 0 5px, transparent 5px 8px)` }}
              />
              <span>
                <strong className="text-foreground">Control effort</strong> — total thrust
                commanded during the mission. Lower, flatter lines mean an efficient route.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-4 shrink-0 rounded-full bg-foreground/40" />
              <span>
                <strong className="text-foreground">iter / high-low</strong> — the x-axis counts
                optimizer steps from 0 to {model.iterations}. The left axis normalizes each metric
                to its own min–max range so all three fit one plot.
              </span>
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}