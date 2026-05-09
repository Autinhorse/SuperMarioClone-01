import "server-only";
import { renderLevelThumbnail } from "./render";
import { createServiceClient } from "@/lib/supabase/service";

const BUCKET = "level-thumbnails";

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
