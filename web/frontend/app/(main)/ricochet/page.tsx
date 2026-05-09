import Link from "next/link";
import { LevelThumbnail } from "@/components/LevelThumbnail";
import { getCampaignLevels } from "@/lib/campaign";

export const metadata = {
  title: "LevelCraft: Ricochet — Pick a Level",
  description:
    "Play through the curated 10-level Ricochet campaign. Pick any level to start.",
};

// Game hub. Lists the 10 campaign levels in order; each card links
// into the campaign play surface, where the in-game playthrough is
// wrapped by a website-side overlay that handles "Next level" /
// "Back to hub" without ever falling back to the game's own
// MenuScene (which lives inside the iframe and would otherwise show
// when the player exits a level).
export default async function RicochetHubPage() {
  const levels = await getCampaignLevels();

  return (
    <div className="px-6 lg:px-10 mt-6 mb-12 space-y-6">
      <header className="rounded-3xl border-2 border-ink bg-white p-5 shadow-[6px_6px_0_0_var(--color-ink)] flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Fixed back: hub's only sensible parent is the homepage. Plain
            <Link> beats router.back() here — the latter would walk
            through every campaign level the user just played before
            finally landing on /. */}
        <Link
          href="/"
          aria-label="Back to homepage"
          className="size-10 shrink-0 rounded-full border-2 border-ink bg-paper grid place-items-center hover:-translate-y-0.5 transition"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-2xl">
            LevelCraft: Ricochet
          </h1>
          <p className="text-sm text-ink/70">
            {levels.length} hand-built levels. Beat one to unlock the next.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/explore"
            className="px-4 h-10 rounded-full border-2 border-ink bg-white font-display font-semibold text-sm flex items-center gap-2 shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
          >
            ✦ Community levels
          </Link>
          <Link
            href="/ricochet/create"
            className="px-4 h-10 rounded-full border-2 border-ink bg-brand-yellow font-display font-semibold text-sm flex items-center gap-2 shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
          >
            ✏️ Build your own
          </Link>
        </div>
      </header>

      {levels.length === 0 ? (
        <EmptyState />
      ) : (
        <section>
          <h2 className="font-display font-bold text-2xl mb-4 flex items-center gap-2">
            <span aria-hidden>▶</span> Pick a level
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {levels.map((level) => (
              <Link
                key={level.id}
                href={`/ricochet/campaign/${level.n}`}
                className="rounded-2xl border-2 border-ink bg-white p-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition block relative"
              >
                <span className="absolute top-1 left-1 z-10 size-9 rounded-full border-2 border-ink bg-brand-yellow grid place-items-center font-display font-bold text-sm">
                  {level.n}
                </span>
                <div className="aspect-square rounded-xl border-2 border-ink relative overflow-hidden bg-paper">
                  <LevelThumbnail
                    thumbnailUrl={level.thumbnailUrl}
                    previewPage={level.previewPage}
                    alt={level.title}
                  />
                </div>
                <div className="px-1 pt-3 pb-1">
                  <h3 className="font-display font-bold text-base truncate">
                    {level.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-ink/40 bg-white/50 p-10 text-center">
      <div className="font-display font-bold text-xl mb-2">
        No campaign levels published yet
      </div>
      <p className="text-sm text-ink/70">
        Featured levels haven&apos;t been seeded — check back soon.
      </p>
    </div>
  );
}
