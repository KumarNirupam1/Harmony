import Link from "next/link";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

const COLORS = {
  edge: "#7c5cff",
  compute: "#27b3ff",
  data: "#2ea043",
  ops: "#ffb454",
};

function Monogram({ char, color }: { char: string; color: string }) {
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-sm font-bold"
      style={{ color, background: `${color}1a`, border: `1px solid ${color}40` }}
    >
      {char}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1 font-mono text-[11px] text-muted">
      {children}
    </span>
  );
}

function Connector({ label }: { label: string }) {
  return (
    <div className="flex items-center">
      <span className="hidden h-px flex-1 bg-border sm:block" />
      <div className="flex flex-col items-center py-1">
        <span className="h-2.5 w-px bg-accent/50" />
        <span className="mx-3 rounded-full border border-border bg-panel-2 px-3 py-0.5 font-mono text-[10px] text-muted">
          {label}
        </span>
        <span className="h-2.5 w-px bg-accent/50" />
      </div>
      <span className="hidden h-px flex-1 bg-border sm:block" />
    </div>
  );
}

function LayerBand({
  name,
  color,
  items,
}: {
  name: string;
  color: string;
  items: { t: string; s: string }[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel-2 p-3">
      <div className="flex items-center gap-2 px-1">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color }}>
          {name}
        </span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.t} className="rounded-xl border border-border bg-panel px-3 py-2">
            <p className="text-xs font-semibold text-foreground">{it.t}</p>
            <p className="mt-0.5 font-mono text-[10px] leading-4 text-muted">{it.s}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="mt-1 h-7 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-[var(--accent)]/30" />
      <div>
        <p className="text-[11px] font-semibold tracking-[0.22em] text-accent uppercase">{kicker}</p>
        <h2 className="font-display mt-0.5 text-3xl tracking-tight">{title}</h2>
        {sub && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">{sub}</p>}
      </div>
    </div>
  );
}

const STAGES = [
  ["Plan", "The operator sets fleet size, horizon, optimizer iterations and a seed. That JSON is the entire API contract."],
  ["Solve", "The Lambda container unrolls RK4 advection, then backprops capture versus control effort through every hour of the horizon."],
  ["Compare", "The response carries a velocity sample plus random and Harmony trajectories — same gyre, side by side."],
  ["Judge", "Metrics are server-computed on the image: recovered debris, effort, efficiency gain. The UI only counts them up."],
];

const DECISIONS: { code: string; title: string; color: string; body: React.ReactNode }[] = [
  {
    code: "λ",
    title: "Compute — Lambda (container + torch)",
    color: COLORS.compute,
    body: (
      <>
        The whole backend is <strong>one tiny Python service</strong>. No servers, no EC2 — it
        auto-scales to zero, and a mission solve is precisely what a FaaS job is for. The image
        is <strong>container-packaged</strong> because the free tier caps at 1 GB and the solver +
        torch barely fits an unzipped layer.
      </>
    ),
  },
  {
    code: "↗",
    title: "Ingress — Function URL over API Gateway",
    color: COLORS.compute,
    body: (
      <>
        Solves take <strong>20–60 s</strong>; API Gateway caps requests at 30 s. The{" "}
        <strong>Function URL has no cap</strong>, so the demo never times out. The Gateway
        variant still exists because CloudFormation provisioned it first — it is a valid
        alternate demo path.
      </>
    ),
  },
  {
    code: "≡",
    title: "History — DynamoDB",
    color: COLORS.data,
    body: (
      <>
        History only needs <strong>append + list recent</strong>. Serverless, zero ops, JSON-native
        items — and it keeps the whole stack inside one IAM account without a database server to
        babysit.
      </>
    ),
  },
  {
    code: "🔒",
    title: "Secrets — SSM Parameter Store",
    color: COLORS.ops,
    body: (
      <>
        Secrets <strong>without a vault</strong>: Lambda reads the OpenAI key at runtime through an
        IAM policy attachment. Keys never ship in code or the repository.
      </>
    ),
  },
  {
    code: "◎",
    title: "Delivery — S3 + CloudFront",
    color: COLORS.edge,
    body: (
      <>
        <code className="font-mono text-[11px]">next build</code> exports static files — cheap and
        globally fast, behind <strong>TLS + a stable URL</strong> plus edge rewrites for pretty
        routes. The CloudFront Function fix isn&apos;t polish: without it,{" "}
        <code className="font-mono text-[11px]">/planner</code> returns 403 from a
        directory-index-less S3 origin.
      </>
    ),
  },
  {
    code: "⌘",
    title: "Ops — IAM · CloudWatch · CloudFormation",
    color: COLORS.ops,
    body: (
      <>
        <strong>Least-privilege roles</strong>, logs that surface the silently-swallowed DynamoDB
        exceptions, and <strong>one template</strong> so the stack deploys reproducibly instead of
        click-ops.
      </>
    ),
  },
];

