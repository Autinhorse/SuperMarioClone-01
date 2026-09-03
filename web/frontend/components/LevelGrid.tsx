import Link from "next/link";
import { editHref, levelHref } from "@/lib/games";
import { formatCount } from "@/lib/format";
import type { ProfileLevel } from "@/lib/profile";
import { LevelThumbnail } from "@/components/LevelThumbnail";
import { RatingDisplay } from "@/components/RatingWidget";
import { DeleteLevelButton } from "@/components/DeleteLevelButton";

// The level-card grid shown on both the profile page (`/u/[username]`) and
// Origin's `/origin/my-levels`. Pulled out of the profile page (2026-09-03)
// so the two don't carry two copies of the same card markup, badge logic and
// thumbnail-fallback gotcha.
export function LevelGrid({
  levels,
  showDraftBadge = false,
  showDelete = false,
}: {
  levels: ProfileLevel[];
  showDraftBadge?: boolean;
  showDelete?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {levels.map((level) => {
        // Whether this game actually has a web editor to send the owner to.
        // False for every Origin level today (`GAMES.origin.editableInBrowser`
        // is false by design — see lib/games.ts) — Origin's own editor lives
        // inside the game, reached generically via `/origin/web?mode=edit`,
        // not per-level yet. The bottom-right button's icon/label follow this,
        // not `showDraftBadge` alone: a "✏️ Edit" button that actually lands on
        // the read-only level page would be a lie the user discovers by
        // clicking it.
        const canEdit = showDraftBadge && editHref(level.gameType, level.id) !== null;
        return (
          <Link
            key={level.id}
            // Drafts (only shown to the owner) go straight to the editor when
            // one exists — the play/level page would just be an extra click
            // before the owner reaches the only useful action they have for
            // an unpublished level. Published levels keep the play landing.
            href={
              (showDraftBadge ? editHref(level.gameType, level.id) : null) ??
              levelHref(level.gameType, level.id) ??
              "/explore"
            }
            className="rounded-2xl border-2 border-ink bg-white p-2 shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-0.5 transition block relative"
          >
            {/* Top-left badge: Draft / Edit (drafts only) or featured star
                (published+featured). Mutually exclusive — drafts can't be
                featured. Top-right is reserved for the delete button when
                the viewer owns the level. Forks show "Edit" instead of
                "Draft" so they're visually distinguishable from fresh
                drafts (both share the same title text). This badge states a
                *status* ("this row is a draft/fork"), not an action, so it
                stays tied to `showDraftBadge` even where there's no editor
                to send the owner to. */}
            {showDraftBadge ? (
              <span className="absolute top-1 left-1 z-10 px-2 py-0.5 rounded-md border-2 border-ink bg-paper text-[10px] font-display font-bold uppercase tracking-wide">
                {level.parentId ? "Edit" : "Draft"}
              </span>
            ) : level.isFeatured ? (
              <span className="absolute top-1 left-1 z-10 size-11 rounded-full border-2 border-ink bg-brand-yellow grid place-items-center text-base">
                ⭐
              </span>
            ) : null}
            {showDelete && (
              <DeleteLevelButton levelId={level.id} levelTitle={level.title} />
            )}
            <div className="aspect-square rounded-xl border-2 border-ink relative overflow-hidden bg-paper">
              <LevelThumbnail
                thumbnailUrl={level.thumbnailUrl}
                previewPage={level.previewPage}
                alt={level.title}
              />
              <button
                type="button"
                aria-label={canEdit ? `Edit ${level.title}` : `Preview ${level.title}`}
                className="absolute bottom-2 right-2 size-9 rounded-full border-2 border-ink bg-white grid place-items-center text-sm"
              >
                {canEdit ? "✏️" : "▶"}
              </button>
            </div>
            <div className="px-1 pt-3 pb-1">
              <h3 className="font-display font-bold text-base truncate">{level.title}</h3>
              {level.parentId && level.parentTitle && (
                <p className="text-[11px] text-ink/60 truncate">editing live version</p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs font-semibold flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="text-brand-coral">♥</span> {formatCount(level.likeCount)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-brand-green">▶</span> {formatCount(level.playCount)}
                </span>
                <RatingDisplay
                  ratingSum={level.ratingSum}
                  ratingCount={level.ratingCount}
                />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
