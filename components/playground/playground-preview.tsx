"use client";

import { useEffect, useMemo, useState } from "react";
import { MissionCanvas } from "./mission-canvas";
import { generateMockMission } from "@/lib/mock-mission";
import { DEFAULT_MISSION } from "@/lib/types";

export function PlaygroundPreview() {
  const mission = useMemo(() => generateMockMission(DEFAULT_MISSION), []);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const maxFrame = Math.max(0, mission.random.trajectory.length - 1);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      if (dt > 140) {
        last = now;
        setFrame((f) => (f >= maxFrame ? 0 : f + 0.35));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, maxFrame]);

  return (
    <section id="playground" className="mx-auto w-full max-w-6xl px-6 pb-24">
      <p className="text-center text-[11px] font-semibold tracking-[0.28em] text-accent uppercase">
        Live intercept map
      </p>
      <h2 className="font-display mt-2 text-center text-4xl tracking-tight sm:text-5xl">
        Watch the fleet ride the gyre
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted">
        Current arrows, floating plastic, and two strategies on the same water:
        a random patrol versus Harmony boats that intercept debris instead of
        crossing the current.
      </p>
      <div className="soft-card mt-10 overflow-hidden p-3 sm:p-4">
        <div className="h-[400px] sm:h-[520px]">
          <MissionCanvas mission={mission} frame={frame} className="h-full" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 px-2 pb-2">
          <button type="button" className="btn-primary" onClick={() => setPlaying((p) => !p)}>
            {playing ? "Pause" : "Play"}
          </button>
          <input
            className="h-1.5 flex-1 accent-[var(--accent)]"
            type="range"
            min={0}
            max={maxFrame}
            value={Math.min(maxFrame, Math.floor(frame))}
            onChange={(e) => {
              setPlaying(false);
              setFrame(Number(e.target.value));
            }}
          />
          <p className="text-[11px] text-muted">Scrub mission hours</p>
        </div>
      </div>
    </section>
  );
}
