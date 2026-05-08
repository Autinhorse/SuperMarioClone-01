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

// Partial-update endpoint for level metadata. Accepts any combination
// of {title, status}. Distinct from PUT because PUT is reserved for
// the level `data` payload — keeping the metadata path separate means
// the editor's frequent saves don't risk stomping a title rename in
// flight, and vice versa. RLS gates writes the same way (creator-only).
//
// `status` transitions: today only draft ↔ published is exercised; the
// `removed` value is reserved for a future "soft delete" flow. The DB
// has a set_published_at trigger that stamps published_at on first
// transition to 'published', so we don't set it here.
const VALID_STATUSES = new Set(["draft", "published"] as const);
type Status = "draft" | "published";

export async function PATCH(req: Request, { params }: { params: Params }) {
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as
    | { title?: unknown; status?: unknown }
    | null;
  if (!body || (body.title === undefined && body.status === undefined)) {
    return NextResponse.json(
      { error: "Body must include at least one of {title, status}." },
      { status: 400 },
    );
  }

  const update: { title?: string; status?: Status } = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string") {
      return NextResponse.json(
        { error: "title must be a string." },
        { status: 400 },
      );
    }
    const trimmed = body.title.trim();
    // Mirrors the levels.title CHECK constraint (1..100). Catching it
    // here yields a friendlier 400 than letting Postgres reject.
    if (trimmed.length < 1 || trimmed.length > 100) {
      return NextResponse.json(
        { error: "Title must be 1–100 characters." },
        { status: 400 },
      );
    }
    update.title = trimmed;
  }

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !VALID_STATUSES.has(body.status as Status)) {
      return NextResponse.json(
        { error: "status must be one of: draft, published." },
        { status: 400 },
      );
    }
    update.status = body.status as Status;
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
    .update(update)
    .eq("id", id)
    .select("id, title, status");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json(
      { error: "Level not found, or you don't have permission to edit it." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, title: rows[0].title, status: rows[0].status });
}
