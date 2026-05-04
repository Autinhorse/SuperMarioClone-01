import Link from "next/link";

export function Hero() {
  return (
    <section className="px-6 lg:px-10 mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="relative rounded-3xl border-2 border-ink bg-white p-8 lg:p-10 shadow-[6px_6px_0_0_var(--color-ink)]">
        <h1 className="font-display font-bold text-4xl lg:text-5xl leading-[1.05] tracking-tight">
          Build your world.
          <br />
          Share the challenge.
          <br />
          Play together.
        </h1>

        <p className="mt-6 inline-block bg-brand-purple/20 px-2 py-1 rounded font-semibold text-ink">
          Create and share your own levels.
          <br />
          Challenge players around the world.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/ricochet"
            className="px-6 h-12 rounded-full border-2 border-ink bg-brand-yellow font-display font-semibold flex items-center gap-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
          >
            ▶ Play Ricochet
          </Link>
          <Link
            href="/ricochet/create"
            className="px-6 h-12 rounded-full border-2 border-ink bg-white font-display font-semibold flex items-center gap-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
          >
            ✏️ Build Level →
          </Link>
        </div>

        <div
          className="absolute -left-8 -bottom-6 text-6xl select-none hidden sm:block"
          aria-hidden
        >
          🍞
        </div>
      </div>

      <div className="rounded-3xl border-2 border-ink bg-brand-purple/30 p-3 shadow-[6px_6px_0_0_var(--color-ink)] relative">
        <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-lg border-2 border-ink bg-brand-purple text-white font-display font-semibold text-sm">
          Ricochet
        </div>
        <div className="absolute -top-3 -right-3 z-10 size-14 rounded-full border-2 border-ink bg-brand-yellow grid place-items-center text-2xl">
          ⭐
        </div>

        <div className="aspect-video rounded-2xl border-2 border-ink bg-[#cdb4f0] grid place-items-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(26,27,46,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,27,46,0.15) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <button
            type="button"
            aria-label="Play video"
            className="relative size-16 rounded-full border-2 border-ink bg-white grid place-items-center text-2xl hover:scale-105 transition"
          >
            ▶
          </button>
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 px-3 py-2 rounded-full bg-white/80 border border-ink/30 text-xs font-medium">
            <span>▶</span>
            <div className="flex-1 h-1 rounded-full bg-ink/20 relative">
              <div className="absolute left-0 top-0 h-full w-0 bg-ink rounded-full" />
            </div>
            <span>0:00 / 0:15</span>
            <span>🔊</span>
            <span>⛶</span>
          </div>
        </div>
      </div>
    </section>
  );
}
