import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase client bound to an `Authorization: Bearer <access_token>` header,
// for the /api/v1/ routes the desktop game client calls (ADR-004).
//
// Why this exists at all: lib/supabase/server.ts builds its client from
// cookies, which a native binary has no way to send. ADR-004 explicitly
// rejected "make the existing cookie routes also accept bearer" — the web app
// can be redeployed at will, an installed game cannot, so the two surfaces get
// separate upgrade cadences.
//
// ⚠️ Deliberately NOT the service-role client. Requests run as the caller, so
// RLS stays the access-control boundary — same guarantee the cookie routes
// have. (The one narrow exception is the thumbnail *storage write*, whose
// bucket has no INSERT policy; that route still verifies ownership through
// RLS with this client first. See lib/thumbnail/publish.ts.)
//
// The publishable key is public by design — it ships inside the game binary
// and in the website's browser bundle. Security is RLS, not key secrecy.
export function createBearerClient(token: string): SupabaseClient {
  // ⚠️ Omit the header entirely when there is no token — do NOT send
  // `Authorization: Bearer ` with an empty value. PostgREST rejects that with
  // `Empty JWT is sent in Authorization header` (a 500) instead of falling back
  // to the anonymous role, which breaks every endpoint that anonymous callers
  // are allowed to use (e.g. GET a published level). Absent header = anon.
  const headers: Record<string, string> = {};
  if (token !== "") {
    headers.Authorization = `Bearer ${token}`;
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers },
      // No session persistence or refresh on the server: each request is
      // self-contained, and the client owns its own token lifecycle.
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

/** Pull the bearer token out of a request. Returns "" when absent/malformed —
 *  callers turn that into a 401 via requireUser(), so a missing header and a
 *  bad token fail the same way (no information leak about which). */
export function bearerToken(req: Request): string {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, value] = header.split(" ");
  if (!value || scheme.toLowerCase() !== "bearer") return "";
  return value.trim();
}

/** Convenience: build the client straight from the request. */
export function clientFromRequest(req: Request): SupabaseClient {
  return createBearerClient(bearerToken(req));
}
