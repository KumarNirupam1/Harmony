import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

export default function Terms() {
    return (
        <div className="flex min-h-full flex-1 flex-col bg-background">
            <Navbar />
            <main className="mx-auto w-full max-w-2xl flex-1 px-6 pt-20 pb-16">
                <h1 className="font-display text-5xl tracking-tight">Terms of Service</h1>
                <p className="mt-6 text-sm leading-7 text-muted">
                    Harmony is mission software for planning, not a navigation or autopilot
                    system. Routes are decision support. Local crews remain responsible for
                    seamanship, safety, and compliance with maritime law.
                </p>
                <p className="mt-4 text-sm leading-7 text-muted">
                    Benchmark metrics (+50% recovery, ≤60% fuel saved) describe the double-gyre
                    experiment in this repository. They are not a guarantee for any real ocean
                    basin. The service is provided as-is for the First Commit hackathon
                    demonstration.
                </p>
                <p className="mt-4 text-sm leading-7 text-muted">Team Titan · 2026.</p>
            </main>
            <Footer />
        </div>
    );
}
