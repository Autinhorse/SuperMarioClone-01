import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLevel } from "@/lib/level";
import { formatCount } from "@/lib/format";
import { summarizeOriginLevel, type OriginSummary } from "@/lib/origin-summary";
import { ContextualBackButton } from "@/components/ContextualBackButton";
import { LevelThumbnail } from "@/components/LevelThumbnail";
import { RatingWidget } from "@/components/RatingWidget";
import { OriginPlayFrame } from "@/components/OriginPlayFrame";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const level = await getLevel(id);
  if (!level) return { title: "Level not found — LevelCraft" };
  return {
    title: `${level.title} — Origin — LevelCraft`,
    description:
      level.description ??
      `${level.title} by ${level.creatorUsername ?? "anonymous"}, built with LevelCraft Origin.`,
  };
}

// An Origin level's page on the website.
//
// Mirrors /ricochet/play/[id] down to the header card, plus a readout of the
// level. Since 2026-08-03 there **is** an Origin web build, so the thumbnail
// panel doubles as a play button — but the engine is only mounted on click
// (see OriginPlayFrame): this page's real job is to be a *page* — server
// rendered title/description/thumbnail that chat apps preview and search
// engines index — and a canvas can do neither of those.
//
// No PublishToggle here either, unlike the Ricochet page: publishing an Origin
// level is gated on the author having cleared it, and only the desktop client
// can produce that clear. The owner manages publish state from inside the game.
export default async function OriginLevelPage({ params }: { params: Params }) {
  const { id } = await params;
  const level = await getLevel(id);
  // RLS hides drafts from non-creators, so null = missing or not-for-this-viewer.
  // 404 either way (don't leak draft existence). Wrong game → 404 too, so a
  // Ricochet id typed under /origin doesn't render a half-wrong page.
  if (!level || level.gameType !== "origin") notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === level.creatorId;
  const summary = summarizeOriginLevel(level.data);

  return (
    <div className="px-6 lg:px-10 mt-6 mb-12 space-y-4">
      <header className="rounded-3xl border-2 border-ink bg-white p-5 shadow-[6px_6px_0_0_var(--color-ink)] flex flex-col sm:flex-row sm:items-center gap-4">
        <ContextualBackButton fallbackHref="/origin" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-bold text-2xl truncate">{level.title}</h1>
            {level.status === "draft" && (
              <span className="px-2 py-0.5 rounded-md border-2 border-ink bg-paper text-[10px] font-display font-bold uppercase tracking-wide">
                Draft
              </span>
            )}
          </div>
          <p className="text-sm text-ink/70">
            by{" "}
            {level.creatorUsername ? (
              <Link href={`/u/${level.creatorUsername}`} className="font-semibold underline">
                {level.creatorUsername}
              </Link>
            ) : (
              "(unknown)"
            )}
            {level.description && <span className="text-ink/60"> · {level.description}</span>}
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm font-semibold flex-wrap">
            <span className="flex items-center gap-1">
              <span className="text-brand-coral">♥</span> {formatCount(level.likeCount)}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-brand-green">▶</span> {formatCount(level.playCount)}
            </span>
            <code className="text-xs text-ink/60 font-mono">#{level.id}</code>
          </div>
          {level.status === "published" && (
            <div className="mt-3">
              <RatingWidget
                levelId={level.id}
                initialRatingSum={level.ratingSum}
                initialRatingCount={level.ratingCount}
                initialViewerRating={level.viewerRating}
                viewerSignedIn={!!user}
                isOwner={isOwner}
              />
            </div>
          )}
        </div>
        <Link
          href="/origin"
          className="px-4 h-10 rounded-full border-2 border-ink bg-white font-display font-semibold text-sm flex items-center gap-2 shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition shrink-0"
        >
          ✦ More Origin levels
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 items-start">
        {/* The thumbnail is rendered by the game itself at publish time using
            the same TerrainView the editor draws with, so this really is what
            the level looks like — not a website-side approximation.
            No PNG (thumbnail rendering is non-fatal on the client) → say so.
            LevelThumbnail's fallback is Ricochet's SVG renderer, which can't
            read an Origin payload; it would fill this panel with a blank green
            grid that reads as "a level made entirely of grass". */}
        <section className="rounded-3xl border-2 border-ink bg-ink p-2 shadow-[6px_6px_0_0_var(--color-ink)]">
          <OriginPlayFrame levelId={level.id} title={level.title}>
            {level.thumbnailUrl ? (
              <LevelThumbnail
                thumbnailUrl={level.thumbnailUrl}
                previewPage={null}
                alt={level.title}
              />
            ) : (
              <div className="text-center px-6 py-10">
                <div className="text-5xl mb-4" aria-hidden>
                  🗺️
                </div>
                <p className="text-sm text-paper/70 max-w-xs mx-auto">
                  No preview image for this level.
                </p>
              </div>
            )}
          </OriginPlayFrame>
        </section>

        <div className="space-y-4">
          <section className="rounded-3xl border-2 border-ink bg-brand-green p-5 shadow-[6px_6px_0_0_var(--color-ink)]">
            <h2 className="font-display font-bold text-lg mb-2">Play this level</h2>
            <p className="text-sm leading-snug">
              Hit play on the image to run it right here — no install. The
              desktop app is the full version: it has the editor, your level
              library and offline play. Downloads aren&apos;t open yet — the{" "}
              <Link href="/devlog" className="font-semibold underline">
                DevLog
              </Link>{" "}
              is where the build gets announced.
            </p>
            {isOwner && (
              <p className="text-sm leading-snug mt-3 border-t-2 border-ink/20 pt-3">
                This one&apos;s yours. Publishing and updating happen in the
                game&apos;s editor — the publish button re-uploads this level
                and keeps its id, plays and ratings.
              </p>
            )}
          </section>

          {summary && <LevelReadout summary={summary} />}
        </div>
      </div>
    </div>
  );
}

// What the level is made of. Read straight out of the published payload
// (lib/origin-summary.ts) — no extra columns, no server work at publish time.
function LevelReadout({ summary }: { summary: OriginSummary }) {
  return (
    <section className="rounded-3xl border-2 border-ink bg-white p-5 shadow-[6px_6px_0_0_var(--color-ink)] space-y-3">
      <h2 className="font-display font-bold text-lg">Inside this level</h2>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label={summary.areaCount === 1 ? "area" : "areas"} value={summary.areaCount} />
        <Stat label="tiles" value={summary.cellCount} />
        <Stat label={summary.objectCount === 1 ? "object" : "objects"} value={summary.objectCount} />
      </dl>

      {summary.rules.length > 0 && (
        <div>
          <h3 className="text-xs font-display font-bold uppercase tracking-wide text-ink/60 mb-1">
            Rules
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {summary.rules.map((rule) => (
              <li
                key={rule}
                className="px-2 py-0.5 rounded-md border-2 border-ink bg-brand-yellow text-xs font-semibold"
              >
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.elements.length > 0 && (
        <div>
          <h3 className="text-xs font-display font-bold uppercase tracking-wide text-ink/60 mb-1">
            Elements used
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {summary.elements.map((element) => (
              <li
                key={element.type}
                className="px-2 py-0.5 rounded-md border-2 border-ink/30 bg-paper text-xs font-mono"
              >
                {element.type}
                {element.count > 1 && (
                  <span className="text-ink/50"> ×{element.count}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border-2 border-ink bg-paper py-2">
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block font-display font-bold text-xl">{formatCount(value)}</span>
        <span className="block text-[11px] text-ink/60 font-semibold uppercase tracking-wide">
          {label}
        </span>
      </dd>
    </div>
  );
}
