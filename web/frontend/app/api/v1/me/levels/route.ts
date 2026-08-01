import { v1Context } from "@/lib/api/v1";
import { ok, fail } from "@/lib/api/respond";

type LevelRow = {
  id: string;
  title: string;
  status: string;
  game_type: string;
  format_version: number;
  parent_id: string | null;
  thumbnail_url: string | null;
  play_count: number;
  like_count: number;
  updated_at: string;
};

// GET /api/v1/me/levels — the caller's own levels, drafts included.
//
// Deliberately not a general browse endpoint: "my levels" needs no search,
// no sort options and no pagination story to be useful, whereas browsing other
// people's work needs all three. That lands with the browse batch.
//
// Scoped by RLS via `creator_id = auth.uid()`; the explicit filter is there so
// an accidental policy loosening doesn't silently turn this into "everyone's
// levels".
export async function GET(req: Request) {
  const ctx = await v1Context(req);
  if (!ctx.ok) return ctx.response;

  const { data, error } = await ctx.supabase
    .from("levels")
    .select(
      "id, title, status, game_type, format_version, parent_id, thumbnail_url, play_count, like_count, updated_at",
    )
    .eq("creator_id", ctx.user.id)
    .order("updated_at", { ascending: false });

  if (error) return fail(500, error.message, "server_error");
  return ok({ levels: (data ?? []) as LevelRow[] });
}
