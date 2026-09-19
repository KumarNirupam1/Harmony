import Link from "next/link";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

export default function Architecture() {
    return (
        <div className="flex min-h-full flex-1 flex-col bg-background">
            <Navbar />
            <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-20 pb-16">
                <p className="text-[11px] font-semibold tracking-[0.24em] text-accent uppercase">
                    Stack
                </p>
                <h1 className="font-display mt-2 text-5xl tracking-tight">Architecture</h1>
                <p className="mt-4 text-muted leading-7">
                    Aqualign turns debris cleanup from a line-of-sight chase into a
                    differentiable control problem. The browser never runs PyTorch — it posts a
                    mission, then paints the field, both strategies, and the KPIs.
                </p>

                <ol className="mt-10 space-y-6">
                    {[
                        [
                            "Plan",
                            "The operator sets fleet size, horizon, optimizer iterations and a seed. That JSON is the entire contract.",
                        ],
                        [
                            "Solve",
                            "API Gateway fronts a Lambda container. The engine unrolls RK4 advection, then backprops capture versus fuel through every hour.",
                        ],
                        [
                            "Compare",
                            "The response carries a 25×25 velocity sample plus random and Aqualign trajectories. The canvas scrubs them on the same gyre.",
                        ],
                        [
                            "Judge",
                            "Metrics are server-computed: recovered debris, control effort, efficiency gain, effort saved. The UI only counts them up.",
                        ],
                    ].map(([title, body], i) => (
                        <li key={title} className="soft-card p-6">
                            <p className="font-mono text-xs text-accent">0{i + 1}</p>
                            <h2 className="mt-1 text-lg font-semibold">{title}</h2>
                            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                        </li>
                    ))}
                </ol>

                <Link href="/planner" className="btn-primary mt-10">
                    Launch the planner
                </Link>
            </main>
            <Footer />
        </div>
    );
}
