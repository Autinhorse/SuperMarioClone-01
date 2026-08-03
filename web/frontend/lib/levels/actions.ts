"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLevel, unrateLevel } from "./feedback";

// Server Actions for the two browser components that still spoke HTTP.
//
// ADR-005 decision 4: **the website is not an API consumer.** Every page here
// already reads through the server Supabase client; `RatingWidget` and
// `DeleteLevelButton` were the last two holdouts, calling `/api/levels/*` with
// `fetch`. Moving them here is what makes that decision true rather than
// aspirational — and it matters concretely: it leaves `/api/levels/*` used only
// by Ricochet's embed, so those routes can die with Ricochet, while `/api/v1/*`
// stays frozen for shipped game binaries and nothing else.
//
// The rules themselves are NOT reimplemented — `lib/levels/feedback.ts` is the
// same module `/api/v1/levels/[id]/rate` calls, so "you can't rate your own
// level" cannot drift between the site and the game.

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Set the caller's 1–5 rating on a level. */
export async function rateLevelAction(
  levelId: string,
  value: number,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Actions are a public entry point like any route handler — re-check auth
  // here rather than trusting the caller rendered the interactive variant.
  if (!user) return { ok: false, error: "Sign in to rate levels." };

  const result = await rateLevel(supabase, levelId, user, value);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

/** Clear the caller's rating. Idempotent — deleting a missing row is a no-op. */
export async function unrateLevelAction(levelId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to rate levels." };

  const result = await unrateLevel(supabase, levelId, user);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

/** Delete one of the caller's own levels.
 *
 *  Ownership is enforced by RLS, not here: the `.select()` comes back empty
 *  when the policy filtered the row out, which is the same signal as "no such
 *  level" — deliberately indistinguishable, so this can't be used to probe
 *  which ids exist. */
export async function deleteLevelAction(
  levelId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to delete levels." };

  const { data: rows, error } = await supabase
    .from("levels")
    .delete()
    .eq("id", levelId)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!rows || rows.length === 0) {
    return {
      ok: false,
      error: "Level not found, or you don't have permission to delete it.",
    };
  }

  // The delete button lives on profile pages; drop their cached render so the
  // card is gone on the router.refresh() the component fires next. The old
  // fetch path relied on refresh() alone, which could serve the pre-delete
  // snapshot from the router cache.
  revalidatePath("/u/[username]", "page");
  return { ok: true };
}
