"use client";

import { useState } from "react";
import { explainMission, type ExplainResult } from "@/lib/api";
import type { MissionMetrics, MissionRequest } from "@/lib/types";

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
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
            Copilot
          </p>
          <p className="mt-1 text-sm font-medium">Why did Harmony win?</p>
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
          <p className="text-sm leading-6 text-foreground">{result.explanation}</p>
          <p className="mt-3 inline-flex rounded-full border border-border bg-panel px-2.5 py-0.5 text-[10px] tracking-[0.16em] text-muted uppercase">
            source: {result.source}
          </p>
        </div>
      )}
    </div>
  );
}
