import catalog from "@/data/arcade-catalog.json";

// Arcade = the levels that ship **inside the game**, not user creations.
// Two jobs: teach the mechanics, and keep there being something to play when
// player-made levels are thin on the ground.
//
// **The level data is not here and never will be.** It's bundled in the Godot
// build (`res://levels/arcade/<slug>.lvl`) — so pressing Play is a zero-download,
// works-offline, version-always-matches affair. What the website needs is only
// the *catalog*: what exists, in what order, and a picture of each.
//
// Source of truth is `ui/arcade/arcade_catalog.tres` in the game repo;
// `test/tools/make_arcade_bundle.gd` regenerates `data/arcade-catalog.json`
// plus `public/origin-arcade/<slug>.png`. **Do not hand-edit either** — add the
// level to the .tres, re-run the tool, copy the output over.

export type ArcadeLevel = {
  slug: string;
  title: string;
  thumbnail: string;
};

export type ArcadeCategory = {
  id: string;
  title: string;
  levels: ArcadeLevel[];
};

type Catalog = { version: number; categories: ArcadeCategory[] };

/** Bumped by the generator when the JSON shape changes. Refusing to read a
 *  newer shape beats silently rendering half of it. */
const SUPPORTED_VERSION = 1;

const data = catalog as Catalog;

export function arcadeCategories(): ArcadeCategory[] {
  if (data.version !== SUPPORTED_VERSION) {
    console.error(
      `[arcade] catalog version ${data.version} != supported ${SUPPORTED_VERSION} — regenerate or update lib/arcade.ts`,
    );
    return [];
  }
  return data.categories;
}

export function arcadeLevels(): ArcadeLevel[] {
  return arcadeCategories().flatMap((c) => c.levels);
}

export function arcadeLevelCount(): number {
  return arcadeLevels().length;
}

/** Where a thumbnail lives once copied into public/. */
export function arcadeThumbHref(level: ArcadeLevel): string {
  return `/origin-arcade/${level.thumbnail}`;
}

/** Launch URL: the game reads `?arcade=<slug>` itself (`Main.deep_link_arcade_slug`)
 *  and goes straight into the level, skipping its own front page.
 *
 *  Deliberately **not** the same shape as a community level (`?level=<id>`):
 *  that one is a cloud id and needs a download. Keeping them separate is what
 *  lets Arcade be instant and offline-capable. */
export function arcadePlayHref(slug: string): string {
  return `/origin/web?arcade=${encodeURIComponent(slug)}`;
}
