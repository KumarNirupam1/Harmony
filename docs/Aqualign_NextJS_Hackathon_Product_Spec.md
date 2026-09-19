# Aqualign — Next.js Hackathon Product Specification

## Purpose

This document is the implementation brief for converting the current **Aqualign differentiable-physics prototype** into a polished, production-style web application for the **WeMakeDevs × AWS First Commit hackathon (Sept 17–20, 2026)**.

The existing scientific/optimization engine should remain the foundation. The goal is to add a high-quality Next.js frontend, expose the existing Python engine through a clean API, improve a few objective/metric mismatches where necessary, and package the project as a convincing real-world product.

The application should be presented as:

> **Aqualign — Autonomous Ocean Cleanup Mission Control**
>
> A differentiable-physics mission planner that helps cleanup fleets intercept moving ocean debris by optimizing vessel control around ocean currents instead of blindly fighting them.

This specification is intentionally implementation-oriented. OpenCode should inspect the existing repository before changing anything and preserve working scientific code unless a change is explicitly required below.

---

# 1. Hackathon Context and Product Strategy

The hackathon is open-theme and asks teams to solve a real problem. Its judging criteria include idea/impact, use of AWS, learning, execution, and the three-minute demo video. There is also a separate Best UI prize focused on usability and design.

Aqualign should therefore optimize for five observable qualities:

1. **The problem is immediately understandable.**
2. **The differentiable-physics technology is visibly real, not just claimed.**
3. **The application is genuinely interactive.**
4. **AWS is a meaningful part of deployment/architecture rather than a logo pasted on the page.**
5. **The first 60 seconds of the product demonstrate the value without requiring explanation.**

Do not try to win by adding dozens of shallow features. A reliable mission-planning flow with an excellent simulation experience is more important than a large feature count.

Recommended target: **Ship It** if deployment can be made stable. The live deployment and architecture are explicitly part of that track's evaluation.

---

# 2. Current Repository — Verified Capability Audit

The packed repository currently contains these functional areas.

## 2.1 Existing data generation

### `data/generate_data.py`

Already implemented:

- 100 × 100 synthetic ocean grid.
- 50 × 50 unit domain based on a 0.5 grid scale.
- Rotational/double-gyre-like current field.
- Exponential decay of current strength with distance.
- Additional sinusoidal eddy perturbations.
- Saves `data/gulf_stream.npz` containing:
  - `u`
  - `v`
  - `x`
  - `y`

This is sufficient for the hackathon demo. Do **not** block the frontend on obtaining a real ocean dataset.

## 2.2 Existing differentiable ocean field

### `src/ocean_field.py`

Already implemented:

- Loads the `.npz` field.
- Converts velocity grids to PyTorch tensors.
- Exposes `get_velocity(pos)`.
- Uses `torch.nn.functional.grid_sample` for differentiable interpolation.
- Returns interpolated `[u, v]` velocity at arbitrary positions.

This is the main scientific foundation.

## 2.3 Existing differentiable physics

### `src/particle_simulator.py`

Already implemented:

- Differentiable debris advection.
- RK4 integration.
- Euler fallback.
- Vessel kinematics using:
  - ocean current
  - plus control thrust

Current vessel model is intentionally simple:

`total_velocity = current_velocity + control_thrust`

Do not replace this with a complex naval simulator during the hackathon.

## 2.4 Existing route optimization

### `src/optimizer.py`

Already implemented:

- Learnable controls for every vessel and timestep.
- `torch.tanh` thrust bounding.
- Differentiable vessel simulation.
- Soft Gaussian proximity reward.
- Control-cost penalty.
- Adam optimization.
- Optimization logging.

This is the core differentiable-optimization feature.

## 2.5 Existing comparison experiment

### `src/compare_strategies.py`

Already implemented:

- Random Patrol baseline.
- Aqualign optimized strategy.
- Debris collection measurement using a capture radius.
- Fuel/control-effort measurements.
- Saved metrics.
- Static Matplotlib visualization.

## 2.6 Existing Streamlit interface

### `dashboard.py`

Already implemented:

- Number of vessels slider.
- Simulation horizon slider.
- Optimization iterations.
- Learning rate.
- Run simulation action.
- Random vs Aqualign KPIs.
- Static trajectory plot.
- Dark scientific styling.

This is a **prototype dashboard**, not the final product frontend.

The new Next.js frontend should replace it as the primary user experience. Keep Streamlit available only as a research/debugging fallback unless it causes maintenance issues.

## 2.7 Existing Tesseract examples

### `tesseracts/dotproduct`

- Differentiable dot product.
- Cosine similarity.
- Jacobian/JVP/VJP support.

### `tesseracts/scaler`

- Differentiable vector scaling.
- VJP support.

### `buildall.sh`

Builds all Tesseracts through the `tesseract` CLI.

These examples are useful technical provenance but **do not need to become visible product features** in the main user flow.

---

# 3. What the Repository Does NOT Currently Have

OpenCode should treat the following as missing unless they exist in the user's separate existing backend/project outside the packed repository.

## Frontend/product gaps

