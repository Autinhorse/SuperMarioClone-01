import { v1Context } from "@/lib/api/v1";
import { ok, fail } from "@/lib/api/respond";
import { markCleared } from "@/lib/levels/mutations";

type Params = Promise<{ id: string }>;

// POST /api/v1/levels/{id}/mark-cleared — the creator cleared their own level
// end-to-end, which is what satisfies the publish gate (see preparePublish).
//
// ⚠️ This is trust-the-client by construction, and that's accepted: ADR-004
// records that play counts and clear reports from software running on the
// user's machine are unverifiable, and that the gate exists to stop someone
// accidentally publishing a level they can't finish — not to stop someone
// determined. Don't build anti-cheat on top of it.
export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const ctx = await v1Context(req);
  if (!ctx.ok) return ctx.response;

  const result = await markCleared(ctx.supabase, id);
  if (!result.ok) {
    return fail(
      result.status,
      result.error,
      result.status === 404 ? "not_found" : "server_error",
    );
  }
  return ok({
    last_cleared_at: result.value.lastClearedAt,
    updated_at: result.value.updatedAt,
  });
}
