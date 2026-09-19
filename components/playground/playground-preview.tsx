"use client";

import { useEffect, useMemo, useState } from "react";
import { MissionCanvas } from "./mission-canvas";
import { generateMockMission } from "@/lib/mock-mission";
import { DEFAULT_MISSION } from "@/lib/types";

export function PlaygroundPreview() {
  const mission = useMemo(() => generateMockMission(DEFAULT_MISSION), []);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const max = mission.random.trajectory.length - 1;
    const tick = (now: number) => {
      const dt = now - last;
      if (dt > 48) {
        last = now;
        setFrame((f) => (f >= max ? 0 : f + 1));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, mission.random.trajectory.length]);

  return (
    <section id="playground" className="mx-auto w-full max-w-5xl px-6 pb-24">
      <p className="text-center text-[11px] font-semibold tracking-[0.28em] text-accent uppercase">
        Playground
      </p>
      <h2 className="font-display mt-2 text-center text-4xl tracking-tight sm:text-5xl">
        Try Aqualign Live
      </h2>
      <div className="soft-card mt-10 overflow-hidden p-3 sm:p-4">
        <div className="h-[380px] sm:h-[460px]">
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
            max={mission.random.trajectory.length - 1}
            value={frame}
            onChange={(e) => {
              setPlaying(false);
              setFrame(Number(e.target.value));
            }}
          />
        </div>
      </div>
    </section>
  );
}
