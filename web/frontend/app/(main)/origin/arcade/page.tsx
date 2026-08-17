import Link from "next/link";
import Image from "next/image";
import {
  arcadeCategories,
  arcadeLevelCount,
  arcadePlayHref,
  arcadeThumbHref,
} from "@/lib/arcade";

export const metadata = {
  title: "Arcade — LevelCraft Origin",
  description:
    "The levels that ship with LevelCraft Origin. Play any of them in your browser — no download, no account.",
};

// The web twin of the game's own Arcade picker.
//
// **Why an HTML page and not just the game's screen**: this is the half of the
// product a search engine can read and a link preview can show, and it opens
// instantly instead of after a 39 MB wasm download. The game keeps its own
// picker for people already inside it; the two show the same catalog because
// they're generated from the same `arcade_catalog.tres`.
//
// Structure mirrors the game (same categories, same order, same names) but the
// *look* follows this site's design system, not the canvas. Reproducing the
// in-game screen pixel-for-pixel would mean every UI tweak in the game became a
// website ticket, and the two would drift anyway.
export default function ArcadePage() {
  const categories = arcadeCategories();
  const total = arcadeLevelCount();

  return (
    <div className="px-6 lg:px-10 mt-6 mb-12 space-y-6">
      <header className="rounded-3xl border-2 border-ink bg-white p-5 shadow-[6px_6px_0_0_var(--color-ink)] flex flex-col sm:flex-row sm:items-center gap-4">
        <Link
          href="/"
          aria-label="Back to homepage"
          className="size-10 shrink-0 rounded-full border-2 border-ink bg-paper grid place-items-center hover:-translate-y-0.5 transition"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-2xl">Arcade</h1>
          <p className="text-sm text-ink/70">
            {total} levels built into the game. Play any of them right here — no
            download, no account.
          </p>
        </div>
        <Link
          href="/origin/web?mode=edit"
          className="px-4 h-10 rounded-full border-2 border-ink bg-brand-yellow font-display font-semibold text-sm flex items-center gap-2 shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition shrink-0"
        >
          ✏️ Build your own
        </Link>
      </header>

      {categories.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ink/40 bg-white/50 p-10 text-center">
          <div className="font-display font-bold text-xl mb-2">
            Arcade catalog is empty
          </div>
          <p className="text-sm text-ink/70">
            Regenerate it with <code>make_arcade_bundle.gd</code> in the game repo.
          </p>
        </div>
      ) : (
        categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="font-display font-bold text-2xl mb-4 flex items-center gap-2">
              <span aria-hidden>▶</span> {cat.title}
              <span className="text-sm font-semibold text-ink/60">
                {cat.levels.length}
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {cat.levels.map((level) => (
                <Link
                  key={level.slug}
                  href={arcadePlayHref(level.slug)}
                  className="rounded-2xl border-2 border-ink bg-white p-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition block group"
                >
                  {/* 16:9 — the game's own viewport shape, and what the
                      thumbnails are rendered at (16×9 cells). Any other ratio
                      would crop or letterbox them. */}
                  <div className="aspect-video rounded-xl border-2 border-ink relative overflow-hidden bg-paper">
                    {/* Rendered by the game at bundle time with the same
                        TerrainView the editor draws with — this really is what
                        the level looks like, not a website-side approximation. */}
                    {/* `unoptimized`: these are already rendered at exactly the
                        size they're shown (480×270, ~16 KB). Running them
                        through the image optimizer buys nothing and costs a
                        real bug — the optimized copy is keyed by URL, so
                        regenerating the catalog leaves every card showing the
                        previous render until the cache is cleared. */}
                    <Image
                      src={arcadeThumbHref(level)}
                      alt={level.title}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover"
                    />
                    <span className="absolute inset-0 grid place-items-center bg-ink/40 opacity-0 group-hover:opacity-100 transition">
                      <span className="rounded-xl border-2 border-ink bg-brand-yellow px-3 py-1.5 font-display font-bold text-sm shadow-[3px_3px_0_0_var(--color-ink)]">
                        ▶ Play
                      </span>
                    </span>
                  </div>
                  <div className="px-1 pt-2 pb-1">
                    <h3 className="font-display font-bold text-base truncate">
                      {level.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
