import Phaser from 'phaser';

import { TILE_SIZE } from '../config/feel';
import type { CardinalDir } from '../../shared/level-format/types';
import { Bullet } from './Bullet';

// Fixed cannon: a wall-like static body (player can't pass through it)
// that fires a Bullet every `period` seconds in `dir`. First shot is
// delayed by `period` (NOT 0) so the player has a moment to read the
// room before the first shot — matches the Godot reference.

type DirVector = { x: number; y: number };
const DIR_VECTORS: Record<CardinalDir, DirVector> = {
  up:    { x: 0,  y: -1 },
  down:  { x: 0,  y: 1  },
  left:  { x: -1, y: 0  },
  right: { x: 1,  y: 0  },
};

// Native cannon art is 180×180 (a 144 cell + 36 of barrel sticking out
// one side). Display at TILE_SIZE × (180/144) = 1.25 tiles so the cell
// portion lines up with the world grid.
const CANNON_DISPLAY = TILE_SIZE * (180 / 144);

// Image rotation per firing direction. Native art has the barrel
// pointing right (= rotation 0); each cardinal is a quarter-turn from
// there.
const DIR_ROTATION: Record<CardinalDir, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

export class Cannon extends Phaser.GameObjects.Image {
  declare body: Phaser.Physics.Arcade.StaticBody;

  private readonly dir: CardinalDir;
  private readonly period: number;
  private readonly bulletSpeedPx: number;     // cached: tiles → pixels at construction
  private readonly bulletGroup: Phaser.GameObjects.Group;
  private timer: number;

  constructor(
    scene: Phaser.Scene,
    col: number,
    row: number,
    dir: CardinalDir,
    period: number,
    bulletSpeedTiles: number,
    bulletGroup: Phaser.GameObjects.Group,
  ) {
    const x = (col + 0.5) * TILE_SIZE;
    const y = (row + 0.5) * TILE_SIZE;
    super(scene, x, y, 'cannon');
    this.setDisplaySize(CANNON_DISPLAY, CANNON_DISPLAY);
    this.setRotation(DIR_ROTATION[dir]);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);  // static body — blocks the player
    // Body init uses displayWidth (= 1.25 tile); shrink to the cell-sized
    // central portion so the player only collides with the cell, not
    // the barrel poking out. setSize(_, _, true) re-centers the body
    // on the game object using offset = (displayWidth/2 - halfWidth, …)
    // → lands the body exactly on the cell.
    this.body.setSize(TILE_SIZE, TILE_SIZE, true);

    this.dir = dir;
    this.period = period;
    this.bulletSpeedPx = bulletSpeedTiles * TILE_SIZE;
    this.bulletGroup = bulletGroup;
    this.timer = period;  // first shot delayed by period
  }

  // Called by PlayScene each frame.
  tick(dt: number): void {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.period;
      this.fire();
    }
  }

  private fire(): void {
    const v = DIR_VECTORS[this.dir];
    // Spawn just outside the cannon's cell in the firing direction so the
    // bullet doesn't immediately overlap its own cannon (which would
    // self-despawn). Cardinal-only fire makes a flat offset sufficient;
    // the ignoreBody pattern in Bullet handles oblique-fire turrets later.
    const offset = TILE_SIZE * 0.5 + Bullet.SIZE * 0.5 + 1;
    const bx = this.x + v.x * offset;
    const by = this.y + v.y * offset;
    const bullet = new Bullet(this.scene, bx, by, v.x * this.bulletSpeedPx, v.y * this.bulletSpeedPx);
    this.bulletGroup.add(bullet);
  }
}
