import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordCounter } from "@/lib/levels/mutations";

type Params = Promise<{ id: string }>;

// Bumps levels.play_count for a published level. Anonymous-allowed —
// the underlying record_play RPC is SECURITY DEFINER and only updates
// status='published' rows, so a draft can't be inflated via this
// endpoint.
//
// Skip the increment when the caller is the level's own creator —
// "play count" tracks how many times *other* people have played the
// level, so author test-runs and the author replaying their own work
// shouldn't inflate the public-facing number.
//
// The body lives in lib/levels/mutations.ts:recordCounter — it was identical
// to the clear counter but for the RPC name, and /api/v1/ needs the same rules.
export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await recordCounter(supabase, id, "record_play");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, ...result.value });
}
