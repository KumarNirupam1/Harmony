# Remaining work to submission

Status date: Sep 20, 2026 · Deadline: **Sep 20 EOD** · Team Titan
What's NOT here: video generation (cut by the team). Everything else needed to
ship, pass the build gate, deploy, and demo cleanly is listed below.

Legend: `[x]` done · `[ ]` todo · `(owner)` who.

---

## Infrastructure — DONE & GREEN ✅ (Sep 20)

### API (Lambda + DynamoDB + SSM)
- [x] Stack `harmony-api` UPDATE_COMPLETE; `POST /mission` solves + persists;
      `GET /api/missions` returns history; `POST /api/explain` → `source: openai`.
- Live URLs:
  - Function URL (use for web; no 30 s cap):
    `https://ovnmgz33g5i4qrsqxmfir5ov2a0ftakv.lambda-url.us-east-1.on.aws/`
  - API Gateway: `https://s0vu084eog.execute-api.us-east-1.amazonaws.com`

### Web (CloudFront + S3)
- [x] Live: `https://d32eo4z8j4qsxd.cloudfront.net` — all routes 200.
- [x] `trailingSlash` export + CloudFront Function (`harmony-viewer-rewrite`)
      baked idempotently into `infra/scripts/deploy-web.sh`.
- [x] `NEXT_PUBLIC_API_URL` = Function URL at build; CORS verified.

### Quality / CI / Git
- [x] `tsc --noEmit` 0 errors · `eslint` 0 errors · contracts match the engine.
- [x] GitHub Actions `.github/workflows/ci.yml` (web-build + api-test) **green on main**.
- [x] All local commits pushed (`origin/main` in sync).

---

## P1 — Frontend gaps (owner: teammate F-tasks)

Backend + frontend contracts are live and verified; these are pure React/Next UI.

- [ ] **Objective presets + boundary penalty control** in the planner: backend
      accepts `objective: balanced|max_collection|min_control_effort` and
      `boundary_penalty: bool` — the UI sends only the 7 base params. Add preset
      chips + a boundary toggle to the form; send in `MissionRequest`.
- [ ] **Copilot panel** in the planner: `POST /api/explain` is live (source
      `openai` with the SSM key). Add a "Why did Harmony win?" button → shows
      `explanation` + `source: openai|static`. Graceful offline fallback.
      Request shape: `{ params: MissionRequest, metrics: MissionMetrics }`.
- [ ] **History from DynamoDB**: `GET /api/missions` is live and returns
      `{missionId, createdAt, params, metrics}` (newest first). Merge server rows
      into `components/history` (dedupe on `missionId`), keep local mirror offline.
- [ ] **Replay from history**: history row → `/planner?id=<missionId>`. Site is
      `output: export` — read `window.location.search` directly (NOT
      `useSearchParams` without `Suspense`). Restore = POST a new solve with the
      row's `params` (there is no GET-by-id endpoint).
- [ ] Landing: replace default Next/Vercel SVGs in `public/` with the Harmony
      wave mark; add OG image + metadata so share links look right.
- [ ] Planner copy check after the above: objective label, boundary flag,
      copilot chip, "history is in DynamoDB" wording (mostly already updated).

Note: `SavedMission` local rows use `id`; server rows use `missionId` — the
history merge must map between them.

---

## P2 — Data & correctness (owner: you, torch box) — REQUIRED before submit

- [ ] Run the real test suite (CI runs the same thing):
      `python -m pytest api/tests -q`  → all green.
- [ ] Rebuild the shipped sample with the v1.1 metrics (current
      `data/sample-mission.json` is a pre-1.1 engine dump; `lib/mock-mission.ts`
      is already correct):
      `python -c "from api.app.runner import run_mission, MissionParams; import json; open('data/sample-mission.json','w').write(json.dumps(run_mission(MissionParams(debris_count=80))))"`

---

## P2 — Polish / risk (owner: split; do if time)

- [ ] (optional, strong for judges) Real currents instead of synthetic:
      `pip install xarray netCDF4 requests && python api/scripts/fetch_real_data.py --region bay-of-bengal --write data/gulf_stream.npz`
      Re-run the benchmark; confirm `+17% / 63%` still hold, else update landing numbers.
- [ ] Offline path: block network → planner still serves the seeded double-gyre
      mock; no unhandled promise rejection in console.
- [ ] Dark-mode sanity pass on every page.
- [ ] Confirm `+17% / 63% / <5s` on landing match the demo benchmark (README table).
- [ ] CloudFront URL reachable for judges (README top or pinned team message).

---

## Submission checklist (all above green)

- [ ] Frontend P1 items shipped by teammate (deployed via `npm run deploy:web`).
- [ ] Sample response regen'd; landing stats match the real benchmark.
- [ ] README accurate (architecture, run/deploy, learnings) — read top to bottom.
- [ ] **SheerID verification** on AWS Builder Center (outside repo).
- [ ] Demo rehearse: 3-vessel, 72 h, seed 42 walkthrough; try offline fallback.