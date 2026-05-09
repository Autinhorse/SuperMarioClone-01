import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLevel, type LevelDetail } from "@/lib/level";
import { formatCount } from "@/lib/format";
import { PublishProvider } from "@/components/PublishProvider";
import { PublishToggle } from "../../edit/[id]/PublishToggle";
import { GameFrame } from "./GameFrame";
import { ContextualBackButton } from "@/components/ContextualBackButton";
import { RatingWidget } from "@/components/RatingWidget";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const level = await getLevel(id);
  if (!level) return { title: "Level not found — LevelCraft" };
  return {
    title: `${level.title} — Ricochet — LevelCraft`,
    description: level.description ?? `Play ${level.title} by ${level.creatorUsername ?? "anonymous"}.`,
  };
}

export default async function PlayLevelPage({ params }: { params: Params }) {
  const { id } = await params;
  const level = await getLevel(id);
  // RLS hides drafts from non-creators, so null here = either missing or
  // private-from-this-viewer. 404 either way (don't leak draft existence).
  if (!level || level.gameType !== "ricochet") notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === level.creatorId;
  const viewerSignedIn = !!user;

  const body = (
    <PlayBody
      level={level}
      isOwner={isOwner}
      viewerSignedIn={viewerSignedIn}
    />
  );
  // Owners get the shared PublishCtx so the header's PublishToggle can
  // react to natural-play clears posted by GameFrame. Non-owners skip
  // the provider entirely — they can neither toggle nor verify.
  if (isOwner && level.status !== "removed") {
    return (
      <PublishProvider
        initialStatus={level.status}
        initialNeedsPlaytest={level.needsPlaytest}
      >
        {body}
      </PublishProvider>
    );
  }
  return body;
}

function PlayBody({
  level,
  isOwner,
  viewerSignedIn,
}: {
  level: LevelDetail;
  isOwner: boolean;
  viewerSignedIn: boolean;
}) {
  const isDraft = level.status === "draft";
  const hasContent =
    level.data &&
    typeof level.data === "object" &&
    !Array.isArray(level.data) &&
    "pages" in (level.data as Record<string, unknown>);

  return (
    <div className="px-6 lg:px-10 mt-6 space-y-4">
      {/* Header card */}
      <header className="rounded-3xl border-2 border-ink bg-white p-5 shadow-[6px_6px_0_0_var(--color-ink)] flex flex-col sm:flex-row sm:items-center gap-4">
        <ContextualBackButton fallbackHref="/explore" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-bold text-2xl truncate">{level.title}</h1>
            {/* Owners see the live PublishToggle (handles draft + published states).
                Non-owners viewing a draft would never reach this page (RLS hides),
                but defensively render a static Draft badge if they somehow do. */}
            {isOwner && level.status !== "removed" ? (
              <PublishToggle levelId={level.id} />
            ) : isDraft ? (
              <span className="px-2 py-0.5 rounded-md border-2 border-ink bg-paper text-[10px] font-display font-bold uppercase tracking-wide">
                Draft
              </span>
            ) : null}
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
          {/* Rating row. Only meaningful for published levels — drafts
              wouldn't have public ratings anyway, and the API rejects
              rates against drafts. */}
          {level.status === "published" && (
            <div className="mt-3">
              <RatingWidget
                levelId={level.id}
                initialRatingSum={level.ratingSum}
                initialRatingCount={level.ratingCount}
                initialViewerRating={level.viewerRating}
                viewerSignedIn={viewerSignedIn}
                isOwner={isOwner}
              />
            </div>
          )}
        </div>
        {isOwner && (
          <Link
            href={`/ricochet/edit/${level.id}`}
            className="px-4 h-10 rounded-full border-2 border-ink bg-white font-display font-semibold text-sm flex items-center gap-2 shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition shrink-0"
          >
            ✏️ Edit
          </Link>
        )}
      </header>

      {/* Game frame */}
      <section className="rounded-3xl border-2 border-ink bg-ink p-2 shadow-[6px_6px_0_0_var(--color-ink)]">
        <div className="aspect-[5/3] w-full rounded-2xl bg-[#22252c] overflow-hidden grid place-items-center text-paper">
          {hasContent ? (
            <GameFrame
              levelId={level.id}
              levelData={level.data}
              isOwner={isOwner}
            />
          ) : (
            <Placeholder />
          )}
        </div>
      </section>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="text-center px-6 py-10">
      <div className="text-5xl mb-4" aria-hidden>
        🚧
      </div>
      <h2 className="font-display font-bold text-xl text-paper mb-2">
        This level has no content yet
      </h2>
      <p className="text-sm text-paper/70 max-w-md mx-auto">
        The author created the entry but hasn&apos;t built the level layout yet. Check back later
        when the editor is wired up.
      </p>
    </div>
  );
}
