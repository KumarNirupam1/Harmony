# Remaining work to submission

Status date: Sep 19, 2026 · Deadline: **Sep 20 EOD** · Team Titan
What's NOT here: video generation (cut by the team). Everything else needed to
ship, pass the build gate, deploy, and demo cleanly is listed below.

Legend: `[x]` done · `[ ]` todo · `(owner)` who.

---

## P0 — Ship-blocking (finish first)

### Deploy (owner: you — needs valid AWS creds)
- [ ] `aws configure` with friend's credentials, then verify:
      `aws sts get-caller-identity` -> returns an AccountId.
- [ ] `./infra/scripts/deploy-api.sh` (~15–30 min, do not Ctrl+C).
      `sam deploy` builds the Lambda image, pushes to ECR, provisions
      API Gateway + Lambda + DynamoDB + S3 + SSM policy.
- [ ] Smoke the API:
      `curl $API_URL/health` → `{"status":"ok",...}`
      `curl -X POST $API_URL/mission -H 'content-type: application/json' -d '{"seed":1,"iterations":200}'`
      → check `meta.missionId` exists and a row appeared in DynamoDB.
- [ ] Give the copilot its key (gpt-4o-mini, server-side only):
      `aws ssm put-parameter --name /harmony/openai-key --type SecureString --value sk-...`
      then `curl -X POST $API_URL/api/explain` with a finished mission's
      params+metrics → expect `"source":"openai"`.
- [ ] Deploy the web app with the API URL baked in at build time:
      `NEXT_PUBLIC_API_URL=$API_URL ./infra/scripts/deploy-web.sh`
      → live at CloudFront URL.
- [ ] End-to-end: open the CloudFront URL → planner → run a mission →
      canvas + KPIs + history + copilot all work against the real Lambda.

### Data & correctness (owner: you, on a machine with torch installed)
- [ ] Rebuild the shipped mock *and* sample response with the v1.1 metrics
      (current `data/sample-mission.json` is a pre-1.1 engine dump — the web
      mock in `lib/mock-mission.ts` is already correct):
      `python -c "from api.app.runner import run_mission, MissionParams; import json; open('data/sample-mission.json','w').write(json.dumps(run_mission(MissionParams(debris_count=80))))"`
- [ ] Run the real test suite (CI runs the same thing):
      `python -m pytest api/tests -q`  → all green (engine + copilot fallback).
- [ ] Optional but strong for judges — real currents instead of synthetic:
      `pip install xarray netCDF4 requests && python api/scripts/fetch_real_data.py --region bay-of-bengal --write data/gulf_stream.npz`
      Then re-run the benchmark (`scripts/`/engine) and confirm the
      `+17% / 63%` claims still hold on real data; if they drift, update the
      landing numbers before deploy.

### Verification before you push/commit
- [ ] `python3 -m py_compile api/app/*.py api/harmony/*.py api/tests/*.py`
- [ ] `npx tsc --noEmit`  → 0 errors
- [ ] `npm run lint`  → clean (scoped to source; see package.json)
- [ ] `npm run build`  → 8 static routes exported
- [ ] `bash -n infra/scripts/*.sh && docker build -t harmony-api -f api/Dockerfile .`
      → image builds and `data/gulf_stream.npz` is inside (needed by the engine).

## P0 — Git / CI
- [ ] Push to `main`; GitHub Actions runs `web-build` (npm ci/lint/build) and
      `api-test` (pip install + pytest). Both must be green.
- [ ] Any file >2 MB will be rejected by pre-commit (`.npz` / samples are fine
      today — watch new dataset exports).

---

## P1 — Frontend gaps to close before submission (owner: teammate F-tasks)

- [ ] **Objective presets + boundary penalty controls** in the planner: backend
      accepts `objective: balanced|max_collection|min_control_effort` and
      `boundary_penalty: bool` — the UI still only sends the 7 base params.
      (Add to `form`, send in `MissionRequest`, small preset chips + a boundary
      toggle; defaults unchanged.)
- [ ] **Copilot panel** in the planner: `POST /api/explain` exists and is tested;
      add a "Why did Harmony win?" button → shows `explanation` +
      `source: openai|static`. Graceful offline fallback.
- [ ] **History from DynamoDB**: `GET /api/missions` exists; `components/history`
      currently shows device-local rows only. Merge server rows in (dedupe on
      `missionId`), keep local mirror when offline.
- [ ] **Replay from history**: history row → `/planner?id=<missionId>`. Because
      the site is `output: export`, read `window.location.search` directly (do
      NOT use `useSearchParams` without a `Suspense` boundary). Restore = fetch
      live mission or rebuild from seed params.
- [ ] Landing: replace the default Next/Vercel SVGs in `public/` with the
      Harmony wave mark; add an OG image + metadata so share links look right.
- [ ] Planner copy check after all the above: objective label, boundary flag,
      copilot chip, "history is in DynamoDB" wording (already updated).

---

## P2 — Polish / risk (do if time)

- [ ] Test the offline path: block network → planner should still serve the
      seeded double-gyre mock ("if the API is offline, judges still see the
      story"). Confirm no unhandled promise rejection in console.
- [ ] Dark-mode sanity pass on every page (canvas + KPI cards + copilot panel).
- [ ] Confirm the `+17% / 63% / <5s` numbers on the landing match the benchmark
      you actually demo (README has the table; keep them in sync).
- [ ] Put the CloudFront URL somewhere reachable for the judges (README top or a
      pinned team message). Do not hardcode secrets — the SSM key stays server-side.

---

## Submission checklist (everything above is green)

- [ ] API deployed, `/health` + `/mission` + `/api/missions` + `/api/explain` verified.
- [ ] Web deployed to CloudFront with `NEXT_PUBLIC_API_URL` baked in.
- [ ] Plutivo CI: web-build + api-test green on `main` HEAD.
- [ ] Sample response regen'd; landing stats match the real benchmark.
- [ ] Frontend gaps above (P1) shipped by teammate.
- [ ] README accurate (architecture, run/deploy, learnings) — read it top to bottom.
- [ ] **SheerID verification** on AWS Builder Center (outside this repo).
- [ ] Demo rehearse: 3-vessel, 72 h, seed 42 walkthrough; try the offline fallback.