- No Next.js application.
- No TypeScript frontend.
- No production design system.
- No interactive WebGL/canvas simulation.
- No mission-builder workflow.
- No mission replay.
- No scenario presets.
- No what-if controls.
- No explainability panel.
- No fleet detail panel.
- No mission history UI.
- No natural-language mission planning UI.
- No responsive mobile/tablet layout.

## Backend/API gaps in this packed repository

There is no HTTP API server shown in the packed repository.

Important: **do not assume the Python files are already an API.** The Next.js frontend must not import Python or execute the optimizer in the browser.

If the user's existing separate backend already wraps this engine, reuse its routes and contracts instead of creating a second backend. If it does not, add a thin API layer around the existing Python modules.

## Infrastructure gaps

The packed repository does not demonstrate:

- AWS deployment.
- Persistent mission storage.
- Mission/job IDs.
- Progress streaming.
- Production health checks.
- Cloud observability.

---

# 4. Recommended Technology Stack

## 4.1 Core frontend

Use:

- **Next.js + TypeScript**
- **App Router**
- **Tailwind CSS**
- **shadcn/ui** for the component foundation
- **Motion** (`motion/react`) for high-quality transitions and micro-interactions
- **Lucide React** for icons

Next.js is appropriate for the web application shell and routing. App Router should be used for the new frontend.

shadcn/ui is preferred because it gives us composable components without forcing the product into an off-the-shelf visual identity.

Motion should be used selectively for:

- page/section transitions
- KPI number transitions
- drawers
- mission status changes
- optimization progress
- replay controls
- button feedback

Do not animate every element.

## 4.2 Main simulation visualization

### Recommended: deck.gl with an Orthographic view

Use:

- `deck.gl`
- `@deck.gl/react`
- `@deck.gl/layers`
- `@deck.gl/core`

Reason: the existing simulation uses a synthetic Cartesian 0–50 × 0–50 domain rather than latitude/longitude. A geospatial map library is therefore unnecessary and can actually make the model harder to explain.

Use deck.gl to render:

- ocean-current vectors
- debris points
- debris density
- vessel positions
- vessel paths
- capture zones
- predicted debris paths
- hover/click selection

Recommended layers:

- `LineLayer` for current vectors
- `ScatterplotLayer` for debris and vessel markers
- `PathLayer` for vessel trajectories
- `HeatmapLayer` or a custom density layer for debris concentration

Use an **OrthographicView** / non-geographic scientific coordinate system.

### Why not MapLibre for the main simulator?

MapLibre is excellent for interactive geographic maps, but the current Aqualign simulation is not geographic data. Do not fake a real-world map by placing synthetic 0–50 coordinates on arbitrary latitude/longitude values.

If a future version introduces real geospatial ocean data, add MapLibre at that stage and migrate the visualization layer accordingly.

## 4.3 Optional immersive visual layer

### React Three Fiber + Three.js + Drei

Use only for an optional visual layer, such as:

- landing-page ocean ambience
- a subtle 3D mission-control background
- a stylized ocean surface
- a lightweight vessel/particle hero visualization

Do **not** rebuild the actual scientific simulation in Three.js. The authoritative simulation remains Python/PyTorch.

R3F is a React renderer for Three.js and is well suited to an isolated interactive 3D scene. Use dynamic client-only loading so WebGL code does not interfere with server rendering.

## 4.4 Charts

Use **Recharts** for:

- optimization progress
- collection vs iteration
- control effort vs iteration
- mission time series
- fleet utilization
- comparison charts

Do not use charts for values that could be communicated more clearly as KPI cards.

## 4.5 Server-state management

Use **TanStack Query** for:

- fetching mission results
- mission history
- starting mutations/jobs
- polling fallback when SSE is unavailable
- cache invalidation

Avoid adding Redux.

Use simple React state for local component state. Add Zustand only if cross-page UI state becomes genuinely complex.

## 4.6 Validation

Use **Zod** at the frontend API boundary to validate mission requests/responses.

This is especially important because simulation results can contain large nested arrays and status/progress data.

---

# 5. Product Information Architecture

Keep the product to a small number of clear areas.

## Routes

### `/`

Landing + live demonstration.

### `/mission`

Mission Planner.

### `/simulation/[missionId]`

Live/replay simulation workspace.

### `/analysis/[missionId]`

Mission results + explanation + comparison.

### `/history`

Previously executed missions.

### `/architecture`

Technical architecture / how Aqualign works.

The AI Copilot should be a right-side drawer or floating panel, not a separate product area.

---

# 6. Visual Direction

## Design goal

The interface should look like a **premium scientific operations console**, not a generic SaaS dashboard and not a videogame.

Reference mood:

- ocean observatory
- autonomous vehicle mission control
- aerospace operations console
- scientific visualization
- modern developer tooling

## Theme

Primary background:

- near-black navy / blue-gray

Secondary surfaces:

- dark slate

Borders:

- very subtle cool gray

Primary accent:

- electric cyan/blue

Secondary accent:

- teal

Warning:

- amber

Danger:

- red only when genuinely necessary

Avoid rainbow gradients.

## Typography

Use a modern sans-serif available through the project, preferably the Next.js default/system stack. Do not depend on an external font provider for core rendering.

Use:

- large concise headings
- compact operational labels
- tabular/numeric styling for metrics
- generous spacing

## Core visual principle

