import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/api/auth";
import { rateLevel, unrateLevel } from "@/lib/levels/feedback";

type Params = Promise<{ id: string }>;

// Set or update the caller's 1–5 rating for a level.
//
// The rules (integer 1–5, not your own level, published only, upsert so a
// re-rate overwrites) live in lib/levels/feedback.ts — shared with
// POST /api/v1/levels/[id]/rate so the website and the game client can't drift
// on them. What stays here is the cookie-session shell.
export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requireUser(supabase);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as { value?: unknown } | null;
  const result = await rateLevel(supabase, id, auth.user, body?.value as number);
  if (!result.ok) {
    // Existing browser callers read `{error, code?}` — keep that shape exactly.
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true, ...result.value });
}

// Remove the caller's rating. Missing-row deletes are a silent no-op
// (idempotent); the trigger updates the aggregate columns.
export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requireUser(supabase);
  if (!auth.ok) return auth.response;

  const result = await unrateLevel(supabase, id, auth.user);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true });
}
