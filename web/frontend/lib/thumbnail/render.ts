// No `server-only` marker here on purpose: this module is also imported
// by the seed/backfill script (web/supabase/seeds/05_backfill_thumbnails.ts)
// running under tsx. The node:fs / node:path imports already make it
// impossible to bundle into a client component (Next.js will fail the
// build), so the strict guard sits on publish.ts instead.
//
// @napi-rs/canvas is loaded LAZILY (dynamic import inside the renderer
// function) rather than statically. The package ships per-platform
// native binaries via optional deps; if the right one didn't get
// installed (e.g. Windows-x64 binary missing on a fresh `npm install`),
// a static import would fail at module-evaluation time and take the
// entire route handler with it — meaning DELETE / PATCH / PUT on
// /api/levels/[id] would 500 even though they don't touch rendering.
// The lazy import isolates the failure to the publish path that
// actually uses canvas.
import type { Image, SKRSContext2D } from "@napi-rs/canvas";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// Renders a published level's page-0 to a PNG using the actual game
// sprite assets (the same PNGs the runtime loads). Visual logic mirrors
// games/ricochet/src/game/scenes/editor/drawers.ts — that file is the
// canonical "static frame-0 preview" renderer, so we keep their sprite
// names + sizing factors in lockstep.
//
// Render is server-only. Output: 720×432 PNG (cell=24px), aspect 5:3
// matching the level's 30×18 grid. Card containers can letterbox or
// crop via CSS object-fit.

const COLS = 30;
const ROWS = 18;
const CELL = 24;
const W = COLS * CELL; // 720
const H = ROWS * CELL; // 432

const SPRITES_DIR = resolve(
  process.cwd(),
  "public/games/ricochet/sprites",
);

// Matches games/ricochet/src/game/config/feel.ts COLOR_BACKGROUND
// (paper-tone). We don't load background.png here — at thumbnail scale
// the textured background just adds noise; a flat fill reads cleaner.
const PAPER = "#f7f4ec";

// Cardinal-direction → rotation (radians). Native art for spike_0 /
// cannon / laser-cannon all point in their respective base direction
// per drawers.ts; we mirror those exact mappings.
const DIR_ROTATION: Record<string, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};
const SPIKE_TIP_ROTATION: Record<string, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};

// Cached @napi-rs/canvas module. First call to renderLevelThumbnail
// dynamic-imports it; subsequent calls reuse. If the platform binary
// is missing the failure surfaces here, not at module-eval time.
let canvasModulePromise: Promise<typeof import("@napi-rs/canvas")> | null = null;
function loadCanvasModule(): Promise<typeof import("@napi-rs/canvas")> {
  if (!canvasModulePromise) {
    canvasModulePromise = import("@napi-rs/canvas");
  }
  return canvasModulePromise;
}

// Lazy sprite cache keyed by file name (without extension). One disk
// read per sprite per process; modern runtimes (Vercel) reuse the
// module across invocations on the same instance, amortizing the load.
const spriteCache = new Map<string, Promise<Image>>();
function getSprite(file: string): Promise<Image> {
  let p = spriteCache.get(file);
  if (!p) {
    p = (async () => {
      const { loadImage } = await loadCanvasModule();
      const buf = await readFile(resolve(SPRITES_DIR, `${file}.png`));
      return loadImage(buf);
    })();
    spriteCache.set(file, p);
  }
  return p;
}

// Permissive input shape — each renderer branch null-checks before
// drawing, so a malformed level just renders an empty canvas instead
// of throwing. We deliberately keep this loose because levels.data is
// opaque JSONB on the platform side and shouldn't be assumed valid.
type Cell = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";
type LevelDataLike = {
  exit?: { page?: number; x?: number; y?: number };
  pages?: Array<{
    tiles?: string[];
    spawn?: Cell;
    spikes?: Array<Cell & { dir?: Dir }>;
    spike_blocks?: Cell[];
    glass_walls?: Cell[];
    conveyors?: Array<Cell & { dir?: "cw" | "ccw" }>;
    cannons?: Array<Cell & { dir?: Dir }>;
    turrets?: Cell[];
    laser_cannons?: Array<Cell & { dir?: Dir }>;
    gears?: Array<Cell & { size?: number }>;
    portals?: Array<{ color: number; points: Cell[] }>;
    keys?: Array<Cell & { color?: number }>;
    key_walls?: Array<Cell & { color?: number }>;
    teleports?: Cell[];
  }>;
};

