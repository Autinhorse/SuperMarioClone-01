import { revalidatePath } from "next/cache";
import { v1Context, v1OpenContext, rejectGuest } from "@/lib/api/v1";
import { ok, fail, notFoundOrForbidden } from "@/lib/api/respond";
import { saveLevelData } from "@/lib/levels/mutations";
import { preparePublish } from "@/lib/levels/publish";

type Params = Promise<{ id: string }>;

// Bearer-authenticated twins of app/api/levels/[id]/route.ts. The rules live in
// lib/levels/* — both surfaces call the same functions, so the publish gate and
// the fork/swap can't drift between the website and the game (ADR-004).

// GET — read a level back. Anonymous-friendly: RLS shows published levels to
// everyone and drafts only to their creator, so this one query serves both
// "download someone's level" and "reopen my own draft".
export async function GET(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const ctx = await v1OpenContext(req);
  if (!ctx.ok) return ctx.response;

  const { data, error } = await ctx.supabase
    .from("levels")
    .select(
      "id, title, description, data, status, game_type, format_version, creator_id, play_count, like_count, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return fail(500, error.message, "server_error");
  if (!data) return notFoundOrForbidden("view");
  return ok({ level: data });
}

// PUT — replace the level data. Also clears the playtest gate (saveLevelData).
export async function PUT(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const ctx = await v1Context(req);
  if (!ctx.ok) return ctx.response;

  const body = (await req.json().catch(() => null)) as {
    data?: unknown;
    format_version?: unknown;
  } | null;
  if (!body || typeof body.data !== "object" || body.data === null) {
    return fail(400, "Body must be {data: <level json object>}.", "bad_request");
  }
  const formatVersion =
    typeof body.format_version === "number" &&
    Number.isInteger(body.format_version)
      ? body.format_version
      : undefined;

  const result = await saveLevelData(ctx.supabase, id, body.data, formatVersion);
  if (!result.ok) {
    return fail(
      result.status,
      result.error,
      result.status === 404 ? "not_found" : "server_error",
    );
  }
  return ok();
}

// PATCH — title and/or status. Publishing runs the gate and the fork/swap.
const VALID_STATUSES = new Set(["draft", "published"] as const);
type Status = "draft" | "published";

export async function PATCH(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const ctx = await v1Context(req);
  if (!ctx.ok) return ctx.response;

  const body = (await req.json().catch(() => null)) as {
    title?: unknown;
    status?: unknown;
  } | null;
  if (!body || (body.title === undefined && body.status === undefined)) {
    return fail(400, "Body must include at least one of {title, status}.", "bad_request");
  }

  const update: { title?: string; status?: Status } = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string") {
      return fail(400, "title must be a string.", "bad_request");
    }
    const trimmed = body.title.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      return fail(400, "Title must be 1–100 characters.", "bad_request");
    }
    update.title = trimmed;
  }
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !VALID_STATUSES.has(body.status as Status)) {
      return fail(400, "status must be one of: draft, published.", "bad_request");
    }
    update.status = body.status as Status;
  }

  if (update.status === "published") {
    const guest = rejectGuest(ctx.user);
    if (guest) return guest;

    // Unlike the web path, we do NOT render a thumbnail here — Godot levels
    // can't be drawn on Vercel. The client uploads one beforehand via
    // POST /api/v1/levels/{id}/thumbnail, so returning null means "keep the
    // thumbnail_url already on the row" (and carry it across a fork swap).
    const outcome = await preparePublish(ctx.supabase, id, async () => null);
    if (outcome.kind === "error") {
      return fail(outcome.status, outcome.error, outcome.code);
    }
    if (outcome.kind === "swapped") {
      revalidatePath("/u/[username]", "page");
      revalidatePath("/explore", "page");
      revalidatePath("/", "page");
      return ok({
        title: outcome.title,
        status: "published",
        swappedToId: outcome.swappedToId,
      });
    }
  }

  const { data: rows, error } = await ctx.supabase
    .from("levels")
    .update(update)
    .eq("id", id)
    .select("id, title, status");

  if (error) return fail(500, error.message, "server_error");
  if (!rows || rows.length === 0) return notFoundOrForbidden();

  revalidatePath("/u/[username]", "page");
  revalidatePath("/explore", "page");
  revalidatePath("/", "page");
  return ok({ title: rows[0].title, status: rows[0].status });
}

// DELETE — hard delete. Likes/ratings cascade via FK.
export async function DELETE(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const ctx = await v1Context(req);
  if (!ctx.ok) return ctx.response;

  const { data: rows, error } = await ctx.supabase
    .from("levels")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return fail(500, error.message, "server_error");
  if (!rows || rows.length === 0) return notFoundOrForbidden("delete");

  revalidatePath("/u/[username]", "page");
  revalidatePath("/explore", "page");
  return ok();
}
