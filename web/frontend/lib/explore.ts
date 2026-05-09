import { createClient } from "@/lib/supabase/server";
import type { FeaturedLevel } from "@/lib/homepage";
import { extractPreviewPage } from "@/lib/level-preview";

type Row = {
  id: string;
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
 */
export async function getAllPublishedLevels(limit = 50): Promise<FeaturedLevel[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("levels")
    .select("id, title, like_count, play_count, rating_sum, rating_count, data, thumbnail_url, profiles!levels_creator_id_fkey(username)")
    .eq("status", "published")
    // forks_must_be_draft + status filter already exclude forks; spelled
    // out for clarity so a future reader doesn't have to chase the CHECK.
    .is("parent_id", null)
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