The **ocean simulation must dominate the visual hierarchy**.

Do not cover the simulation with 20 cards.

---

# 7. Landing Page Specification

The first screen must explain the product in under 10 seconds.

## Hero

Headline:

> **Don't fight the ocean. Optimize with it.**

Subheading:

> Aqualign plans autonomous cleanup missions by differentiating through simulated ocean currents, debris motion, and vessel controls.

Primary CTA:

> **Plan a Mission**

Secondary CTA:

> **Watch a Mission Replay**

## Hero visualization

Show a small live simulation:

- dark ocean plane
- moving current particles
- a few debris clusters
- 2–3 glowing vessel markers
- subtle path trails

Keep it lightweight.

## Trust/technical strip

Show actual technologies:

`PyTorch` · `Differentiable Physics` · `Next.js` · `AWS`

If deployed using the AWS architecture described below, also show:

`ECS/Fargate` · `S3` · `CloudWatch`

Do not claim services that are not actually deployed.

---

# 8. Mission Planner

This is the core product workflow.

## Layout

Desktop:

```text
┌─────────────────────────────────────────────────────────────┐
│ AQUALIGN / PLAN MISSION                                    │
├──────────────────────┬──────────────────────────────────────┤
│ Mission settings     │ Mission preview                      │
│                      │                                       │
│ Fleet                │  Ocean/current preview               │
│ [3 vessels]          │                                       │
│                      │  Debris clusters                     │
│ Horizon              │  Vessel starting points              │
│ [72 hours]           │                                       │
│                      │                                       │
│ Debris density       │                                       │
│ [████████░░]         │                                       │
│                      │                                       │
│ Optimization         │                                       │
│ ○ Collection         │                                       │
│ ● Balanced           │                                       │
│ ○ Fuel               │                                       │
│                      │                                       │
│ [PLAN MISSION]       │                                       │
└──────────────────────┴───────────────────────────────────────┘
```

## Inputs

Expose only parameters supported by the backend.

Baseline parameters:

- number of vessels: 1–5
- horizon: 24–96 hours
- optimization iterations: 50–500
- learning rate: 0.01–0.5
- random seed

New scenario parameters:

- debris count
- debris spread
- debris center
- current intensity
- capture radius

Optimization objective presets:

### Maximum Collection

Prioritize debris interception.

### Balanced

Trade collection and control effort.

### Minimum Effort

Strongly penalize control effort.

The UI should map these presets to backend weights instead of exposing raw mathematical hyperparameters to normal users.

Add an **Advanced** section for raw parameters if needed.

---

# 9. Scenario Presets

Provide working presets.

## Normal

Moderate debris, default currents.

## Dense Debris

Higher concentration/spread around the central region.

## Strong Currents

Higher current magnitude.

## Dispersing Field

Debris spread wider over time.

## Low Fuel

Higher control-effort penalty.

## Custom

User-adjustable values.

Presets must produce real backend changes. Do not create visual-only toggles.

---

# 10. Mission Execution UX

After clicking Plan Mission, do not freeze the page.

Use a mission-job model.

Recommended lifecycle:

```text
CREATED
   ↓
QUEUED
   ↓
SIMULATING BASELINE
   ↓
OPTIMIZING
   ↓
RUNNING FINAL SIMULATION
   ↓
COMPLETED
```

Possible failure:

```text
FAILED
```

## Optimization progress screen

Show:

- current iteration
- total iterations
- current loss
- collection objective
- control-effort objective
- elapsed time
- current best route preview

Example:

```text
AQUALIGN OPTIMIZATION

Iteration       147 / 300
Progress        ████████████░░ 49%

Collection      22.41
Control effort  381.7
Loss            -22.03

Optimizing fleet trajectories...
```

A line chart should update when progress data is available.

If real-time progress is too difficult for the first working version, implement a reliable job endpoint + polling first and add SSE afterward.

---

# 11. Main Simulation Workspace

This is the product's signature screen.

## Layout

```text
┌───────────────────────────────────────────────────────────────┐
│ MISSION AQL-2026-001          ● OPTIMIZED                    │
├───────────────────────────────────────┬───────────────────────┤
│                                       │ MISSION SUMMARY       │
│                                       │                       │
│        OCEAN SIMULATION               │ Collection   34      │
│                                       │ Coverage     57%     │
│      → → ↗       🗑 🗑                │ Control      382     │
│   ↗           ↘                       │ Duration     68 h    │
│ 🚢───╮          ↓                      │                       │
│      ╰──────→ 🗑🗑                    │ Fleet                 │
│                                       │ Vessel 01  Active    │
│   ↙      🗑🗑        🚢               │ Vessel 02  Active    │
│                                       │ Vessel 03  Active    │
│                                       │                       │
├───────────────────────────────────────┴───────────────────────┤
│ ▶ REPLAY       00:00 / 72:00          SPEED 1× 2× 5×         │
└───────────────────────────────────────────────────────────────┘
```

## Visualization layers

Add a layer control:

- Ocean currents
- Current strength
- Debris
- Debris density
- Vessel routes
- Predicted debris trajectory
- Capture zones
- Start/end markers

All layers must have accessible on/off state.

## Vessel interactions

Hover/click on a vessel.

