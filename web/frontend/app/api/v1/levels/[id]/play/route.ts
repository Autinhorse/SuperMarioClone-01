import { v1OpenContext } from "@/lib/api/v1";
import { ok, fail } from "@/lib/api/respond";
import { recordCounter } from "@/lib/levels/mutations";

type Params = Promise<{ id: string }>;

// Bearer twin of app/api/levels/[id]/play/route.ts — bumps levels.play_count.
//
// **Anonymous-allowed** (`v1OpenContext`), like its cookie ancestor: the
// underlying record_play RPC is SECURITY DEFINER and only touches published
// rows, so a draft can't be inflated through it. Requiring a session would mean
// the game has to mint a guest just to count a play — the network-on-startup
// ADR-003 avoids. A token, when present, is what lets recordCounter recognise
// the author and skip their own playthroughs.
export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const ctx = await v1OpenContext(req);
  if (!ctx.ok) return ctx.response;

  const result = await recordCounter(ctx.supabase, id, "record_play");
  if (!result.ok) return fail(result.status, result.error, "server_error");
  return ok(result.value);
}
