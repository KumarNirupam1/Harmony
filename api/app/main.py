"""Aqualign mission API (FastAPI).

Deployed on AWS as a Lambda container (see infra/sam-template.yaml) or run
locally with:  uvicorn app.main:app --port 8000
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

API_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_ROOT))

from app.runner import MissionParams, run_mission  # noqa: E402


class MissionRequest(BaseModel):
    num_vessels: int = Field(3, ge=1, le=6)
    horizon: int = Field(72, ge=12, le=168)
    iterations: int = Field(200, ge=20, le=600)
    learning_rate: float = Field(0.1, ge=0.01, le=0.5)
    seed: int = Field(42, ge=0, le=1_000_000)
    debris_count: int = Field(200, ge=50, le=1000)
    debris_spread: float = Field(15.0, ge=1.0, le=50.0)


app = FastAPI(title="Aqualign Ocean Cleanup API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "aqualign-api"}


@app.post("/mission")
def mission(req: MissionRequest):
    started = time.time()
    try:
        result = run_mission(
            MissionParams(
                num_vessels=req.num_vessels,
                horizon=req.horizon,
                iterations=req.iterations,
                learning_rate=req.learning_rate,
                seed=req.seed,
                debris_count=req.debris_count,
                debris_spread=req.debris_spread,
            )
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"simulation failed: {exc}") from exc

    result["meta"] = {"latency_ms": int((time.time() - started) * 1000)}
    return result