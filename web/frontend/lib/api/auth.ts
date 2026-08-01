import type { SupabaseClient, User } from "@supabase/supabase-js";
import { fail } from "./respond";

// `const { data: { user } } = await supabase.auth.getUser(); if (!user) 401`
// was written out verbatim in 12 places. This is that, once.
//
// Returns a discriminated union rather than throwing, so handlers keep their
// straight-line shape:
//
//   const auth = await requireUser(supabase);
//   if (!auth.ok) return auth.response;
//   // auth.user is a User from here on
//
// Takes the client as a parameter instead of building one — the whole point of
// /api/v1/ is that the same logic runs against a cookie-bound client (web) and
// a bearer-bound one (game client). Same reason lib/level.ts:fetchViewerRating
// takes its client as an argument.
export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; response: ReturnType<typeof fail> };

export async function requireUser(
  supabase: SupabaseClient,
): Promise<AuthResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: fail(401, "Not authenticated.", "not_authenticated"),
    };
  }
  return { ok: true, user };
}
