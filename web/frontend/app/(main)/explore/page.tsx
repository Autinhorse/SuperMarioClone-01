import Link from "next/link";
import { formatCount } from "@/lib/format";
import { getAllPublishedLevels } from "@/lib/explore";
import { gameInfo, levelHref } from "@/lib/games";
import { LevelThumbnail } from "@/components/LevelThumbnail";
import { RatingDisplay } from "@/components/RatingWidget";

export const metadata = {
  title: "Explore Levels — LevelCraft",
  description: "Browse every published level the community has built.",
};

export default async function ExplorePage() {
  const levels = await getAllPublishedLevels(50);

  return (
    <div className="px-6 lg:px-10 mt-10 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-3xl flex items-center gap-2">
            <span aria-hidden>✦</span> Explore Levels
          </h1>
          <p className="text-sm text-ink/70 mt-1">
            Every published level, freshest first.
          </p>
        </div>
        <span className="text-sm text-ink/60 font-semibold">
          {formatCount(levels.length)} {levels.length === 1 ? "level" : "levels"}
        </span>
      </header>

      {levels.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ink/40 bg-white/50 p-10 text-center">
          <div className="font-display font-bold text-xl mb-2">
            Nothing here yet
          </div>
          <p className="text-sm text-ink/70">
            Levels show up here as creators publish them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {levels.map((level) => (
            <article
              key={level.id}
              className="relative rounded-2xl border-2 border-ink bg-white p-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
            >
              {/* Which game built this. /explore is cross-game now, and the
                  thumbnails alone don't say — two very different games can
                  produce similar-looking little pictures. */}
              <span className="absolute top-1 left-1 z-10 px-2 py-0.5 rounded-md border-2 border-ink bg-paper text-[10px] font-display font-bold uppercase tracking-wide">
                {gameInfo(level.gameType)?.name ?? level.gameType}
              </span>
              <div className="aspect-square rounded-xl border-2 border-ink relative overflow-hidden bg-paper">
                <LevelThumbnail
                  thumbnailUrl={level.thumbnailUrl}
                  previewPage={level.previewPage}
                  alt={level.title}
                />
                <button
                  type="button"
                  aria-label={`Preview ${level.title}`}
                  className="absolute bottom-2 right-2 size-9 rounded-full border-2 border-ink bg-white grid place-items-center text-sm"
                >
                  ▶
                </button>
              </div>
              <div className="px-1 pt-3 pb-1">
                <h3 className="font-display font-bold text-base truncate">{level.title}</h3>
                <p className="text-xs text-ink/60 truncate">
                  by{" "}
                  {level.creatorUsername ? (
                    <Link
                      href={`/u/${level.creatorUsername}`}
                      className="relative z-10 font-semibold hover:underline"
                    >
                      {level.creatorUsername}
                    </Link>
                  ) : (
                    "(unknown)"
                  )}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs font-semibold flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="text-brand-coral">♥</span> {formatCount(level.likeCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-brand-green">▶</span> {formatCount(level.playCount)}
                  </span>
                  <RatingDisplay
                    ratingSum={level.ratingSum}
                    ratingCount={level.ratingCount}
                  />
                </div>
              </div>
              {/* Href depends on which game the level belongs to — see
                  lib/games.ts. null (unknown game_type) renders no overlay
                  rather than a link that 404s. */}
              {levelHref(level.gameType, level.id) && (
                <Link
                  href={levelHref(level.gameType, level.id)!}
                  aria-label={level.title}
                  className="absolute inset-0 rounded-2xl"
                />
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