// Renders the level's page 0 to a PNG buffer. Throws on canvas / sprite
// load errors so the caller (publish API) can fail the request rather
// than ship a half-rendered thumbnail.
export async function renderLevelThumbnail(
  levelData: unknown,
): Promise<Buffer> {
  const level = (levelData ?? {}) as LevelDataLike;
  const page = level.pages?.[0];

  const { createCanvas } = await loadCanvasModule();
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background fill. Matches the SVG fallback's paper color.
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  if (!page || !Array.isArray(page.tiles)) {
    return canvas.toBuffer("image/png");
  }

  // --- Walls + coins from the tile grid ------------------------------
  const wallSprite = await getSprite("wall");
  const coinSprite = await getSprite("coin_0");
  for (let r = 0; r < page.tiles.length && r < ROWS; r++) {
    const row = page.tiles[r] ?? "";
    for (let c = 0; c < row.length && c < COLS; c++) {
      const ch = row.charAt(c);
      const px = c * CELL;
      const py = r * CELL;
      if (ch === "W") {
        ctx.drawImage(wallSprite, px, py, CELL, CELL);
      } else if (ch === "C") {
        // 0.825 of a tile, centered (matches drawCoin).
        const s = CELL * 0.825;
        const off = (CELL - s) / 2;
        ctx.drawImage(coinSprite, px + off, py + off, s, s);
      }
    }
  }

  // --- Glass walls ---------------------------------------------------
  if (page.glass_walls?.length) {
    const sp = await getSprite("glass-wall");
    for (const g of page.glass_walls) {
      ctx.drawImage(sp, g.x * CELL, g.y * CELL, CELL, CELL);
    }
  }

  // --- Conveyors (always cw/middle for thumbnails) -------------------
  // Real runtime picks left/middle/right based on neighbors; at this
  // scale the seams aren't visible, so always-middle is fine.
  if (page.conveyors?.length) {
    for (const cv of page.conveyors) {
      const dir = cv.dir === "ccw" ? "counterclockwise" : "clockwise";
      const sp = await getSprite(`conveyor-${dir}-middle_0`);
      ctx.drawImage(sp, cv.x * CELL, cv.y * CELL, CELL, CELL);
    }
  }

  // --- Key walls -----------------------------------------------------
  if (page.key_walls?.length) {
    for (const kw of page.key_walls) {
      const color = clampColor(kw.color);
      const sp = await getSprite(`key_wall_${color}`);
      ctx.drawImage(sp, kw.x * CELL, kw.y * CELL, CELL, CELL);
    }
  }

  // --- Spike blocks: spike_2 base + 4× spike_3 teeth -----------------
  // Mirrors drawSpikeBlock — 144-native-px teeth strip 83×30 at native
  // scale, scaled here to CELL.
  if (page.spike_blocks?.length) {
    const baseSprite = await getSprite("spike_2");
    const teethSprite = await getSprite("spike_3");
    const scale = CELL / 144;
    const teethW = 83 * scale;
    const teethH = 30 * scale;
    const half = CELL / 2;
    const offset = half - teethH;
    for (const sb of page.spike_blocks) {
      const cx = sb.x * CELL + half;
      const cy = sb.y * CELL + half;
      ctx.drawImage(baseSprite, sb.x * CELL, sb.y * CELL, CELL, CELL);
      const sides = [
        { dx: 0, dy: -offset, rot: 0 },
        { dx: offset, dy: 0, rot: Math.PI / 2 },
        { dx: 0, dy: offset, rot: Math.PI },
        { dx: -offset, dy: 0, rot: -Math.PI / 2 },
      ];
      for (const s of sides) {
        drawRotated(
          ctx,
          teethSprite,
          cx + s.dx,
          cy + s.dy,
          teethW,
          teethH,
          s.rot,
        );
      }
    }
  }

  // --- Directional spikes: spike_0 rotated + spike_1 teeth on edge --
  if (page.spikes?.length) {
    const baseSprite = await getSprite("spike_0");
    const teethSprite = await getSprite("spike_1");
    const scale = CELL / 144;
    const teethW = 137 * scale;
    const teethH = 36 * scale;
    const half = CELL / 2;
    const off = half - teethH;
    for (const s of page.spikes) {
      const dir = (s.dir ?? "up") as Dir;
      const cx = s.x * CELL + half;
      const cy = s.y * CELL + half;
      drawRotated(
        ctx,
        baseSprite,
        cx,
        cy,
        CELL,
        CELL,
        SPIKE_TIP_ROTATION[dir]!,
      );
      let tx = cx;
      let ty = cy;
      if (dir === "up") ty -= off;
      else if (dir === "down") ty += off;
      else if (dir === "left") tx -= off;
      else if (dir === "right") tx += off;
      drawRotated(
        ctx,
        teethSprite,
        tx,
        ty,
        teethW,
        teethH,
        SPIKE_TIP_ROTATION[dir]!,
      );
    }
  }

  // --- Cannon (1.25-tile sprite, rotated by dir) ---------------------
  if (page.cannons?.length) {
    const sp = await getSprite("cannon");
    const size = CELL * (180 / 144);
    const half = CELL / 2;
    for (const cn of page.cannons) {
      const dir = (cn.dir ?? "right") as Dir;
      drawRotated(
        ctx,
        sp,
        cn.x * CELL + half,
        cn.y * CELL + half,
        size,
        size,
        DIR_ROTATION[dir]!,
      );
    }
  }

  // --- Turret (base + barrel, no rotation in static preview) --------
  if (page.turrets?.length) {
    const base = await getSprite("turret-base");
    const barrel = await getSprite("turret-cannon");
    for (const t of page.turrets) {
      ctx.drawImage(base, t.x * CELL, t.y * CELL, CELL, CELL);
      ctx.drawImage(barrel, t.x * CELL, t.y * CELL, CELL, CELL);
    }
  }

  // --- Laser cannon (base static, barrel rotated by dir) ------------
  if (page.laser_cannons?.length) {
    const base = await getSprite("laser-base");
    const barrel = await getSprite("laser-cannon");
    const half = CELL / 2;
    for (const lc of page.laser_cannons) {
      const dir = (lc.dir ?? "right") as Dir;
      ctx.drawImage(base, lc.x * CELL, lc.y * CELL, CELL, CELL);
      drawRotated(
        ctx,
        barrel,
        lc.x * CELL + half,
        lc.y * CELL + half,
        CELL,
        CELL,
        DIR_ROTATION[dir]!,
      );
    }
  }

  // --- Gears (size×size sprite, gear_{size-1}, no path lines) -------
  if (page.gears?.length) {
    for (const g of page.gears) {
      const size = g.size ?? 2;
      const idx = Math.max(0, Math.min(2, size - 1));
      const sp = await getSprite(`gear_${idx}`);
      const half = CELL / 2;
      const visualSize = size * CELL;
      ctx.drawImage(
        sp,
        g.x * CELL + half - visualSize / 2,
        g.y * CELL + half - visualSize / 2,
        visualSize,
        visualSize,
      );
    }
  }

  // --- Portals -------------------------------------------------------
  if (page.portals?.length) {
    for (const p of page.portals) {
      const sp = await getSprite(`portal_${clampColor(p.color)}_0`);
      for (const pt of p.points) {
        ctx.drawImage(sp, pt.x * CELL, pt.y * CELL, CELL, CELL);
      }
    }
  }

  // --- Cross-page teleports (frame 0, no target-page badge) ---------
  if (page.teleports?.length) {
    const sp = await getSprite("teleport_0");
    for (const tp of page.teleports) {
      ctx.drawImage(sp, tp.x * CELL, tp.y * CELL, CELL, CELL);
    }
  }

  // --- Keys (slightly larger than a cell; matches drawKey 1.1875×) --
  if (page.keys?.length) {
    const half = CELL / 2;
    const visualSize = CELL * 1.1875;
    for (const k of page.keys) {
      const sp = await getSprite(`key_${clampColor(k.color)}_0`);
      ctx.drawImage(
        sp,
        k.x * CELL + half - visualSize / 2,
        k.y * CELL + half - visualSize / 2,
        visualSize,
        visualSize,
      );
    }
  }

  // --- Spawn (start banner) ------------------------------------------
  if (page.spawn) {
    const sp = await getSprite("start-banner");
    ctx.drawImage(sp, page.spawn.x * CELL, page.spawn.y * CELL, CELL, CELL);
  }

  // --- Exit (only when it lives on page 0; teleport sprite at 1.5×) -
  if (
    level.exit &&
    level.exit.page === 0 &&
    typeof level.exit.x === "number" &&
    typeof level.exit.y === "number"
  ) {
    const sp = await getSprite("teleport_0");
    const half = CELL / 2;
    const visualSize = CELL * 1.5;
    ctx.drawImage(
      sp,
      level.exit.x * CELL + half - visualSize / 2,
      level.exit.y * CELL + half - visualSize / 2,
      visualSize,
      visualSize,
    );
  }

  return canvas.toBuffer("image/png");
}

// drawImage with rotation around (cx, cy). Mirrors Phaser's setRotation
// + setDisplaySize semantics in a one-liner so render branches stay
// readable. ctx state is saved/restored to scope the transform.
function drawRotated(
  ctx: SKRSContext2D,
  img: Image,
  cx: number,
  cy: number,
  w: number,
  h: number,
  rotation: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function clampColor(c: number | undefined): number {
  if (typeof c !== "number" || !Number.isFinite(c)) return 0;
  return Math.max(0, Math.min(5, Math.floor(c)));
}
