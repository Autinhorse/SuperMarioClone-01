import Phaser from 'phaser';

import { TILE_SIZE, TURRET_TRACK_SPEED } from '../config/feel';
import { Bullet } from './Bullet';
import type { Player } from './Player';

// Tracking turret. Wall-like static body (blocks the player) with a
// barrel that rotates toward the player at TURRET_TRACK_SPEED rad/s,
// firing a bullet in the barrel's CURRENT facing every `period` seconds.
//
// Built as a Container holding two children:
//   base   — turret-base.png at full cell, never rotates
//   barrel — turret-cannon.png, rotated each frame to face the player
//
// The bullet's ignoreBody/ignoreTimer is set to `this` for a brief window
// after firing, because at oblique angles the bullet's bbox briefly
// overlaps the turret's cell at spawn time — without the ignore, the
// bullet would self-despawn against its own turret on the first physics
// frame.

export class Turret extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.StaticBody;

  private readonly barrel: Phaser.GameObjects.Image;
  private readonly period: number;
  private readonly bulletSpeedPx: number;
  private readonly bulletGroup: Phaser.GameObjects.Group;
  private timer: number;
  private player: Player | null = null;

  constructor(
    scene: Phaser.Scene,
    col: number,
    row: number,
    period: number,
    bulletSpeedTiles: number,
    bulletGroup: Phaser.GameObjects.Group,
    delay = 0,
  ) {
    const x = (col + 0.5) * TILE_SIZE;
    const y = (row + 0.5) * TILE_SIZE;
    super(scene, x, y);
    scene.add.existing(this);

    // Base — full cell, axis-aligned (added first so the barrel renders
    // on top). Container-relative coords; (0,0) = container's world position.
    const base = scene.add.image(0, 0, 'turret-base');
    base.setDisplaySize(TILE_SIZE, TILE_SIZE);
    this.add(base);

    // Barrel — image natively points right (rotation 0). Rotated each
    // frame in trackPlayer to face the player. Sized at ~full cell so
    // the barrel pokes out of the cell at the firing angle.
    this.barrel = scene.add.image(0, 0, 'turret-cannon');
    this.barrel.setDisplaySize(TILE_SIZE, TILE_SIZE);
    this.add(this.barrel);

    // Static body covering the cell — the player + bullets collide with
    // this exactly like a wall. Container has no getTopLeft/getCenter, so
    // body.updateFromGameObject() throws in Phaser 4 (it expects those
    // methods to exist on the host GameObject). Set the body's top-left
    // position manually instead.
    scene.physics.add.existing(this, true);
    this.body.setSize(TILE_SIZE, TILE_SIZE);
    this.body.position.set(this.x - TILE_SIZE / 2, this.y - TILE_SIZE / 2);

    this.period = period;
    this.bulletSpeedPx = bulletSpeedTiles * TILE_SIZE;
    this.bulletGroup = bulletGroup;
    this.timer = period + delay;  // first shot at delay+period
  }

  // PlayScene calls this once after the player is constructed, since
  // turrets are built before the player.
  setPlayer(player: Player): void {
    this.player = player;
  }

  tick(dt: number): void {
    if (!this.player) {
      return;
    }
    this.trackPlayer(dt);
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.period;
      this.fire();
    }
  }

  // Rotate the barrel toward the player at a bounded angular speed.
  // Phaser.Math.Angle.Wrap normalises to [-PI, PI] so the rotation
  // always takes the shorter way around.
  private trackPlayer(dt: number): void {
    const player = this.player!;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const targetAngle = Math.atan2(dy, dx);
    const diff = Phaser.Math.Angle.Wrap(targetAngle - this.barrel.rotation);
    const maxStep = TURRET_TRACK_SPEED * dt;
    if (Math.abs(diff) <= maxStep) {
      this.barrel.rotation = targetAngle;
    } else {
      this.barrel.rotation += Math.sign(diff) * maxStep;
    }
  }

  private fire(): void {
    const angle = this.barrel.rotation;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    // Spawn just outside the cell edge in the firing direction. At
    // cardinal angles this clears the cell entirely; at oblique angles
    // the bullet bbox still overlaps the cell briefly, which the
    // ignore-window below covers.
    const offset = TILE_SIZE * 0.5 + Bullet.SIZE * 0.5 + 1;
    const bx = this.x + dirX * offset;
    const by = this.y + dirY * offset;
    const bullet = new Bullet(
      this.scene,
      bx,
      by,
      dirX * this.bulletSpeedPx,
      dirY * this.bulletSpeedPx,
    );

    // Bullet self-ignore window. Bullet must travel ~1 tile + its own
    // size to clear the turret AABB at the worst-case oblique angle;
    // ignoreTime = that distance / bullet speed. Floored at 0.05s as
    // a safety margin so the very first frame's pre-physics overlap
    // is always covered.
    bullet.ignoreBody = this;
    const clearancePx = TILE_SIZE + Bullet.SIZE;
    bullet.ignoreTimer = Math.max(0.05, clearancePx / Math.max(this.bulletSpeedPx, 1));

    this.bulletGroup.add(bullet);
  }
}
