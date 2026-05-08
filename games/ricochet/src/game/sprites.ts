import type Phaser from 'phaser';

import type { ConveyorDir } from '../shared/level-format/types';

// Centralised sprite-loading. Both PlayScene and EditScene need the
// same set of textures (the editor draws static previews using the
// same art the game runs on); bundling the loads here keeps the two
// scenes in sync without ~100 duplicate `load.image` lines per scene.
//
// Phaser's texture cache is keyed globally — calling load.image with
// the same key from two scenes still loads the asset once.
export function loadSprites(scene: Phaser.Scene): void {
  // World + character.
  scene.load.image('background', 'sprites/background.png');
  scene.load.image('wall', 'sprites/wall.png');
  scene.load.image('player_idle', 'sprites/player_idle.png');
  for (let i = 0; i < 6; i++) {
    scene.load.image(`player_roll_${i}`, `sprites/player_roll_${i}.png`);
  }

  // Pickups + level signposts.
  scene.load.image('coin_0', 'sprites/coin_0.png');
  scene.load.image('coin_1', 'sprites/coin_1.png');
  scene.load.image('glass-wall', 'sprites/glass-wall.png');
  scene.load.image('start-banner', 'sprites/start-banner.png');

  // Spikes — directional uses spike_0 base + spike_1 teeth, spike-block
  // uses spike_2 base + spike_3 teeth.
  scene.load.image('spike_0', 'sprites/spike_0.png');
  scene.load.image('spike_1', 'sprites/spike_1.png');
  scene.load.image('spike_2', 'sprites/spike_2.png');
  scene.load.image('spike_3', 'sprites/spike_3.png');

  // Keys + key walls. 6 colors; keys have 8 rotation frames, walls
  // are single-frame.
  for (let c = 0; c < 6; c++) {
    for (let f = 0; f < 8; f++) {
      scene.load.image(`key_${c}_${f}`, `sprites/key_${c}_${f}.png`);
    }
    scene.load.image(`key_wall_${c}`, `sprites/key_wall_${c}.png`);
  }

  // Weapons family.
  scene.load.image('cannon', 'sprites/cannon.png');
  scene.load.image('turret-base', 'sprites/turret-base.png');
  scene.load.image('turret-cannon', 'sprites/turret-cannon.png');
  scene.load.image('laser-base', 'sprites/laser-base.png');
  scene.load.image('laser-cannon', 'sprites/laser-cannon.png');

  // Gears (1x / 2x / 3x size variants).
  scene.load.image('gear_0', 'sprites/gear_0.png');
  scene.load.image('gear_1', 'sprites/gear_1.png');
  scene.load.image('gear_2', 'sprites/gear_2.png');

  // Portals — 6 colors × 4 frames.
  for (let c = 0; c < 6; c++) {
    for (let f = 0; f < 4; f++) {
      scene.load.image(`portal_${c}_${f}`, `sprites/portal_${c}_${f}.png`);
    }
  }

  // Cross-page teleport — 4-frame loop, single color.
  for (let f = 0; f < 4; f++) {
    scene.load.image(`teleport_${f}`, `sprites/teleport_${f}.png`);
  }

  // Conveyor — cw/ccw × left/middle/right × 3 frames. Texture keys
  // use cw/ccw; on-disk filenames use the longer clockwise/counter-
  // clockwise spellings.
  for (const [dirKey, dirFile] of [['cw', 'clockwise'], ['ccw', 'counterclockwise']] as const) {
    for (const piece of ['left', 'middle', 'right'] as const) {
      for (let f = 0; f < 3; f++) {
        scene.load.image(
          `conveyor_${dirKey}_${piece}_${f}`,
          `sprites/conveyor-${dirFile}-${piece}_${f}.png`,
        );
      }
    }
  }
}

// Returns the 3-piece slice of a horizontal conveyor row at (col, row),
// based on whether same-direction conveyors sit immediately to its
// left and right. Used by both PlayScene (for runtime visuals) and
// EditScene (for editor previews) so the artwork seam logic is shared.
export function conveyorPieceFor(
  conveyorMap: ReadonlyMap<string, ConveyorDir>,
  col: number,
  row: number,
  dir: ConveyorDir,
): 'left' | 'middle' | 'right' {
  const sameLeft = conveyorMap.get(`${col - 1},${row}`) === dir;
  const sameRight = conveyorMap.get(`${col + 1},${row}`) === dir;
  if (sameLeft && sameRight) return 'middle';
  if (!sameLeft && sameRight) return 'left';
  if (sameLeft && !sameRight) return 'right';
  return 'middle';  // isolated single cell
}
