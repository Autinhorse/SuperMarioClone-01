import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/api/auth";
import { markCleared } from "@/lib/levels/mutations";

type Params = Promise<{ id: string }>;

// Records that the creator has just cleared their own level end-to-end
// via the editor's publish-verify playthrough. Sets last_cleared_at = now()
// for the row, scoped to creator via RLS (`creators update own levels`).
// The publish path in PATCH /api/levels/[id] compares last_cleared_at
// against updated_at to enforce the playtest gate.
//
// Anyone editing the row would also bump updated_at via the
// levels_touch_updated_at trigger; that's exactly the desired
// behavior — both timestamps land on the same `now()` for this
// statement, so last_cleared_at >= updated_at holds (gate passes).
export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requireUser(supabase);
  if (!auth.ok) return auth.response;

  const result = await markCleared(supabase, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({
    ok: true,
    last_cleared_at: result.value.lastClearedAt,
    updated_at: result.value.updatedAt,
  });
}
