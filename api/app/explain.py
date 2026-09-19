"""Aqualign mission copilot.

A tiny LLM sidecar that explains WHY the optimized route beat random patrol, in
plain English for a non-technical judge. Uses a small managed model
(gpt-4o-mini) via the OpenAI API; the key is stored server-side in AWS SSM
Parameter Store (/aqualign/openai-key, SecureString) and is NEVER exposed to the
browser or the repo.

Degrades gracefully: no key / no network / model error -> a deterministic
static explanation is returned instead, so the UI button never breaks.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Any, Dict, Optional

SSM_PARAM_NAME = os.environ.get("AQUALIGN_OPENAI_KEY_SSM", "/aqualign/openai-key")
MODEL = os.environ.get("AQUALIGN_LLM_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = (
    "You are 'Aqualign', a mission planner for an ocean-cleanup fleet. "
    "Explain IN 2-3 SHORT, PLAIN-ENGLISH SENTENCES why the optimized route "
    "outperformed a random patrol, using the numbers provided. Mention riding "
    "ocean currents rather than fighting them. Do not mention APIs, models, "
    "or technical jargon. No markdown formatting."
)


@lru_cache(maxsize=1)
def _openai_key() -> Optional[str]:
    """Fetch the API key from SSM (cached). Returns None when unavailable."""
    try:
        import boto3  # noqa: PLC0415

        region = os.environ.get("AWS_REGION") or "us-east-1"
        ssm = boto3.client("ssm", region_name=region)
        return ssm.get_parameter(Name=SSM_PARAM_NAME, WithDecryption=True)["Parameter"]["Value"]
    except Exception:  # noqa: BLE001 — key simply isn't configured
        return None


def _static_explanation(params: Dict[str, Any], metrics: Dict[str, Any]) -> str:
    gain = metrics.get("efficiency_gain")
    saved = metrics.get("control_effort_saved_pct")
    collected = metrics.get("optimized_collected", "?")
    total = metrics.get("total_debris", "?")
    vessels = params.get("num_vessels", "?")
    first = metrics.get("first_capture_hour")
    parts = [
        f"A fleet of {vessels} vessels intercepted {collected} of {total} pieces of debris by "
        f"learning to ride the ocean currents instead of motoring across them.",
    ]
    if gain is not None:
        parts.append(f"That is a {gain}% recovery gain over a random patrol on the same field.")
    if saved is not None:
        parts.append(f"Meanwhile, control effort fell {saved}% — targeted routing does the work.")
    if first is not None:
        parts.append(f"The first catch came as early as hour {first}.")
    return " ".join(parts)


def explain_mission(params: Dict[str, Any], metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Return {explanation, source} where source is 'openai' or 'static'."""
    fallback = {"explanation": _static_explanation(params, metrics), "source": "static"}

    key = _openai_key()
    if not key:
        return fallback

    try:
        import openai  # noqa: PLC0415

        client = openai.OpenAI(api_key=key, timeout=20, max_retries=1)
        prompt = json.dumps({"params": params, "metrics": metrics})
        res = client.chat.completions.create(
            model=MODEL,
            temperature=0.4,
            max_tokens=260,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
        text = (res.choices[0].message.content or "").strip()
        if not text:
            return fallback
        return {"explanation": text, "source": "openai", "model": MODEL}
    except Exception:  # noqa: BLE001 — copilot must never take the demo down
        return fallback