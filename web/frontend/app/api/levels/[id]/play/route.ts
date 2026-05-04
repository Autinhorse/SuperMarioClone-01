import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

// Bumps levels.play_count for a published level. Anonymous-allowed —
// the underlying record_play RPC is SECURITY DEFINER and only updates
// status='published' rows, so a draft can't be inflated via this endpoint.
export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_play", { level_text: id });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
