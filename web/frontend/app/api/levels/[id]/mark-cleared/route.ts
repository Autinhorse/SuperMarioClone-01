import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("levels")
    .update({ last_cleared_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, last_cleared_at, updated_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json(
      {
        error:
          "Level not found, or you don't have permission to mark it cleared.",
      },
      { status: 404 },
    );
  }
  return NextResponse.json({
    ok: true,
    last_cleared_at: rows[0].last_cleared_at,
    updated_at: rows[0].updated_at,
  });
}
