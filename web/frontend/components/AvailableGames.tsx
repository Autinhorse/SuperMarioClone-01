import Link from "next/link";

// Presentation only — the routing/capability facts live in lib/games.ts.
// `actions` differs per game because Origin has no web build to "Play" and
// no web editor to "Build" in; pointing those buttons at pages that only
// explain they don't work yet would be worse than naming them honestly.
const games = [
  {
    slug: "ricochet",
    name: "Ricochet",
    tagline: "Bounce. Aim. Escape. Use angles and timing to reach the goal!",
    accent: "bg-brand-green",
    mascot: "🔴",
    badge: null as string | null,
    actions: [
      { label: "▶ Play", href: "/ricochet", primary: true },
      { label: "✏️ Build Level", href: "/ricochet/create", primary: false },
    ],
  },
  {
    slug: "origin",
    name: "LevelCraft Origin",
    tagline:
      "A 2D platformer creation engine for desktop. Build levels in its editor, publish them here.",
    // Not brand-yellow: the primary button on the card is yellow and would
    // disappear into the panel.
    accent: "bg-brand-sky",
    mascot: "🟦",
    badge: "In development",
    actions: [
      { label: "✦ Browse levels", href: "/origin", primary: true },
      { label: "📓 DevLog", href: "/devlog", primary: false },
    ],
  },
];

export function AvailableGames() {
  return (
    <section className="px-6 lg:px-10 mt-14">
      <h2 className="font-display font-bold text-2xl mb-4 flex items-center gap-2">
        <span aria-hidden>✦</span> Available Games
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
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className="font-display font-bold text-3xl">{game.name}</h3>
                {game.badge && (
                  <span className="px-2 py-0.5 rounded-md border-2 border-ink bg-white text-[10px] font-display font-bold uppercase tracking-wide">
                    {game.badge}
                  </span>
                )}
              </div>
              <p className="text-base leading-snug max-w-md">{game.tagline}</p>
            </div>

            <div className="flex flex-col gap-3 min-w-[200px]">
              {game.actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`px-5 h-12 rounded-full border-2 border-ink font-display font-semibold flex items-center justify-between gap-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition ${
                    action.primary ? "bg-brand-yellow" : "bg-white"
                  }`}
                >
                  <span>{action.label}</span>
                  <span>→</span>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
