import Link from "next/link";
import Image from "next/image";

// Homepage banner. Two panels, same shape the site has always had — slogan and
// calls to action on the left, a picture of the game on the right.
//
// Replaces the old Ricochet <Hero>: levelcraft.gg is Origin's site now
// (2026-08-04). Ricochet's routes still work by direct link, but nothing on the
// homepage points at it any more.
//
// The art is the game's own front-page art (`styles/default/ui/front/`), copied
// into public/origin/. Using it rather than commissioning something new keeps
// the site and the app looking like one product — and it's the picture players
// already associate with Origin.
export function OriginHero() {
  return (
    <section className="px-6 lg:px-10 mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="relative rounded-3xl border-2 border-ink bg-white p-8 lg:p-10 shadow-[6px_6px_0_0_var(--color-ink)] flex flex-col">
        <h1 className="font-display font-bold text-4xl lg:text-5xl leading-[1.05] tracking-tight">
          Build your world.
          <br />
          Share the challenge.
          <br />
          Play together.
        </h1>

        <p className="mt-6 inline-block bg-brand-purple/20 px-2 py-1 rounded font-semibold text-ink self-start">
          A 2D platformer creation engine.
          <br />
          Play in your browser — no download, no account.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/origin/arcade"
            className="px-6 h-12 rounded-full border-2 border-ink bg-brand-yellow font-display font-semibold flex items-center gap-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
          >
            ▶ Play now
          </Link>
          <Link
            href="/origin/web?mode=edit"
            className="px-6 h-12 rounded-full border-2 border-ink bg-white font-display font-semibold flex items-center gap-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
          >
            ✏️ Build Level →
          </Link>
        </div>
      </div>

      <div className="rounded-3xl border-2 border-ink bg-brand-purple/30 p-3 shadow-[6px_6px_0_0_var(--color-ink)] relative">
        <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-lg border-2 border-ink bg-brand-purple text-white font-display font-semibold text-sm">
          Origin
        </div>
        <div className="aspect-video rounded-2xl border-2 border-ink bg-paper overflow-hidden grid place-items-center p-6">
          <Image
            src="/origin/LevelCraft.png"
            alt="LevelCraft Origin"
            width={1062}
            height={281}
            priority
            className="w-full h-auto max-h-full object-contain"
          />
        </div>
      </div>
    </section>
  );
}
