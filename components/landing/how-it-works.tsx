export function HowItWorks() {
  return (
    <section id="how" className="mx-auto w-full max-w-6xl px-6 pb-24">
      <p className="text-center text-[11px] font-semibold tracking-[0.28em] text-accent uppercase">
        Process
      </p>
      <h2 className="font-display mt-3 text-center text-4xl tracking-tight sm:text-5xl">
        How Aqualign Works
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-muted">
        Differentiable physics, not a trained network. We unroll the ocean forward,
        then backpropagate a debris-collection objective to find routes that ride
        currents instead of fighting them.
      </p>

      <div className="mt-14 grid items-start gap-10 lg:grid-cols-3">
        <article className="text-center">
          <div className="soft-card mx-auto max-w-sm p-5 text-left">
            <div className="inset-well rounded-2xl border-dashed px-4 py-8 text-center">
              <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-accent/15 text-accent">
                ~
              </div>
              <p className="text-sm font-medium">Load the ocean field</p>
              <p className="mt-1 text-xs text-muted">Differentiable velocity field</p>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-panel-2 px-3 py-2 text-xs">
                <span>gulf_stream.npz</span>
                <span className="text-accent">Double gyre · Ready</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs">
                <span>debris.particles</span>
                <span className="text-muted">Floating · In field</span>
              </div>
            </div>
          </div>
          <h3 className="mt-6 text-lg font-semibold">Model the ocean</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted">
            Currents become a differentiable velocity field. Debris and gyres are
            physics you can unroll — not pixels you upload.
          </p>
        </article>

        <article className="text-center">
          <div className="relative mx-auto max-w-sm">
            <div className="rounded-[28px] bg-gradient-to-br from-accent-2 to-accent p-6 text-left text-white shadow-[0_24px_60px_rgba(255,125,39,0.32)]">
              <p className="text-sm/none opacity-80">PyTorch · RK4</p>
              <p className="mt-2 font-display text-4xl">Simulate</p>
              <p className="mt-1 text-sm opacity-90">debris + vessels through the field</p>
              <p className="mt-16 text-[10px] tracking-[0.16em] uppercase opacity-80">
                Soft collection objective · every time step
              </p>
            </div>
          </div>
          <h3 className="mt-6 text-lg font-semibold">Unroll the physics</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted">
            Floating debris and cleanup vessels are simulated through that field.
            The collection objective is differentiable, so gradients flow back
            through the entire rollout.
          </p>
        </article>

        <article className="text-center">
          <div className="soft-card mx-auto max-w-sm p-5 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Adam on thrust</span>
              <span className="text-muted">no neural net</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-foreground/10">
              <div className="h-full w-[62%] rounded-full bg-accent" />
            </div>
            <ul className="mt-4 space-y-2 text-xs text-muted">
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="h-2 w-2 rounded-full bg-accent" /> Capture vs patrol
                </span>
                +50%
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="h-2 w-2 rounded-full bg-accent-2" /> Fuel riding the flow
                </span>
                ≤ 60%
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="h-2 w-2 rounded-full bg-foreground/40" /> Dashboard compare
                </span>
                live
              </li>
            </ul>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-panel-2 p-3">
              <div>
                <p className="text-[10px] tracking-widest text-accent uppercase">Baseline</p>
                <p className="text-xs font-medium">Random patrol vs learned route</p>
              </div>
              <div className="h-10 w-14 rounded-lg bg-gradient-to-br from-accent-2 to-accent" />
            </div>
          </div>
          <h3 className="mt-6 text-lg font-semibold">Optimize the controls</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted">
            Vessel thrust is optimized directly with Adam. Trajectories that exploit
            currents beat a random-patrol baseline — then you inspect them on the
            dashboard.
          </p>
        </article>
      </div>
    </section>
  );
}
