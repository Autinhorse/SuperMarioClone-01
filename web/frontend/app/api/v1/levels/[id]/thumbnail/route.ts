import { v1Context, rejectGuest } from "@/lib/api/v1";
import { ok, fail, notFoundOrForbidden } from "@/lib/api/respond";
import { uploadLevelThumbnail } from "@/lib/thumbnail/publish";

type Params = Promise<{ id: string }>;

// POST /api/v1/levels/{id}/thumbnail — upload a client-rendered PNG.
//
// The website renders thumbnails server-side (lib/thumbnail/render.ts, via
// @napi-rs/canvas plus Ricochet sprites on disk). That is impossible for
// Godot levels on Vercel, so the game renders its own and posts the bytes.
// Body is the raw PNG (Content-Type: image/png), not JSON — base64 in a JSON
// envelope would inflate it by a third for no benefit.
//
// ⚠️ Ownership is checked here with the caller's own token (RLS), and only the
// storage write uses the service role — the level-thumbnails bucket has just a
// SELECT policy (migration 20260509180000), so no user token can write to it.
// ADR-004's "no service_role in /api/v1/" is about access control staying in
// RLS; that still holds. See lib/thumbnail/publish.ts.

// 1 MB, matching the bucket's file_size_limit. Rejecting here gives a readable
// error instead of a storage-layer failure halfway through publish.
const MAX_BYTES = 1_048_576;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const ctx = await v1Context(req);
  if (!ctx.ok) return ctx.response;
  const guest = rejectGuest(ctx.user);
  if (guest) return guest;

  // Resolve the storage key the same way publish does: for a fork it's the
  // parent id, so the published level's existing thumbnail URL stays valid.
  // The select runs under RLS — a level the caller can't see yields no row.
  const { data: level, error: readErr } = await ctx.supabase
    .from("levels")
    .select("id, parent_id, creator_id")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return fail(500, readErr.message, "server_error");
  if (!level) return notFoundOrForbidden();
  // Readable-but-not-writable is possible (any published level is readable),
  // so ownership needs its own check — RLS would have blocked a write, but
  // this route's write goes through the service role.
  if (level.creator_id !== ctx.user.id) return notFoundOrForbidden();

  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.byteLength === 0) {
    return fail(400, "Body must be the raw PNG bytes.", "bad_request");
  }
  if (bytes.byteLength > MAX_BYTES) {
    return fail(
      400,
      `Thumbnail is too large (${bytes.byteLength} bytes, limit ${MAX_BYTES}).`,
      "bad_request",
    );
  }
  if (!PNG_MAGIC.every((b, i) => bytes[i] === b)) {
    return fail(400, "Body must be a PNG image.", "bad_request");
  }

  const publicId = (level.parent_id as string | null) ?? id;
  let url: string;
  try {
    url = await uploadLevelThumbnail(publicId, bytes);
  } catch (err) {
    return fail(
      500,
      `Could not store thumbnail: ${(err as Error).message}`,
      "thumbnail_failed",
    );
  }

  // Write the URL onto the caller's own row (the draft or fork). Publish
  // carries it to the parent during a swap. RLS scopes this to the owner.
  const { error: updErr } = await ctx.supabase
    .from("levels")
    .update({ thumbnail_url: url })
    .eq("id", id);
  if (updErr) return fail(500, updErr.message, "server_error");

  return ok({ thumbnail_url: url });
}
