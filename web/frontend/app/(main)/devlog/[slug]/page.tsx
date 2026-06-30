import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDevlogEntries,
  getDevlogEntry,
  formatDevlogDate,
} from "@/lib/devlog";
import { Markdown } from "@/components/Markdown";

type Params = Promise<{ slug: string }>;

// Pre-render every entry at build time; new files become routes on next build.
export async function generateStaticParams() {
  const entries = await getDevlogEntries();
  return entries.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const entry = await getDevlogEntry(slug);
  if (!entry) return { title: "DevLog — LevelCraft" };
  return {
    title: `${entry.title} — DevLog — LevelCraft`,
    description: entry.summary,
  };
}

export default async function DevlogEntryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const entry = await getDevlogEntry(slug);
  if (!entry) notFound();

  return (
    <div className="px-6 lg:px-10 mt-10 mb-16 max-w-3xl mx-auto space-y-8">
      <Link
        href="/devlog"
        className="inline-flex items-center gap-2 font-display font-semibold text-ink/70 hover:text-ink transition"
      >
        ← All entries
      </Link>

      <header className="rounded-3xl border-2 border-ink bg-white p-8 lg:p-10 shadow-[6px_6px_0_0_var(--color-ink)]">
        <div className="flex items-center gap-3 mb-3 text-sm">
          {entry.tag ? (
            <span className="inline-block rounded-full border-2 border-ink bg-brand-yellow px-3 py-0.5 font-display font-bold text-xs uppercase tracking-wide">
              {entry.tag}
            </span>
          ) : null}
          <span className="text-ink/60 font-display">
            {formatDevlogDate(entry.date)}
          </span>
        </div>
        <h1 className="font-display font-bold text-4xl lg:text-5xl leading-tight">
          {entry.title}
        </h1>
      </header>

      <article>
        <Markdown>{entry.body}</Markdown>
      </article>

      <div className="pt-4">
        <Link
          href="/devlog"
          className="inline-flex items-center gap-2 font-display font-semibold text-brand-purple hover:opacity-70 transition"
        >
          ← Back to all entries
        </Link>
      </div>
    </div>
  );
}
