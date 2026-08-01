import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiErrorCode } from "@/lib/api/respond";

// The publish path: playtest gate + fork/swap. Extracted verbatim from
// PATCH /api/levels/[id] so the cookie route (web editor) and the bearer route
// (desktop game client, ADR-004) run the *same* rules. Getting this wrong is
// expensive — a bypassed swap destroys the parent's id, play_count and
// permalinks — so the shape below deliberately mirrors the original control
// flow one-to-one rather than being "cleaned up".
//
// What is NOT here, on purpose:
//   * revalidatePath — a Next.js cache concern that belongs to the route layer
//     (and throws outside a Route Handler).
//   * the generic UPDATE that follows — it also serves title-only PATCHes, so
//     it stays in the handler. This function tells the handler whether to run
//     it, via the "continue" outcome.
//   * building the Supabase client — callers pass theirs (cookie or bearer).

/** Where the thumbnail for this publish comes from.
 *
 * Web renders it server-side from the level data (@napi-rs/canvas). The game
 * client can't — Godot levels aren't renderable on Vercel — so it uploads a
 * PNG beforehand via POST /api/v1/levels/{id}/thumbnail and this returns null,
 * meaning "keep whatever is already on the row". */
export type ResolveThumbnail = (
  publicId: string,
  data: unknown,
) => Promise<string | null>;

export type PublishOutcome =
  /** Fork republished into its parent. Nothing left to do but respond. */
  | { kind: "swapped"; title: string; swappedToId: string }
  /** Gate passed; caller runs its normal UPDATE, applying thumbnailUrl if set. */
  | { kind: "continue"; thumbnailUrl: string | null }
  | { kind: "error"; status: number; error: string; code?: ApiErrorCode };

export async function preparePublish(
  supabase: SupabaseClient,
  id: string,
  resolveThumbnail: ResolveThumbnail,
): Promise<PublishOutcome> {
  // One SELECT serves all three branches (original / fork / error).
  // `thumbnail_url` is read so a caller that supplies no new thumbnail can
  // still carry the fork's existing one across the swap.
  const { data: current, error: readErr } = await supabase
    .from("levels")
    .select(
      "status, last_cleared_at, data, parent_id, title, description, thumbnail_url",
    )
    .eq("id", id)
    .maybeSingle();
  if (readErr) {
    return { kind: "error", status: 500, error: readErr.message };
  }
  if (!current) {
    return {
      kind: "error",
      status: 404,
      error: "Level not found, or you don't have permission to edit it.",
      code: "not_found",
    };
  }
  const isFork = current.parent_id !== null;

  // Gate. An already-published original may be republished without a re-test
  // (covers the Unpublish→Publish bounce on grandfathered rows). Forks always
  // require a fresh clear — they exist precisely because the data just changed.
  const gateApplies = isFork || current.status !== "published";
  if (gateApplies && current.last_cleared_at === null) {
    return {
      kind: "error",
      status: 400,
      error:
        "Test play required: clear this level end-to-end before publishing.",
      code: "playtest_required",
    };
  }

  // Storage key = the public-facing level id. For a fork that's the parent, so
  // the parent's existing thumbnail_url stays valid (the upload upserts).
  const publicId = isFork ? (current.parent_id as string) : id;
  let nextThumbnailUrl: string | null = null;
  try {
    nextThumbnailUrl = await resolveThumbnail(publicId, current.data);
  } catch (err) {
    return {
      kind: "error",
      status: 500,
      error: `Could not generate thumbnail: ${(err as Error).message}`,
      code: "thumbnail_failed",
    };
  }

  if (!isFork) {
    return { kind: "continue", thumbnailUrl: nextThumbnailUrl };
  }

  // Swap: copy fork content into parent, then delete the fork. Two statements
  // rather than an RPC — a partial failure (UPDATE ok, DELETE fails) leaves an
  // orphaned fork but the user-visible outcome (live level updated) succeeded,
  // so we log and continue rather than failing the request.
  const parentId = current.parent_id as string;
  const { error: swapErr } = await supabase
    .from("levels")
    .update({
      title: current.title,
      description: current.description,
      data: current.data,
      thumbnail_url: nextThumbnailUrl ?? current.thumbnail_url,
      last_cleared_at: current.last_cleared_at,
    })
    .eq("id", parentId);
  if (swapErr) {
    return { kind: "error", status: 500, error: swapErr.message };
  }
  const { error: delErr } = await supabase.from("levels").delete().eq("id", id);
  if (delErr) {
    console.error(
      `[swap ${id}→${parentId}] UPDATE ok but DELETE failed: ${delErr.message}`,
    );
  }

  return { kind: "swapped", title: current.title, swappedToId: parentId };
}
