#!/usr/bin/env python3
"""Idempotently ensure the Harmony CloudFront viewer-request rewrite function.

Reproduces what was originally applied manually so a fresh or redeployed
distribution always resolves clean route paths (/planner/ -> /planner/index.html)
with output: export + trailingSlash. Safe to run on every deploy: no-ops when
the association already exists.

Usage: python infra/scripts/ensure-cf-function.py <distribution_id>
Env:   HARMONY_CF_FUNCTION_CODE (path to cf-edge-rewrite.js, default repo path)
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

FUNCTION_NAME = "harmony-viewer-rewrite"

DEFAULT_CODE = Path(__file__).resolve().parent / "cf-edge-rewrite.js"


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    dist_id = sys.argv[1]

    try:
        import boto3  # noqa: PLC0415
    except ImportError:
        print("boto3 missing — attempting install...", file=sys.stderr)
        import subprocess  # noqa: PLC0415

        subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", "--user", "boto3"])
        import boto3  # noqa: PLC0415

    code = Path(os.environ.get("HARMONY_CF_FUNCTION_CODE", DEFAULT_CODE)).read_text()
    cf = boto3.client("cloudfront", region_name="us-east-1")

    # 1) Function must exist.
    try:
        cf.get_function(Name=FUNCTION_NAME)
    except cf.exceptions.NoSuchFunctionExists:
        cf.create_function(
            Name=FUNCTION_NAME,
            FunctionConfig={"Comment": "harmony clean-route -> index.html", "Runtime": "cloudfront-js-2.0"},
            FunctionCode=code,
        )
        print(f"created function {FUNCTION_NAME}")
    arn = cf.describe_function(Name=FUNCTION_NAME)["FunctionSummary"]["FunctionMetadata"]["FunctionARN"]

    # 2) Must already be attached? Then nothing to do (also implies it is LIVE).
    cfg = cf.get_distribution_config(Id=dist_id)
    dc = cfg["DistributionConfig"]
    current = dc["DefaultCacheBehavior"].get("FunctionAssociations", {}).get("Items", [])
    if any(item.get("FunctionARN") == arn for item in current):
        print(f"{FUNCTION_NAME} already associated with {dist_id}")
        return 0

    # 3) Published (LIVE) functions are the only ones a distribution can use.
    summary = cf.describe_function(Name=FUNCTION_NAME)["FunctionSummary"]
    if summary["FunctionMetadata"]["Stage"] != "LIVE":
        etag = cf.get_function(Name=FUNCTION_NAME)["ETag"]
        cf.publish_function(Name=FUNCTION_NAME, IfMatch=etag)
        print(f"published {FUNCTION_NAME} to LIVE")

    # 4) Attach to the default viewer-request behavior.
    dc["DefaultCacheBehavior"]["FunctionAssociations"] = {
        "Quantity": 1,
        "Items": [{"FunctionARN": arn, "EventType": "viewer-request"}],
    }
    res = cf.update_distribution(Id=dist_id, DistributionConfig=dc, IfMatch=cfg["ETag"])
    print(f"associated {arn} -> {dist_id} (status {res['Distribution']['Status']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())