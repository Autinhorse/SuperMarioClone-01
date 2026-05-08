import Phaser from 'phaser';

import { COLOR_GRID, COLOR_LASER_BEAM, TILE_SIZE } from '../../config/feel';
import type {
  CardinalDir,
  ConveyorDir,
  Gear as GearData,
  TextLabel as TextLabelData,
} from '../../../shared/level-format/types';

// Editor previews. These mirror PlayScene's visuals using static frame-0
// sprites — no animations (the editor wants a calm preview, not motion).
// drawConveyor takes a piece (left/middle/right) the caller computes
// via conveyorPieceFor in src/game/sprites.ts; everything else uses a
// single sprite per call, optionally rotated for direction.
//
// Each draw function takes the per-page Container (so the registered
// children get torn down on the next renderPage's removeAll) and reads
// `container.scene` to access the scene factory.

// Shared layout fractions. The runtime also uses these (with its own
// physics anchoring) so cross-file divergence is a known risk if either
// set is tweaked.
type Rect = { x: number; y: number; w: number; h: number };
const SPIKE_LAYOUT: Record<CardinalDir, { plate: Rect; spike: Rect }> = {
  up:    { plate: { x: 0,   y: 0.5, w: 1,   h: 0.5 }, spike: { x: 0,   y: 0,   w: 1,   h: 0.5 } },
  down:  { plate: { x: 0,   y: 0,   w: 1,   h: 0.5 }, spike: { x: 0,   y: 0.5, w: 1,   h: 0.5 } },
  left:  { plate: { x: 0.5, y: 0,   w: 0.5, h: 1   }, spike: { x: 0,   y: 0,   w: 0.5, h: 1   } },
  right: { plate: { x: 0,   y: 0,   w: 0.5, h: 1   }, spike: { x: 0.5, y: 0,   w: 0.5, h: 1   } },
};
// Image rotation per direction. Native art for spike_0 / cannon /
// laser-cannon all point right at rotation 0; quarter-turns face other
// cardinals.
const DIR_ROTATION: Record<CardinalDir, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};
// Spike teeth specifically: native art has tips pointing UP, so rotate
// to face the lethal direction (up=0, right=π/2, down=π, left=-π/2).
const SPIKE_TIP_ROTATION: Record<CardinalDir, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};

// Pixel-coords of a cell's center.
export function cellCenter(col: number, row: number): { x: number; y: number } {
  return { x: (col + 0.5) * TILE_SIZE, y: (row + 0.5) * TILE_SIZE };
}

export function drawGridBackground(
  container: Phaser.GameObjects.Container,
  cols: number,
  rows: number,
): void {
  const scene = container.scene;
  // Background image — same sprite as Play, sized to the editor's
  // page area. Sits below the grid lines (depth -200 < grid -100).
  const bg = scene.add.image(
    (cols * TILE_SIZE) / 2,
    (rows * TILE_SIZE) / 2,
    'background',
  );
  bg.setDisplaySize(cols * TILE_SIZE, rows * TILE_SIZE);
  bg.setDepth(-200);
  container.add(bg);

  const g = scene.add.graphics();
  g.lineStyle(1, COLOR_GRID, 1);
  for (let c = 0; c <= cols; c++) {
    g.lineBetween(c * TILE_SIZE, 0, c * TILE_SIZE, rows * TILE_SIZE);
  }
  for (let r = 0; r <= rows; r++) {
    g.lineBetween(0, r * TILE_SIZE, cols * TILE_SIZE, r * TILE_SIZE);
  }
  g.setDepth(-100);
  container.add(g);
}

export function drawWall(
  container: Phaser.GameObjects.Container,
  col: number,
  row: number,
): void {
  const { x, y } = cellCenter(col, row);
  const img = container.scene.add.image(x, y, 'wall');
  img.setDisplaySize(TILE_SIZE, TILE_SIZE);
  container.add(img);
}

export function drawCoin(
  container: Phaser.GameObjects.Container,
  col: number,
  row: number,
): void {
  const { x, y } = cellCenter(col, row);
  const img = container.scene.add.image(x, y, 'coin_0');
  img.setDisplaySize(TILE_SIZE * 0.825, TILE_SIZE * 0.825);
  container.add(img);
}