Show:

- vessel ID
- current position
- current velocity
- control thrust
- mission assignment
- distance to nearest debris cluster
- route status

---

# 12. Mission Replay

This feature is mandatory for the polished version.

The backend should return complete replay data for:

- vessel trajectory over time
- debris positions over time or a compressed representation
- capture events
- optimizer-selected route

The frontend animates the data locally.

Do NOT repeatedly call the backend for every animation frame.

Controls:

- play/pause
- scrubber
- speed 0.5× / 1× / 2× / 5×
- reset
- jump to capture event

Display:

`T + 00h`, `T + 12h`, etc.

Capture events should be visually highlighted.

---

# 13. Random vs Aqualign Comparison

Create a dedicated analysis view.

## KPI comparison

```text
                         RANDOM        AQUALIGN
Debris captured             X             Y
Coverage                   X%            Y%
Control effort              X             Y
Mission duration             X             Y
```

Never hardcode the README's illustrative metrics.

Always use values returned by the current simulation.

## Comparison visualization

Provide synchronized views:

- Random Patrol trajectory
- Aqualign trajectory

The user should be able to toggle:

`Show Both` / `Random Only` / `Aqualign Only`

## Explanation

Show a callout:

> **Aqualign used a current-assisted route to approach the central debris field rather than following a direct path.**

This statement must be generated from actual route/current metrics when possible. Otherwise label it as a qualitative explanation, not a measured fact.

---

# 14. Explainability — "Why This Route?"

This is a high-value differentiator.

Click a vessel route → open a side panel.

Example structure:

```text
VESSEL 02

ROUTE STRATEGY
Current-assisted interception

WHY?
The optimized path shifts east before
approaching the debris cluster.

CURRENT CONTRIBUTION
+X units

CONTROL EFFORT
Y units

INTERCEPTION
Z debris encounters

[VIEW ROUTE DETAILS]
```

Only display numerical claims if the backend has actually computed them.

If the current backend cannot yet derive a metric such as "current contribution", calculate it from the returned current and thrust time series rather than inventing it.

Suggested computed explanation fields:

- cumulative thrust magnitude
- cumulative current-assisted displacement
- direct-distance baseline
- optimized path length
- nearest approach to selected debris cluster
- first capture time
- number of unique captured debris

---

# 15. Optimization Learning View

Add a compact optimization timeline.

Show:

- iteration number
- loss
- soft collection objective
- unique capture estimate if implemented
- control effort

Chart:

```text
Collection objective
│                 ______
│             ___/
│         ___/
│     ___/
│____/
└────────────────────────
        Iterations
```

The route preview can optionally update at major checkpoints such as iterations:

`0 → 25 → 50 → 100 → 200 → final`

Do not stream massive tensors to the browser for every iteration.

---

# 16. What-If Simulation

Build a simple scenario adjustment panel.

Controls:

- Current strength.
- Debris density.
- Fleet size.
- Mission horizon.
- Fuel priority.

Button:

> **Replan Mission**

After completion show:

```text
SCENARIO CHANGE

Current strength      +30%

REPLAN RESULT
Collection            +X%
Control effort        -Y%
First capture          T+Zh
```

Values must come from actual baseline/replanned results.

Do not fake causal explanations.

---

# 17. Fleet Panel

Create a persistent fleet panel on the simulation screen.

Example:

```text
FLEET

Vessel 01   ACTIVE
Vessel 02   INTERCEPTING
Vessel 03   CURRENT RIDING
Vessel 04   SWEEPING
Vessel 05   STANDBY
```

The mission optimizer currently does not explicitly assign semantic roles like "current riding". Therefore:

- Do not claim roles unless the backend actually computes them.
- It is acceptable to label the vessel simply `OPTIMIZED`, `ACTIVE`, `START`, `TARGET`, etc.
- Future role classification can be added once backed by measurable route characteristics.

---

# 18. Debris Forecast

Add a visualization mode:

> **Where will the debris be?**

Time options:

- +6h
- +12h
- +24h
- +48h
- +72h

Show the debris field at the selected forecast time.

This feature uses the existing particle advection engine.

The story is:

> Aqualign does not optimize against a static target. It accounts for the fact that the target itself moves with the flow.

---

# 19. AI Mission Copilot

This should be a secondary feature, not the core of the product.

The Copilot converts natural language into valid mission parameters.

Example:

User:

> Plan a 48-hour mission with 4 vessels, high debris density, and minimum control effort.

Assistant output:

```text
MISSION PARAMETERS

Fleet:           4 vessels
Horizon:         48 h
Debris density:  High
Objective:       Minimum effort

[APPLY TO MISSION PLANNER]
```

The assistant must not pretend to have run the simulation until a real backend job has completed.

## Suggested AWS integration

For a deployed AWS version, use an AWS-compatible agent implementation appropriate for the chosen architecture. The hackathon specifically lists Strands Agents SDK for the Build It track and SageMaker AI for the Ship It track.

The agent should map language → structured parameters, then call the same mission-planning API used by the normal UI.

Do not create a second optimization engine for the agent.

---

# 20. Mission History

Persist completed mission summaries.

Show:

