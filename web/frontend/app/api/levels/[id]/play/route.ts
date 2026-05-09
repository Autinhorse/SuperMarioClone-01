import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const { error } = await supabase.rpc("record_play", { level_text: id });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
