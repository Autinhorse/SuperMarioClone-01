import { v1OpenContext } from "@/lib/api/v1";
import { ok, fail } from "@/lib/api/respond";
import { recordCounter } from "@/lib/levels/mutations";

type Params = Promise<{ id: string }>;

// Bearer twin of app/api/levels/[id]/clear/route.ts — bumps levels.clear_count.
//
// **Anonymous-allowed** (`v1OpenContext`), like its cookie ancestor: the
// underlying record_clear RPC is SECURITY DEFINER and only touches published
// rows, so a draft can't be inflated through it. Requiring a session would mean
// the game has to mint a guest just to count a clear — the network-on-startup
// ADR-003 avoids. A token, when present, is what lets recordCounter recognise
// the author and skip their own clears.
//
// Distinct from POST .../mark-cleared: that one is the *author's* publish gate
// (sets last_cleared_at on their own level). This is the public "N people have
// beaten this" counter, and it deliberately skips the author.
export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const ctx = await v1OpenContext(req);
  if (!ctx.ok) return ctx.response;

  const result = await recordCounter(ctx.supabase, id, "record_clear");
  if (!result.ok) return fail(result.status, result.error, "server_error");
  return ok(result.value);
}
