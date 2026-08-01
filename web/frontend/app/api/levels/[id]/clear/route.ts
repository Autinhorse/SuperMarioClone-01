import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordCounter } from "@/lib/levels/mutations";

type Params = Promise<{ id: string }>;

// Bumps levels.clear_count for a published level. Anonymous-allowed via
// the SECURITY DEFINER record_clear RPC, which only updates published rows.
//
// Skip the increment when the caller is the level's own creator — the
// public clear_count should reflect only other people clearing the
// level. Author playthroughs (including the publish-verify gate run)
// already update last_cleared_at via the separate mark-cleared route;
// they don't need to inflate the public counter.
//
// The body lives in lib/levels/mutations.ts:recordCounter — shared with the
// play counter (it was identical but for the RPC name) and with /api/v1/.
export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await recordCounter(supabase, id, "record_clear");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, ...result.value });
}
