import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  username: string;
  createdAt: string;
};

export type ProfileLevel = {
  id: string;
  title: string;
  status: "draft" | "published" | "removed";
  isFeatured: boolean;
  likeCount: number;
  playCount: number;
  publishedAt: string | null;
  createdAt: string;
};

export async function getProfile(username: string): Promise<Profile | null> {
  const supabase = await createClient();
  // ilike → case-insensitive match. Usernames are alphanumeric+underscore only
  // (CHECK constraint), so no LIKE wildcards to escape.
  const { data } = await supabase
    .from("profiles")
    .select("id, username, created_at")
    .ilike("username", username)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    username: data.username,
    createdAt: data.created_at,
  };
}

/**
 * Returns levels owned by the given user. RLS policies determine visibility:
 * - When the authenticated viewer == creator: returns all statuses (drafts included)
 * - Otherwise: returns only published levels
 *
 * The same query body, different results — the database handles authorization.
 */
export async function getProfileLevels(creatorId: string): Promise<ProfileLevel[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("levels")
    .select("id, title, status, is_featured, like_count, play_count, published_at, created_at")
    .eq("creator_id", creatorId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status as ProfileLevel["status"],
    isFeatured: row.is_featured,
    likeCount: row.like_count,
    playCount: row.play_count,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  }));
}
