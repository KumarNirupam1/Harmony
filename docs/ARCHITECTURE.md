# Aqualign — Architecture & AWS Story

> *"We don't fight the ocean; we learn to dance with it."*

Aqualign turns ocean-debris cleanup from a line-of-sight chase into a
**differentiable control problem**. This document explains the full system
architecture and exactly where AWS sits in it — the *Built on AWS* criterion is
part of the Ship It score, so be able to walk a judge through every box below.

## 1 / The problem in one breath

8M tons of plastic enter the ocean every year. It doesn't float still — it rides
geostrophic currents (gyres, eddies, jets). Cleanup vessels that "drive straight
to where the trash is" burn fuel fighting the very currents that move it.
We invert that: **ride the currents, let the optimizer plan the intercept**.

## 2 / System overview

```
                          ┌────────────────────────────────────────┐
                          │              USER (browser)            │
                          │  Next.js 16 · TypeScript · Tailwind v4 │
                          │  React app → static export             │
                          └───────────────────┬────────────────────┘
                                              │ HTTPS (CORS enabled)
                                              ▼
                        ┌─────────────────────────────────────────┐
                        │     API Gateway (HTTP API, serverless)  │
                        │   POST /mission · GET /health           │
                        └───────────────────┬─────────────────────┘
                                            ▼
                        ┌─────────────────────────────────────────┐
                        │        Lambda (container image)         │
                        │   FastAPI + Aqualign engine (PyTorch)   │
                        │   gradient descent through time → route │
                        └───────┬───────────────────┬─────────────┘
                                │ read/write        │ read
                                ▼                   ▼
                     ┌──────────────────┐  ┌──────────────────────┐
                     │  DynamoDB        │  │ S3 (ocean field +    │
                     │  mission store   │  │ datasets, exports)   │
                     └──────────────────┘  └──────────────────────┘
```

### Data flow (the interesting part)

1. Browser calls `POST /mission` with fleet + horizon + optimization settings.
2. Lambda boots the FastAPI container. **Gradient Through Time**: the engine
   unrolls `horizon` steps of RK4 advection, then backprops the capture/fuel
   loss to learn `72 × vessels × 2` thrust controls via Adam.
3. The API returns JSON: velocity field (for overlay), both strategies'
   trajectories (for the scrubber animation), capture/fuel metrics.
4. Front-end renders the side-by-side story and KPIs.
5. A "save mission" writes to DynamoDB; exports/field data live in S3.

### Why serverless for a physics engine?

- The heavy job runs **only when a user asks** — zero idle cost, perfect for
  the free tier and for the "Ship It means deploy, not burn money" story.
- Lambda containers (up to 10 GB image) let us ship PyTorch without cold-start
  gymnastics.
- Architecture *is* the score for Ship It: CloudWatch for metrics, DynamoDB for
  state, S3 for data, API Gateway for a clean HTTPS surface.

## 3 / AWS services used (and why)

| Service               | Role                                                            | Free tier |
| --------------------- | --------------------------------------------------------------- | --------- |
| **API Gateway**       | Serverless HTTPS surface for `/mission`, CORS, throttling       | 1M req/mo |
| **Lambda**            | Container runtime for the PyTorch simulation                     | 400K Gb-sec |
| **S3**                | Static web app export + ocean field datasets                     | 5 GB      |
| **CloudFront**        | Edge delivery of the web app (fast, HTTPS)                       | 1 TB/mo   |
| **DynamoDB**          | Storing mission history/results (pay-per-request)                | 25 GB     |
| **CloudWatch**        | Logs + latency metrics (we log every `/mission` latency)         | included  |
| **EventBridge**       | (Ready) async re-run & scheduled bench runs for the dashboard    | 1M events |

> We deliberately kept Bedrock out of the critical path — per the organizers'
> guidance, Bedrock access can lag, and *"the only thing we ask is that you
> deploy on AWS."* The AI in this project is the **gradient optimizer itself**:
> it *learns* a control policy through time, which is a better "learning" story.

## 4 / Repo layout

```
apps are split so the toolchain stays boring and deployable:
├── app/            Next.js 16 web app (the product)  → S3 + CloudFront
├── api/            FastAPI + PyTorch engine           → Lambda container
│   ├── aqualign/   current-tracking // RK4 // optimizer (ported from Aqualign)
│   └── app/runner.py  headless JSON mission runner
├── data/           gulf_stream.npz (double-gyre field) → also S3
├── infra/          SAM template + deploy scripts
├── docs/           this + judging + video + product
└── archive/        original Streamlit dashboard & legacy scaffold
```

## 5 / Local (Build It) story

The exact same code runs with the open-source AWS stack on your own machine —
no account, no card:

```bash
npm run dev          # web app (front-end)
npm run dev:api      # FastAPI engine locally (uvicorn)
```

Build It track tools we mirror: **SAM CLI + LocalStack** (template in
`infra/sam-template.yaml`), **OpenSearch**-style data querying is a natural next
step for field archives, and **Cedar** fits for future authz. See
`docs/JUDGING.md` for the track strategy.

## 6 / What we learned (criterion #3 — say this out loud)

1. **Differentiable simulation ≠ RL.** Backprop-through-time tastes the whole
   trajectory and needs far fewer samples than policy-gradient methods.
2. **Serverless can run a physics engine** — container images + smart batching
   (grid_sample over the field) keep it seconds-fast on CPU.
3. **Deploying free ≠ deploying free.** Cost architecture matters: on-demand
   compute, pay-per-request DB, static-first front-end.
4. **Data is the bottleneck in the real ocean** — the double-gyre NPZ is
   synthetic; real current data (HYCOM/OSCAR) is the roadmap.