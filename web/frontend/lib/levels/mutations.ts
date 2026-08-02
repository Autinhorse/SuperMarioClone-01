import type { SupabaseClient } from "@supabase/supabase-js";

// Level write operations, extracted from the route handlers so the cookie
// routes (web) and the bearer routes (game client, ADR-004) share one
// implementation. All take the Supabase client as a parameter — same reason
// lib/level.ts:fetchViewerRating does: the caller decides whether it's
// cookie-bound or bearer-bound, the logic doesn't care.
//
// RLS is the access-control boundary throughout. Every mutation ends with
// .select() so a policy-blocked write surfaces as 0 rows rather than a silent
// success — the callers map that to 404.

export type MutationResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

/** Create a draft owned by `creatorId`. Returns the generated short id. */
export async function createLevel(
  supabase: SupabaseClient,
  fields: {
    creatorId: string;
    gameType: string;
    title: string;
    data: unknown;
    /** Optional author blurb. Travels with the level on the game client
     *  (LevelData.description), so publishing sends it along with the title. */
    description?: string | null;
    /** Minimum client generation needed to open this level (ADR-004 §5).
     *  Omitted by the web editor; the game client computes it per level. */
    formatVersion?: number;
  },
): Promise<MutationResult<{ id: string }>> {
  const row: Record<string, unknown> = {
    creator_id: fields.creatorId,
    game_type: fields.gameType,
    title: fields.title,
    data: fields.data,
    status: "draft",
  };
  if (fields.formatVersion !== undefined) {
    row.format_version = fields.formatVersion;
  }
  if (fields.description !== undefined) {
    row.description = fields.description;
  }

  const { data, error } = await supabase
    .from("levels")
    .insert(row)
    .select("id")
    .single();

  if (error || !data) {
    // Surface the real DB error rather than silently dropping the caller —
    // RLS / schema rejections should be rare, and the message identifies why.
    return {
      ok: false,
      status: 500,
      error: error?.message ?? "Could not create level.",
    };
  }
  return { ok: true, value: { id: data.id as string } };
}

/** Replace a level's `data`.
 *
 * Also clears `last_cleared_at`: saving invalidates the playtest gate, because
 * nobody has cleared *this* version yet. NULL is the "needs verify" sentinel;
 * markCleared() sets it back. Done in the same UPDATE so the two can never get
 * out of sync via a save racing a separate clear-clear write. */
export async function saveLevelData(
  supabase: SupabaseClient,
  id: string,
  data: unknown,
  formatVersion?: number,
): Promise<MutationResult<null>> {
  const patch: Record<string, unknown> = { data, last_cleared_at: null };
  if (formatVersion !== undefined) {
    patch.format_version = formatVersion;
  }

  const { data: rows, error } = await supabase
    .from("levels")
    .update(patch)
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, status: 500, error: error.message };
  if (!rows || rows.length === 0) {
    return {
      ok: false,
      status: 404,
      error: "Level not found, or you don't have permission to edit it.",
    };
  }
  return { ok: true, value: null };
}

/** Record that the creator cleared their own level end-to-end — this is what
 *  satisfies the publish gate (see preparePublish). Scoped to the creator by
 *  RLS (`creators update own levels`). */
export async function markCleared(
  supabase: SupabaseClient,
  id: string,
): Promise<MutationResult<{ lastClearedAt: string; updatedAt: string }>> {
  const { data: rows, error } = await supabase
    .from("levels")
    .update({ last_cleared_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, last_cleared_at, updated_at");

  if (error) return { ok: false, status: 500, error: error.message };
  if (!rows || rows.length === 0) {
    return {
      ok: false,
      status: 404,
      error:
        "Level not found, or you don't have permission to mark it cleared.",
    };
  }
  return {
    ok: true,
    value: {
      lastClearedAt: rows[0].last_cleared_at as string,
      updatedAt: rows[0].updated_at as string,
    },
  };
}

/** Bump play_count / clear_count.
 *
 * Both RPCs are SECURITY DEFINER and only touch published rows, so a draft
 * can't be inflated and anonymous callers are fine. The owner is skipped:
 * these counters track how many times *other* people played/cleared, so author
 * test runs shouldn't inflate the public number. */
export async function recordCounter(
  supabase: SupabaseClient,
  id: string,
  rpc: "record_play" | "record_clear",
): Promise<MutationResult<{ skipped?: "owner" }>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: level } = await supabase
      .from("levels")
      .select("creator_id")
      .eq("id", id)
      .maybeSingle();
    if (level?.creator_id === user.id) {
      return { ok: true, value: { skipped: "owner" } };
    }
  }
  const { error } = await supabase.rpc(rpc, { level_text: id });
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true, value: {} };
}

/** Level description cap. The column has no CHECK — it was added before anything
 *  wrote to it — so the limit lives here, applied identically by POST and PATCH.
 *  Matches LevelNaming.DESC_MAX on the game client (which caps before sending;
 *  this is the boundary that actually holds). */
export const DESCRIPTION_MAX = 500;

/** Normalise an optional description field from a request body.
 *  Returns the trimmed string, null to clear it, or an error message. */
export function readDescription(
  value: unknown,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: "description must be a string." };
  }
  const trimmed = value.trim();
  if (trimmed.length > DESCRIPTION_MAX) {
    return {
      ok: false,
      error: `description must be at most ${DESCRIPTION_MAX} characters.`,
    };
  }
  return { ok: true, value: trimmed === "" ? null : trimmed };
}
