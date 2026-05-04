import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

// Bumps levels.clear_count for a published level. Anonymous-allowed via
// the SECURITY DEFINER record_clear RPC, which only updates published rows.
export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_clear", { level_text: id });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
