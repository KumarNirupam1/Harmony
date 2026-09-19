#!/usr/bin/env bash
# Local dev helpers for Aqualign.
set -e

case "${1:-}" in
  api)
    echo "==> Running the FastAPI sim service locally on :8000"
    echo "    (POST /mission) — from repo root, uses api/aqualign engine."
    (cd api && python -m uvicorn app.main:app --reload --port 8000)
    ;;
  seed-data)
    echo "==> Regenerating the synthetic double-gyre field"
    python api/scripts/generate_data.py
    ;;
  *)
    echo "Usage: $0 {api|seed-data}"
    exit 1
    ;;
esac