```text
MISSION HISTORY

AQL-2026-004   Dense debris    72h   Completed
AQL-2026-003   Low fuel        48h   Completed
AQL-2026-002   Strong current  72h   Completed
```

Click → open `/analysis/[missionId]`.

For the MVP, mission history can be stored in DynamoDB if AWS deployment is ready.

If persistence threatens demo stability, implement local/demo history first and then swap the repository layer to DynamoDB.

---

# 21. Metrics and Scientific Honesty

This section is critical.

The current project uses the word **fuel**, but the implementation currently treats `sum(controls²)` as a control-effort proxy. The actual thrust passed to the simulator is `1.5 * tanh(control)`.

Therefore the UI should preferably label the metric:

> **Control Effort**

or

> **Thrust Effort Proxy**

unless the backend is upgraded to a physically meaningful fuel-consumption model.

Do not display "liters of fuel saved" without a calibrated propulsion model.

## Recommended metric split

### Mission metrics

- Unique debris captured.
- Capture rate.
- Mission coverage.
- First capture time.
- Total mission duration.

### Control metrics

- Control effort.
- Average thrust.
- Peak thrust.
- Cumulative thrust magnitude.

### Physics metrics

- Average current speed.
- Current-assisted displacement.
- Average debris drift speed.

### Compute metrics

- Optimization iterations.
- Optimization runtime.
- Backend job status.

---

# 22. Recommended Core-Algorithm Correction

This is not a mandatory redesign, but it is strongly recommended because the current optimization objective and final reported capture metric are not perfectly aligned.

## Current behavior

The optimizer maximizes a sum of Gaussian proximity affinities at every timestep.

The final comparison counts unique debris particles that ever come within the capture radius.

Therefore:

```text
optimizer objective
≠
final reported metric
```

The optimizer can receive reward from repeatedly staying near the same debris without necessarily maximizing the count of unique debris captured.

## Better differentiable objective

For each debris particle, construct an encounter score over all vessels and timesteps.

For example:

```text
affinity(t, vessel, debris)
          ↓
aggregate over vessels
          ↓
aggregate over time
          ↓
soft probability of at-least-one encounter
```

One possible smooth formulation:

```text
capture_score_i = 1 - exp(-alpha * sum_t softmax_v(affinity[t,v,i]))
```

or another stable differentiable approximation of "captured at least once".

Then:

```text
collection_loss = -sum(capture_score_i)
```

This is conceptually closer to the final unique-capture metric.

Important: implement this behind a clearly named objective/helper and add a regression comparison before changing the default behavior. Do not rewrite the optimizer blindly.

---

# 23. Recommended Boundary/Constraint Improvements

The current simulation does not explicitly enforce the 0–50 simulation domain.

Add soft penalties or safe handling for:

- leaving the domain
- invalid NaNs
- extreme control values

Preferred approach:

- preserve differentiability
- avoid hard `if` branches inside the optimization graph when a smooth penalty can do the job

Example concept:

```text
boundary_penalty = distance_outside_domain²
```

This should be added with a small weight and tested against existing benchmark behavior.

---

# 24. Backend/API Contract

The frontend should communicate only through HTTP/WebSocket/SSE APIs.

Suggested REST shape:

## Create mission

`POST /api/missions`

Request:

```json
{
  "num_vessels": 3,
  "time_horizon": 72,
  "iterations": 300,
  "learning_rate": 0.1,
  "seed": 42,
  "scenario": "dense_debris",
  "objective": "balanced",
  "debris": {
    "count": 200,
    "center": [25, 25],
    "spread": 15
  }
}
```

Response:

```json
{
  "mission_id": "AQL-2026-001",
  "status": "created"
}
```

## Start optimization

`POST /api/missions/{missionId}/optimize`

Response:

```json
{
  "job_id": "job-123",
  "status": "queued"
}
```

## Progress

Preferred:

`GET /api/missions/{missionId}/progress`

Use Server-Sent Events if practical.

Events:

```json
{
  "iteration": 120,
  "total_iterations": 300,
  "loss": -18.4,
  "collection_objective": 19.2,
  "control_effort": 344.1,
  "status": "optimizing"
}
```

Fallback: polling endpoint.

## Results

`GET /api/missions/{missionId}/results`

Return:

```json
{
  "mission_id": "AQL-2026-001",
  "scenario": {...},
  "baseline": {...},
  "optimized": {...},
  "trajectories": {...},
  "debris": {...},
  "ocean": {...},
  "optimization_history": [...],
  "capture_events": [...],
  "assumptions": [...]
}
```

## Mission history

`GET /api/missions`

## Health

`GET /health`

The frontend should display a subtle backend status indicator. Do not expose internal exception messages to users.

---

# 25. Visualization Data Contract

Do not send unnecessary raw tensors.

For the web UI use a downsampled visualization grid where appropriate.

Recommended ocean payload:

```json
{
  "width": 25,
  "height": 25,
  "x": [...],
  "y": [...],
  "u": [...],
  "v": [...]
}
```

Recommended trajectory payload:

```json
{
  "time": [0, 1, 2],
  "vessels": [
    {
      "id": 0,
      "positions": [[10,10], [11,10.4], [12,11]]
    }
  ]
}
```

Recommended debris payload:

- initial positions
- final positions
- optional sampled positions by timestep

