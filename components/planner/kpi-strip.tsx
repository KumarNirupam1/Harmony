"use client";

import { useEffect, useState } from "react";

function useCount(target: number, active: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      const raf = requestAnimationFrame(() => setValue(0));
      return () => cancelAnimationFrame(raf);
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      const eased = 1 - (1 - t) ** 3;
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);
  return value;
}

export function KpiStrip({
  metrics,
  active,
}: {
  metrics: {
    random_collected: number;
    optimized_collected: number;
    total_debris: number;
    random_control_effort: number;
    optimized_control_effort: number;
    control_effort_saved_pct: number;
    efficiency_gain: number;
    coverage_pct: number;
    first_capture_hour: number | null;
  };
  active: boolean;
}) {
  const {
    random_collected = 0,
    optimized_collected = 0,
    total_debris = 0,
    random_control_effort = 0,
    optimized_control_effort = 0,
    control_effort_saved_pct = 0,
    efficiency_gain = 0,
    coverage_pct = 0,
    first_capture_hour = null,
  } = metrics;
  const rec = useCount(optimized_collected, active);
  const randRec = useCount(random_collected, active);
  const effort = useCount(optimized_control_effort, active);
  const randEffort = useCount(random_control_effort, active);
  const gain = useCount(efficiency_gain, active);
  const saved = useCount(control_effort_saved_pct, active);

  const recoveredBar = total_debris > 0 ? (optimized_collected / total_debris) * 100 : 0;
  const savedBar = Math.max(0, Math.min(100, control_effort_saved_pct));

  const cards = [
    {
      label: "Debris recovered",
      value: `${Math.round(rec)}`,
      unit: `/ ${total_debris}`,
      sub: total_debris > 0 ? `${recoveredBar.toFixed(0)}% of the cloud` : "versus random",
      bar: total_debris > 0 ? recoveredBar : 40,
      barColor: "var(--success)",
      compare: [
        `random ${Math.round(randRec)}`,
        optimized_collected - random_collected >= 0 ? "better" : "worse",
      ],
    },
    {
      label: "Effort saved",
      value: `${saved.toFixed(0)}`,
      unit: "%",
      sub: `vs random ${Math.round(randEffort)} thrust`,
      bar: savedBar,
      barColor: "var(--accent)",
      compare: [`optimized ${Math.round(effort)}`, "less burn"],
    },
    {
      label: "Efficiency gain",
      value: `${gain >= 0 ? "+" : ""}${gain.toFixed(1)}`,
      unit: "%",
      sub: "capture per unit of thrust",
      bar: Math.max(0, Math.min(100, gain * 2.5)),
      barColor: "var(--accent)",
      compare: coverage_pct > 0 ? [`${coverage_pct.toFixed(1)}% swept`, "domain coverage"] : [],
      accent: true,
    },
  ];

  return (
    <div className="rise-in">
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c, i) => (
          <div
            key={c.label}
            className="soft-card animate-[rise-in_0.6s_cubic-bezier(0.25,0.7,0.3,1)_both] px-5 py-4"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] tracking-[0.16em] text-muted uppercase">{c.label}</p>
              {c.compare[1] && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.compare[1] === "better" || c.compare[1] === "less burn" ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--destructive)]/15 text-[var(--destructive)]"}`}
                >
                  {c.compare[1]}
                </span>
              )}
            </div>
            <p className="mt-1 font-display text-3xl tracking-tight text-foreground">
              {c.value}
              <span className="ml-0.5 text-sm text-muted">{c.unit}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted">{c.sub}</p>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: active ? `${c.bar}%` : "0%",
                  background: c.barColor,
                  transitionDelay: `${i * 90}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        {coverage_pct.toFixed(1)}% domain swept
        {first_capture_hour != null
          ? ` · first capture at hour ${first_capture_hour}`
          : ""}
      </p>
    </div>
  );
}
