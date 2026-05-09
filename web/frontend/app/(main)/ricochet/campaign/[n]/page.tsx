import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaignLevels } from "@/lib/campaign";
import { CampaignFrame } from "./CampaignFrame";

type Params = Promise<{ n: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { n } = await params;
  return {
    title: `Ricochet — Level ${n}`,
  };
}

// Per-level campaign play page. Loads the Nth campaign row, embeds the
// game in mode=play (same iframe protocol as /ricochet/play/[id]), and
// wraps the iframe with CampaignFrame which adds a website-side
// "Level cleared!" overlay [Replay / Next → / Back to Hub]. The
// website-driven overlay deliberately replaces the in-game post-clear
// dialog so the player never falls back to the iframe's MenuScene.
export default async function CampaignLevelPage({
  params,
}: {
  params: Params;
}) {
  const { n: nStr } = await params;
  const n = Number.parseInt(nStr, 10);
  if (!Number.isFinite(n) || n < 1) notFound();

  const all = await getCampaignLevels();
  if (n > all.length) notFound();

  const level = all[n - 1]!;
  const total = all.length;

  return (
    <div className="px-6 lg:px-10 mt-6 space-y-4">
      <header className="rounded-3xl border-2 border-ink bg-white p-5 shadow-[6px_6px_0_0_var(--color-ink)] flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Fixed back: a campaign level's only sensible parent is the
            hub (level select). Plain <Link> avoids router.back()
            walking through previously-played levels. */}
        <Link
          href="/ricochet"
          aria-label="Back to hub"
          className="size-10 shrink-0 rounded-full border-2 border-ink bg-paper grid place-items-center hover:-translate-y-0.5 transition"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md border-2 border-ink bg-brand-yellow text-[10px] font-display font-bold uppercase tracking-wide">
              Level {n} / {total}
            </span>
            <h1 className="font-display font-bold text-2xl truncate">
              {level.title}
            </h1>
          </div>
          <p className="text-sm text-ink/70">
            Reach the exit to unlock the next level.
          </p>
        </div>
        <Link
          href="/ricochet"
          className="px-4 h-10 rounded-full border-2 border-ink bg-white font-display font-semibold text-sm flex items-center gap-2 shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition shrink-0"
        >
          ← Hub
        </Link>
      </header>

      <section className="rounded-3xl border-2 border-ink bg-ink p-2 shadow-[6px_6px_0_0_var(--color-ink)]">
        <div className="aspect-[5/3] w-full rounded-2xl bg-[#22252c] overflow-hidden">
          <CampaignFrame
            levelId={level.id}
            levelData={level.data}
            n={n}
            totalLevels={total}
          />
        </div>
      </section>
    </div>
  );
}
