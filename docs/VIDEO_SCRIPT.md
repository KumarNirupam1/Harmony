# Aqualign — 3-Minute Demo Video Script

Record with the live URL open. No live cellular turn, this is the judge's whole
impression — rehearse once, keep cuts tight, captions on.

---

**[0:00–0:20] The problem (they must buy it)**
> "Eight million tons of plastic enter the ocean every year — and it never sits
> still. It rides gyres, eddies, and jets. Cleanup crews today mostly chase it:
> burning fuel sailing straight at where the trash *was*. We built **Aqualign** —
> a mission planner that stops fighting the ocean and starts *riding* it."

Visual: map of gyres + a vessel path fighting the flow.

**[0:20–0:50] The secret sauce (this is your Learning + Impact hook)**
> "Instead of predicting debris and chasing it, Aqualign treats the ocean as a
> *differentiable vector field*. We unroll the water's physics forward in time —
> using a Runge–Kutta integrator built on PyTorch — then backpropagate the
> capture and fuel losses *through every time step* to learn the vessel's thrust
> controls. The optimizer literally discovers how to use an eddy to gain speed."

Visual: equations on screen (short), the RK4 graph, "readiness" montage.

**[0:50–1:30] The product, live (this is Execution + Ship It)**
> "Here it is, live on AWS. You tell it your fleet and your window, hit Run, and
> the simulation runs on Lambda — the results come back over API Gateway. Watch
> the difference: random patrols on the left, Aqualign's learned routes on the
> right. Same currents, same debris. Aqualign curves *with* the flow and funnels
> toward where the debris naturally gathers."

Visual: run a mission at the live URL; scrub the timeline; pause at a good frame.

**[1:30–1:55] The KPIs**
> "Same ocean, same budget: around half the debris recovered by random patrol,
> versus Aqualign — and a big cut in fuel. On a real fleet, fuel *is* money and
> carbon. That's the story for the mission report a coastal-cleanup NGO reads."

Visual: KPI cards animate; side-by-side metrics; (optional) mission-report panel.

**[1:55–2:45] Where AWS fits + architecture**
> "Under the hood: the web app ships as a static export through CloudFront and
> S3. The engine is a containerized Lambda behind API Gateway — so it costs
> nothing until a mission runs. Mission history lives in DynamoDB, and ocean
> field datasets in S3. Serverless lets an NGO scale from one vessel to a fleet
> without provisioning a single server."

Visual: architecture diagram (from docs/ARCHITECTURE.md) + live `/health` ping.

**[2:45–3:00] Learning + close**
> "We learned to think in gradients over time instead of RL's sample
> inefficiency — and that a PyTorch engine can happily live serverless. Aqualign:
> we don't fight the ocean, we learn to dance with it."

Visual: logo, link, "Ship It on AWS · Free tier".

---

## Recording notes
- Screen is 16:9, dark browser theme, no other tabs, disable notifications.
- Keep the cursor visible during the scrub; it sells the interactivity.
- Post the link + tag **@wemakedevs** on socials (amplifies & earns feedback).
- Optionally link the AWS Builder Center blog post in the description.