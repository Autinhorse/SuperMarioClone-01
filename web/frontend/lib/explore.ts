import { createClient } from "@/lib/supabase/server";
import type { FeaturedLevel } from "@/lib/homepage";

type Row = {
  id: string;
  title: string;
  like_count: number;
  play_count: number;
  profiles: { username: string } | { username: string }[] | null;
};

/**
 * All published levels, freshest first. Capped at `limit` for now (no
 * pagination yet — bump as needed; introduce a paged fetcher when the
 * library outgrows a single page).
 */
export async function getAllPublishedLevels(limit = 50): Promise<FeaturedLevel[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("levels")
    .select("id, title, like_count, play_count, profiles!levels_creator_id_fkey(username)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  return ((data as Row[] | null) ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      title: row.title,
      creatorUsername: profile?.username ?? null,
      likeCount: row.like_count,
      playCount: row.play_count,
    };
  });
}
