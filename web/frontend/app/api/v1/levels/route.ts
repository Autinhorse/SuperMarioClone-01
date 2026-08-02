import { revalidatePath } from "next/cache";
import { v1Context, v1OpenContext, rejectGuest } from "@/lib/api/v1";
import { ok, fail } from "@/lib/api/respond";
import { createLevel, readDescription } from "@/lib/levels/mutations";
import {
  applyBrowseSort,
  escapeLikePattern,
  isBrowseSort,
  publishedLevels,
  BROWSE_SORTS,
} from "@/lib/levels/browse";
import { GAME_SLUGS, isGameSlug } from "@/lib/games";

/** Rows per page. `DEFAULT` fills a typical grid; `MAX` is a ceiling so one
 *  request can't ask for the whole library. */
const PAGE_SIZE_DEFAULT = 24;
const PAGE_SIZE_MAX = 50;
/** Longer search terms are pointless against a 100-char title column, and an
 *  unbounded string here becomes an unbounded LIKE pattern. */
const QUERY_MAX_LEN = 100;

// Columns browse returns. **`data` is deliberately absent** — level payloads
// are the largest thing in the table and a 24-row page of them would be
// megabytes. Downloading a level is `GET /api/v1/levels/{id}`.
const BROWSE_SELECT =
  "id, title, description, game_type, format_version, thumbnail_url, " +
  "play_count, like_count, rating_sum, rating_count, published_at, " +
  "profiles!levels_creator_id_fkey(username)";

type BrowseRow = {
  id: string;
  title: string;
  description: string | null;
  game_type: string;
  format_version: number;
  thumbnail_url: string | null;
  play_count: number;
  like_count: number;
  rating_sum: number;
  rating_count: number;
  published_at: string | null;
  profiles: { username: string } | { username: string }[] | null;
};

// GET /api/v1/levels — browse published levels (ADR-004 §2).
//
// **Anonymous-friendly**: published levels are public, and requiring a session
// to look at them would mean the game has to mint a guest just to open its
// level browser — exactly the network-on-startup that ADR-003's lazy guest
// minting avoids.
//
// Query params (all optional):
//   q           search titles, case-insensitive substring
//   game_type   'ricochet' | 'origin'  (unknown → 400, same as POST)
//   sort        'new' (default) | 'plays' | 'likes'
//   page        1-based, default 1
//   page_size   default 24, capped at 50
//   max_format  hide levels this client couldn't open (ADR-004 §5)
//
// `format_version` is returned on **every** row regardless of `max_format`, so
// a client that would rather grey out an unplayable level than have it vanish
// can do that without a second request. Filtering is opt-in; flagging is free.
//
// Paging asks for one row more than it returns and trims it — that yields
// `has_more` without a second `count` query over a growing table.
export async function GET(req: Request) {
  const ctx = await v1OpenContext(req);
  if (!ctx.ok) return ctx.response;

  const params = new URL(req.url).searchParams;

  const sortRaw = params.get("sort") ?? "new";
  if (!isBrowseSort(sortRaw)) {
    return fail(
      400,
      `Unknown sort "${sortRaw}". Expected one of: ${BROWSE_SORTS.join(", ")}.`,
      "bad_request",
    );
  }

  const gameType = params.get("game_type");
  if (gameType !== null && !isGameSlug(gameType)) {
    return fail(
      400,
      `Unknown game_type "${gameType}". Expected one of: ${GAME_SLUGS.join(", ")}.`,
      "bad_request",
    );
  }

  const page = positiveInt(params.get("page"), 1);
  const pageSize = Math.min(
    positiveInt(params.get("page_size"), PAGE_SIZE_DEFAULT),
    PAGE_SIZE_MAX,
  );

  const maxFormatRaw = params.get("max_format");
  let maxFormat: number | null = null;
  if (maxFormatRaw !== null) {
    const n = Number.parseInt(maxFormatRaw, 10);
    if (!Number.isFinite(n) || n < 1) {
      return fail(400, "max_format must be a positive integer.", "bad_request");
    }
    maxFormat = n;
  }

  let query = publishedLevels(ctx.supabase, BROWSE_SELECT);

  const q = (params.get("q") ?? "").trim().slice(0, QUERY_MAX_LEN);
  if (q !== "") query = query.ilike("title", `%${escapeLikePattern(q)}%`);
  if (gameType !== null) query = query.eq("game_type", gameType);
  if (maxFormat !== null) query = query.lte("format_version", maxFormat);

  query = applyBrowseSort(query, sortRaw);
  // Tie-break on id so paging is stable: `published_at` can repeat (seeded
  // rows, bulk publishes) and without a deterministic second key the same
  // level can appear on two pages or on none.
  query = query.order("id", { ascending: true });

  const from = (page - 1) * pageSize;
  const { data, error } = await query.range(from, from + pageSize);
  if (error) return fail(500, error.message, "server_error");

  const rows = (data ?? []) as unknown as BrowseRow[];
  const hasMore = rows.length > pageSize;

  return ok({
    levels: rows.slice(0, pageSize).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        game_type: row.game_type,
        format_version: row.format_version,
        thumbnail_url: row.thumbnail_url,
        play_count: row.play_count,
        like_count: row.like_count,
        rating_sum: row.rating_sum,
        rating_count: row.rating_count,
        published_at: row.published_at,
        creator_username: profile?.username ?? null,
      };
    }),
    page,
    page_size: pageSize,
    has_more: hasMore,
  });
}