const SERVICES: { group: string; color: string; items: { name: string; res?: string; note: string }[] }[] = [
  {
    group: "Compute & API",
    color: COLORS.compute,
    items: [
      {
        name: "AWS Lambda",
        res: "harmony-api-MissionFunction-0bb983ZZALuU",
        note: "Container image · FastAPI + torch. Mission solver, /api/explain copilot, history.",
      },
      {
        name: "Lambda Function URL",
        note: "Public HTTPS entry used by the web app — avoids API Gateway's 30 s cap.",
      },
      {
        name: "API Gateway (HTTP API v2)",
        note: "Secondary proxy for /api/* routes.",
      },
      {
        name: "ECR",
        note: "Elastic Container Registry — stores the Lambda container image.",
      },
    ],
  },
  {
    group: "Data & storage",
    color: COLORS.data,
    items: [
      {
        name: "DynamoDB",
        res: "harmony-api-MissionsTable…",
        note: "Mission history — append + list recent.",
      },
      {
        name: "S3",
        res: "harmony-web-348220985115",
        note: "Static site hosting for the exported build.",
      },
      {
        name: "SSM Parameter Store",
        res: "/harmony/openai-key",
        note: "SecureString for the OpenAI key.",
      },
    ],
  },
  {
    group: "Delivery & edge",
    color: COLORS.edge,
    items: [
      {
        name: "CloudFront",
        res: "E154HBIKOVX49N",
        note: "CDN in front of S3 — TLS + stable URL.",
      },
      {
        name: "CloudFront Functions",
        res: "harmony-viewer-rewrite",
        note: "Nav URL rewrite so /planner doesn't 403.",
      },
    ],
  },
  {
    group: "IAM & ops",
    color: COLORS.ops,
    items: [
      {
        name: "IAM",
        note: "Lambda execution role: DynamoDB + SSM read + CloudWatch.",
      },
      {
        name: "CloudWatch",
        note: "Lambda logs for debugging · metrics.",
      },
      {
        name: "CloudFormation",
        res: "stack · harmony-api",
        note: "Provisions services 1–7 reproducibly.",
      },
    ],
  },
];

const TOOLING = ["AWS CLI v2", "AWS SAM CLI", "boto3 SDK"];

