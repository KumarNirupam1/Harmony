import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

export default function Privacy() {
    return (
        <div className="flex min-h-full flex-1 flex-col bg-background">
            <Navbar />
            <main className="mx-auto w-full max-w-2xl flex-1 px-6 pt-20 pb-16">
                <h1 className="font-display text-5xl tracking-tight">Privacy Policy</h1>
                <p className="mt-6 text-sm leading-7 text-muted">
                    Aqualign is a mission-planning UI. Visualization runs in your browser.
                    When you press Run mission, fleet parameters are sent to the Aqualign API
                    (`POST /mission`) so the physics engine can return trajectories and KPIs.
                    We do not ask for an account. Mission cards on the History page live in
                    `localStorage` on this device until you clear them.
                </p>
                <p className="mt-4 text-sm leading-7 text-muted">
                    Ocean field datasets used by the solver are benchmark fields (double-gyre),
                    not personal data. Do not paste credentials or private coordinates into
                    free-text fields — this product does not collect them, and you should not
                    provide them.
                </p>
                <p className="mt-4 text-sm leading-7 text-muted">Last updated 19 September 2026.</p>
            </main>
            <Footer />
        </div>
    );
}
