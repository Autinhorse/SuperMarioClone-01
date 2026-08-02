import { v1Context } from "@/lib/api/v1";
import { ok, fail } from "@/lib/api/respond";
import { GAME_SLUGS, isGameSlug } from "@/lib/games";

type LevelRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  game_type: string;
  format_version: number;
  parent_id: string | null;
  thumbnail_url: string | null;
  play_count: number;
  like_count: number;
  rating_sum: number;
  rating_count: number;
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
//
// `?game_type=` narrows to one game. **A client should almost always pass it**:
// levels of every game share one table, so without it the Origin desktop app
// listed the author's Ricochet levels too — and opening one produced an empty
// level rather than an error, because the payload shapes are unrelated.
// The default stays "everything" so this endpoint is still a straight answer to
// "what have I made", for a caller that wants that.
export async function GET(req: Request) {
  const ctx = await v1Context(req);
  if (!ctx.ok) return ctx.response;

  const gameType = new URL(req.url).searchParams.get("game_type");
  if (gameType !== null && !isGameSlug(gameType)) {
    return fail(
      400,
      `Unknown game_type "${gameType}". Expected one of: ${GAME_SLUGS.join(", ")}.`,
      "bad_request",
    );
  }

  let query = ctx.supabase
    .from("levels")
    .select(
      // description + rating aggregates are here for the client's level-detail
      // panel. Still no `data` — listing never needs the payload (that's
      // GET /api/v1/levels/{id}), and a library of them would be megabytes.
      "id, title, description, status, game_type, format_version, parent_id, " +
        "thumbnail_url, play_count, like_count, rating_sum, rating_count, updated_at",
    )
    .eq("creator_id", ctx.user.id);
  if (gameType !== null) query = query.eq("game_type", gameType);

  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) return fail(500, error.message, "server_error");
  // 拼接出来的 select 字符串会打断 supabase-js 的类型推断（它靠字面量解析列名）
  // → 和 browse 路由一样经 unknown 转一次。
  return ok({ levels: (data ?? []) as unknown as LevelRow[] });
}
