import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

// Bumps levels.clear_count for a published level. Anonymous-allowed via
// the SECURITY DEFINER record_clear RPC, which only updates published rows.
//
// Skip the increment when the caller is the level's own creator — the
// public clear_count should reflect only other people clearing the
// level. Author playthroughs (including the publish-verify gate run)
// already update last_cleared_at via the separate mark-cleared route;
// they don't need to inflate the public counter.
export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: level } = await supabase
      .from("levels")
      .select("creator_id")
      .eq("id", id)
      .maybeSingle();
    if (level?.creator_id === user.id) {
      return NextResponse.json({ ok: true, skipped: "owner" });
    }
  }
  const { error } = await supabase.rpc("record_clear", { level_text: id });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
