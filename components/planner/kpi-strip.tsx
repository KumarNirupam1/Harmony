"use client";

import { useEffect, useState } from "react";

function useCount(target: number, active: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
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
  const rec = useCount(metrics.optimized_collected, active);
  const randRec = useCount(metrics.random_collected, active);
  const effort = useCount(metrics.optimized_control_effort, active);
  const randEffort = useCount(metrics.random_control_effort, active);
  const gain = useCount(metrics.efficiency_gain, active);
  const saved = useCount(metrics.control_effort_saved_pct, active);

  const cards = [
    {
      label: "Debris recovered",
      value: `${Math.round(rec)} / ${metrics.total_debris}`,
      sub: `Random patrol ${Math.round(randRec)}`,
    },
    {
      label: "Control effort",
      value: Math.round(effort).toString(),
      sub: `Random ${Math.round(randEffort)} · saved ${saved.toFixed(0)}%`,
    },
    {
      label: "Efficiency gain",
      value: `+${gain.toFixed(1)}%`,
      sub: "The money shot vs random patrol",
      accent: true,
    },
  ];

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="soft-card px-5 py-4">
            <p className="text-[11px] tracking-[0.16em] text-muted uppercase">{c.label}</p>
            <p
              className={`mt-1 font-display text-3xl ${c.accent ? "text-accent" : "text-foreground"}`}
            >
              {c.value}
            </p>
            <p className="mt-1 text-xs text-muted">{c.sub}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        {metrics.coverage_pct.toFixed(1)}% domain swept
        {metrics.first_capture_hour != null
          ? ` · first capture at hour ${metrics.first_capture_hour}`
          : ""}
      </p>
    </div>
  );
}
