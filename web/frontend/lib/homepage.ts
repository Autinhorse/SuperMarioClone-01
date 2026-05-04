import { createClient } from "@/lib/supabase/server";

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
};

export type TopCreator = {
  username: string;
  totalPlays: number;
  levelCount: number;
};

export type HomepageData = {
  stats: HomepageStats;
  featured: FeaturedLevel[];
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
  profiles: { username: string } | { username: string }[] | null;
};

type TopCreatorRow = {
  username: string;
  total_plays: number;
  level_count: number;
};

export async function getHomepageData(): Promise<HomepageData> {
  const supabase = await createClient();

  const [statsRes, featuredRes, topRes] = await Promise.all([
    supabase.rpc("homepage_stats"),
    supabase
      .from("levels")
      // Explicit FK name disambiguates the join — there are two paths from
      // levels to profiles (direct creator FK + m2m via likes).
      .select("id, title, like_count, play_count, profiles!levels_creator_id_fkey(username)")
      .eq("status", "published")
      .eq("is_featured", true)
      .order("published_at", { ascending: false })
      .limit(5),
    supabase.rpc("top_creators", { limit_count: 3 }),
  ]);

  const statsData = statsRes.data as Record<string, number> | null;
  const stats: HomepageStats = statsData
    ? {
        levelsCount: Number(statsData.levels_count ?? 0),
        usersCount: Number(statsData.users_count ?? 0),
        totalPlays: Number(statsData.total_plays ?? 0),
        dailyCreators: Number(statsData.daily_creators ?? 0),
      }
    : DEFAULT_STATS;

  const featured: FeaturedLevel[] = ((featuredRes.data as FeaturedRow[] | null) ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      title: row.title,
      creatorUsername: profile?.username ?? null,
      likeCount: row.like_count,
      playCount: row.play_count,
    };
  });

  const topCreators: TopCreator[] = ((topRes.data as TopCreatorRow[] | null) ?? []).map((row) => ({
    username: row.username,
    totalPlays: Number(row.total_plays),
    levelCount: Number(row.level_count),
  }));

  return { stats, featured, topCreators };
}
