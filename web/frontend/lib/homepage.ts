import { createClient } from "@/lib/supabase/server";
import { extractPreviewPage, type PreviewPage } from "@/lib/level-preview";

export type HomepageStats = {
  levelsCount: number;
  usersCount: number;
  totalPlays: number;
  dailyCreators: number;
};

export type FeaturedLevel = {
  id: string;
  title: string;
  creatorUsername: string | null;
  likeCount: number;
  playCount: number;
  /** Denormalized rating aggregates (sum + count). Average is sum/count
   *  when count > 0; cards hide the rating row entirely when count=0
   *  so a brand-new level doesn't show "0.0 / 5". */
  ratingSum: number;
  ratingCount: number;
  /** Page-0 slice of `levels.data`. Used as the SVG thumbnail fallback
   *  when thumbnailUrl is null (drafts, or rows from before the PNG
   *  pipeline shipped). null = malformed level → empty texture. */
  previewPage: PreviewPage | null;
  /** Public URL of the rendered PNG thumbnail, written by the publish
   *  API on each draft→published transition. null = no PNG yet, fall
   *  back to the inline SVG. */
  thumbnailUrl: string | null;
};

export type TopCreator = {
  username: string;
  totalPlays: number;
  levelCount: number;
};

export type HomepageData = {
  stats: HomepageStats;
  featured: FeaturedLevel[];
  /** Most-recently-published levels regardless of featured flag.
   *  Same row shape as `featured` so the card UI can be reused. */
  latest: FeaturedLevel[];
  topCreators: TopCreator[];
};

const DEFAULT_STATS: HomepageStats = {
  levelsCount: 0,
  usersCount: 0,
  totalPlays: 0,
  dailyCreators: 0,
};

type FeaturedRow = {
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

type TopCreatorRow = {
  username: string;
  total_plays: number;
  level_count: number;
};

export async function getHomepageData(): Promise<HomepageData> {
  const supabase = await createClient();

  const [statsRes, featuredRes, latestRes, topRes] = await Promise.all([
    supabase.rpc("homepage_stats"),
    supabase
      .from("levels")
      // Explicit FK name disambiguates the join — there are two paths from
      // levels to profiles (direct creator FK + m2m via likes).
      // `parent_id is null` is redundant given the forks_must_be_draft
      // CHECK + status filter, but spelled out so a reader doesn't have
      // to chase the constraint to know forks are excluded.
      .select("id, title, like_count, play_count, rating_sum, rating_count, data, thumbnail_url, profiles!levels_creator_id_fkey(username)")
      .eq("status", "published")
      .is("parent_id", null)
      .eq("is_featured", true)
      .order("published_at", { ascending: false })
      .limit(5),
    // "Latest" — every published level, freshest first. Featured-or-not
    // doesn't matter here; it's the chronological newcomer feed.
    supabase
      .from("levels")
      .select("id, title, like_count, play_count, rating_sum, rating_count, data, thumbnail_url, profiles!levels_creator_id_fkey(username)")
      .eq("status", "published")
      .is("parent_id", null)
      .order("published_at", { ascending: false })
      .limit(5),
    supabase.rpc("top_creators", { limit_count: 3 }),
  ]);

  // Surface query errors to the dev log — without this they're swallowed
  // and the four lists silently come back empty (e.g. a missing column
  // makes the whole select fail, which looks identical to "no levels").
  for (const [name, res] of [
    ["homepage_stats", statsRes],
    ["featured", featuredRes],
    ["latest", latestRes],
    ["top_creators", topRes],
  ] as const) {
    if (res.error) console.error(`[homepage ${name}]`, res.error.message);
  }

  const statsData = statsRes.data as Record<string, number> | null;
  const stats: HomepageStats = statsData
    ? {
        levelsCount: Number(statsData.levels_count ?? 0),
        usersCount: Number(statsData.users_count ?? 0),
        totalPlays: Number(statsData.total_plays ?? 0),
        dailyCreators: Number(statsData.daily_creators ?? 0),
      }
    : DEFAULT_STATS;

  const mapRow = (row: FeaturedRow): FeaturedLevel => {
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
  };
  const featured: FeaturedLevel[] = ((featuredRes.data as FeaturedRow[] | null) ?? []).map(mapRow);
  const latest: FeaturedLevel[] = ((latestRes.data as FeaturedRow[] | null) ?? []).map(mapRow);

  const topCreators: TopCreator[] = ((topRes.data as TopCreatorRow[] | null) ?? []).map((row) => ({
    username: row.username,
    totalPlays: Number(row.total_plays),
    levelCount: Number(row.level_count),
  }));

  return { stats, featured, latest, topCreators };
}
