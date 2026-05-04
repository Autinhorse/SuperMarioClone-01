import Link from "next/link";
import { formatCount } from "@/lib/format";
import type { TopCreator } from "@/lib/homepage";

export function InfoRow({ topCreators }: { topCreators: TopCreator[] }) {
  return (
    <section className="px-6 lg:px-10 mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
      <WeeklyChallenge />
      <YourJourney />
      <TopCreators creators={topCreators} />
    </section>
  );
}

function WeeklyChallenge() {
  return (
    <article className="bg-brand-purple/30 rounded-3xl border-2 border-ink p-5 shadow-[6px_6px_0_0_var(--color-ink)] flex flex-col">
      <h3 className="font-display font-bold text-lg mb-3">Weekly Challenge</h3>
      <div
        className="aspect-[16/9] rounded-2xl border-2 border-ink bg-brand-sky/40 mb-4 grid place-items-center text-4xl"
        aria-hidden
      >
        ⛰️
      </div>
      <div className="flex items-center justify-between gap-3 mt-auto">
        <p className="text-sm font-semibold">
          Build a level
          <br />
          using only walls.
        </p>
        <Link
          href="/challenges"
          className="px-4 h-10 rounded-full border-2 border-ink bg-white font-display font-semibold text-sm flex items-center gap-2 shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition shrink-0"
        >
          Join Challenge →
        </Link>
      </div>
    </article>
  );
}

function YourJourney() {
  // Placeholder: XP system not built yet. Show generic progress for now.
  return (
    <article className="bg-brand-yellow rounded-3xl border-2 border-ink p-5 shadow-[6px_6px_0_0_var(--color-ink)] flex flex-col relative">
      <h3 className="font-display font-bold text-lg mb-3">Your Creative Journey</h3>
      <span className="absolute top-3 right-3 text-3xl" aria-hidden>
        🌟
      </span>
      <div className="flex items-center gap-3 mb-2">
        <span className="px-3 py-1 rounded-lg border-2 border-ink bg-white text-sm font-display font-semibold">
          Level 1
        </span>
        <div className="flex-1 h-3 rounded-full border-2 border-ink bg-white overflow-hidden">
          <div className="h-full w-[10%] bg-brand-green" />
        </div>
      </div>
      <p className="text-xs font-semibold text-center mb-3">10 / 100 XP</p>
      <div className="rounded-2xl border-2 border-ink bg-white p-3">
        <p className="text-xs uppercase tracking-wide font-semibold text-ink/60 mb-1">
          Next Achievement
        </p>
        <div className="flex items-center gap-3">
          <span className="size-9 rounded-full border-2 border-ink bg-brand-sky grid place-items-center text-base">
            🏅
          </span>
          <div>
            <p className="font-display font-bold text-sm">Publish your first level</p>
            <p className="text-xs text-ink/60">Build something. Share it with the world.</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function TopCreators({ creators }: { creators: TopCreator[] }) {
  return (
    <article className="bg-brand-coral/40 rounded-3xl border-2 border-ink p-5 shadow-[6px_6px_0_0_var(--color-ink)] flex flex-col relative">
      <h3 className="font-display font-bold text-lg mb-3">Top Creators</h3>
      <span className="absolute top-3 right-3 text-3xl" aria-hidden>
        🏆
      </span>

      {creators.length === 0 ? (
        <div className="flex-1 rounded-2xl border-2 border-dashed border-ink/40 bg-white/50 p-5 text-center grid place-items-center mb-4">
          <div>
            <p className="font-display font-bold text-base mb-1">No creators yet</p>
            <p className="text-xs text-ink/70">
              Publish your first level and you could top this list.
            </p>
          </div>
        </div>
      ) : (
        <ol className="space-y-2 mb-4">
          {creators.map((c, i) => (
            <li
              key={c.username}
              className="flex items-center gap-3 px-3 py-2 rounded-xl border-2 border-ink bg-white"
            >
              <span className="font-display font-bold text-base w-4">{i + 1}</span>
              <span className="size-8 rounded-full border-2 border-ink grid place-items-center text-base">
                👤
              </span>
              <Link href={`/u/${c.username}`} className="font-display font-semibold flex-1 hover:underline">
                {c.username}
              </Link>
              <span className="text-xs font-semibold text-ink/70">
                {formatCount(c.totalPlays)} plays
              </span>
            </li>
          ))}
        </ol>
      )}

      <Link
        href="/creators"
        className="mt-auto px-4 h-10 rounded-full border-2 border-ink bg-white font-display font-semibold text-sm flex items-center justify-center gap-2 shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
      >
        See All Creators →
      </Link>
    </article>
  );
}
