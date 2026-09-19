"use client";

import { useEffect, useRef } from "react";
import type { MissionResult } from "@/lib/types";

type Props = {
  mission: MissionResult;
  frame: number;
  className?: string;
};

function worldToCanvas(
  x: number,
  y: number,
  w: number,
  h: number,
  xmax: number,
  ymax: number,
) {
  const pad = 16;
  return [
    pad + (x / xmax) * (w - pad * 2),
    h - pad - (y / ymax) * (h - pad * 2),
  ] as const;
}

export function MissionCanvas({ mission, frame, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const paint = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth || 640;
      const h = canvas.clientHeight || 420;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { field, domain, random, optimized, debris } = mission;
      const xmax = domain.x_max;
      const ymax = domain.y_max;
      const dark = document.documentElement.classList.contains("dark");

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = dark ? "#140c08" : "#fff8f3";
      ctx.fillRect(0, 0, w, h);

      const mag = field.mag;
      const rows = mag.length;
      const cols = mag[0]?.length ?? 0;
      let maxMag = 0.001;
      for (const row of mag) for (const v of row) maxMag = Math.max(maxMag, v);

      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const [cx, cy] = worldToCanvas(field.x[i], field.y[j], w, h, xmax, ymax);
          const [cx2, cy2] = worldToCanvas(
            field.x[i + 1],
            field.y[j + 1],
            w,
            h,
            xmax,
            ymax,
          );
          const a = 0.08 + mag[j][i] / maxMag * 0.35;
          ctx.fillStyle = `rgba(255, 125, 39, ${a})`;
          ctx.fillRect(cx, cy2, Math.max(1, cx2 - cx + 1), Math.max(1, cy - cy2 + 1));
        }
      }

      ctx.strokeStyle = dark ? "rgba(255, 180, 120, 0.35)" : "rgba(120, 50, 20, 0.22)";
      ctx.lineWidth = 1;
      for (let j = 0; j < rows; j += 3) {
        for (let i = 0; i < cols; i += 3) {
          const [cx, cy] = worldToCanvas(field.x[i], field.y[j], w, h, xmax, ymax);
          const u = field.u[j][i];
          const vel = field.v[j][i];
          const len = Math.hypot(u, vel) || 1;
          const dx = (u / len) * 9;
          const dy = (-vel / len) * 9;
          ctx.beginPath();
          ctx.moveTo(cx - dx * 0.4, cy - dy * 0.4);
          ctx.lineTo(cx + dx, cy + dy);
          ctx.stroke();
        }
      }

      const t = Math.min(frame, random.trajectory.length - 1);
      ctx.fillStyle = dark ? "rgba(255,236,220,0.72)" : "rgba(40,28,22,0.55)";
      for (const p of debris ?? []) {
        const [cx, cy] = worldToCanvas(p[0], p[1], w, h, xmax, ymax);
        ctx.beginPath();
        ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      const drawPath = (
        traj: number[][][],
        color: string,
        dashed: boolean,
        width: number,
      ) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.setLineDash(dashed ? [6, 5] : []);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const vessels = traj[0]?.length ?? 0;
        for (let vIdx = 0; vIdx < vessels; vIdx++) {
          ctx.beginPath();
          for (let k = 0; k <= t; k++) {
            const [cx, cy] = worldToCanvas(
              traj[k][vIdx][0],
              traj[k][vIdx][1],
              w,
              h,
              xmax,
              ymax,
            );
            if (k === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
          }
          ctx.stroke();
        }
        ctx.setLineDash([]);
      };

      drawPath(random.trajectory, "#ff7d27", true, 1.6);
      drawPath(optimized.trajectory, dark ? "#f4ece6" : "#1a1a1a", false, 2.4);

      const markers = (traj: number[][][], fill: string) => {
        traj[t]?.forEach((p) => {
          const [cx, cy] = worldToCanvas(p[0], p[1], w, h, xmax, ymax);
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = dark ? "#140c08" : "#fff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
        traj[traj.length - 1]?.forEach((p) => {
          const [cx, cy] = worldToCanvas(p[0], p[1], w, h, xmax, ymax);
          ctx.strokeStyle = fill;
          ctx.lineWidth = 1.4;
          ctx.strokeRect(cx - 4, cy - 4, 8, 8);
        });
      };

      markers(random.trajectory, "#ff7d27");
      markers(optimized.trajectory, dark ? "#f4ece6" : "#1a1a1a");
    };

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(canvas);
    const mo = new MutationObserver(paint);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [mission, frame]);

  const horizon = mission.params.horizon;

  return (
    <div className={`relative overflow-hidden rounded-[28px] ${className ?? ""}`}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute top-4 right-4 rounded-2xl border border-border bg-panel/90 px-3 py-2 text-[11px] shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="inline-block h-px w-4 border-t-2 border-dashed border-accent" />
          Random patrol
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block h-0.5 w-4 bg-foreground" />
          Harmony
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-border bg-panel/90 px-3 py-1.5 font-mono text-[11px]">
        t = {frame}h / {horizon}h
      </div>
    </div>
  );
}
