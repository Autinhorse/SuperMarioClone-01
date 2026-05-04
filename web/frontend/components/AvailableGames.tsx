import Link from "next/link";

const games = [
  {
    slug: "ricochet",
    name: "Ricochet",
    tagline: "Bounce. Aim. Escape. Use angles and timing to reach the goal!",
    accent: "bg-brand-green",
    mascot: "🔴",
  },
];

export function AvailableGames() {
  return (
    <section className="px-6 lg:px-10 mt-14">
      <h2 className="font-display font-bold text-2xl mb-4 flex items-center gap-2">
        <span aria-hidden>✦</span> Available Game
      </h2>

      <div className="space-y-4">
        {games.map((game) => (
          <article
            key={game.slug}
            className={`${game.accent} rounded-3xl border-2 border-ink p-5 shadow-[6px_6px_0_0_var(--color-ink)] grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-6 items-center`}
          >
            <div
              className="aspect-[4/3] rounded-2xl border-2 border-ink bg-[#cdb4f0] relative overflow-hidden"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(26,27,46,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,27,46,0.15) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            >
              <button
                type="button"
                aria-label={`Preview ${game.name}`}
                className="absolute bottom-2 right-2 size-9 rounded-full border-2 border-ink bg-white grid place-items-center text-sm"
              >
                ▶
              </button>
            </div>

            <div>
              <h3 className="font-display font-bold text-3xl mb-2">{game.name}</h3>
              <p className="text-base leading-snug max-w-md">{game.tagline}</p>
            </div>

            <div className="flex flex-col gap-3 min-w-[200px]">
              <Link
                href={`/${game.slug}`}
                className="px-5 h-12 rounded-full border-2 border-ink bg-brand-yellow font-display font-semibold flex items-center justify-between gap-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
              >
                <span>▶ Play</span>
                <span>→</span>
              </Link>
              <Link
                href={`/${game.slug}/create`}
                className="px-5 h-12 rounded-full border-2 border-ink bg-white font-display font-semibold flex items-center justify-between gap-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
              >
                <span>✏️ Build Level</span>
                <span>→</span>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
