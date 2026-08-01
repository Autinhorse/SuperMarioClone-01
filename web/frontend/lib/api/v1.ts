import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { clientFromRequest } from "@/lib/supabase/bearer";
import { checkClientVersion } from "./version";
import { requireUser } from "./auth";
import { fail } from "./respond";

// The preamble every /api/v1/ handler runs: version check → bearer client →
// authenticated user. Bundled so a new route can't accidentally skip one.
//
//   const ctx = await v1Context(req);
//   if (!ctx.ok) return ctx.response;
//   // ctx.supabase (RLS-scoped to the caller) and ctx.user available
export type V1Context =
  | { ok: true; supabase: SupabaseClient; user: User }
  | { ok: false; response: Response };

export async function v1Context(req: Request): Promise<V1Context> {
  const tooOld = checkClientVersion(req);
  if (tooOld) return { ok: false, response: tooOld };

  const supabase = clientFromRequest(req);
  const auth = await requireUser(supabase);
  if (!auth.ok) return { ok: false, response: auth.response };

  return { ok: true, supabase, user: auth.user };
}

/** Same, minus the auth requirement — for reads that anonymous callers may
 *  make (a published level is public). The client is still bearer-scoped, so
 *  RLS shows the caller their own drafts when a token is present. */
export type V1OpenContext =
  | { ok: true; supabase: SupabaseClient }
  | { ok: false; response: Response };

export async function v1OpenContext(req: Request): Promise<V1OpenContext> {
  const tooOld = checkClientVersion(req);
  if (tooOld) return { ok: false, response: tooOld };
  return { ok: true, supabase: clientFromRequest(req) };
}

/** Guests (anonymous sign-in) may consume but not author — ADR-003.
 *
 * The database enforces this by itself: guests have no `profiles` row and
 * `levels.creator_id` references `profiles(id)`, so the insert simply cannot
 * succeed. This check exists to turn that foreign-key violation into a clear,
 * actionable message instead of an opaque 23503. */
export function rejectGuest(user: User) {
  if (user.is_anonymous) {
    return fail(
      403,
      "Create an account to publish levels — guest sessions can play and build, but not publish.",
      "forbidden",
    );
  }
  return null;
}
