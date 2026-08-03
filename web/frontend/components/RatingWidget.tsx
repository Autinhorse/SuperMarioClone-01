"use client";

import { useState } from "react";
import { rateLevelAction, unrateLevelAction } from "@/lib/levels/actions";

// 5-star rating widget. State the page passes in is the seed; once the
// user clicks, we update local state optimistically (server is the
// source of truth on next page render). Three interaction modes:
//
//   interactive: signed-in non-creator. Click a star to set; click your
//                current rating to clear; hover previews the value.
//   read-only:   anonymous viewer or the level's own creator. Stars
//                show the average; clicks are no-ops, with a hint
//                tooltip explaining why ("Sign in to rate" or "Your
//                own level").
//
// Avg display rounds to nearest whole star — the "4.3 / 5 (12)"
// numeric label sits next to it for precision.
export function RatingWidget({
  levelId,
  initialRatingSum,
  initialRatingCount,
  initialViewerRating,
  viewerSignedIn,
  isOwner,
}: {
  levelId: string;
  initialRatingSum: number;
  initialRatingCount: number;
  initialViewerRating: number | null;
  viewerSignedIn: boolean;
  isOwner: boolean;
}) {
  const [sum, setSum] = useState(initialRatingSum);
  const [count, setCount] = useState(initialRatingCount);
  const [viewerRating, setViewerRating] = useState<number | null>(
    initialViewerRating,
  );
  const [hover, setHover] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const interactive = viewerSignedIn && !isOwner;
  const avg = count > 0 ? sum / count : 0;
  // Stars filled: hover preview wins if interactive, else the user's
  // current rating, else the rounded average. count=0 with no rating
  // shows zero filled stars.
  const filled = interactive
    ? (hover ?? viewerRating ?? Math.round(avg))
    : viewerRating ?? Math.round(avg);

  async function setRating(value: number | null) {
    setBusy(true);
    setError(null);
    try {
      if (value === null) {
        // Clear path.
        const res = await unrateLevelAction(levelId);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        if (viewerRating !== null) {
          setSum((s) => Math.max(0, s - viewerRating));
          setCount((c) => Math.max(0, c - 1));
        }
        setViewerRating(null);
        return;
      }
      const res = await rateLevelAction(levelId, value);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Optimistic update of the aggregates so the next render reflects
      // the new average without a refresh. Mirrors what the trigger
      // would do on the server.
      if (viewerRating === null) {
        setSum((s) => s + value);
        setCount((c) => c + 1);
      } else {
        setSum((s) => s - viewerRating + value);
      }
      setViewerRating(value);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onClickStar(n: number) {
    if (!interactive || busy) return;
    if (n === viewerRating) {
      void setRating(null);
    } else {
      void setRating(n);
    }
  }

  const tooltip = !viewerSignedIn
    ? "Sign in to rate"
    : isOwner
      ? "You can't rate your own level"
      : viewerRating !== null
        ? `Click ${viewerRating}★ again to clear your rating`
        : "Click a star to rate";

  return (
    <div className="flex items-center gap-2 flex-wrap" title={tooltip}>
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHover(null)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            on={n <= filled}
            interactive={interactive}
            disabled={busy}
            onMouseEnter={() => interactive && setHover(n)}
            onClick={() => onClickStar(n)}
          />
        ))}
      </div>
      <span className="text-xs text-ink/70 font-semibold">
        {count > 0 ? `${avg.toFixed(1)} / 5` : "no ratings yet"}
        {count > 0 && (
          <span className="text-ink/50 font-normal ml-1">
            ({count})
          </span>
        )}
      </span>
      {error && (
        <span className="text-xs text-brand-coral font-semibold w-full">
          {error}
        </span>
      )}
    </div>
  );
}

function Star({
  on,
  interactive,
  disabled,
  onMouseEnter,
  onClick,
}: {
  on: boolean;
  interactive: boolean;
  disabled?: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  const fillClass = on ? "text-brand-yellow" : "text-ink/25";
  if (interactive) {
    return (
      <button
        type="button"
        onMouseEnter={onMouseEnter}
        onClick={onClick}
        disabled={disabled}
        className={`text-2xl leading-none ${fillClass} hover:scale-110 transition disabled:opacity-50 disabled:hover:scale-100`}
        aria-label={`Rate this level ${on ? "(filled)" : "(empty)"}`}
      >
        ★
      </button>
    );
  }
  return (
    <span aria-hidden className={`text-2xl leading-none ${fillClass}`}>
      ★
    </span>
  );
}

// Compact variant for level cards. Static (no interaction), tiny text,
// fits inline with the like / play counters. count=0 stays visible —
// shows "★ 0" so the rating column is visible on every card and the
// player notices ratings exist as a feature even when nobody's rated
// yet. count>0 expands to "★ 4.3 (12)" with the average + count.
export function RatingDisplay({
  ratingSum,
  ratingCount,
}: {
  ratingSum: number;
  ratingCount: number;
}) {
  if (ratingCount === 0) {
    return (
      <span className="flex items-center gap-1">
        <span className="text-brand-yellow">★</span> 0
      </span>
    );
  }
  const avg = ratingSum / ratingCount;
  return (
    <span className="flex items-center gap-1">
      <span className="text-brand-yellow">★</span>
      {avg.toFixed(1)}
      <span className="text-ink/50 font-normal">({ratingCount})</span>
    </span>
  );
}
