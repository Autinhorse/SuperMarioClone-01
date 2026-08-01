import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/api/auth";

type Params = Promise<{ id: string }>;

// Set or update the caller's 1–5 rating for a level. Upsert keyed by
// (user_id, level_id) so a re-rate overwrites the previous value; the
// trigger on the ratings table keeps levels.rating_sum / rating_count
// in sync. Creators are forbidden from rating their own levels — we
// reject server-side rather than rely on the UI hiding the widget.
export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as
    | { value?: unknown }
    | null;
  const value = body?.value;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 5
  ) {
    return NextResponse.json(
      { error: "value must be an integer between 1 and 5." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const auth = await requireUser(supabase);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  // Owner-rates-own gate: surface a friendly 403 instead of the
  // generic RLS-violation message a self-rating would otherwise hit
  // if we tried to upsert. Also lets us catch the case before any
  // network round-trip waste.
  const { data: level, error: lookupErr } = await supabase
    .from("levels")
    .select("creator_id, status")
    .eq("id", id)
    .maybeSingle();
  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }
  if (!level) {
    return NextResponse.json({ error: "Level not found." }, { status: 404 });
  }
  if (level.creator_id === user.id) {
    return NextResponse.json(
      { error: "You can't rate your own level.", code: "self_rate" },
      { status: 403 },
    );
  }
  // Only published levels accept ratings — drafts shouldn't accumulate
  // public feedback before the author intends to publish.
  if (level.status !== "published") {
    return NextResponse.json(
      { error: "Only published levels can be rated.", code: "not_published" },
      { status: 403 },
    );
  }

  const { error: upsertErr } = await supabase
    .from("ratings")
    .upsert(
      { user_id: user.id, level_id: id, value },
      { onConflict: "user_id,level_id" },
    );
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, value });
}

// Remove the caller's rating. Trigger updates the aggregate columns;
// missing-row deletes are silently a no-op (idempotent).
export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requireUser(supabase);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const { error } = await supabase
    .from("ratings")
    .delete()
    .eq("user_id", user.id)
    .eq("level_id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
