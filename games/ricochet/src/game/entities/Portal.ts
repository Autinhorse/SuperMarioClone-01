import Phaser from 'phaser';

import {
  PORTAL_COOLDOWN_SEC,
  PORTAL_DESTINATION_COOLDOWN_SEC,
  TILE_SIZE,
} from '../config/feel';
import { SOUND_KEYS, SOUND_VOLUMES } from '../sounds';
import type { Player } from './Player';

// One half of a paired teleporter. Built as a Container holding a single
// 4-frame animated sprite — one animation per pair color (defined in
// PlayScene.ensureAnimations as `portal_spin_<colorIdx>`).
//
// On player overlap: teleport the player to `partner.position`, preserving
// velocity (a fast-moving player exits going the same direction). Both
// portals enter a cooldown afterward (body.enable = false). The source
// gets a short cooldown so the exit physics frame doesn't re-trigger;
// the destination gets a longer one so a rebound off a nearby wall can't
// bring the player back into its overlap circle and re-teleport.
//
// Orphan portals (pair with only 1 point) have partner = null and are
// non-functional — they exist visually but never teleport. This matches
// the Godot editor's "place one half then walk away" → orphan flow.

export class Portal extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.StaticBody;

  partner: Portal | null = null;
  private cooldownTimer = 0;

  constructor(scene: Phaser.Scene, col: number, row: number, colorIdx: number) {
    const x = (col + 0.5) * TILE_SIZE;
    const y = (row + 0.5) * TILE_SIZE;
    super(scene, x, y);
    scene.add.existing(this);

    // Animated portal disc — 4-frame loop, color per `colorIdx`.
    const sprite = scene.add.sprite(0, 0, `portal_${colorIdx}_0`);
    sprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
    sprite.play(`portal_spin_${colorIdx}`);
    this.add(sprite);

    // Static body — portal doesn't move. setCircle's offset is from the
    // body's top-left corner, so to center the circle on the container's
    // (0, 0) the offset must be (-r, -r).
    const bodyR = TILE_SIZE * 0.40;
    scene.physics.add.existing(this, true);
    this.body.setCircle(bodyR, -bodyR, -bodyR);
  }

  // Player-overlap callback (registered in PlayScene).
  // No-ops if on cooldown or unpaired (orphan).
  handlePlayerOverlap(player: Player): void {
    if (this.cooldownTimer > 0 || this.partner === null) {
      return;
    }
    this.scene.sound.play(SOUND_KEYS.portal, { volume: SOUND_VOLUMES.sfx });
    // Preserve velocity so a fast-moving player carries momentum through
    // the portal — body.reset zeros it, so we capture and restore.
    const vx = player.body.velocity.x;
    const vy = player.body.velocity.y;
    player.body.reset(this.partner.x, this.partner.y);
    player.body.setVelocity(vx, vy);

    // Source: short window. Destination: longer (see feel.ts comment).
    this.armCooldown(PORTAL_COOLDOWN_SEC);
    this.partner.armCooldown(PORTAL_DESTINATION_COOLDOWN_SEC);
  }

  // Per-frame: count down cooldown and re-enable when it expires.
  tick(dt: number): void {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
      if (this.cooldownTimer <= 0) {
        this.body.enable = true;
      }
    }
  }

  private armCooldown(durationSec: number): void {
    this.cooldownTimer = durationSec;
    this.body.enable = false;
  }
}
