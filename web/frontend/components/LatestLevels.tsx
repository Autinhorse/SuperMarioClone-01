import Link from "next/link";
import { formatCount } from "@/lib/format";
import type { FeaturedLevel } from "@/lib/homepage";

const TINTS = ["#A5D6A7", "#F4B6B6", "#7BB6E8", "#F5D77A", "#CDB4F0"];

// Row of the most-recently-published levels — the chronological feed
// counterpart to FeaturedLevels' curated picks. Card visuals match the
// featured row so the homepage reads as a coherent set, with the
// "Latest Levels" title and a slightly different tint palette giving
// each section its own identity.
export function LatestLevels({ levels }: { levels: FeaturedLevel[] }) {
  return (
    <section className="px-6 lg:px-10 mt-14">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-2xl flex items-center gap-2">
          <span aria-hidden>🆕</span> Latest Levels
        </h2>
        <Link
          href="/explore"
          className="px-4 h-10 rounded-full border-2 border-ink bg-white font-display font-semibold text-sm flex items-center gap-2 shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
        >
          Explore →
        </Link>
      </div>

      {levels.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {levels.map((level, i) => (
            <Link
              key={level.id}
              href={`/ricochet/play/${level.id}`}
              className="rounded-2xl border-2 border-ink bg-white p-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition block"
            >
              <div
                className="aspect-square rounded-xl border-2 border-ink relative overflow-hidden"
                style={{
                  backgroundColor: TINTS[i % TINTS.length],
                  backgroundImage:
                    "linear-gradient(to right, rgba(26,27,46,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,27,46,0.15) 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              >
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
                  by {level.creatorUsername ?? "(unknown)"}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs font-semibold">
                  <span className="flex items-center gap-1">
                    <span className="text-brand-coral">♥</span> {formatCount(level.likeCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-brand-green">▶</span> {formatCount(level.playCount)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-ink/40 bg-white/50 p-10 text-center">
      <div className="font-display font-bold text-xl mb-2">No published levels yet</div>
      <p className="text-sm text-ink/70">
        New publishes will show up here as they go live.
      </p>
    </div>
  );
}
