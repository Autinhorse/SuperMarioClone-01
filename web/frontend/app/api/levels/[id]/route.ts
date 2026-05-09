import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { publishLevelThumbnail } from "@/lib/thumbnail/publish";

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

  // Saving the level data invalidates the playtest gate — the player
  // hasn't cleared *this* version yet. NULL is the "needs verify"
  // sentinel; mark-cleared sets it back to a timestamp on a successful
  // verify run. Done in the same UPDATE so the two never get out of
  // sync (e.g. via a save that races with a separate clear-clear write).
  const { data: rows, error } = await supabase
    .from("levels")
    .update({ data: body.data, last_cleared_at: null })
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
  let nextThumbnailUrl: string | null = null;
  if (update.status === "published") {
    const { data: current, error: readErr } = await supabase
      .from("levels")
      .select("status, last_cleared_at, data, parent_id, title, description")
      .eq("id", id)
      .maybeSingle();
    if (readErr) {
      return NextResponse.json({ error: readErr.message }, { status: 500 });
    }
    if (!current) {
      return NextResponse.json(
        { error: "Level not found, or you don't have permission to edit it." },
        { status: 404 },
      );
    }
    const isFork = current.parent_id !== null;

    // Gate. For an already-published original, allow a no-op republish
    // without re-test (covers Unpublish→Publish bounce on grandfathered
    // rows). Forks always require a fresh clear — they exist precisely
    // because the user just changed the data.
    const gateApplies = isFork || current.status !== "published";
    if (gateApplies && current.last_cleared_at === null) {
      return NextResponse.json(
        {
          error:
            "Test play required: clear this level end-to-end before publishing.",
          code: "playtest_required",
        },
        { status: 400 },
      );
    }

    // Storage key = the public-facing level id. For a fork that's the
    // parent (so the parent's existing thumbnail_url URL stays valid;
    // upload upserts the same key).
    const publicId = isFork ? (current.parent_id as string) : id;
    try {
      nextThumbnailUrl = await publishLevelThumbnail(publicId, current.data);
    } catch (err) {
      return NextResponse.json(
        {
          error: `Could not generate thumbnail: ${(err as Error).message}`,
          code: "thumbnail_failed",
        },
        { status: 500 },
      );
    }

    if (isFork) {
      // Swap: copy fork content into parent, then delete fork. Two
      // statements rather than an RPC for now — partial failure (UPDATE
      // ok, DELETE fails) leaves the fork orphaned but the user-visible
      // outcome (live level updated) succeeded. We log and continue.
      const parentId = current.parent_id as string;
      const { error: swapErr } = await supabase
        .from("levels")
        .update({
          title: current.title,
          description: current.description,
          data: current.data,
          thumbnail_url: nextThumbnailUrl,
          last_cleared_at: current.last_cleared_at,
        })
        .eq("id", parentId);
      if (swapErr) {
        return NextResponse.json({ error: swapErr.message }, { status: 500 });
      }
      const { error: delErr } = await supabase
        .from("levels")
        .delete()
        .eq("id", id);
      if (delErr) {
        console.error(
          `[swap ${id}→${parentId}] UPDATE ok but DELETE failed: ${delErr.message}`,
        );
      }

      // Profile drafts (fork removed) + public listings (parent thumb
      // changed) all need a fresh server render.
      revalidatePath("/u/[username]", "page");
      revalidatePath("/explore", "page");
      revalidatePath("/", "page");

      return NextResponse.json({
        ok: true,
        title: current.title,
        status: "published",
        swappedToId: parentId,
      });
    }
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

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
