# Aqualign — Product

## Problem
8M tons of plastic enter the ocean annually. Debris concentrates along current
features (gyres, eddies, frontal jets), so cleanup success depends on *where you
send vessels and how well you ride the flow*. Reactive chases waste fuel and
carbon chasing a target that moved.

**Winner insight:** this is not (only) a prediction problem — it is a **control
problem**. Aqualign computes routes that exploit the ocean's own energy to
intercept debris clusters before they disperse.

## Persona
Primary user: **coastal cleanup / port-authority operations lead** — someone
who must decide, tonight, where to send the team's cleanup boat(s) tomorrow.
Secondary: **marine-debris researchers** who want to benchmark routing
strategies; educators teaching differentiable optimization.

## Core loop (the one feature that must work)
1. **Plan** — pick region (double-gyre dataset today; real current data next),
   fleet size, time window.
2. **Run** — hit Run; a serverless Lambda solves the differentiable control
   problem (gradient descent through time).
3. **Compare** — animated side-by-side: Random Patrol vs Aqualign, over the
   current field.
4. **Judge** — KPI cards: debris recovered, fuel used, efficiency gain, fuel
   saved. Numbers an ops lead can act on.
5. **Document** — mission report + export; persisted to DynamoDB.

## Features (v1 — shipped)
- Configuration panel: vessels (1–6), horizon (12–168 h), optimizer
  iterations/learning rate, debris model.
- Live mission run via `POST /mission` on AWS Lambda + API Gateway.
- Canvas visualization: velocity streamlines, both strategies, animated
  scrubber over time.
- KPI dashboard with deltas + a "fuel saved" story.
- Mission history via DynamoDB (save/replay).

## Features (v2 — beachhead for the judges' "what's next" question)
- Real current data (HYCOM/OSCAR) instead of synthetic NPZ → regional picker.
- Fleet cost model ($/fuel-hour, CO₂ per liter marine diesel) → cost/benefit.
- AI-written mission report (any provider — Bedrock proven unnecessary).
- Cedar-based authorization so NGOs/units share private mission bases.
- OpenSearch on field archives for "where has debris clustered historically?"

## Non-goals (say these out loud if asked)
- No boat navigation/hardware. We plan; local crews execute.
- No RL. Differentiable control is deliberately simpler, faster, and
  explainable-by-inspection. That *is* the point.

## Why this wins on "real problem, small solved well"
A cleaning NGO doesn't need a research demo — it needs *where to point the
boat*. Aqualign is that answer, computed by a technique judges can grasp in a
paragraph of video, demonstrated end-to-end on AWS.