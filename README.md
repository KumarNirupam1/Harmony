# 🌊 Aqualign — Order from Chaos

**Mission planning for ocean-cleanup fleets.** A differentiable physics engine
that routes vessels to *ride* ocean currents instead of fighting them.

> Built at the **First Commit | Bharat Builds Tour** hackathon (WeMakeDevs × AWS).
> Team **Titan** · Team code `BP57CZ`

![build](https://img.shields.io/badge/build-passing-brightgreen)
![license](https://img.shields.io/badge/license-Apache%202.0-blue)
![ts](https://img.shields.io/badge/TypeScript-Next.js%2016-blue)
![aws](https://img.shields.io/badge/AWS-Ship%20It-FF9900)

## The problem

8M tons of plastic enter the ocean every year — and it never sits still. It
rides gyres, eddies and jets. Cleanup crews that "drive straight at the trash"
burn fuel fighting the current that moves it. Aqualign inverts this: treat the
ocean as a **differentiable vector field**, unroll the physics forward in time,
and **backpropagate capture/fuel loss through every step** to learn intercept
routes. Random patrol vs learned rout → up to **+50% recovery** and **≤60% fuel
saved** in the double-gyre benchmark.

## Quickstart

```bash
npm install          # web app (Next.js 16 · TypeScript · Tailwind v4)
npm run dev          # ui → http://localhost:3000

# Simulation API (Python + PyTorch engine)
python3 -m venv .venv && source .venv/bin/activate
pip install -r api/requirements.txt
npm run dev:api      # FastAPI → http://localhost:8000   (POST /mission)
```

## Repository layout

```
app/                 Next.js 16 web app (the product)      → S3 + CloudFront
api/                 FastAPI + PyTorch engine (Lambda container)
  ├─ aqualign/       ocean current tracking · RK4 · gradient optimizer
  └─ app/            FastAPI routes + headless JSON runner
data/                double-gyre ocean field (gulf_stream.npz)  → also S3
infra/
  ├─ sam-template.yaml   serverless stack: API + Lambda + DynamoDB + S3
  └─ scripts/            deploy-api.sh · deploy-web.sh · dev.sh
docs/                ARCHITECTURE · JUDGING · VIDEO_SCRIPT · PRODUCT
archive/             original Streamlit dashboard + legacy scaffold
```

## Ship It — deploy on AWS (free tier)

```bash
./infra/scripts/deploy-api.sh   # builds & pushes the Lambda container, SAM deploy
./infra/scripts/deploy-web.sh   # static export → S3 + CloudFront
```

See **docs/ARCHITECTURE.md** for the full AWS story and **docs/JUDGING.md** for
how the stack maps to the judging criteria. Local (Build It) path: the identical
stack runs via SAM/LocalStack without an AWS account (see ARCHITECTURE §5).

## Team

- **Sanket Singh** — lead
- **Kumar Nirupam**

<small>Originally built for the Tesseract hackathon; evolved here into a shipped,
serverless product at First Commit.</small>