export function drawGlassWall(
  container: Phaser.GameObjects.Container,
  col: number,
  row: number,
): void {
  const { x, y } = cellCenter(col, row);
  const img = container.scene.add.image(x, y, 'glass-wall');
  img.setDisplaySize(TILE_SIZE, TILE_SIZE);
  container.add(img);
}

// Spike block: spike_2 base + 4 × spike_3 teeth, one per side. Same
// art layout as PlayScene.makeSpikeBlock — see that function for the
// offset / size derivation.
export function drawSpikeBlock(
  container: Phaser.GameObjects.Container,
  col: number,
  row: number,
): void {
  const { x, y } = cellCenter(col, row);
  const scene = container.scene;
  const base = scene.add.image(x, y, 'spike_2');
  base.setDisplaySize(TILE_SIZE, TILE_SIZE);
  container.add(base);

  const scale = TILE_SIZE / 144;
  const teethW = 83 * scale;
  const teethH = 30 * scale;
  const halfTile = TILE_SIZE / 2;
  const offset = halfTile - teethH;
  const sides: Array<{ dx: number; dy: number; rot: number }> = [
    { dx: 0, dy: -offset, rot: 0 },              // top
    { dx: offset, dy: 0, rot: Math.PI / 2 },     // right
    { dx: 0, dy: offset, rot: Math.PI },         // bottom
    { dx: -offset, dy: 0, rot: -Math.PI / 2 },   // left
  ];
  for (const s of sides) {
    const tooth = scene.add.image(x + s.dx, y + s.dy, 'spike_3');
    tooth.setDisplaySize(teethW, teethH);
    tooth.setRotation(s.rot);
    container.add(tooth);
  }
}

// Conveyor: the caller (EditScene.renderPage) computes the piece via
// conveyorPieceFor(map, x, y, dir). No animation — frame 0 is enough
// for an editor preview.
export function drawConveyor(
  container: Phaser.GameObjects.Container,
  col: number,
  row: number,
  dir: ConveyorDir,
  piece: 'left' | 'middle' | 'right',
): void {
  const { x, y } = cellCenter(col, row);
  const img = container.scene.add.image(x, y, `conveyor_${dir}_${piece}_0`);
  img.setDisplaySize(TILE_SIZE, TILE_SIZE);
  container.add(img);
}

// Directional spike: spike_0 full-cell base rotated by dir + spike_1
// teeth on the lethal edge at native aspect (matches PlayScene.makeSpike).
export function drawSpike(
  container: Phaser.GameObjects.Container,
  col: number,
  row: number,
  dir: CardinalDir,
): void {
  const { x, y } = cellCenter(col, row);
  const scene = container.scene;
  const base = scene.add.image(x, y, 'spike_0');
  base.setDisplaySize(TILE_SIZE, TILE_SIZE);
  // spike_0 native art points UP (open side faces up), not right — so use
  // SPIKE_TIP_ROTATION, not DIR_ROTATION. Matches PlayScene's makeSpike.
  base.setRotation(SPIKE_TIP_ROTATION[dir]);
  container.add(base);

  // Teeth strip on the lethal edge.
  const lethalRect = SPIKE_LAYOUT[dir].spike;
  const scale = TILE_SIZE / 144;
  const teethW = 137 * scale;
  const teethH = 36 * scale;
  const halfTile = TILE_SIZE / 2;
  const off = halfTile - teethH;
  let tx = x;
  let ty = y;
  switch (dir) {
    case 'up':    ty -= off; break;
    case 'down':  ty += off; break;
    case 'left':  tx -= off; break;
    case 'right': tx += off; break;
  }
  const teeth = scene.add.image(tx, ty, 'spike_1');
  teeth.setDisplaySize(teethW, teethH);
  teeth.setRotation(SPIKE_TIP_ROTATION[dir]);
  container.add(teeth);
  void lethalRect;  // kept for documentation parity with PlayScene
}

