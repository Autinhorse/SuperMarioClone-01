import { createClient } from "@/lib/supabase/server";
import { extractPreviewPage, type PreviewPage } from "@/lib/level-preview";

export type Profile = {
  id: string;
  username: string;
  createdAt: string;
};

export type ProfileLevel = {
  id: string;
  gameType: string;
  title: string;
  status: "draft" | "published" | "removed";
  isFeatured: boolean;
  likeCount: number;
  playCount: number;
  ratingSum: number;
  ratingCount: number;
  publishedAt: string | null;
  createdAt: string;
  previewPage: PreviewPage | null;
  thumbnailUrl: string | null;
  /** Set when this row is a revision-swap fork (a draft cloned from a
   *  published level). Identifies the parent so the profile card can
   *  show "Editing: {parentTitle}" — both rows usually share the same
   *  title, so without this label drafts and forks look identical. */
  parentId: string | null;
  parentTitle: string | null;
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
  // Self-join on parent_id pulls the parent row's title in one query —
  // null when this row isn't a fork. The relationship name `parent` is
  // the column name; supabase-js infers the join from the FK.
  const { data } = await supabase
    .from("levels")
    .select(
      "id, game_type, title, status, is_featured, like_count, play_count, rating_sum, rating_count, published_at, created_at, data, thumbnail_url, parent_id, parent:parent_id(title)",
    )
    .eq("creator_id", creatorId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    const parent = Array.isArray(row.parent) ? row.parent[0] : row.parent;
    return {
      id: row.id,
      gameType: row.game_type,
      title: row.title,
      status: row.status as ProfileLevel["status"],
      isFeatured: row.is_featured,
      likeCount: row.like_count,
      playCount: row.play_count,
      ratingSum: row.rating_sum,
      ratingCount: row.rating_count,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      previewPage: extractPreviewPage(row.data),
      thumbnailUrl: row.thumbnail_url,
      parentId: row.parent_id,
      parentTitle: parent?.title ?? null,
    };
  });
}
