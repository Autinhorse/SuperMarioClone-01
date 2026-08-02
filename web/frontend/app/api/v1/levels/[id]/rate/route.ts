import { v1Context } from "@/lib/api/v1";
import { ok, fail } from "@/lib/api/respond";
import { rateLevel, unrateLevel } from "@/lib/levels/feedback";

type Params = Promise<{ id: string }>;

// Bearer twin of app/api/levels/[id]/rate/route.ts. Both call
// lib/levels/feedback.ts so the rules ("1–5", "not your own", "published only")
// can't drift between the website and the game (ADR-004).
//
// Guests are NOT rejected here the way they are for authoring: the FK from
// ratings.user_id to profiles(id) already makes a guest rating impossible, and
// duplicating ADR-003's boundary in the route would give two places to keep in
// sync. The insert fails with a clear 500 rather than a friendly 403 — worth
// revisiting if guest rating turns out to be a real path players hit.

export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const ctx = await v1Context(req);
  if (!ctx.ok) return ctx.response;

  const body = (await req.json().catch(() => null)) as { value?: unknown } | null;
  const result = await rateLevel(ctx.supabase, id, ctx.user, body?.value as number);
  if (!result.ok) return fail(result.status, result.error, result.code);
  return ok(result.value);
}

export async function DELETE(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const ctx = await v1Context(req);
  if (!ctx.ok) return ctx.response;

  const result = await unrateLevel(ctx.supabase, id, ctx.user);
  if (!result.ok) return fail(result.status, result.error, result.code);
  return ok();
}
