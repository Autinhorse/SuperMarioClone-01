import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { publishLevelThumbnail } from "@/lib/thumbnail/publish";
import { requireUser } from "@/lib/api/auth";
import { saveLevelData } from "@/lib/levels/mutations";
import { preparePublish } from "@/lib/levels/publish";

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
  const auth = await requireUser(supabase);
  if (!auth.ok) return auth.response;

  // Body (including the "saving clears the playtest gate" rule) lives in
  // lib/levels/mutations.ts:saveLevelData — shared with /api/v1/.
  const result = await saveLevelData(supabase, id, body.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
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
  const auth = await requireUser(supabase);
  if (!auth.ok) return auth.response;

  // Publish path. Three branches share an early SELECT so we read the
  // row at most once, regardless of which branch we end up on:
  //
  //   1. Original (parent_id IS NULL): playtest gate, render thumbnail
  //      keyed by self-id, flip status to published.
  //   2. Fork    (parent_id IS NOT NULL): playtest gate, render
  //      thumbnail keyed by parent_id, swap fork's data + title +
  //      thumbnail + last_cleared_at into the parent row, delete the
  //      fork. The fork's status was 'draft' and stays effectively
  //      gone — the parent stays 'published'. Preserves parent's id /
  //      play_count / like_count / created_at across the edit.
  //   3. Non-publish PATCH (title, or unpublish): skip this whole block.
  //
  // The rules themselves (gate + swap) live in lib/levels/publish.ts so the
  // bearer routes in /api/v1/ run the identical logic — a bypassed swap would
  // destroy the parent's id, play_count and permalinks. What stays here is the
  // Next-specific part: revalidatePath (throws outside a Route Handler) and
  // response shaping.
  let nextThumbnailUrl: string | null = null;
  if (update.status === "published") {
    const outcome = await preparePublish(supabase, id, (publicId, data) =>
      publishLevelThumbnail(publicId, data),
    );
    if (outcome.kind === "error") {
      return NextResponse.json(
        outcome.code
          ? { error: outcome.error, code: outcome.code }
          : { error: outcome.error },
        { status: outcome.status },
      );
    }
    if (outcome.kind === "swapped") {
      // Profile drafts (fork removed) + public listings (parent thumb
      // changed) all need a fresh server render.
      revalidatePath("/u/[username]", "page");
      revalidatePath("/explore", "page");
      revalidatePath("/", "page");
      return NextResponse.json({
        ok: true,
        title: outcome.title,
        status: "published",
        swappedToId: outcome.swappedToId,
      });
    }
    nextThumbnailUrl = outcome.thumbnailUrl;
  }

  // Non-fork path: regular UPDATE (status flip, title rename, or both,
  // optionally with the freshly-rendered thumbnail).
  const finalUpdate: typeof update & { thumbnail_url?: string } = { ...update };
  if (nextThumbnailUrl !== null) {
    finalUpdate.thumbnail_url = nextThumbnailUrl;
  }
  const { data: rows, error } = await supabase
    .from("levels")
    .update(finalUpdate)
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
  // Title / status / thumbnail changes all surface on cards. Revalidate
  // the public listings + the user's profile so a back-nav from the
  // editor doesn't show pre-edit values.
  revalidatePath("/u/[username]", "page");
  revalidatePath("/explore", "page");
  revalidatePath("/", "page");
  return NextResponse.json({ ok: true, title: rows[0].title, status: rows[0].status });
}

// Hard-deletes a level the caller owns. Likes cascade via the FK
// constraint (likes.level_id ... on delete cascade). RLS gates writes
// (`creators delete own levels`), so a non-owner delete affects 0 rows
// and we map that to 404 — matches the convention used by PUT/PATCH
// above (avoid leaking row existence).
export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requireUser(supabase);
  if (!auth.ok) return auth.response;

  const { data: rows, error } = await supabase
    .from("levels")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json(
      { error: "Level not found, or you don't have permission to delete it." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
