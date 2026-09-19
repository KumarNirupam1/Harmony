# Aqualign — Judging Strategy

Judges score: **Idea & Impact · Built on AWS · Learning · Execution · Demo video**.
Every submission is eligible for all three tracks (Ship It, Build It, Best UI).
Here is our evidence mapped to each criterion — keep this open while recording.

| Criterion | What we say | Where it lives |
| --- | --- | --- |
| **1. Idea & Impact** | 8M tons/yr of plastic; cleanup vessels waste fuel fighting currents. Aqualign plans *where to go* by using the ocean's own energy → +50% recovery, −12→63% fuel in benchmark runs. Small problem solved well: "route a cleanup run through the current map." | Homepage hero, `docs/PRODUCT.md`, demo intro |
| **2. Built on AWS** | API Gateway + Lambda (PyTorch container) + DynamoDB + S3 + CloudFront. Live URL on the free tier. Architecture diagram in video. Ship It = deployment, Build It = same stack via SAM/LocalStack. | `docs/ARCHITECTURE.md`, video section 2 |
| **3. Learning** | (1) Differentiable physics: gradients *through time* with RK4 + `grid_sample`. (2) Serverless for a physics engine. (3) Cost-native architecture. (4) Real data reality (synthetic NPZ today, HYCOM/OSCAR next). | `docs/ARCHITECTURE.md` §6, blog post |
| **4. Execution** | One feature that *runs*: configure → run → animated comparison + KPIs, end to end, in the browser. Plus mission history, report/export. Keep it working over adding more. | demo video, repo `README.md` |
| **5. Demo video** | 3 minutes, scripted (below). No live demo — the video *is* what judges see. | `docs/VIDEO_SCRIPT.md` |
| **Best UI** (if we chase it) | Dark, scientific-but-beautiful; stream-lines + trajectories as a canvas; KPI cards; a slider + animated scrubber that make the optimization *feel* alive. | `app/` components |
| **Blog** (optional) | "We didn't fight the ocean — we learned to dance with it" → AWS Builder Center, link in submission (top-5 blog = Logitech keyboard). | write after build day |

## Track decision: Ship It primary, Build It as the same code

We target **Ship It** (₹2L + $3k): the deployment is the point-scorer and the
same submission is auto-considered for Best UI. Because every piece also runs
locally (see §5 in ARCHITECTURE), the project remains fully eligible for
**Build It** the instant a deploy hiccups — that redundancy is our insurance
policy for day 1.

## Deployment plan (Ship It checklist)

- [ ] Sign up AWS Free Tier (if not done) — starts with ~$200 credits
- [ ] `npm run build` + verify static export (no server runtime)
- [ ] `./infra/scripts/deploy-api.sh` → note the generated `ApiUrl`
- [ ] `./infra/scripts/deploy-web.sh` → note CloudFront URL, point API base at `ApiUrl`
- [ ] `curl <ApiUrl>/health` externally (CORS check)
- [ ] Record 3-min demo **at the live URL**
- [ ] Student verification (SheerID / AWS Builder Center) — the slow ticket, start now
- [ ] (Optional) DynamoDB mission-history feature on in the video

## Kill-list (things NOT to do on build day)

- Anything that needs Bedrock/SageMaker provisioning we don't have yet.
- A second "cool" feature that could break the first. Execution > breadth.
- Changing the committed folder structure mid-way — the API/web contract is
  frozen: `POST /mission` in, `{field, random, optimized, metrics, meta}` out.