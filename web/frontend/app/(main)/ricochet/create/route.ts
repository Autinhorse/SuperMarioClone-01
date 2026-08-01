import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createLevel } from "@/lib/levels/mutations";

const DEFAULT_TITLE = "Untitled level";

// Minimal LevelData payload that satisfies the game's loader
// (validateLevel requires `pages[].tiles` non-empty + `pages[].spawn`).
// 18×30 grid with the bottom row of walls so the player has a floor to
// spawn on, and a straight-shot exit on the right edge of the same row.
// The author swaps these out as soon as they start building.
const BLANK_LEVEL_DATA = {
  id: "",
  name: DEFAULT_TITLE,
  exit: { page: 0, x: 28, y: 16 },
  pages: [
    {
      tiles: [...Array(17).fill(".".repeat(30)), "W".repeat(30)],
      spawn: { x: 1, y: 16 },
    },
  ],
};

// "Build Level" entry point as a Route Handler rather than a Server
// Component page. Hitting GET /ricochet/create (e.g. via the homepage
// Build button — a regular <Link>) creates a fresh draft owned by the
// caller and redirects to the editor. The author lands directly in
// the iframe with an empty grid; the title is editable inline in the
// editor header.
//
// Why a Route Handler: revalidatePath is forbidden during Server
// Component renders (Next.js 16 raised this from a warning to an
// error), and we need it to invalidate the user's profile page so the
// router cache doesn't show the pre-create snapshot when the user
// navigates back. Route Handlers explicitly support the call.
//
// Note: each visit creates a row. Drafts are cheap, but a user who
// click-spams Build will accumulate Untitled drafts in their profile —
// trim them manually for now; cleanup automation is future work.
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/ricochet/create", req.url),
    );
  }

  // The insert lives in lib/levels/mutations.ts:createLevel — shared with
  // POST /api/v1/levels. What stays here is the browser-specific part:
  // revalidatePath and the 302 into the editor.
  const result = await createLevel(supabase, {
    creatorId: user.id,
    gameType: "ricochet",
    title: DEFAULT_TITLE,
    data: BLANK_LEVEL_DATA,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  revalidatePath("/u/[username]", "page");

  return NextResponse.redirect(
    new URL(`/ricochet/edit/${result.value.id}`, req.url),
  );
}
