import Link from "next/link";
import { formatCount } from "@/lib/format";
import { getAllPublishedLevels } from "@/lib/explore";

const TINTS = ["#7BB6E8", "#F4B6B6", "#F5D77A", "#A5D6A7", "#CDB4F0"];

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
    </div>
  );
}
