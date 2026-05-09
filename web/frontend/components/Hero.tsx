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

        <div className="aspect-video rounded-2xl border-2 border-ink bg-ink overflow-hidden">
          {/* Muted autoplay loop — browser autoplay policy blocks
              videos with sound, and ambient muted gameplay reads as a
              "live screenshot" without demanding interaction. The
              visitor can click "Play Ricochet" below to actually try
              the game. playsInline keeps it inline on iOS instead of
              hijacking fullscreen. */}
          <video
            src="/videos/Ricochet-Build-Share-Play.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-contain"
            aria-label="Ricochet gameplay preview"
          />
        </div>
      </div>
    </section>
  );
}
