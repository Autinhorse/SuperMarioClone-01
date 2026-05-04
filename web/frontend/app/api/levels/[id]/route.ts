import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

// Updates levels.data for a level the caller owns. RLS gates writes
// (`creators update own levels` policy), so a non-owner update silently
// affects 0 rows — we detect that via `.select()` and return 404, both
// to avoid leaking row existence and to give the editor a useful signal.
export async function PUT(req: Request, { params }: { params: Params }) {
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as { data?: unknown } | null;
  if (!body || typeof body.data !== "object" || body.data === null) {
    return NextResponse.json(
      { error: "Body must be {data: <level json object>}." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("levels")
    .update({ data: body.data })
    .eq("id", id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json(
      { error: "Level not found, or you don't have permission to edit it." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
