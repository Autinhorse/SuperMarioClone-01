import Link from "next/link";
import { getDevlogEntries, formatDevlogDate } from "@/lib/devlog";

export const metadata = {
  title: "Devlog of LevelCraft: Origin",
  description:
    "A 53-year-old veteran coder fulfilling a dream four decades in the making — building a Super Mario Maker–style game entirely through AI, with zero hand-written code.",
};

export default async function DevlogPage() {
  const entries = await getDevlogEntries();

  return (
    <div className="px-6 lg:px-10 mt-10 mb-16 max-w-3xl mx-auto space-y-10">
      <header className="rounded-3xl border-2 border-ink bg-white p-8 lg:p-10 shadow-[6px_6px_0_0_var(--color-ink)]">
        <p className="font-display text-sm uppercase tracking-[0.2em] text-ink/60 mb-2">
          LevelCraft
        </p>
        <h1 className="font-display font-bold text-4xl lg:text-5xl leading-tight mb-3">
          Devlog of LevelCraft: Origin
        </h1>
        <p className="text-lg text-ink/80 leading-relaxed">
          A 53-year-old veteran coder fulfilling a dream four decades in the
          making — building a <em>Super Mario Maker</em>–style game entirely
          through AI, with zero hand-written code.
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="text-ink/60 text-center py-10">
          No entries yet. Check back soon.
        </p>
      ) : (
        <ul className="space-y-5">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <Link
                href={`/devlog/${entry.slug}`}
                className="block rounded-2xl border-2 border-ink bg-white p-6 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition"
              >
                <div className="flex items-center gap-3 mb-2 text-sm">
                  {entry.tag ? (
                    <span className="inline-block rounded-full border-2 border-ink bg-brand-yellow px-3 py-0.5 font-display font-bold text-xs uppercase tracking-wide">
                      {entry.tag}
                    </span>
                  ) : null}
                  <span className="text-ink/60 font-display">
                    {formatDevlogDate(entry.date)}
                  </span>
                </div>
                <h2 className="font-display font-bold text-2xl leading-tight mb-1">
                  {entry.title}
                </h2>
                {entry.summary ? (
                  <p className="text-ink/75 leading-relaxed">{entry.summary}</p>
                ) : null}
                <span className="inline-block mt-3 font-display font-semibold text-brand-purple">
                  Read entry →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
