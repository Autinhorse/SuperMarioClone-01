import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The "level the public can see" predicate, in one place.
 *
 * Both conditions matter and neither is redundant with RLS:
 *
 * - `status = published` — RLS shows a signed-in creator *their own drafts*
 *   too. Without this filter, browsing while logged in would quietly mix your
 *   unfinished work into what is supposed to be everyone's published levels.
 * - `parent_id is null` — excludes revision-swap forks. The
 *   `forks_must_be_draft` CHECK plus the status filter already imply it, but
 *   it is spelled out so a reader doesn't have to chase the constraint to know
 *   forks stay hidden.
 *
 * `select` is a parameter because the callers want very different columns:
 * the browse API must NOT ship `data` (level payloads are large and browsing
 * doesn't need them — that's what `GET /api/v1/levels/{id}` is for), while the
 * website's card renderers read `data` to draw an SVG fallback thumbnail.
 */
export function publishedLevels(supabase: SupabaseClient, select: string) {
  return supabase
    .from("levels")
    .select(select)
    .eq("status", "published")
    .is("parent_id", null);
}

/** Sort orders the browse API accepts. `new` is the default everywhere. */
export const BROWSE_SORTS = ["new", "plays", "likes"] as const;
export type BrowseSort = (typeof BROWSE_SORTS)[number];

export function isBrowseSort(value: string): value is BrowseSort {
  return (BROWSE_SORTS as readonly string[]).includes(value);
}

/**
 * Apply a sort. Deliberately no "top rated": an honest one needs
 * `rating_sum / rating_count`, PostgREST can't order by an expression, and
 * ordering by `rating_sum` alone would just rank by popularity wearing a
 * rating's clothes. It needs a generated column — a migration, not a param.
 */
export function applyBrowseSort<T>(query: T, sort: BrowseSort): T {
  const q = query as { order: (col: string, opts: object) => T };
  switch (sort) {
    case "plays":
      return q.order("play_count", { ascending: false });
    case "likes":
      return q.order("like_count", { ascending: false });
    case "new":
    default:
      return q.order("published_at", { ascending: false });
  }
}

/**
 * Escape a user-supplied search term for a LIKE pattern.
 *
 * `%` and `_` are wildcards: an unescaped `%` turns "find levels called %" into
 * "find every level". Backslash first, or it would escape the escapes.
 */
export function escapeLikePattern(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/[%_]/g, (c) => `\\${c}`);
}
