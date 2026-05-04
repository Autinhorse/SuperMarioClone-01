import { createClient } from "@/lib/supabase/server";

export type LevelDetail = {
  id: string;
  gameType: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "removed";
  likeCount: number;
  playCount: number;
  createdAt: string;
  publishedAt: string | null;
  creatorUsername: string | null;
  creatorId: string;
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
  created_at: string;
  published_at: string | null;
  profiles: { username: string } | { username: string }[] | null;
};

export async function getLevel(id: string): Promise<LevelDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("levels")
    .select(
      // Explicit FK name disambiguates the join — there are two paths from
      // levels to profiles (direct creator FK + m2m via likes).
      "id, game_type, creator_id, title, description, data, status, like_count, play_count, created_at, published_at, profiles!levels_creator_id_fkey(username)",
    )
    .eq("id", id)
    .maybeSingle();
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
    createdAt: row.created_at,
    publishedAt: row.published_at,
    creatorUsername: profile?.username ?? null,
    creatorId: row.creator_id,
    data: row.data,
  };
}
