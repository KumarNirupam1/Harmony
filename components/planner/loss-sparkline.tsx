import type { OptimizationStep } from "@/lib/types";

export function LossSparkline({ history }: { history: OptimizationStep[] }) {
  if (!history.length) return null;
  const w = 320;
  const h = 88;
  const losses = history.map((s) => s.loss);
  const min = Math.min(...losses);
  const max = Math.max(...losses);
  const span = max - min || 1;
  const pts = losses
    .map((v, i) => {
      const x = (i / Math.max(1, losses.length - 1)) * w;
      const y = h - 8 - ((v - min) / span) * (h - 16);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
        Gradient through time
      </p>
      <p className="mt-1 text-sm text-muted">Loss over optimizer iterations</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full" role="img" aria-label="Optimization loss">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={pts}
          className="text-accent"
        />
      </svg>
    </div>
  );
}