// Cannon: full art (base + barrel) in a single 180×180 sprite,
// displayed at 1.25 tile so the cell-portion lines up with the grid.
export function drawCannon(
  container: Phaser.GameObjects.Container,
  col: number,
  row: number,
  dir: CardinalDir,
): void {
  const { x, y } = cellCenter(col, row);
  const img = container.scene.add.image(x, y, 'cannon');
  img.setDisplaySize(TILE_SIZE * (180 / 144), TILE_SIZE * (180 / 144));
  img.setRotation(DIR_ROTATION[dir]);
  container.add(img);
}

export function drawKeyWall(
  container: Phaser.GameObjects.Container,
  col: number,
  row: number,
  colorIdx: number,
): void {
  const { x, y } = cellCenter(col, row);
  const img = container.scene.add.image(x, y, `key_wall_${colorIdx}`);
  img.setDisplaySize(TILE_SIZE, TILE_SIZE);
  container.add(img);
}

export function drawKey(
  container: Phaser.GameObjects.Container,
  col: number,
  row: number,
  colorIdx: number,
): void {
  const { x, y } = cellCenter(col, row);
  // Frame 0 only (editor preview); PlayScene plays the 8-frame anim.
  const img = container.scene.add.image(x, y, `key_${colorIdx}_0`);
  img.setDisplaySize(TILE_SIZE * 1.1875, TILE_SIZE * 1.1875);
  container.add(img);
}

// `isEditing` true when this gear is the active path-edit target —
// caller (EditScene) computes via `gearEditState?.gear === g`.
export function drawGear(
  container: Phaser.GameObjects.Container,
  g: GearData,
  isEditing: boolean,
): void {
  const { x, y } = cellCenter(g.x, g.y);
  const r = (g.size * TILE_SIZE) / 2;
  const scene = container.scene;
  const textureKey = `gear_${Math.max(0, Math.min(2, g.size - 1))}`;
  const img = scene.add.image(x, y, textureKey);
  img.setDisplaySize(r * 2, r * 2);
  container.add(img);

  if (g.waypoints.length > 0) {
    const path = scene.add.graphics();
    path.lineStyle(2, 0xff9933, 0.6);
    path.beginPath();
    path.moveTo(x, y);
    for (const wp of g.waypoints) {
      const c = cellCenter(wp.x, wp.y);
      path.lineTo(c.x, c.y);
    }
    if (g.closed) {
      path.lineTo(x, y);
    }
    path.strokePath();
    container.add(path);
    for (const wp of g.waypoints) {
      const c = cellCenter(wp.x, wp.y);
      container.add(scene.add.circle(c.x, c.y, TILE_SIZE * 0.1, 0xff9933));
    }
  }

  if (isEditing) {
    const ring = scene.add.graphics();
    ring.lineStyle(3, 0x4ca6ff, 0.95);
    ring.strokeCircle(x, y, r + 5);
    container.add(ring);
  }
}

export function drawPortal(
  container: Phaser.GameObjects.Container,
  col: number,
  row: number,
  colorIdx: number,
): void {
  const { x, y } = cellCenter(col, row);
  const img = container.scene.add.image(x, y, `portal_${colorIdx}_0`);
  img.setDisplaySize(TILE_SIZE, TILE_SIZE);
  container.add(img);
}

// Turret: fixed base + barrel pointing right at rest (matches the
// initial state Turret.barrel has before the first track update).
export function drawTurret(
  container: Phaser.GameObjects.Container,
  col: number,
  row: number,
): void {
  const { x, y } = cellCenter(col, row);
  const scene = container.scene;
  const base = scene.add.image(x, y, 'turret-base');
  base.setDisplaySize(TILE_SIZE, TILE_SIZE);
  container.add(base);
  const barrel = scene.add.image(x, y, 'turret-cannon');
  barrel.setDisplaySize(TILE_SIZE, TILE_SIZE);
  container.add(barrel);
}

