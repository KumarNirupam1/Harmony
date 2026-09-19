# Aqualign — Frontend Tasks (handoff to teammate)

Owner: **Sankar's teammate (YOU, frontend)** · Contract: `docs/API_CONTRACT.md` ·
TypeScript + Next.js 16 + Tailwind v4 · Mock now, live API later.

Folder rule: UI code lives under `app/_components/` or a top-level `components/`
(colocation is fine in App Router). No new libraries unless you ask first — the
repo currently ships only Next/React/Tailwind.

---

## P0 — Must ship (this is the "one working feature")

### T0.1 Planner page `app/planner/page.tsx` (client component)
Route the hero "Launch the planner" button to `/planner`.
Layout: left config panel, right big canvas, bottom KPI strip.

### T0.2 Config panel
- Inputs → mission request: `num_vessels` (1–6, default 3), `horizon` (12–168,
  default 72), `iterations` (default **200**), `learning_rate` (default 0.1),
  `seed` (default 42).
- "Run mission" button. Disabled while running → spinner + elapsed ms (runs
  take ~2–5 s).

### T0.3 Canvas visualization (the star — this is the demo moment)
Client component rendering `mission` response:
- **Velocity field**: draw `field.mag` as a subtle radial gradient background +
  optional small arrow grid from `u`/`v` (25×25 → sample every 3rd).
- **Debris**: white dots at start positions (derive from `random.debris_tracks[0]`
  or scatter `debris_count` points around center 25,25 σ=15).
- **Random patrol**: coral `#F0883E`, **dashed** lines, all vessels.
- **Aqualign**: cyan `#22d3ee`, **solid**, heavier stroke.
- **Animated scrubber**: play + timeline slider scrubbing `trajectory` frames
  (`t=0 → horizon`). Aqualign's curvature should *read* vs random's chaos.
- Sensible 0…50 world-space to canvas transform (domain from `mission.domain`).
- Endpoints marked with markers; legend top-right; ⌛ `t = 36h / 72h` readout.

### T0.4 KPI strip (server-computed numbers)
From `mission.metrics`:
- Debris recovered: `random_collected` vs `optimized_collected` (+`total_debris`)
- Fuel used: both + `fuel_saved_pct`
- Headline: `efficiency_gain` (show a strong delta — it's the money shot)

### T0.5 API wiring + graceful states
- `lib/api.ts`: `runMission()` per `docs/API_CONTRACT.md` §5, `API_BASE` from
  `NEXT_PUBLIC_API_URL`, default `http://localhost:8000`.
- States: idle → running (spinner) → success (render) → error (FastAPI `detail`,
  friendly message + retry).
- **Offline mock**: if `NEXT_PUBLIC_API_URL` unset and fetch fails, fall back to
  loading `data/sample-mission.json` (already generated for you).
- Button on planner to download/"+ New mission" reset.

### T0.6 Landing polish (`app/page.tsx`)
Already has hero + 5-step + KPI placeholders. Make the hero *feel* like the
product: swap the placeholder card for a **static snapshot of the planner
visualization** (first frame of the mock) — judges see the product in 3 s.

---

## P1 — Win Best UI (sleek & delightful)

### T1.1 Motion language
- Canvas scrubber animates with `requestAnimationFrame` (ease in/out).
- KPI deltas count up on arrival.
- Page transitions subtle; no heavy animation libs.

### T1.2 Optimization history chart
Small chart of `optimization_history` (loss over iterations) — proves
"gradient descent through time" to judges. SVG sparkline, no chart lib.

### T1.3 "How it works" callouts on the planner
Inline tooltips/cards for **Learn → Differentiable physics**, **Built on AWS →
Lambda + API Gateway**, targeting judging criteria (see `docs/JUDGING.md`).

### T1.4 Mission history (stretch, only if P0 is rock solid)
Save current mission client-side (localStorage) → replay cards. Do NOT wire
DynamoDB save from the client yet (backend still deciding).

### T1.5 Responsive + dark-only
Dark ocean theme enforced (see design tokens); looks great at 1280×720 for the
video recording.

---

## P2 — Ship It / video support

### T2.1 Static export readiness
Repo config already has `output: "export"`. Keep **all** data fetching
client-side (no server-only code in pages) so `npm run build` produces a static
`out/`. Verify `npm run build` passes before the day ends.

### T2.2 Demo-day page state
A "hide UI chrome" toggle or 16:9 clean layout for the 3-min video record.

---

## Design tokens (do not deviate — Best UI consistency)
| Token | Value | Use |
|---|---|---|
| background `#04070d` | deep ocean | page bg |
| panel `#0b1220` / `#0f1729` | cards | config, KPI |
| border `#1c2b45` | hairlines | cards |
| accent `#38bdf8` / `#22d3ee` | cyan family | brand, Aqualign routes, CTA |
| coral `#f0883e` | | random patrol (dashed) |
| muted `#7e95b8` | text | secondary |
| success `#2ea043` | | positive deltas |

Typography: Geist (already via `app/layout.tsx`). Mono for numbers.

---

## Acceptance = hackathon video beats
Judges see: config → **Run mission** → animated routes carve the currents → KPIs
pop (`efficiency_gain`, `fuel_saved_pct`) → loss sparkline. If a judge mutters
"that's the ocean," you've won.

## Done = all P0 checkboxes ticked + `npm run build` green. Then tag frontend
owner in the demo video cut.