For replay, a maximum of one frame per simulation timestep is sufficient for the current 24–96 hour horizon.

---

# 26. Frontend Component Structure

Suggested structure:

```text
frontend/
├── app/
│   ├── page.tsx
│   ├── mission/
│   │   └── page.tsx
│   ├── simulation/
│   │   └── [missionId]/
│   │       └── page.tsx
│   ├── analysis/
│   │   └── [missionId]/
│   │       └── page.tsx
│   ├── history/
│   │   └── page.tsx
│   └── architecture/
│       └── page.tsx
│
├── components/
│   ├── ui/
│   ├── ocean/
│   │   ├── OceanViewport.tsx
│   │   ├── CurrentLayer.tsx
│   │   ├── DebrisLayer.tsx
│   │   ├── VesselLayer.tsx
│   │   ├── RouteLayer.tsx
│   │   └── CaptureLayer.tsx
│   ├── mission/
│   │   ├── MissionForm.tsx
│   │   ├── ScenarioSelector.tsx
│   │   ├── ObjectiveSelector.tsx
│   │   └── MissionProgress.tsx
│   ├── analytics/
│   │   ├── KPIGrid.tsx
│   │   ├── ComparisonChart.tsx
│   │   ├── OptimizationChart.tsx
│   │   └── EfficiencyBreakdown.tsx
│   ├── fleet/
│   │   ├── FleetPanel.tsx
│   │   └── VesselDetails.tsx
│   ├── replay/
│   │   └── ReplayControls.tsx
│   └── copilot/
│       └── MissionCopilot.tsx
│
├── lib/
│   ├── api.ts
│   ├── schemas.ts
│   └── formatters.ts
│
├── hooks/
│   ├── useMission.ts
│   ├── useMissionProgress.ts
│   └── useReplay.ts
│
└── types/
    └── mission.ts
```

OpenCode may adjust this structure to match the existing frontend/backend repository if one already exists. Do not duplicate existing services.

---

# 27. Performance Rules

The simulation can be computationally expensive. The browser should stay responsive.

## Required rules

1. Do not run PyTorch in the browser.
2. Do not send 300 optimizer iterations worth of full simulation tensors to the browser.
3. Use dynamic client-side loading for deck.gl/WebGL components.
4. Keep animation state local to the visualization component.
5. Use memoization for large visualization arrays.
6. Avoid React state updates on every animation frame if `requestAnimationFrame` or a local ref can be used.
7. Use TanStack Query for API lifecycle/state.
8. Make the simulation viewport resize smoothly.
9. Provide a non-WebGL fallback view if initialization fails.
10. Do not let decorative 3D effects block the mission workflow.

---

# 28. Responsive Design

The primary judge experience is desktop.

Desktop:

- full simulation workspace
- side panels
- dense analytics

Tablet:

- simulation remains primary
- analytics stack below
- side panels become drawers

Mobile:

- simplified simulation
- bottom sheets for fleet/details
- mission creation remains usable

Do not simply shrink desktop cards until they become unusable.

---

# 29. Accessibility

Implement:

- keyboard navigation
- visible focus states
- semantic buttons
- accessible labels for toggles
- accessible contrast
- reduced-motion preference for Motion animations
- textual alternatives for key metrics

The WebGL simulation is supplementary; all mission status/results must also exist in normal HTML UI.

---

# 30. Error and Empty States

Implement polished states for:

## No mission

> No active mission. Configure a fleet and plan your first route.

## Optimization running

Show progress, not a blank spinner.

## Backend unavailable

> Optimization service unavailable. Check backend connectivity.

## Invalid mission

Explain what field needs correction.

## WebGL failure

Switch to a lightweight 2D/SVG/canvas fallback rather than showing a blank box.

## Optimization failed

Allow retry without losing mission parameters.

---

# 31. AWS Deployment Recommendation

For a production-style hackathon deployment, separate the web application from the Python optimization runtime.

Recommended architecture:

```text
                         USER
                           │
                           ▼
                    Next.js Frontend
                           │
                           ▼
                     AWS Edge / CDN
                           │
                           ▼
                      API Gateway
                           │
                           ▼
                    ECS / Fargate
                  Python API + PyTorch
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
             S3        DynamoDB     CloudWatch
         datasets      missions       logs
```

Potential role of each service:

### S3

- ocean datasets
- saved mission result artifacts
- optional replay snapshots

### DynamoDB

- mission metadata
- status
- summary metrics
- timestamps

### ECS/Fargate

- FastAPI/Python runtime
- optimizer
- simulation execution

### API Gateway

- public API boundary
- CORS/auth policy if required

### CloudWatch

- health/log visibility
- optimization job errors

### Frontend hosting

Use AWS-native hosting where practical.

Important compatibility note: AWS Amplify's current Next.js support documentation states support through Next.js 15. If the frontend is built on a newer Next.js version not supported by the selected Amplify runtime, use an AWS-compatible static export + S3/CloudFront approach or containerize the Next.js app instead of forcing an unsupported deployment path.

Do not claim an AWS service in the architecture diagram unless the running deployment actually uses it.

---

# 32. Cost/Scope Guardrails

Do not introduce unnecessary AWS infrastructure.

For the hackathon, the core should be:

```text
Next.js
  ↓
API
  ↓
ECS/Fargate
  ↓
PyTorch
  ↓
S3 / DynamoDB / CloudWatch
```

Do not add Kafka, Redis, EKS, SageMaker training jobs, or complex microservices unless a real requirement appears.

The optimizer is small enough for a single containerized service for the demo.

---

# 33. Security and Configuration

Never hardcode:

- AWS credentials
- API keys
- agent secrets
- database credentials
- private endpoints

Use environment variables.

Frontend:

```text
NEXT_PUBLIC_API_BASE_URL
```

Backend:

```text
AWS_REGION
S3_BUCKET
DYNAMODB_TABLE
MODEL/OPTIMIZER SETTINGS IF NEEDED
```

Do not expose private AWS credentials through `NEXT_PUBLIC_*` variables.

---

# 34. Testing Requirements

## Backend

At minimum test:

- ocean field loading
- interpolation output shape
- optimizer output shape
- mission request validation
- deterministic seed behavior
- random baseline vs optimized result generation
- mission result serialization
- failed optimization handling

## Frontend

At minimum test:

- mission form validation
- API request lifecycle
- progress state transitions
- simulation rendering with sample fixture
- replay play/pause/reset
- comparison metrics
- loading/error states

## E2E smoke test

The following flow must work in one test:

```text
Open app
  ↓
Plan Mission
  ↓
Optimization starts
  ↓
Progress appears
  ↓
Mission completes
  ↓
Simulation appears
  ↓
Replay works
  ↓
Analysis page works
```

---

# 35. Demo Data / Demo Mode

The final app should always have a **Demo Mission** that can be launched without custom configuration.

Purpose:

- judge opens page
- clicks one button
- working result appears

Demo mode should use deterministic seed `42` unless an intentionally different seed is required.

Do not fake results. The demo can reuse a precomputed result artifact only if that artifact was actually generated by the Aqualign simulation.

Recommended UX:

> **Try a 72-hour Demo Mission**

This avoids a blank dashboard when judges first open the site.

---

# 36. Submission/Demo Narrative

The product should support a three-minute story.

## 0:00–0:20

Show the problem:

> Ocean debris moves with the current. A vessel that simply drives toward the debris can waste control effort while the target moves.

## 0:20–0:45

Show the core:

```text
Ocean Field
     ↓
Differentiable Simulation
     ↓
Gradient Optimization
     ↓
Fleet Route
```

## 0:45–1:15

Use Mission Planner:

- 5 vessels
- 72 hours
- dense debris
- balanced objective

Click Plan Mission.

## 1:15–1:45

Show optimization progress and replay.

Make the route visibly adapt to the current field.

## 1:45–2:15

Compare Random vs Aqualign using actual results.

## 2:15–2:35

Use "Why This Route?" to explain one interesting trajectory.

## 2:35–2:50

Use AI Copilot to create a second mission.

## 2:50–3:00

Show AWS architecture and final impact metrics.

Closing line:

> **Aqualign doesn't fight the ocean. It plans with the physics of the ocean.**

---

# 37. Feature Priority

## P0 — Must work before polish

- [ ] Next.js frontend scaffold.
- [ ] Existing backend/API connection.
- [ ] Mission creation form.
- [ ] Start optimization job.
- [ ] Mission progress state.
- [ ] Real mission results.
- [ ] Interactive simulation viewport.
- [ ] Vessel routes.
- [ ] Debris visualization.
- [ ] Ocean current visualization.
- [ ] Random vs Aqualign comparison.
- [ ] Replay.
- [ ] Responsive layout.
- [ ] Deployable production build.

## P1 — High-value differentiators

- [ ] Scenario presets.
- [ ] Optimization progress chart.
- [ ] Why This Route.
- [ ] What-if replan.
- [ ] Mission history.
- [ ] Debris forecast mode.
- [ ] Cloud architecture page.
- [ ] Correct/align unique-capture objective with reported metric.
- [ ] Boundary penalty / safe domain handling.

## P2 — Add only after P0/P1 is stable

- [ ] AI Mission Copilot.
- [ ] R3F 3D hero.
- [ ] Advanced vessel role classification.
- [ ] Real geospatial basemap.
- [ ] Additional datasets.
- [ ] Multi-user/account system.

---

# 38. Explicit Non-Goals

Do not build these as part of the hackathon MVP:

- full physical ship dynamics
- real-time global ocean digital twin
- global geospatial tracking infrastructure
- autonomous hardware control
- vessel collision avoidance system
- production maritime navigation certification
- LLM training pipeline
- custom foundation model
- unnecessary microservices
- complex authentication unless the existing backend requires it

Aqualign is a **mission-planning and simulation prototype**, not a certified maritime navigation system.

---

# 39. OpenCode Implementation Rules

OpenCode must follow these rules.

## Rule 1 — Inspect first

Before editing:

- inspect repository root
- inspect existing package files
- inspect any existing backend/server outside the packed files
- inspect current git state
- determine whether a frontend already exists
- determine whether an API already exists

Do not create duplicate services.

## Rule 2 — Preserve the scientific core

Do not rewrite:

- `OceanField`
- `ParticleSimulator`
- `RouteOptimizer`

