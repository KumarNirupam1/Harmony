const STEPS = [
  {
    n: "01",
    title: "Plan",
    body: "Pick a region, fleet size and time window. Tell the system what you can deploy.",
  },
  {
    n: "02",
    title: "Run",
    body: "A serverless Lambda solves a differentiable control problem — gradients through time — to learn intercept routes.",
  },
  {
    n: "03",
    title: "Compare",
    body: "Watch random patrols and learned Aqualign routes battle the same current field, side by side.",
  },
  {
    n: "04",
    title: "Judge",
    body: "Debris recovered, fuel burned, efficiency gained — KPIs an ops lead can act on by morning.",
  },
  {
    n: "05",
    title: "Document",
    body: "Save the mission, generate the report, send the fleet. Every run persists in DynamoDB.",
  },
];

const KPIS = [
  { label: "Recovery gain", value: "+50%", sub: "vs random patrol" },
  { label: "Fuel saved", value: "≤ 60%", sub: "riding, not fighting, the flow" },
  { label: "Time to plan", value: "< 5s", sub: "one Lambda, zero servers" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="text-xl">🌊</span>
          <span className="text-sm font-semibold tracking-[0.22em] uppercase">
            Aqualign
          </span>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
          <a className="hover:text-foreground" href="#how">How it works</a>
          <a className="hover:text-foreground" href="#metrics">Benchmarks</a>
          <a className="hover:text-foreground" href="#stack">Stack</a>
          <a
            className="badge rounded-full px-3 py-1 text-xs"
            href="https://github.com/anomalyco/youtube-creator-helper"
          >
            Ship It · AWS
          </a>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6">
        {/* Hero */}
        <section className="relative flex flex-col items-center pt-20 pb-24 text-center">
          <div className="halo pointer-events-none absolute inset-0" />
          <span className="badge relative mb-6 rounded-full px-4 py-1.5 text-xs">
            Ocean cleanup · differentiable route planning
          </span>
          <h1 className="relative max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
            We don't fight the ocean.
            <br />
            <span className="text-gradient">We learn to dance with it.</span>
          </h1>
          <p className="relative mt-6 max-w-xl text-lg leading-8 text-muted">
            8M tons of plastic drift into the ocean each year — caught in gyres
            and currents that never stop moving. Aqualign plans cleanup routes
            that ride those currents instead of burning fuel chasing debris.
          </p>
          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#how"
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition hover:bg-accent-2"
            >
              Launch the planner
            </a>
            <a
              href="#stack"
              className="rounded-full border border-border bg-panel px-6 py-3 text-sm font-medium text-foreground transition hover:bg-panel-2"
            >
              See the architecture
            </a>
          </div>
        </section>

        {/* Metrics */}
        <section
          id="metrics"
          className="grid grid-cols-1 gap-4 pb-24 sm:grid-cols-3"
        >
          {KPIS.map((k) => (
            <div key={k.label} className="card p-6 text-left">
              <div className="text-3xl font-semibold text-gradient">{k.value}</div>
              <div className="mt-1 text-sm font-medium">{k.label}</div>
              <div className="mt-0.5 text-xs text-muted">{k.sub}</div>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section id="how" className="pb-24">
          <h2 className="text-2xl font-semibold tracking-tight">
            From chaos to a course
          </h2>
          <p className="mt-2 max-w-lg text-muted">
            One workflow, end to end — the same pipeline that runs on AWS runs
            on your laptop.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s) => (
              <div key={s.n} className="card p-5">
                <div className="text-xs font-mono text-accent">{s.n}</div>
                <div className="mt-2 text-sm font-semibold">{s.title}</div>
                <div className="mt-1.5 text-xs leading-5 text-muted">{s.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Stack */}
        <section id="stack" className="pb-24">
          <h2 className="text-2xl font-semibold tracking-tight">Where AWS sits</h2>
          <p className="mt-2 max-w-lg text-muted">
            A static web app on CloudFront + S3. A PyTorch engine inside a
            Lambda container behind API Gateway. Mission history in DynamoDB.
            Serverless so an NGO scales from one boat to a fleet — and pays
            nothing until a mission runs.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              "API Gateway",
              "Lambda",
              "S3 + CloudFront",
              "DynamoDB",
              "PyTorch",
              "Next.js 16",
            ].map((t) => (
              <div
                key={t}
                className="rounded-lg border border-border bg-panel px-4 py-3 text-center text-xs font-medium"
              >
                {t}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted sm:flex-row">
          <span>🌊 Aqualign — First Commit · Bharat Builds Tour · Team Titan</span>
          <span>Differentiable physics, deployed free on AWS.</span>
        </div>
      </footer>
    </div>
  );
}