import Link from "next/link";
import { formatCount } from "@/lib/format";
import { getAllPublishedLevels } from "@/lib/explore";
import { GAMES } from "@/lib/games";
import { LevelThumbnail } from "@/components/LevelThumbnail";
import { RatingDisplay } from "@/components/RatingWidget";

export const metadata = {
  title: "LevelCraft Origin — Levels",
  description:
    "Levels built with LevelCraft Origin, the 2D platformer creation engine. Browse what creators have published from the desktop editor.",
};

// Origin's hub. Deliberately NOT shaped like /ricochet: that page is a
// campaign picker into a playable iframe, and Origin has no web build to
// put in an iframe (it's a Godot desktop app; `games/origin/` on disk holds
// only devlogs). So this page does the two things the website *can* do for
// a desktop game — explain what it is, and show what people have published.
export default async function OriginHubPage() {
  const levels = await getAllPublishedLevels(50, "origin");
  const game = GAMES.origin;

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
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-bold text-2xl">{game.name}</h1>
            <span className="px-2 py-0.5 rounded-md border-2 border-ink bg-brand-yellow text-[10px] font-display font-bold uppercase tracking-wide">
              In development
            </span>
          </div>
          <p className="text-sm text-ink/70">{game.tagline}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/devlog"
            className="px-4 h-10 rounded-full border-2 border-ink bg-white font-display font-semibold text-sm flex items-center gap-2 shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
          >
            📓 DevLog
          </Link>
          <Link
            href="/explore"
            className="px-4 h-10 rounded-full border-2 border-ink bg-white font-display font-semibold text-sm flex items-center gap-2 shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
          >
            ✦ All levels
          </Link>
        </div>
      </header>

      {/* This block used to say "you can't play these here yet". It can stop
          saying that: there is a browser build now. Keep it honest about what
          the browser build is *not* — the desktop app is still the full one. */}
      <section className="rounded-3xl border-2 border-ink bg-brand-green p-5 shadow-[6px_6px_0_0_var(--color-ink)]">
        <h2 className="font-display font-bold text-xl mb-2">
          Play it right here
        </h2>
        <p className="text-base leading-snug max-w-2xl mb-4">
          Origin runs in your browser — play community levels and open the
          editor without installing anything. The desktop app for Windows and
          macOS is the full version; it isn&apos;t open for download yet, and
          the DevLog is where that gets announced.
        </p>
        <Link
          href="/origin/web"
          className="inline-block rounded-xl border-2 border-ink bg-paper px-5 py-2 font-display font-bold shadow-[3px_3px_0_0_var(--color-ink)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_var(--color-ink)] transition-transform"
        >
          Play in browser
        </Link>
      </section>

      <section>
        <h2 className="font-display font-bold text-2xl mb-4 flex items-center gap-2">
          <span aria-hidden>✦</span> Published levels
          <span className="text-sm font-semibold text-ink/60">
            {formatCount(levels.length)}
          </span>
        </h2>

        {levels.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink/40 bg-white/50 p-10 text-center">
            <div className="font-display font-bold text-xl mb-2">
              No Origin levels published yet
            </div>
            <p className="text-sm text-ink/70">
              They show up here as creators publish them from the desktop editor.
            </p>
          </div>
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
                </div>
                <div className="px-1 pt-3 pb-1">
                  <h3 className="font-display font-bold text-base truncate">
                    {level.title}
                  </h3>
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
                      <span className="text-brand-coral">♥</span>{" "}
                      {formatCount(level.likeCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-brand-green">▶</span>{" "}
                      {formatCount(level.playCount)}
                    </span>
                    <RatingDisplay
                      ratingSum={level.ratingSum}
                      ratingCount={level.ratingCount}
                    />
                  </div>
                </div>
                <Link
                  href={`/origin/play/${level.id}`}
                  aria-label={level.title}
                  className="absolute inset-0 rounded-2xl"
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
