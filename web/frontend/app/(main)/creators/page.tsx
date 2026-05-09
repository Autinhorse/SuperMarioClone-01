import Link from "next/link";
import { formatCount, formatJoinDate } from "@/lib/format";
import { getAllCreators } from "@/lib/creators";

export const metadata = {
  title: "Creators — LevelCraft",
  description:
    "Everyone who has shipped a level on LevelCraft, with their stats.",
};

// Public directory of contributors. Sorted by total plays (most-played
// first) so the most active creators surface; ties break on level
// count, then alphabetically. Each row links to the creator's
// /u/{username} profile.
export default async function CreatorsPage() {
  const creators = await getAllCreators();

  return (
    <div className="px-6 lg:px-10 mt-10 mb-12 space-y-6 max-w-4xl mx-auto">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-3xl flex items-center gap-2">
            <span aria-hidden>🏆</span> Creators
          </h1>
          <p className="text-sm text-ink/70 mt-1">
            Everyone who has shipped at least one level.
          </p>
        </div>
        <span className="text-sm text-ink/60 font-semibold">
          {formatCount(creators.length)}{" "}
          {creators.length === 1 ? "creator" : "creators"}
        </span>
      </header>

      {creators.length === 0 ? (
        <EmptyState />
      ) : (
        <ol className="space-y-3">
          {creators.map((c, i) => {
            const ratingAvg =
              c.ratingCount > 0 ? c.ratingSum / c.ratingCount : null;
            return (
              <li key={c.username}>
                <Link
                  href={`/u/${c.username}`}
                  className="rounded-2xl border-2 border-ink bg-white p-4 sm:p-5 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition flex items-center gap-4"
                >
                  <span className="font-display font-bold text-2xl w-7 text-ink/40 text-right">
                    {i + 1}
                  </span>
                  <span className="size-12 shrink-0 rounded-full border-2 border-ink bg-brand-yellow grid place-items-center text-2xl">
                    👤
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-lg truncate">
                      {c.username}
                    </h3>
                    <p className="text-xs text-ink/60">
                      Member since {formatJoinDate(c.createdAt)}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-sm font-semibold shrink-0">
                    <Stat
                      icon="✦"
                      iconClass="text-ink/60"
                      value={formatCount(c.levelCount)}
                      label="levels"
                    />
                    <Stat
                      icon="▶"
                      iconClass="text-brand-green"
                      value={formatCount(c.totalPlays)}
                      label="plays"
                    />
                    <Stat
                      icon="♥"
                      iconClass="text-brand-coral"
                      value={formatCount(c.totalLikes)}
                      label="likes"
                    />
                    {ratingAvg !== null && (
                      <Stat
                        icon="★"
                        iconClass="text-brand-yellow"
                        value={ratingAvg.toFixed(1)}
                        label={`(${formatCount(c.ratingCount)})`}
                      />
                    )}
                  </div>
                </Link>
                {/* Mobile: stats wrap below the row instead of trying
                    to fit alongside the avatar. */}
                <div className="sm:hidden flex flex-wrap gap-3 mt-2 px-5 text-xs font-semibold">
                  <span>
                    ✦ {formatCount(c.levelCount)} levels
                  </span>
                  <span className="text-brand-green">
                    ▶ {formatCount(c.totalPlays)}
                  </span>
                  <span className="text-brand-coral">
                    ♥ {formatCount(c.totalLikes)}
                  </span>
                  {ratingAvg !== null && (
                    <span className="text-brand-yellow">
                      ★ {ratingAvg.toFixed(1)} ({formatCount(c.ratingCount)})
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function Stat({
  icon,
  iconClass,
  value,
  label,
}: {
  icon: string;
  iconClass: string;
  value: string;
  label: string;
}) {
  return (
    <span className="flex items-baseline gap-1 whitespace-nowrap">
      <span className={iconClass}>{icon}</span>
      <span className="font-display font-bold">{value}</span>
      <span className="text-ink/60 font-normal text-xs">{label}</span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-ink/40 bg-white/50 p-10 text-center">
      <div className="font-display font-bold text-xl mb-2">
        No creators yet
      </div>
      <p className="text-sm text-ink/70">
        Be the first — publish a level and you&apos;ll show up here.
      </p>
    </div>
  );
}