export function drawLaserCannon(
  container: Phaser.GameObjects.Container,
  col: number,
  row: number,
  dir: CardinalDir,
): void {
  const { x, y } = cellCenter(col, row);
  const scene = container.scene;
  const base = scene.add.image(x, y, 'laser-base');
  base.setDisplaySize(TILE_SIZE, TILE_SIZE);
  container.add(base);
  const barrel = scene.add.image(x, y, 'laser-cannon');
  barrel.setDisplaySize(TILE_SIZE, TILE_SIZE);
  barrel.setRotation(DIR_ROTATION[dir]);
  container.add(barrel);

  // Beam-direction hint — short red line projecting one tile out from
  // the cannon edge in `dir`. Faint so it doesn't clutter the editor.
  const offsetMap: Record<CardinalDir, { dx: number; dy: number }> = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
  };
  const o = offsetMap[dir];
  const hint = scene.add.graphics();
  hint.lineStyle(2, COLOR_LASER_BEAM, 0.5);
  hint.lineBetween(
    x + o.dx * TILE_SIZE * 0.5,
    y + o.dy * TILE_SIZE * 0.5,
    x + o.dx * TILE_SIZE * 1.5,
    y + o.dy * TILE_SIZE * 1.5,
  );
  container.add(hint);
}

export function drawTextLabel(
  container: Phaser.GameObjects.Container,
  tl: TextLabelData,
): void {
  const tlX = tl.x * TILE_SIZE;
  const tlY = tl.y * TILE_SIZE;
  const w = tl.width * TILE_SIZE;
  const h = tl.height * TILE_SIZE;
  const pad = 4;
  const scene = container.scene;

  // Faint dashed-style bounds outline so an empty / short label is
  // still locatable + clickable in the editor.
  const outline = scene.add.graphics();
  outline.lineStyle(1, 0x666c8c, 0.5);
  outline.strokeRect(tlX, tlY, w, h);
  container.add(outline);

  if (tl.text.length > 0) {
    const text = scene.add.text(tlX + pad, tlY + pad, tl.text, {
      color: '#cccccc',
      fontSize: `${tl.font_size ?? 16}px`,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      wordWrap: { width: w - pad * 2 },
    });
    container.add(text);
  }
}

// Cross-page teleport. Editor keeps the "→N" target-page label since
// authors need to know where each teleporter goes; PlayScene drops it
// (just visual noise during play).
export function drawTeleport(
  container: Phaser.GameObjects.Container,
  col: number,
  row: number,
  targetPage: number,
): void {
  const { x, y } = cellCenter(col, row);
  const scene = container.scene;
  const img = scene.add.image(x, y, 'teleport_0');
  img.setDisplaySize(TILE_SIZE, TILE_SIZE);
  container.add(img);
  container.add(
    scene.add
      .text(x, y, `→${targetPage + 1}`, {
        color: '#ffffff',
        fontSize: '16px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5),
  );
}

// Spawn (start banner). Editor-only — at runtime the spawn cell is
// empty and the player visual sits there.
export function drawSpawn(
  container: Phaser.GameObjects.Container,
  col: number,
  row: number,
): void {
  const { x, y } = cellCenter(col, row);
  const img = container.scene.add.image(x, y, 'start-banner');
  img.setDisplaySize(TILE_SIZE, TILE_SIZE);
  container.add(img);
}

// Exit. Same teleport ring PlayScene uses (static frame 0 — editor wants
// a calm preview, no animation), scaled 1.5× with a gold "EXIT" label so
// it reads as the level destination.
export function drawExit(
  container: Phaser.GameObjects.Container,
  col: number,
  row: number,
): void {
  const { x, y } = cellCenter(col, row);
  const scene = container.scene;
  const visualSize = TILE_SIZE * 1.5;
  const ring = scene.add.image(x, y, 'teleport_0');
  ring.setDisplaySize(visualSize, visualSize);
  container.add(ring);
  container.add(
    scene.add
      .text(x, y, 'EXIT', {
        color: '#ffd700',
        fontSize: '14px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5),
  );
}

// Bright orange outline. Single-cell elements pass `(x*TILE, y*TILE,
// TILE_SIZE, TILE_SIZE)` as bounds; multi-cell elements (text labels)
// pass their full footprint.
export function drawSelectionBox(
  container: Phaser.GameObjects.Container,
  bounds: { x: number; y: number; w: number; h: number },
): void {
  const box = container.scene.add.graphics();
  box.lineStyle(3, 0xffaa33, 1);
  box.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
  // Above the page renders so the highlight always reads on top of
  // its element's visual.
  box.setDepth(60);
  container.add(box);
}
