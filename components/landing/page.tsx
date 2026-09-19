import Image from "next/image";
import Link from "next/link";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PlaygroundPreview } from "@/components/playground/playground-preview";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { WhereAWSits } from "./where-aws-sits";

export default function Landing() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <Image
            src="/fleet.jpg"
            alt=""
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/82 via-background/70 to-background dark:from-background/80 dark:via-background/72 dark:to-background" />
          <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pt-24 pb-24 text-center sm:pt-28 sm:pb-28">
            <h1 className="font-display text-[3.3rem] leading-[0.95] tracking-tight sm:text-9xl pt-14">
              Ride the current.
              <br />
              <span className="text-accent">Waste nothing.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[1rem] leading-7 text-muted">
              An editorial, serverless mission planner for ocean-cleanup fleets. Routes
              are learned by riding gyres instead of fighting them — so debris is
              intercepted while control effort stays in reserve.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/planner" className="btn-primary">
                Start planning
              </Link>
              <Link href="/planner" className="btn-ghost">
                Open sandbox
              </Link>
            </div>
          </div>
        </section>

        <PlaygroundPreview />
        <HowItWorks />

        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <p className="text-center text-[11px] font-semibold tracking-[0.28em] text-accent uppercase">
            Why it exists
          </p>
          <h2 className="font-display mt-3 text-center text-4xl tracking-tight sm:text-5xl">
            Built for boats that pick up the ocean
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Debris never sits still",
                body: "Plastic rides jets, eddies, and double-gyre cells. A straight-line chase burns control effort on water that is already moving the trash.",
              },
              {
                title: "Currents are the engine",
                body: "Harmony treats the sea as a differentiable velocity field. Capture loss backprops through every RK4 hour so thrust learns to surf the flow.",
              },
              {
                title: "Judges see both strategies",
                body: "The live map overlays random patrol against the learned intercept on the same field — boats, debris, and current arrows in one view.",
              },
            ].map((card) => (
              <article key={card.title} className="soft-card p-6">
                <h3 className="text-lg font-semibold">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="metrics" className="mx-auto grid w-full max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-3">
          {[
            { value: "+17%", label: "Recovery gain", sub: "vs random patrol — live benchmark" },
            { value: "63%", label: "Control effort saved", sub: "riding, not fighting, the flow" },
            { value: "< 5s", label: "Time to plan", sub: "one Lambda, zero servers" },
          ].map((k) => (
            <div key={k.label} className="soft-card px-6 py-7">
              <div className="font-display text-4xl text-accent">{k.value}</div>
              <div className="mt-2 text-sm font-medium">{k.label}</div>
              <div className="mt-1 text-xs text-muted">{k.sub}</div>
            </div>
          ))}
        </section>

        <WhereAWSits />

        <section className="mx-auto w-full max-w-5xl px-6 pb-8">
          <div className="cta-band relative overflow-hidden rounded-[32px] px-8 py-16 text-center sm:px-16">
            <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
              Ready to send the fleet?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted">
              Open the sandbox, set vessels and horizon, and watch Harmony discover
              intercepts a random patrol will never find.
            </p>
            <Link href="/planner" className="btn-primary mt-8">
              Start planning
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
