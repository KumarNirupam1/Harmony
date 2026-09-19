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
  const pad = 28;
  return [
    pad + (x / xmax) * (w - pad * 2),
    h - pad - (y / ymax) * (h - pad * 2),
  ] as const;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function samplePos(traj: number[][][], t: number, vIdx: number) {
  const last = traj.length - 1;
  const i0 = Math.max(0, Math.min(last, Math.floor(t)));
  const i1 = Math.min(last, i0 + 1);
  const f = t - i0;
  const p0 = traj[i0]?.[vIdx];
  const p1 = traj[i1]?.[vIdx] ?? p0;
  if (!p0) return null;
  return [lerp(p0[0], p1[0], f), lerp(p0[1], p1[1], f)] as const;
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
      const ocean = ctx.createLinearGradient(0, 0, 0, h);
      if (dark) {
        ocean.addColorStop(0, "#0a1620");
        ocean.addColorStop(1, "#061018");
      } else {
        ocean.addColorStop(0, "#16384c");
        ocean.addColorStop(0.55, "#122f40");
        ocean.addColorStop(1, "#0e2634");
      }
      ctx.fillStyle = ocean;
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
          const n = mag[j][i] / maxMag;
          ctx.fillStyle = `rgba(39, 179, 255, ${0.04 + n * 0.22})`;
          ctx.fillRect(cx, cy2, Math.max(1, cx2 - cx + 1), Math.max(1, cy - cy2 + 1));
        }
      }

      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.font = "500 9px ui-sans-serif, system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      for (let g = 0; g <= 5; g++) {
        const x = 28 + ((w - 56) * g) / 5;
        const y = 28 + ((h - 56) * g) / 5;
        ctx.beginPath();
        ctx.moveTo(x, 28);
        ctx.lineTo(x, h - 28);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(28, y);
        ctx.lineTo(w - 28, y);
        ctx.stroke();
        if (g < 5) ctx.fillText(`${((xmax * g) / 5).toFixed(0)}`, x + 3, h - 14);
      }
      ctx.fillText("x (km)", w - 52, h - 14);
      ctx.save();
      ctx.translate(14, h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("y (km)", 0, 0);
      ctx.restore();

      ctx.strokeStyle = "rgba(186, 222, 240, 0.28)";
      ctx.lineWidth = 0.8;
      for (let j = 0; j < rows; j += 3) {
        for (let i = 0; i < cols; i += 3) {
          const [cx, cy] = worldToCanvas(field.x[i], field.y[j], w, h, xmax, ymax);
          const u = field.u[j][i];
          const vel = field.v[j][i];
          const speed = Math.hypot(u, vel) || 1;
          const dx = (u / speed) * 7;
          const dy = (-vel / speed) * 7;
          ctx.beginPath();
          ctx.moveTo(cx - dx, cy - dy);
          ctx.lineTo(cx + dx, cy + dy);
          ctx.stroke();
        }
      }

      const t = Math.min(frame, random.trajectory.length - 1);
      const iEnd = Math.min(random.trajectory.length - 1, Math.floor(t) + 1);

      ctx.fillStyle = "rgba(236, 244, 248, 0.55)";
      for (const p of debris ?? []) {
        const [cx, cy] = worldToCanvas(p[0], p[1], w, h, xmax, ymax);
        ctx.beginPath();
        ctx.arc(cx, cy, 1.15, 0, Math.PI * 2);
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
        ctx.setLineDash(dashed ? [5, 5] : []);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const vessels = traj[0]?.length ?? 0;
        for (let vIdx = 0; vIdx < vessels; vIdx++) {
          ctx.beginPath();
          for (let k = 0; k <= iEnd; k++) {
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

      drawPath(random.trajectory, "rgba(212, 168, 110, 0.85)", true, 1.4);
      ctx.shadowColor = "rgba(39, 179, 255, 0.35)";
      ctx.shadowBlur = 8;
      drawPath(optimized.trajectory, "#27b3ff", false, 2);
      ctx.shadowBlur = 0;

      const drawMarker = (traj: number[][][], color: string) => {
        const vessels = traj[0]?.length ?? 0;
        for (let vIdx = 0; vIdx < vessels; vIdx++) {
          const pos = samplePos(traj, t, vIdx);
          if (!pos) continue;
          const prev = samplePos(traj, Math.max(0, t - 1), vIdx) ?? pos;
          const [cx, cy] = worldToCanvas(pos[0], pos[1], w, h, xmax, ymax);
          const angle = Math.atan2(-(pos[1] - prev[1]), pos[0] - prev[0]);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angle);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(7, 0);
          ctx.lineTo(-5, 3.4);
          ctx.lineTo(-3.2, 0);
          ctx.lineTo(-5, -3.4);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.7)";
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.restore();
        }
      };

      drawMarker(random.trajectory, "#c4924a");
      drawMarker(optimized.trajectory, "#27b3ff");

      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.strokeRect(28, 28, w - 56, h - 56);

      ctx.fillStyle = "rgba(255,255,255,0.38)";
      ctx.font = "500 10px ui-sans-serif, system-ui";
      ctx.fillText("Double-gyre velocity field  ·  surface layer", 32, 18);
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
  const hour = Math.min(horizon, Math.floor(frame));

  return (
    <div className={`relative overflow-hidden rounded-[28px] ${className ?? ""}`}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute top-4 right-4 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white/90 backdrop-blur-md">
        <p className="mb-1.5 text-[10px] tracking-[0.18em] text-white/50 uppercase">Legend</p>
        <div className="flex items-center gap-2">
          <span className="inline-block h-px w-4 border-t border-dashed border-[#c4924a]" />
          Random patrol
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block h-px w-4 bg-[#27b3ff]" />
          Harmony
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block h-1 w-1 rounded-full bg-white/70" />
          Debris
        </div>
      </div>
      <div className="pointer-events-none absolute right-4 bottom-4 rounded-md border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-[11px] text-white/80 backdrop-blur-md">
        t = {hour} h / {horizon} h
      </div>
    </div>
  );
}
