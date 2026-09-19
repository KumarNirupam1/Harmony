# Aqualign — API Contract (for the Frontend)

Backend owner: **Kumar Nirupam** · Contract frozen · Changes only via both-of-us.

## 1 / Endpoints (base URL TBD → we'll give you the live AWS URL)

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| `GET` | `/health` | — | `{"status":"ok","service":"aqualign-api"}` |
| `POST` | `/mission` | JSON (below) | Full mission result (below) |

CORS: `allow-origins: *` — any origin can call from the browser, including your
localhost dev server.

## 2 / Request (`POST /mission`)

```jsonc
{
  "num_vessels": 3,      // 1..6
  "horizon": 72,         // 12..168 (hours / time steps)
  "iterations": 200,     // 20..600   ← use 200+ so metrics look right
  "learning_rate": 0.1,  // 0.01..0.5
  "seed": 42,            // deterministic runs
  "debris_count": 200,   // 50..1000
  "debris_spread": 15.0  // 1..50 (how scattered the debris starts)
}
```

## 3 / Response

```jsonc
{
  "params": { /* echo of the request above */ },

  // Velocity field overlay (25×25 sample) for your streamlines/canvas.
  "field": { "x": number[], "y": number[], "u": number[][], "v": number[][], "mag": number[][] },

  "domain": { "x_max": 50.0, "y_max": 50.0 },   // world bounds (0..50 each)

  "random": {
    "collected": 6,                             // debris captured (hard count)
    "fuel": 450.4,                              // fuel cost (sum thrust²)
    "trajectory": [ [ [x,y], [x,y], [x,y] ],    // [time=horizon+1][vessel][x,y]
                    /* 73 frames × 3 vessels */ ]
  },

  "optimized": { /* same shape — same field, learned routes */ },

  "metrics": {
    "random_collected": 6,
    "optimized_collected": 7,
    "random_fuel": 450.4,
    "optimized_fuel": 164.2,
    "efficiency_gain": 16.7,    // % (optimized/random - 1)
    "fuel_saved": 286.2,        // units
    "fuel_saved_pct": 63.5,     // %
    "total_debris": 200         // use as 100% scale
  },

  "optimization_history": [ { "iter": 0, "loss": -670.03, "collected": 670.03, "fuel": 0 }, ... ],

  "meta": { "latency_ms": 4218 }
}
```

> `trajectory[0]` = the vessels' starting positions. `trajectory.length` = `horizon + 1`.
> Debris start positions: sample the **first frame** of `random.debris_tracks` if you
> can't generate your own from the seed — or just scatter dots per `debris_count`.

## 4 / Versioning + mock

- **Live contract**: `data/sample-mission.json` in this repo is a **real response**
  (from the actual engine — not hand-written). Use it as your mock until the AWS
  URL is live. Note its `params.debris_count` = 80 (smaller sample).
- **Don't rely on `debris_tracks`** in v1 mock — it's large; we may trim it server-side.

## 5 / Your app config

```ts
// lib/api.ts — use this base; teammates just swap the URL
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"; // → AWS URL later
```

Fetch pattern (call from the browser; it's CORS-open):

```ts
export async function runMission(body: MissionRequest): Promise<MissionResult> {
  const res = await fetch(`${API_BASE}/mission`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`mission failed: ${res.status}`);
  return res.json();
}
```

## 6 / Error behavior

- `4xx/5xx` → body is `{"detail": "..."}` (FastAPI standard). Show a friendly error.
- Runtime ≈ **2–5 s** (PyTorch on Lambda, CPU). Show a spinner/progress.
- `iterations < 20` or `horizon` out of range → the API rejects with `422`.

## 7 / Dev handoff

```bash
cd api && python -m uvicorn app.main:app --reload --port 8000   # backend runs here
npm run dev                      # your UI runs on :3000, calls :8000
```

Backend latency budget: aim `meta.latency_ms < 8000` on Lambda. Report anything
slower to Nirupam — size/optimizer tuning is his problem, not yours.