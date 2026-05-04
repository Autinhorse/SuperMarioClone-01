import { formatCount } from "@/lib/format";
import type { HomepageStats } from "@/lib/homepage";

export function StatsStrip({ stats }: { stats: HomepageStats }) {
  const items = [
    {
      value: stats.levelsCount,
      label: "Levels Created",
      mascot: "📦",
      tint: "bg-brand-coral/30",
    },
    { value: stats.usersCount, label: "Players", mascot: "🎖️", tint: "bg-brand-yellow/40" },
    { value: stats.totalPlays, label: "Plays", mascot: "🌿", tint: "bg-brand-green/40" },
    {
      value: stats.dailyCreators,
      label: "Daily Creators",
      mascot: "🌟",
      tint: "bg-brand-orange/40",
    },
  ];

  return (
    <section className="px-6 lg:px-10 mt-14">
      <div className="rounded-3xl border-2 border-ink bg-white shadow-[6px_6px_0_0_var(--color-ink)] grid grid-cols-2 md:grid-cols-4 divide-y-2 md:divide-y-0 md:divide-x-2 divide-ink/20">
        {items.map((s) => (
          <div key={s.label} className="flex items-center gap-3 p-5">
            <span
              className={`size-12 shrink-0 rounded-2xl border-2 border-ink grid place-items-center text-2xl ${s.tint}`}
              aria-hidden
            >
              {s.mascot}
            </span>
            <div>
              <div className="font-display font-bold text-2xl leading-none">
                {formatCount(s.value)}
              </div>
              <div className="text-xs uppercase tracking-wide font-semibold text-ink/60 mt-1">
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-center font-display italic text-base mt-6">
        Made with <span className="text-brand-coral">♥</span> by creators, for players.
      </p>
    </section>
  );
}
