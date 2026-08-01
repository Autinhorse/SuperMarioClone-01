import { createClient } from "@/lib/supabase/server";

export type LevelDetail = {
  id: string;
  gameType: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "removed";
  likeCount: number;
  playCount: number;
  /** Denormalized rating aggregates kept in sync by the
   *  ratings_adjust_level trigger. Average = sum / count when count > 0. */
  ratingSum: number;
  ratingCount: number;
  /** Current viewer's own rating for this level, or null if they haven't
   *  rated (or aren't signed in). Used to seed the RatingWidget so its
   *  star fill / "click again to clear" hint reflect server state. */
  viewerRating: number | null;
  createdAt: string;
  publishedAt: string | null;
  /** Playtest gate: true iff the level has not been cleared since its
   *  last data write (or has never been cleared). PUT /api/levels/[id]
   *  resets last_cleared_at to NULL on every data save; mark-cleared
   *  sets it back to a timestamp. The publish API enforces the same
   *  IS NOT NULL check server-side. */
  needsPlaytest: boolean;
  creatorUsername: string | null;
  creatorId: string;
  /** Public URL of the PNG thumbnail written at publish time. null when the
   *  level has never been published, or when rendering it failed (that step
   *  is deliberately non-fatal on both clients). */
  thumbnailUrl: string | null;
  /** Game-specific level payload. Opaque to the platform. */
  data: unknown;
};

type LevelRow = {
  id: string;
  game_type: string;
  creator_id: string;
  title: string;
  description: string | null;
  data: unknown;
  status: "draft" | "published" | "removed";
  like_count: number;
  play_count: number;
  rating_sum: number;
  rating_count: number;
  created_at: string;
  published_at: string | null;
  last_cleared_at: string | null;
  thumbnail_url: string | null;
  profiles: { username: string } | { username: string }[] | null;
};

export async function getLevel(id: string): Promise<LevelDetail | null> {
  const supabase = await createClient();
  const [{ data, error }, viewerRating] = await Promise.all([
    supabase
      .from("levels")
      .select(
        // Explicit FK name disambiguates the join — there are two paths from
        // levels to profiles (direct creator FK + m2m via likes).
        "id, game_type, creator_id, title, description, data, status, like_count, play_count, rating_sum, rating_count, created_at, published_at, last_cleared_at, thumbnail_url, profiles!levels_creator_id_fkey(username)",
      )
      .eq("id", id)
      .maybeSingle(),
    fetchViewerRating(supabase, id),
  ]);
  // Surface errors to the dev-server log instead of silently returning
  // null — that path looks identical to "not found" downstream and
  // produces hard-to-diagnose 404s when a column is missing or RLS
  // blocks the read.
  if (error) {
    console.error(`[getLevel ${id}]`, error.message);
  }
  if (!data) return null;
  const row = data as LevelRow;
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    gameType: row.game_type,
    title: row.title,
    description: row.description,
    status: row.status,
    likeCount: row.like_count,
    playCount: row.play_count,
    ratingSum: row.rating_sum,
    ratingCount: row.rating_count,
    viewerRating,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    needsPlaytest: row.last_cleared_at === null,
    creatorUsername: profile?.username ?? null,
    creatorId: row.creator_id,
    thumbnailUrl: row.thumbnail_url,
    data: row.data,
  };
}

// Returns the current viewer's existing 1–5 rating for the level, or
// null if they're not signed in / haven't rated yet. Runs in parallel
// with the main level select to keep the play page's TTFB snappy.
async function fetchViewerRating(
  supabase: Awaited<ReturnType<typeof createClient>>,
  levelId: string,
): Promise<number | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("ratings")
    .select("value")
    .eq("level_id", levelId)
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.value ?? null;
}
