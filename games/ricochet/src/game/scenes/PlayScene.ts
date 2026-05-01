import Phaser from 'phaser';

import {
  TILE_SIZE,
  ROOM_COLS,
  ROOM_ROWS,
  SPAWN_COL,
  SPAWN_ROW,
  COLOR_WALL,
  COLOR_BACKGROUND,
  COLOR_GRID,
} from '../config/feel';
import { Player } from '../entities/Player';

// Phase 2 hardcoded test room. Outer wall border + a few inner platforms
// arranged to exercise every player state: a low ceiling for FLYING_UP
// rebound, an isolated wall column for FLYING_H rebound on both sides,
// and several ledges to test JUMPING / FALLING. No game elements (spikes,
// gears, etc.) and no level loader yet — those land in later phases.
export class PlayScene extends Phaser.Scene {
  private player!: Player;
  private walls!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super('PlayScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_BACKGROUND);
    this.drawGridBackground();

    // Generate a 1-tile wall texture once; static bodies in the wall group
    // reuse this texture, which is much cheaper than instantiating a
    // Rectangle shape per cell.
    if (!this.textures.exists('wall')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(COLOR_WALL, 1);
      gfx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      gfx.generateTexture('wall', TILE_SIZE, TILE_SIZE);
      gfx.destroy();
    }

    this.walls = this.physics.add.staticGroup();
    this.buildRoom();

    // Input wiring — the player gets references to the cursor keys and
    // jump key so it doesn't have to reach into the scene's input plugin.
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('PlayScene requires the keyboard plugin');
    }
    const cursors = keyboard.createCursorKeys();
    const jumpKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    const spawnX = (SPAWN_COL + 0.5) * TILE_SIZE;
    const spawnY = (SPAWN_ROW + 0.5) * TILE_SIZE;
    this.player = new Player(this, spawnX, spawnY, cursors, jumpKey);

    this.physics.add.collider(this.player, this.walls);

    // Bottom-left help text. Drawn after walls so it sits on top.
    this.add.text(
      16,
      ROOM_ROWS * TILE_SIZE - 28,
      'Arrows: launch  |  Space: jump (arrows mid-air re-launch)  |  Phase 2 — feel test',
      { color: '#9aa0a8', fontSize: '14px' },
    );
  }

  update(time: number, delta: number): void {
    this.player.update(time, delta);
  }

  private buildRoom(): void {
    // Outer border.
    for (let c = 0; c < ROOM_COLS; c++) {
      this.makeWall(c, 0);
      this.makeWall(c, ROOM_ROWS - 1);
    }
    for (let r = 1; r < ROOM_ROWS - 1; r++) {
      this.makeWall(0, r);
      this.makeWall(ROOM_COLS - 1, r);
    }

    // Inner platforms — [col, row, width, height]. Carefully placed to
    // exercise the full state machine in one screen:
    //   - overhead ceiling: tests FLYING_UP -> PAUSED
    //   - mid platforms: test FALLING land + JUMPING up onto
    //   - left and right ledges: test FALLING_INPUT relaunch
    //   - isolated wall column: tests FLYING_H rebound on both sides
    const platforms: ReadonlyArray<readonly [number, number, number, number]> = [
      [10, 4, 4, 1],    // overhead ceiling
      [13, 9, 6, 1],    // mid platform
      [3, 13, 5, 1],    // left ledge
      [25, 12, 6, 1],   // right ledge
      [20, 14, 1, 4],   // wall column for left-and-right rebound test
    ];
    for (const [col, row, width, height] of platforms) {
      for (let c = col; c < col + width; c++) {
        for (let r = row; r < row + height; r++) {
          this.makeWall(c, r);
        }
      }
    }
  }

  private makeWall(col: number, row: number): void {
    const x = (col + 0.5) * TILE_SIZE;
    const y = (row + 0.5) * TILE_SIZE;
    this.walls.create(x, y, 'wall');
  }

  private drawGridBackground(): void {
    // Same subtle grid as Phase 1's BootScene — gives the room a sense of
    // scale and makes tile alignment readable.
    const gfx = this.add.graphics();
    gfx.lineStyle(1, COLOR_GRID, 0.6);
    const w = ROOM_COLS * TILE_SIZE;
    const h = ROOM_ROWS * TILE_SIZE;
    for (let x = 0; x <= w; x += TILE_SIZE) {
      gfx.lineBetween(x, 0, x, h);
    }
    for (let y = 0; y <= h; y += TILE_SIZE) {
      gfx.lineBetween(0, y, w, y);
    }
    gfx.setDepth(-100);
  }
}