unless a concrete bug or objective mismatch requires a targeted change.

## Rule 3 — Keep API and simulation separate

The browser consumes JSON/streaming APIs only.

## Rule 4 — Make the simulation visually authoritative

The map/canvas is not decoration. It is the main product view.

## Rule 5 — No fake numbers

Never hardcode:

- improvement percentages
- debris captured
- fuel savings
- coverage
- runtime

unless they are clearly labeled as a fixed demo benchmark and actually correspond to a generated simulation artifact.

## Rule 6 — No fake AI

If the Copilot is added, it must create structured mission parameters and call the real mission API.

## Rule 7 — Prefer a working feature over a flashy incomplete feature

The event's judging guidance emphasizes execution and explicitly favors working functionality over collections of unfinished ideas.

## Rule 8 — Do not make the UI dependent on the optimizer finishing synchronously inside a browser request.

Use an async job lifecycle.

## Rule 9 — Keep demo mode deterministic.

## Rule 10 — Verify every feature end-to-end before starting another feature.

---

# 40. Recommended Implementation Order

## Phase 1 — Frontend foundation

1. Create `frontend/` Next.js + TypeScript app unless an existing frontend should be reused.
2. Configure Tailwind + shadcn/ui.
3. Add Motion.
4. Add deck.gl.
5. Add Recharts.
6. Add TanStack Query.
7. Create base layout/navigation.
8. Create dark scientific design system.

## Phase 2 — API integration

1. Connect the existing backend.
2. Implement mission types/schemas.
3. Add create/start/status/results APIs.
4. Implement polling first.
5. Add SSE only after the polling flow is stable.

## Phase 3 — Core mission flow

1. Mission Planner.
2. Start optimization.
3. Progress screen.
4. Results.
5. Simulation viewport.

## Phase 4 — Signature visuals

1. current vectors
2. debris
3. vessel markers
4. route trails
5. layer controls
6. replay
7. vessel selection
8. capture events

## Phase 5 — Analysis

1. Random vs Aqualign.
2. KPI cards.
3. optimization chart.
4. Why This Route.
5. control-effort/physics metrics.

## Phase 6 — Differentiator features

1. scenario presets
2. what-if replan
3. debris forecast
4. mission history

## Phase 7 — AI + AWS polish

1. Copilot.
2. S3/DynamoDB where useful.
3. CloudWatch.
4. production deployment.
5. architecture page.

## Phase 8 — Demo hardening

1. deterministic demo mission
2. error handling
3. performance pass
4. mobile pass
5. E2E test
6. screen-recording-friendly UI

---

# 41. Definition of Done

The project is ready for the hackathon demo when the following works from a clean browser session:

```text
Landing page
    ↓
Plan Mission
    ↓
Select scenario
    ↓
Start mission
    ↓
See actual optimization progress
    ↓
Mission completes
    ↓
See interactive current/debris/vessel simulation
    ↓
Replay mission
    ↓
Inspect vessel route
    ↓
See Random vs Aqualign comparison
    ↓
Open Why This Route
    ↓
Open Mission Analysis
```

The deployment must expose a stable public URL for judging if entering the Ship It track.

---

# 42. Final Product Positioning

Do not describe Aqualign primarily as:

> "a Streamlit app comparing random control to Adam optimization."

Describe it as:

> **Aqualign is an autonomous ocean-cleanup mission planner. It simulates moving debris and ocean currents, differentiates through the physics, and directly optimizes a fleet's control trajectories to plan interception missions. The frontend turns that research engine into an interactive command center where an operator can configure a mission, watch optimization, replay the route, understand why the fleet moved the way it did, and compare the resulting impact with a baseline patrol strategy.**

The core technology remains differentiable physics. The frontend turns that technology into a product a judge can understand and use in minutes.

---

# 43. Official/Current Technology References

These should be checked against the chosen versions during implementation:

- Next.js: https://nextjs.org/docs
- shadcn/ui + Next.js: https://ui.shadcn.com/docs/installation/next
- Motion for React: https://motion.dev/docs/react
- deck.gl: https://deck.gl/docs
- deck.gl with React: https://deck.gl/docs/get-started/using-with-react
- React Three Fiber: https://r3f.docs.pmnd.rs/
- Three.js: https://threejs.org/docs/
- Recharts: https://recharts.github.io/
- TanStack Query: https://tanstack.com/query/latest/docs/framework/react/overview
- MapLibre GL JS: https://maplibre.org/maplibre-gl-js/docs/
- AWS Amplify Next.js support: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- AWS Next.js deployment guide: https://docs.aws.amazon.com/amplify/latest/userguide/getting-started-next.html

---

# 44. Final Instruction to OpenCode

**Build this as a product around the existing Aqualign engine, not as a rewrite of the scientific engine.**

Start by inspecting the actual repository and any existing backend/frontend. Reuse existing APIs if available. Otherwise create the minimum clean Python API adapter required to expose the optimizer to the Next.js application.

The most important deliverable is:

```text
A polished Next.js Mission Control
        ↓
real Aqualign backend
        ↓
real differentiable optimization
        ↓
real interactive visualization
        ↓
real replay + analysis
        ↓
real AWS deployment
```

Everything else is secondary.
