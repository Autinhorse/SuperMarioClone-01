import { createClient } from "@/lib/supabase/server";
import type { FeaturedLevel } from "@/lib/homepage";
import { extractPreviewPage } from "@/lib/level-preview";
import { publishedLevels } from "@/lib/levels/browse";

type Row = {
  id: string;
  game_type: string;
  title: string;
  like_count: number;
  play_count: number;
  rating_sum: number;
  rating_count: number;
  data: unknown;
  thumbnail_url: string | null;
  profiles: { username: string } | { username: string }[] | null;
};

/**
 * All published levels, freshest first. Capped at `limit` for now (no
 * pagination yet — bump as needed; introduce a paged fetcher when the
 * library outgrows a single page).
 *
 * `gameType` narrows to one game — that's what each game's hub page uses to
 * show "levels built with this game". Omit it for the cross-game /explore feed.
 */
export async function getAllPublishedLevels(
  limit = 50,
  gameType?: string,
): Promise<FeaturedLevel[]> {
  const supabase = await createClient();
  // Same predicate the browse API uses — see lib/levels/browse.ts for why both
  // conditions are needed even with RLS in place.
  let query = publishedLevels(
    supabase,
    "id, game_type, title, like_count, play_count, rating_sum, rating_count, data, thumbnail_url, profiles!levels_creator_id_fkey(username)",
  );
  if (gameType) query = query.eq("game_type", gameType);
  const { data, error } = await query
    .order("published_at", { ascending: false })
    .limit(limit);

  // Same pattern as lib/homepage.ts — surface errors to the dev log so
  // a missing column doesn't silently render the page as "no levels".
  if (error) {
    console.error("[explore]", error.message);
  }

  return ((data as Row[] | null) ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      gameType: row.game_type,
      title: row.title,
      creatorUsername: profile?.username ?? null,
      likeCount: row.like_count,
      playCount: row.play_count,
      ratingSum: row.rating_sum,
      ratingCount: row.rating_count,
      previewPage: extractPreviewPage(row.data),
      thumbnailUrl: row.thumbnail_url,
    };
  });
}
