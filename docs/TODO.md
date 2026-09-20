# Harmony — submission punch-list

Status date: Sep 20, 2026 · Deadline: **Sep 20 EOD** · Team Titan
What's NOT here: video generation (cut by the team).

Everything below in **Done** is verified live/in CI. Only the **Remaining** block
is truly open.

---

## Done & verified ✅

### Infrastructure
- API live (Lambda + DynamoDB + SSM): `POST /mission`, `GET /api/missions`,
  `POST /api/explain` (`source: openai`). Function URL:
  `https://ovnmgz33g5i4qrsqxmfir5ov2a0ftakv.lambda-url.us-east-1.on.aws/`
- Web live on CloudFront `https://d32eo4z8j4qsxd.cloudfront.net` — all routes
  200; trailingSlash export + `harmony-viewer-rewrite` edge function baked
  idempotently into `infra/scripts/deploy-web.sh`
- CI `.github/workflows/ci.yml` (web-build + api-test) green on main; tsc/lint clean

### Frontend (teammate) — deployed live
- Objective presets + boundary penalty toggle → `POST /mission`
- Copilot panel → `POST /api/explain`, `source` chip, offline fallback
- History merged from DynamoDB (dedupe on `missionId`) + local offline mirror
- Replay via `/planner/?id=` (reads `window.location.search`; no get-by-id)
- Landing SVGs (`icon.svg`, `og.svg`) + OG metadata; unused assets removed

### Data & correctness (torch box)
- `python -m pytest api/tests -q` → 5/5 green locally (hermetic key test)
- `data/sample-mission.json` regenerated with v1.1 metrics (80 debris, gain 333%)

### Process
- SheerID verification done
- Offline mock path + dark mode sanity + structural quality checks done

---

## Remaining

- [ ] **(optional, low priority — recommend skip)** Real currents instead of
      synthetic: `python api/scripts/fetch_real_data.py --region bay-of-bengal
      --write data/gulf_stream.npz`; re-validate `+17% / 63%` landing numbers.
      Swapping the baked field this late risks the demo without judging upside.
- [ ] **README top-to-bottom**: architecture, run/deploy, learnings section
      accurate; CloudFront URL + SheerID state noted.
- [ ] **Demo rehearse**: 3-vessel / 72 h / seed 42 walkthrough; try block-network
      offline fallback; run it on the live CloudFront URL, not localhost.

---

Anything not in this list is done — don't re-check it. Ship it.