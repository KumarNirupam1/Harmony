# Aqualign — Remaining Tasks (converged plan: "Deploy + enrich")

Deadline: **Sept 20 EOD**. Scope chosen: protect the running P0, then deploy and
enrich. No async jobs, no copilot, no what-if, no forecast mode until this lands.

Design tokens & FE conventions: `docs/FRONTEND_TASKS.md`. Contract source of
truth: `docs/API_CONTRACT.md`.

---

## Contract change (read first — the response shape is changing)

`fuel` is being renamed to **`control_effort`** (judging + spec §21 wording).
Both of these sections change at the SAME time — backend and frontend land in
one commit so nothing breaks.

New / changed fields:

- `StrategyResult` (`random`, `optimized`, `optimization_history` entries):
  - `fuel` → **`control_effort`** (same value, sum of squared thrust)
  - **new** `captures_over_time: number[]` — cumulative unique-captured count
    at each frame `t` (length `horizon + 1`). Powers the analysis chart.
- `metrics`:
  - `random_fuel`/`optimized_fuel` → **`random_control_effort` / `optimized_control_effort`**
  - `fuel_saved`/`fuel_saved_pct` → **`control_effort_saved` / `control_effort_saved_pct`**
  - **new** `coverage_pct`, `random_coverage_pct` — % of the 50×50 domain swept
  - **new** `unique_captures`, `random_unique_captures` — debris caught by ≥1 vessel
  - **new** `first_capture_hour`, `random_first_capture_hour` — earliest capture frame
  - **new** `current_assisted_distance`, `random_current_assisted_distance` —
    cumulative ocean-drift applied to vessels (domain units)
  - unchanged `efficiency_gain`, `total_debris`
- `meta`: **new** `mission_id` (DynamoDB key). New endpoint `GET /api/missions`
  returns `{missions: [{id, createdAt, params, metrics}]}` (summaries only — no
  trajectories, keeps the page light).

---

## BACKEND — owner: Nirupam (for reference, so FE knows the inputs)

### B1. Metric enrichment in `api/app/runner.py`
- Track per-frame capture masks → `captures_over_time` for both strategies.
- Compute `coverage_pct` (discretize domain, mark units within capture radius).
- Compute `first_capture_hour`, `unique_captures`, current-assisted drift.
- Replace `fuel` with `control_effort` everywhere (incl. `optimization_history`).
- Re-run `python -m api.scripts.run_smoke` (or a manual `/mission` call) and
  confirm the −63% control-effort story still holds.

### B2. Persistence in `api/app/main.py`
- `POST /mission`: write result to DynamoDB (`AQUALIGN_TABLE`, key `missionId`),
  store params + metrics + a compact payload (NO full trajectories), return
  `meta.mission_id`.
- `GET /api/missions`: scan table, return recent summaries desc by `createdAt`.
- Add `boto3` to `api/requirements.txt`.
- Local dev: no table → log a warning and continue (never break the sim).

### B3. Deploy
- `aws configure`, set region, `./infra/scripts/deploy-api.sh`, get `ApiUrl`
  from the stack output, set `NEXT_PUBLIC_API_URL` for the web build,
  `./infra/scripts/deploy-web.sh`. E2E: `/health` then `POST /mission` on the
  live URL, confirm DynamoDB row appears.

---

## FRONTEND — owner: teammate (do these; start on F2/F3 after F1)

### F1. Routes + restore — `app/`
- Rename `/planner` → `/mission` (move `app/planner/` → `app/mission/`).
- Add a redirect so `/planner` still resolves (small `app/planner/page.tsx`
  that `redirect()`s to `/mission` — keep it a server component, no data fetch).
- Update all nav links + hero CTAs (`components/landing/*`) to `/mission`.
- Restore-from-history: planner reads `?id=` query param and prefills the form
  from a history/saved record (see F4) — no dynamic routes needed (static
  export stays happy).

### F2. Analysis panel (new component, sits under the replay scrubber)
Use **hand-rolled SVG** (no chart lib — repo ships only Next/React/Tailwind).
- Chart 1: `optimized.captures_over_time` vs `random.captures_over_time`
  (x = hours, y = debris recovered) — two polylines, coral dashed vs accent
  solid, matching the canvas legend.
- Chart 2 (small): cumulative `control_effort` over time — or fold into KPI
  strip (see F3).
- Card labels: "Debris recovered over time", "Control effort over time".
- Show `coverage_pct`, `first_capture_hour`, `current_assisted_distance` as
  small read-outs next to the charts.

### F3. Label + KPI updates — `components/planner/`
- `kpi-strip.tsx`: "Fuel used" → **"Control effort"**; subs show saved % from
  `control_effort_saved_pct`. Add a 4th card if available:
  "First capture" (`first_capture_hour`h) + "Coverage" (`coverage_pct`%).
- `loss-sparkline.tsx` + `lib/types.ts`: accept `control_effort` key in
  `OptimizationStep` (and `MissionMetrics`, `StrategyResult`).
- Update `lib/api.ts` type usage if it references `fuel`; bump the mock in
  `lib/mock-mission.ts` to the new fields so offline demo still matches.
- "Try a demo mission" button in the config panel: runs one click with
  `DEFAULT_MISSION` (seed 42, 200 debris) — good for judges & video.

### F4. History parity — `components/history/` + `lib/`
- Keep localStorage as the fast path; it already saves on each run.
- If `GET /api/missions` is live, fetch and render server history (id →
  deep-link `/mission?id=…`). Degrade gracefully to localStorage when offline.
- `lib/history.ts`: store `mission_id` in `SavedMission` when the API returns it.

### F5. Landing snapshot — `app/page.tsx`
- Swap the placeholder hero card for a **static snapshot** of the planner viz
  (first frame of the mock) so judges see the product in 3 s.

### F6. Build gate
- `npm run build` GREEN before the day ends (static export, all fetches
  client-side). Then the FE owner reviews the video cut.

---

## Sequence that avoids merge pain
1. Backend ships B1+B2 with new field names + `mission_id`.
2. FE merges the same day: F1 → F3 types/labels → F3 canvas unaffected (uses
   `trajectory`/`debris` only) → F2 charts → F4/F5.
3. Coordinate the `fuel→control_effort` rename in ONE commit pair so nothing
   renders stale `fuel` keys.
4. BE deploys (B3) only after FE types are aligned — mock-first means the UI
   still works if deployment is late.

## Not doing this round (parked)
Async job model + progress/SSE, scenario presets, boundary penalty, unique-
capture objective alignment, copilot, what-if, forecast mode.