import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_TITLE = "Untitled level";

// Minimal LevelData payload that satisfies the game's loader (validateLevel
// requires `pages[].tiles` non-empty + `pages[].spawn`). 18×30 grid with
// the bottom row of walls so the player has a floor to spawn on, and a
// straight-shot exit on the right edge of the same row. The author swaps
// these out as soon as they start building.
const BLANK_LEVEL_DATA = {
  id: "",
  name: DEFAULT_TITLE,
  exit: { page: 0, x: 28, y: 16 },
  pages: [
    {
      tiles: [
        ...Array(17).fill(".".repeat(30)),
        "W".repeat(30),
      ],
      spawn: { x: 1, y: 16 },
    },
  ],
};

// Server-component "Build Level" entry point. Hitting /ricochet/create
// creates a fresh draft owned by the current user and redirects to the
// editor — the user lands directly in the iframe with an empty grid,
// no intermediate "name your level" dialog. Title can be edited inline
// in the editor header.
//
// Note: each visit creates a row. Drafts are cheap, but a user who
// click-spams Build will accumulate Untitled drafts in their profile —
// trim them manually for now; cleanup automation is future work.
export default async function CreateLevelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/ricochet/create");
  }

  const { data, error } = await supabase
    .from("levels")
    .insert({
      creator_id: user.id,
      game_type: "ricochet",
      title: DEFAULT_TITLE,
      data: BLANK_LEVEL_DATA,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    // Bubble a server error rather than half-silently dropping the user
    // back at the homepage. RLS or schema rejections should be rare; if
    // we hit one, the message tells us why.
    throw new Error(error?.message ?? "Could not create level.");
  }

  redirect(`/ricochet/edit/${data.id}`);
}
