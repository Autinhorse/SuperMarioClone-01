// The one place that knows what games exist on this platform.
//
// `levels.game_type` is a free-form text column (all games share one table;
// see migration 20260503130000) and the v1 API takes it straight from the
// client — so anything that turns a row into a URL has to go through here
// rather than hardcoding `/ricochet/...`. Before this module existed, every
// level card linked to `/ricochet/play/{id}`, which meant a level published
// from the Origin desktop app showed up on /explore with a link that 404s.

export const GAME_SLUGS = ["ricochet", "origin"] as const;
export type GameSlug = (typeof GAME_SLUGS)[number];

export type GameInfo = {
  slug: GameSlug;
  name: string;
  tagline: string;
  /** Can a level of this game be played right here in the browser?
   *  Ricochet ships a Phaser build under /public/games; Origin ships a Godot
   *  Web export under /public/origin-web (since 2026-08-03), mounted on click
   *  by `OriginPlayFrame` so the level page still renders as a page first. */
  playableInBrowser: boolean;
  /** Does this game have an **editor route on the website** (`/{game}/edit/{id}`)?
   *
   *  False for Origin, and deliberately so — not a missing feature. Origin's
   *  web build is the same client as the desktop one and owns its own editor,
   *  publish dialog and level library (ADR-005 decision 3); reimplementing any
   *  of that as React pages would be the second implementation that ADR exists
   *  to prevent. Origin authors edit inside the game, reached via
   *  `/origin/web?mode=edit`. */
  editableInBrowser: boolean;
};

export const GAMES: Record<GameSlug, GameInfo> = {
  ricochet: {
    slug: "ricochet",
    name: "Ricochet",
    tagline: "Bounce. Aim. Escape. Use angles and timing to reach the goal!",
    playableInBrowser: true,
    editableInBrowser: true,
  },
  origin: {
    slug: "origin",
    name: "LevelCraft Origin",
    tagline:
      "A 2D platformer creation engine. Play and build right in the browser, or get the desktop app for the full version.",
    playableInBrowser: true,
    editableInBrowser: false, // by design — see the field comment
  },
};

export function isGameSlug(value: string): value is GameSlug {
  return (GAME_SLUGS as readonly string[]).includes(value);
}

export function gameInfo(gameType: string): GameInfo | null {
  return isGameSlug(gameType) ? GAMES[gameType] : null;
}

/**
 * Where a level card should point. Returns null for a `game_type` this build
 * doesn't know about — callers render a non-clickable card rather than a link
 * that 404s. (Nothing creates unknown types today; the v1 API rejects them.
 * This is here so an older deploy meeting a newer game degrades quietly.)
 */
export function levelHref(gameType: string, id: string): string | null {
  return isGameSlug(gameType) ? `/${gameType}/play/${id}` : null;
}

/** Where the owner edits a level, or null when this game has no web editor. */
export function editHref(gameType: string, id: string): string | null {
  const info = gameInfo(gameType);
  return info?.editableInBrowser ? `/${info.slug}/edit/${id}` : null;
}
