import { revalidatePath } from "next/cache";
import { v1Context, rejectGuest } from "@/lib/api/v1";
import { ok, fail } from "@/lib/api/respond";
import { createLevel } from "@/lib/levels/mutations";
import { GAME_SLUGS, isGameSlug } from "@/lib/games";

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
    formatVersion,
  });
  if (!result.ok) return fail(result.status, result.error, "server_error");

  // A new draft shows up on the author's profile.
  revalidatePath("/u/[username]", "page");

  return ok({ id: result.value.id });
}
