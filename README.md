# Aqualign — ride the current. waste nothing.

A serverless mission planner for ocean-cleanup fleets. A differentiable
physics engine unrolls ocean advection (RK4) as a PyTorch computation graph and
**gradient-tunes vessel control sequences** so cleanup crews ride gyres instead
of fighting them. Try it against a random patrol on the same, identical current
field and watch the numbers move.

Built for **First Commit | Bharat Builds Tour** (WeMakeDevs × AWS) — Team Titan
(Team code `BP57CZ`).

```
Web (Next.js static export, S3 + CloudFront)
        │  POST /mission            GET /api/missions
        ▼
API Gateway ──► Lambda container ──► PyTorch rollout (CPU)
                (FastAPI, Web Adapter)      │
                                           ├── DynamoDB  mission history
                                           └── S3        ocean current data
```

## The loop

1. Configure a fleet (vessels, horizon, debris spread, seed).
2. `POST /mission` → the engine runs **Random Patrol** (baseline) and
   **Aqualign** (Adam over the full rollout) on the same currents.
3. Replay both animated side-by-side; scrub the timeline; read KPIs:
   debris recovered, **control effort** used, efficiency gain, domain coverage,
   first-capture hour — plus a loss-over-iterations sparkline proving the
   gradient walked there.

Reference results (double-gyre benchmark, seed 42, 200 debris, 3 vessels, 72h):

| Metric | Random patrol | Aqualign | Δ |
| --- | --- | --- | --- |
| Debris recovered | 6 | 7 | **+16.7%** |
| Control effort | 450.4 | 164.2 | **−63.5%** |
| First capture | hour 9 | hour 4 | earlier |

## Repo layout

```
api/                  FastAPI service + engine
  aqualign/             differentiator (ocean_field, particle_simulator, optimizer)
  app/                  main.py (HTTP), runner.py (headless), explain.py (LLM copilot)
  scripts/              generate_data.py (synthetic), fetch_real_data.py (OSCAR real currents)
  tests/                smoke tests
  Dockerfile            Lambda container (Web Adapter)
app/  components/  lib/   Next.js 16 static-export UI
data/                     ocean current .npz (u,v,x,y) + sample responses
infra/                    SAM template + deploy scripts (API, web)
docs/                     remaining work to submission (docs/TODO.md)
```

## Run locally

```bash
# 1. API (engine) — needs Python 3.11+ with torch
cd api && pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000   # POST localhost:8000/mission

# 2. Web — Node 20+
npm install
npm run dev                    # http://localhost:3000 (calls :8000)
```

Offline-safe: if the API is unreachable the UI falls back to a seeded mock
(`lib/mock-mission.ts`); `NEXT_PUBLIC_API_URL` points the app at the live
Lambda URL.

## Real ocean data (Bay of Bengal)

`data/gulf_stream.npz` ships with a synthetic double-gyre field. To use real
surface currents from NASA OSCAR:

```bash
pip install xarray netCDF4 requests
python api/scripts/fetch_real_data.py --region bay-of-bengal --write data/gulf_stream.npz
```

The engine only reads `u/v/x/y` arrays, so it is dataset-agnostic. A backup of
the synthetic field is kept as `data/gulf_stream_synthetic_backup.npz`. Set
`AQUALIGN_DATA` to switch files.

## Deploy on AWS

Prereqs: AWS CLI, SAM CLI, Docker Desktop (running).

```bash
aws configure                      # friend/your IAM keys + region (us-east-1)
aws sts get-caller-identity        # must return an identity, not an error

# 1. API — first run builds the PyTorch container (~15–30 min; don't Ctrl+C)
./infra/scripts/deploy-api.sh      # prints API URL: https://…execute-api…

# 2. Web — static export to S3 + CloudFront
NEXT_PUBLIC_API_URL=https://… ./infra/scripts/deploy-web.sh   # prints CloudFront URL

# 3. LLM copilot (optional) — the 3-second explainer
aws ssm put-parameter --name /aqualign/openai-key --type SecureString --value sk-…
curl -X POST https://…/api/explain -H "Content-Type: application/json" \
  -d '{"params":{…},"metrics":{…}}'
```

Stack: API Gateway (HTTP API) → Lambda container (FastAPI on the Web Adapter,
CPU PyTorch) → DynamoDB mission store + S3 data bucket; web = S3 + CloudFront,
CORS-open. No duplicated claims: only what you see here is what we say we built.

## Learnings (what this repo exists to show)

- **Differentiable physics isn't just for ML**: treating an ODE rollout as a
  computation graph means the *gradient* itself plans routes — metrics are
  computed, not imputed.
- **Capture objectives need care**: a soft Gaussian collection reward ≠ a hard
  capture count; the gap between the two is measurable.
- **Serverless + heavy runtime works**: a PyTorch CPU container behind Lambda's
  Web Adapter holds ~2–5 s mission solves; no GPU, no EC2.
- **Static export keeps the UI safe**: S3 + CloudFront for the frontend means no
  origin server to babysit on demo day.

See `docs/TODO.md` for everything left before submission.