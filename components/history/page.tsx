"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { clearMissions, loadMissions, type SavedMission } from "@/lib/history";

export default function History() {
    const [rows, setRows] = useState<SavedMission[]>([]);

    useEffect(() => {
        setRows(loadMissions());
    }, []);

    return (
        <div className="flex min-h-full flex-1 flex-col bg-background">
            <Navbar />
            <main className="mx-auto w-full max-w-4xl flex-1 px-6 pt-20 pb-16">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-semibold tracking-[0.24em] text-accent uppercase">
                            Device
                        </p>
                        <h1 className="font-display mt-2 text-5xl tracking-tight">Mission history</h1>
                        <p className="mt-3 max-w-lg text-sm text-muted">
                            Runs are stored in this browser only. Replay uses the same seed and
                            parameters — nothing is written from the client to DynamoDB yet.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => {
                            clearMissions();
                            setRows([]);
                        }}
                    >
                        Clear
                    </button>
                </div>

                {rows.length === 0 ? (
                    <div className="soft-card mt-10 px-8 py-16 text-center">
                        <p className="font-display text-3xl">No missions yet</p>
                        <p className="mt-2 text-sm text-muted">Run the planner once and it will land here.</p>
                        <Link href="/planner" className="btn-primary mt-6">
                            Open sandbox
                        </Link>
                    </div>
                ) : (
                    <ul className="mt-10 grid gap-4">
                        {rows.map((m) => (
                            <li key={m.id} className="soft-card flex flex-wrap items-center justify-between gap-4 p-5">
                                <div>
                                    <p className="text-sm font-medium">
                                        {m.params.num_vessels} vessels · {m.params.horizon}h · seed {m.params.seed}
                                    </p>
                                    <p className="mt-1 text-xs text-muted">
                                        {new Date(m.createdAt).toLocaleString()} · gain {m.metrics.efficiency_gain}% ·
                                        effort saved {m.metrics.control_effort_saved_pct}%
                                    </p>
                                </div>
                                <Link
                                    href={`/planner`}
                                    className="btn-ghost"
                                >
                                    Replay in sandbox
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
            <Footer />
        </div>
    );
}
