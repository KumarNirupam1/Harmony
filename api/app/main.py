"""Harmony mission API (FastAPI).

Deployed on AWS as a Lambda container (see infra/sam-template.yaml) or run
locally with:  uvicorn app.main:app --port 8000
"""
from __future__ import annotations

import os
import sys
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

API_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_ROOT))

from app.runner import MissionParams, run_mission  # noqa: E402
from app.explain import explain_mission  # noqa: E402


def _ddb_type(value):
    """Recursively convert values for DynamoDB (boto3 resource rejects floats).

    Numbers must be Decimal; bool/int/str pass through; lists/dicts recurse.
    """
    if isinstance(value, bool):
        return value
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        return value
    if isinstance(value, (list, tuple)):
        return [_ddb_type(v) for v in value]
    if isinstance(value, dict):
        return {k: _ddb_type(v) for k, v in value.items()}
    return value


def _from_ddb(value):
    """Inverse of _ddb_type: Decimal -> float so results round-trip to JSON."""
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, list):
        return [_from_ddb(v) for v in value]
    if isinstance(value, dict):
        return {k: _from_ddb(v) for k, v in value.items()}
    return value


class MissionRequest(BaseModel):
    num_vessels: int = Field(3, ge=1, le=6)
    horizon: int = Field(72, ge=12, le=168)
    iterations: int = Field(200, ge=20, le=600)
    learning_rate: float = Field(0.1, ge=0.01, le=0.5)
    seed: int = Field(42, ge=0, le=1_000_000)
    debris_count: int = Field(200, ge=50, le=1000)
    debris_spread: float = Field(15.0, ge=1.0, le=50.0)
    objective: str = Field("balanced", pattern="^(balanced|max_collection|min_control_effort)$")
    boundary_penalty: bool = Field(False)


app = FastAPI(title="Harmony Ocean Cleanup API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "harmony-api"}


def _mission_table():
    """Return a DynamoDB table client, or None when persistence is unavailable."""
    table_name = os.environ.get("HARMONY_TABLE")
    if not table_name:
        return None
    try:
        import boto3
    except ImportError:
        return None
    try:
        region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "us-east-1"
        return boto3.resource("dynamodb", region_name=region).Table(table_name)
    except Exception:  # noqa: BLE001 — persistence is best-effort
        return None


def _save_mission(result: dict) -> Optional[str]:
    """Persist params + metrics (not trajectories) to DynamoDB. Returns mission id."""
    table = _mission_table()
    if table is None:
        return None
    mission_id = uuid.uuid4().hex
    try:
        table.put_item(
            Item={
                "missionId": mission_id,
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "params": _ddb_type(result.get("params", {})),
                "metrics": _ddb_type(result.get("metrics", {})),
            }
        )
        return mission_id
    except Exception as exc:  # noqa: BLE001 — never break the simulation response
        print(f"WARN mission save skipped: {type(exc).__name__}: {exc}")
        return None


@app.get("/api/missions")
def list_missions(limit: int = 12):
    """Recent mission summaries (params + metrics only, no trajectories)."""
    table_name = os.environ.get("HARMONY_TABLE")
    rows: list = []
    if not table_name:
        return {"missions": []}
    try:
        import boto3
        from boto3.dynamodb.types import TypeDeserializer

        region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "us-east-1"
        client = boto3.client("dynamodb", region_name=region)
        des = TypeDeserializer()
        items: list = []
        kwargs = {
            "TableName": table_name,
            "ProjectionExpression": "missionId, createdAt, params, metrics",
        }
        while True:
            resp = client.scan(**kwargs)
            items.extend(resp.get("Items", []))
            if "LastEvaluatedKey" not in resp:
                break
            kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]
        rows = [_from_ddb({k: des.deserialize(v) for k, v in item.items()}) for item in items]
        rows.sort(key=lambda r: str(r.get("createdAt", "")), reverse=True)
        rows = rows[: max(1, min(limit, 50))]
    except Exception as exc:  # noqa: BLE001
        print(f"WARN list missions failed: {type(exc).__name__}: {exc}")
    return {"missions": rows}


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
                objective=req.objective,
                boundary_penalty=req.boundary_penalty,
            )
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"simulation failed: {exc}") from exc

    mission_id = _save_mission(result)
    result["meta"] = {
        "latency_ms": int((time.time() - started) * 1000),
        "mission_id": mission_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return result


class ExplainRequest(BaseModel):
    params: MissionRequest
    metrics: dict


@app.post("/api/explain")
def explain(req: ExplainRequest):
    """Copilot: explains a finished mission in plain English (LLM sidecar)."""
    return explain_mission(req.params.model_dump(), req.metrics)