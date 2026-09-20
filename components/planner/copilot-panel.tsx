"use client";

import { useState } from "react";
import { explainMission, type ExplainResult } from "@/lib/api";
import type { MissionMetrics, MissionRequest } from "@/lib/types";

function RobotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="8" width="16" height="11" rx="3.5" fill="currentColor" />
      <path d="M12 5.5V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="2.4" r="1.2" fill="currentColor" />
      <rect x="7" y="11.5" width="3" height="3.2" rx="1" fill="var(--panel)" />
      <rect x="14" y="11.5" width="3" height="3.2" rx="1" fill="var(--panel)" />
      <rect x="9.5" y="16.5" width="5" height="1.6" rx="0.8" fill="var(--panel)" />
    </svg>
  );
}

export function CopilotPanel({
  params,
  metrics,
}: {
  params: MissionRequest;
  metrics: MissionMetrics;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [result, setResult] = useState<ExplainResult | null>(null);

  async function onAsk() {
    setStatus("loading");
    const next = await explainMission(params, metrics);
    setResult(next);
    setStatus("ready");
  }

  return (
    <div className="soft-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[#7c5cff] text-white shadow-[0_0_18px_rgba(39,179,255,0.35)]">
            <RobotIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
              AI REVIEW
            </p>
            <p className="mt-0.5 text-sm font-medium">Why did Harmony win?</p>
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost"
          disabled={status === "loading"}
          onClick={onAsk}
        >
          {status === "loading" ? "Asking…" : status === "ready" ? "Ask again" : "Explain this run"}
        </button>
      </div>
      {result && (
        <div className="mt-4 rounded-2xl bg-panel-2 p-4">
          <div className="flex items-start gap-3">
<span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[#7c5cff] text-white">
            <RobotIcon className="h-3 w-3" />
          </span>
            <p className="text-sm leading-6 text-foreground">{result.explanation}</p>
          </div>
          <p className="mt-3 inline-flex rounded-full border border-border bg-panel px-2.5 py-0.5 text-[10px] tracking-[0.16em] text-muted uppercase">
            source: {result.source}
          </p>
        </div>
      )}
    </div>
  );
}
