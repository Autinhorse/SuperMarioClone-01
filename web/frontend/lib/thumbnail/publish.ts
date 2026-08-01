import "server-only";
import { renderLevelThumbnail } from "./render";
import { createServiceClient } from "@/lib/supabase/service";

const BUCKET = "level-thumbnails";

// Uploads an already-rendered PNG to the public bucket, keyed by level id.
// Returns the public URL the caller writes to levels.thumbnail_url. Replaces
// any existing image at the same key.
//
// Split out from publishLevelThumbnail so a second producer can reuse it: the
// desktop game client renders its own thumbnail (Godot levels can't be drawn
// on Vercel — see lib/thumbnail/render.ts, which needs @napi-rs/canvas plus
// Ricochet sprites on disk) and POSTs the bytes to
// /api/v1/levels/{id}/thumbnail, which lands here.
//
// ⚠️ service_role is required, not laziness: the level-thumbnails bucket has
// only a SELECT policy (migration 20260509180000), so no user token can write
// to it. ADR-004's "no service_role in /api/v1/" rule is about *access
// control* staying in RLS — the v1 route still verifies ownership with the
// caller's own token before calling this, exactly like the web path does.
export async function uploadLevelThumbnail(
  levelId: string,
  png: Buffer | Uint8Array,
): Promise<string> {
  const supabase = createServiceClient();
  const path = `${levelId}.png`;
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, png, {
      contentType: "image/png",
      cacheControl: "3600",
      upsert: true,
    });
  if (uploadErr) {
    throw new Error(`Thumbnail upload failed: ${uploadErr.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Cache-bust the public URL so a republish doesn't show the old
  // image until the CDN expires it. The upload's cacheControl: 3600
  // would otherwise hold the previous thumbnail for an hour.
  const sep = data.publicUrl.includes("?") ? "&" : "?";
  return `${data.publicUrl}${sep}v=${Date.now()}`;
}

// Renders a level's thumbnail and uploads it to the public bucket,
// keyed by level id. Returns the public URL the caller writes to
// levels.thumbnail_url. Replaces any existing image at the same key.
//
// Wraps render + upload so the publish API has a single call, and the
// backfill script reuses the exact same path. Throws on render or
// upload failure — the caller should treat that as a publish failure
// (no half-published level with a stale or missing thumbnail).
export async function publishLevelThumbnail(
  levelId: string,
  levelData: unknown,
): Promise<string> {
  const png = await renderLevelThumbnail(levelData);
  return uploadLevelThumbnail(levelId, png);
}
