import Link from "next/link";
import { formatCount } from "@/lib/format";
import type { FeaturedLevel } from "@/lib/homepage";
import { LevelThumbnail } from "@/components/LevelThumbnail";
import { RatingDisplay } from "@/components/RatingWidget";

export function FeaturedLevels({ levels }: { levels: FeaturedLevel[] }) {
  return (
    <section className="px-6 lg:px-10 mt-14">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-2xl flex items-center gap-2">
          <span aria-hidden>✦</span> Featured Levels
        </h2>
        <Link
          href="/explore"
          className="px-4 h-10 rounded-full border-2 border-ink bg-white font-display font-semibold text-sm flex items-center gap-2 shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
        >
          Explore More Levels →
        </Link>
      </div>

      {levels.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {levels.map((level) => (
            <article
              key={level.id}
              className="relative rounded-2xl border-2 border-ink bg-white p-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
            >
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
                <h3 className="font-display font-bold text-base">{level.title}</h3>
                <p className="text-xs text-ink/60">
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
              {/* Overlay link covers the entire card; the username link
                  above lives at z-10 so it captures its own clicks. */}
              <Link
                href={`/ricochet/play/${level.id}`}
                aria-label={level.title}
                className="absolute inset-0 rounded-2xl"
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <Link
      href="/ricochet/create"
      className="block rounded-2xl border-2 border-dashed border-ink/40 bg-white/50 p-10 text-center hover:bg-white hover:border-ink transition"
    >
      <div className="font-display font-bold text-xl mb-2">No featured levels yet 👀</div>
      <p className="text-sm text-ink/70 mb-3">
        Be the first to publish one — your level could end up here.
      </p>
      <span className="inline-block px-5 h-11 rounded-full border-2 border-ink bg-brand-yellow font-display font-semibold leading-[40px] shadow-[4px_4px_0_0_var(--color-ink)]">
        ✏️ Build Level →
      </span>
    </Link>
  );
}
