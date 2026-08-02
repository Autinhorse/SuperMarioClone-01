import { v1Context, rejectGuest } from "@/lib/api/v1";
import { ok, fail } from "@/lib/api/respond";
import { reportLevel } from "@/lib/levels/feedback";

type Params = Promise<{ id: string }>;

// POST /api/v1/levels/{id}/report — flag a level for moderation.
//
// **No cookie twin.** Sketched in ADR-004 §2, never built for the website
// because the website has no report UI; the desktop client is the first surface
// that needs it (a player browsing community levels has no other way to flag
// something). If the website grows the UI later it calls
// lib/levels/feedback.ts:reportLevel, same as this.
//
// Guests are rejected explicitly. The `reports.reporter_id → profiles(id)` FK
// already makes it impossible (guests have no profiles row — ADR-003), but a
// foreign-key violation surfaces as an opaque 500; `rejectGuest` turns it into
// the same actionable 403 publishing gives.
//
// Re-reporting the same level replaces the previous submission (upsert on the
// unique key) rather than adding a row — see the migration for why.
export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const ctx = await v1Context(req);
  if (!ctx.ok) return ctx.response;
  const guest = rejectGuest(ctx.user);
  if (guest) return guest;

  const body = (await req.json().catch(() => null)) as
    | { reason?: unknown; detail?: unknown }
    | null;
  if (!body || typeof body.reason !== "string") {
    return fail(400, "Body must include {reason: <string>}.", "bad_request");
  }
  const detail = typeof body.detail === "string" ? body.detail : null;

  const result = await reportLevel(ctx.supabase, id, ctx.user, body.reason, detail);
  if (!result.ok) return fail(result.status, result.error, result.code);
  return ok();
}
