import { createClient } from "@/lib/supabase/server";

export type CreatorRow = {
  username: string;
  createdAt: string;
  levelCount: number;
  totalPlays: number;
  totalLikes: number;
  /** Aggregated across all the creator's published levels. Average is
   *  ratingSum/ratingCount when ratingCount > 0; "no ratings" otherwise. */
  ratingSum: number;
  ratingCount: number;
};

type Row = {
  username: string;
  created_at: string;
  level_count: number;
  total_plays: number;
  total_likes: number;
  rating_sum: number;
  rating_count: number;
};

// All creators with at least one published level, sorted by total plays.
// Powers the /creators page. Nothing links there any more — the homepage row
// that did (`InfoRow`) was deleted with the Ricochet-era homepage on
// 2026-08-17; the page itself still works by direct URL. Counts are
// cross-game, so it also over-reports now.
export async function getAllCreators(): Promise<CreatorRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("all_creators");
  if (error) {
    console.error("[all_creators]", error.message);
    return [];
  }
  return ((data as Row[] | null) ?? []).map((r) => ({
    username: r.username,
    createdAt: r.created_at,
    levelCount: Number(r.level_count),
    totalPlays: Number(r.total_plays),
    totalLikes: Number(r.total_likes),
    ratingSum: Number(r.rating_sum),
    ratingCount: Number(r.rating_count),
  }));
}