export default function Architecture() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-28 pb-16">
        <p className="text-[11px] font-semibold tracking-[0.24em] text-accent uppercase">Stack</p>
        <h1 className="font-display mt-2 text-5xl tracking-tight">Architecture</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted">
          Harmony turns debris cleanup from a line-of-sight chase into a differentiable control
          problem. The browser never runs PyTorch — it posts a mission, then paints the intercept
          map, both strategies, and the KPIs. Underneath: one serverless AWS stack, zero servers,
          keys that never touch the repo.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Chip>λ Container Lambda + torch</Chip>
          <Chip>↗ Function URL · no 30 s cap</Chip>
          <Chip>◎ CloudFront edge + S3</Chip>
          <Chip>≡ DynamoDB history</Chip>
          <Chip>⌘ SAM / CloudFormation</Chip>
        </div>

        <section className="mt-12">
          <SectionHeader
            kicker="One mission"
            title="Four stages"
            sub="A single JSON request through a loop that ends with a verdict."
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {STAGES.map(([title, body], i) => (
              <div key={title} className="soft-card relative p-5">
                <span className="font-mono text-xs text-accent">0{i + 1}</span>
                <h3 className="mt-1 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <SectionHeader
            kicker="System diagram"
            title="The stack, in one picture"
            sub="Edge → compute → data. Every arrow is a real request path in the deployed stack."
          />
          <div className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
            <div className="flex justify-center">
              <div className="w-full max-w-xs rounded-2xl border border-border bg-panel-2 px-4 py-3 text-center">
                <p className="text-sm font-semibold text-foreground">Your browser</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted">
                  exported Next.js app · /planner, /history
                </p>
              </div>
            </div>

            <Connector label="https · d32eo4z8j4qsxd.cloudfront.net" />

            <LayerBand
              name="Edge & delivery"
              color={COLORS.edge}
              items={[
                { t: "CloudFront", s: "E154HBIKOVX49N · CDN, TLS" },
                { t: "CloudFront Functions", s: "harmony-viewer-rewrite" },
                { t: "S3", s: "harmony-web-348220985115" },
                { t: "Static export", s: "next build · out/" },
              ]}
            />

            <Connector label="/api/mission · Function URL (no 30 s cap)" />

            <LayerBand
              name="Compute & API"
              color={COLORS.compute}
              items={[
                { t: "AWS Lambda", s: "MissionFunction-0bb983ZZALuU" },
                { t: "FastAPI + torch", s: "solver · copilot · history" },
                { t: "Function URL", s: "primary public entry" },
                { t: "API Gateway v2", s: "secondary /api/* path" },
              ]}
            />

            <Connector label="boto3 · least-privilege IAM role" />

            <LayerBand
              name="Data & secrets"
              color={COLORS.data}
              items={[
                { t: "DynamoDB", s: "MissionsTable · history" },
                { t: "SSM Parameter Store", s: "/harmony/openai-key" },
                { t: "CloudWatch", s: "logs · metrics" },
                { t: "ECR", s: "container image" },
              ]}
            />

            <p className="mt-4 rounded-xl border border-border bg-panel-2 px-3 py-2 text-center font-mono text-[11px] leading-5 text-muted">
              CloudFormation <span className="text-accent">harmony-api</span> provisions the whole
              right-hand side · IAM mediates every cross-service call
            </p>
          </div>
        </section>

        <section className="mt-14">
          <SectionHeader
            kicker="Why this stack"
            title="Design decisions"
            sub="Each service earns its place — or it doesn't get deployed."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {DECISIONS.map((d) => (
              <div key={d.title} className="soft-card flex gap-4 p-5">
                <Monogram char={d.code} color={d.color} />
                <div>
                  <h3 className="text-sm font-semibold">{d.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted">{d.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <SectionHeader
            kicker="Inventory"
            title="AWS services actually in use"
            sub="The exact resources behind the demo — grouped by responsibility."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {SERVICES.map((g) => (
              <div key={g.group} className="soft-card p-5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
                  <h3 className="text-sm font-semibold tracking-wide">{g.group}</h3>
                  <span className="ml-auto rounded-full border border-border bg-panel-2 px-2 py-0.5 font-mono text-[10px] text-muted">
                    {g.items.length}
                  </span>
                </div>
                <ul className="mt-3 space-y-2">
                  {g.items.map((it) => (
                    <li key={it.name} className="rounded-xl border border-border bg-panel-2 px-3 py-2.5">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-xs font-semibold text-foreground">{it.name}</span>
                        {it.res && <span className="font-mono text-[10px] text-accent">{it.res}</span>}
                      </div>
                      <p className="mt-0.5 text-xs leading-5 text-muted">{it.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-panel px-5 py-4">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
              Tooling — not AWS services
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TOOLING.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-panel-2 px-3 py-1 font-mono text-[11px] text-muted"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Link href="/planner" className="btn-primary">
            Launch the planner
          </Link>
          <Link href="/history" className="btn-ghost">
            Browse mission history
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}