/** Parse a positive integer param, falling back on anything unusable.
 *  A bad `page` shouldn't 400 — it should behave like no page at all. */
function positiveInt(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

// POST /api/v1/levels — create a draft owned by the caller.
//
// The bearer-authenticated twin of GET /ricochet/create (which redirects a
// browser into the editor). Both go through lib/levels/mutations.ts:createLevel;
// what differs is only the shell — this one returns JSON `{id}` because a
// native client has nowhere to be redirected to.
//
// `data` is opaque here: the platform stores level JSON and never parses it
// (web/CLAUDE.md). Validation is the game's job — it owns the schema.
export async function POST(req: Request) {
  const ctx = await v1Context(req);
  if (!ctx.ok) return ctx.response;
  const guest = rejectGuest(ctx.user);
  if (guest) return guest;

  const body = (await req.json().catch(() => null)) as {
    title?: unknown;
    data?: unknown;
    description?: unknown;
    game_type?: unknown;
    format_version?: unknown;
  } | null;
  if (!body || typeof body.data !== "object" || body.data === null) {
    return fail(400, "Body must include {data: <level json object>}.", "bad_request");
  }

  const title =
    typeof body.title === "string" && body.title.trim() !== ""
      ? body.title.trim()
      : "Untitled level";
  // Mirrors the levels.title CHECK constraint (1..100) so the caller gets a
  // readable 400 instead of a Postgres error.
  if (title.length > 100) {
    return fail(400, "Title must be 1–100 characters.", "bad_request");
  }

  // `game_type` decides which set of website routes a level lives under, so
  // an unrecognised value produces a row nothing on the site can render or
  // link to. Rejecting here is cheaper than discovering it later as a card
  // whose link 404s. Origin is the default because this API exists for the
  // desktop client; browser flows pass their own type explicitly.
  let description: string | null | undefined;
  if (body.description !== undefined) {
    const d = readDescription(body.description);
    if (!d.ok) return fail(400, d.error, "bad_request");
    description = d.value;
  }

  const gameType =
    typeof body.game_type === "string" && body.game_type !== ""
      ? body.game_type
      : "origin";
  if (!isGameSlug(gameType)) {
    return fail(
      400,
      `Unknown game_type "${gameType}". Expected one of: ${GAME_SLUGS.join(", ")}.`,
      "bad_request",
    );
  }

  const formatVersion =
    typeof body.format_version === "number" &&
    Number.isInteger(body.format_version)
      ? body.format_version
      : undefined;

  const result = await createLevel(ctx.supabase, {
    creatorId: ctx.user.id,
    gameType,
    title,
    data: body.data,
    description,
    formatVersion,
  });
  if (!result.ok) return fail(result.status, result.error, "server_error");

  // A new draft shows up on the author's profile.
  revalidatePath("/u/[username]", "page");

  return ok({ id: result.value.id });
}
