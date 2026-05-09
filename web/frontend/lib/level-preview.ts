// Minimal slice of the game's LevelData shape — only the pieces needed
// to render a thumbnail of page 0. Mirrors `games/ricochet/src/shared/
// level-format/types.ts` but the web frontend doesn't import from games/
// (data is opaque to the platform), so we redeclare locally and do a
// permissive runtime extraction.
//
// `exit` here is synthesized: the source LevelData has it at the top
// level with a `page` field; we copy it onto the preview only when that
// page is 0 so the thumbnail shows the goal cell.

export type Cell = { x: number; y: number };
export type CardinalDir = "up" | "down" | "left" | "right";

export type PreviewPage = {
  tiles: string[];
  spawn: Cell;
  exit?: Cell;
  spikes?: Array<Cell & { dir?: CardinalDir }>;
  spike_blocks?: Cell[];
  glass_walls?: Cell[];
  conveyors?: Cell[];
  cannons?: Array<Cell & { dir?: CardinalDir }>;
  turrets?: Cell[];
  laser_cannons?: Cell[];
  gears?: Array<Cell & { size?: number }>;
  portals?: Array<{ color: number; points: Cell[] }>;
  keys?: Array<Cell & { color: number }>;
  key_walls?: Array<Cell & { color: number }>;
  teleports?: Cell[];
};

export function extractPreviewPage(data: unknown): PreviewPage | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const pages = d.pages;
  if (!Array.isArray(pages) || pages.length === 0) return null;
  const p0 = pages[0] as Record<string, unknown>;
  if (!Array.isArray(p0.tiles) || p0.tiles.length === 0) return null;
  if (typeof p0.tiles[0] !== "string") return null;

  const exit = d.exit as { page?: number; x?: number; y?: number } | undefined;
  const exitOnP0 =
    exit && exit.page === 0 && typeof exit.x === "number" && typeof exit.y === "number"
      ? { x: exit.x, y: exit.y }
      : undefined;

  // Cast through unknown — runtime shape isn't fully validated, but the
  // renderer treats every field as optional and skips missing ones.
  return {
    ...(p0 as unknown as PreviewPage),
    exit: exitOnP0,
  };
}
