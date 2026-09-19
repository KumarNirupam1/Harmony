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
                <section className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pt-24 pb-24 text-center sm:pt-28">
                    <h1 className="font-display text-[3.3rem] leading-[0.95] tracking-tight sm:text-9xl">
                        Ride the current.
                        <br />
                        <span className="text-accent">Waste nothing.</span>
                    </h1>
                    <p className="mt-6 max-w-2xl text-[1rem] leading-7 text-muted">
                        An editorial, serverless mission planner for ocean-cleanup fleets. Routes
                        are learned by riding gyres instead of fighting them — so debris is
                        intercepted while fuel stays in the tank.
                    </p>
                    <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                        <Link href="/planner" className="btn-primary">
                            Start planning
                        </Link>
                        <Link href="/planner" className="btn-ghost">
                            Open sandbox
                        </Link>
                    </div>
                </section>

                <PlaygroundPreview />
                <HowItWorks />

                <section id="metrics" className="mx-auto grid w-full max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-3">
                    {[
                        { value: "+50%", label: "Recovery gain", sub: "vs random patrol" },
                        { value: "≤ 60%", label: "Fuel saved", sub: "riding, not fighting, the flow" },
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
                    <div className="cta-band rounded-[32px] px-8 py-16 text-center sm:px-16">
                        <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
                            Ready to optimize your fleet?
                        </h2>
                        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted">
                            Run the double-gyre benchmark. Adam tunes thrust through the physics
                            rollout — you keep the routes that ride the current.
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
