import Phaser from 'phaser';

import {
  TILE_SIZE,
  FLIGHT_SPEED_TILES,
  GRAVITY_TILES,
  TERMINAL_VELOCITY_TILES,
  JUMP_HEIGHT_TILES,
  REBOUND_DISTANCE_TILES,
  PAUSE_TIME_SEC,
  COLOR_PLAYER,
} from '../config/feel';

// Player state machine. Mirrors the Godot version's State enum 1:1 so the
// port can be validated by side-by-side comparison. See player.gd in
// games/ricochet/godot/scripts/ for the reference implementation.
export enum PlayerState {
  IDLE,           // standing on a floor, accepting input
  RISING,         // rising 1 tile vertically before a horizontal launch
  FLYING_H,       // cruising left or right at flight speed
  FLYING_UP,      // cruising up at flight speed
  FLYING_DOWN,    // cruising down at flight speed (only triggered mid-jump)
  JUMPING,        // vertical jump arc; input accepted during ascent AND descent
  REBOUNDING,     // 1-tile horizontal rebound after hitting a wall
  PAUSED,         // brief delay before falling under gravity
  FALLING,        // gravity-driven free fall, no input
  FALLING_INPUT,  // gravity-driven fall after a fly-up ceiling bump; input accepted
}

// Per-state collision rect sizes. Narrowed by 2px on the perpendicular
// axis during motion so the box doesn't snag on the corner of an adjacent
// wall while sliding along it. Lifted from player.gd's _SHAPE_* constants.
const SHAPE_FULL  = { w: TILE_SIZE - 2, h: TILE_SIZE - 2 };
const SHAPE_HMOVE = { w: TILE_SIZE - 2, h: TILE_SIZE - 4 };
const SHAPE_VMOVE = { w: TILE_SIZE - 4, h: TILE_SIZE - 2 };

export class Player extends Phaser.GameObjects.Rectangle {
  // Narrow body type — set in constructor via physics.add.existing.
  declare body: Phaser.Physics.Arcade.Body;

  state: PlayerState = PlayerState.IDLE;

  // Pixel-space tuning, cached from feel.ts at construction.
  private readonly flightSpeed: number;
  private readonly gravity: number;
  private readonly terminalVelocity: number;
  private readonly jumpHeight: number;
  private readonly reboundDistance: number;
  // Initial up-velocity to reach jumpHeight under gravity: v = sqrt(2 * g * h).
  private readonly jumpInitialVelocity: number;

  // Per-state working values.
  private direction = 0;            // -1 left, 0, +1 right
  private riseTargetY = 0;          // y-coord to stop the pre-launch rise at
  private reboundTargetX = 0;       // x-coord to stop the rebound at
  private pauseTimer = 0;
  private postPauseState: PlayerState = PlayerState.FALLING;

  // Input refs — passed in by PlayScene so the player doesn't reach into
  // the scene's input plugin directly.
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly jumpKey: Phaser.Input.Keyboard.Key;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    jumpKey: Phaser.Input.Keyboard.Key,
  ) {
    super(scene, x, y, TILE_SIZE, TILE_SIZE, COLOR_PLAYER);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.cursors = cursors;
    this.jumpKey = jumpKey;

    // Cache pixel values from tile units.
    this.flightSpeed = FLIGHT_SPEED_TILES * TILE_SIZE;
    this.gravity = GRAVITY_TILES * TILE_SIZE;
    this.terminalVelocity = TERMINAL_VELOCITY_TILES * TILE_SIZE;
    this.jumpHeight = JUMP_HEIGHT_TILES * TILE_SIZE;
    this.reboundDistance = REBOUND_DISTANCE_TILES * TILE_SIZE;
    this.jumpInitialVelocity = Math.sqrt(2 * this.gravity * this.jumpHeight);

    // Body setup. Manual gravity per state (matches Godot 1:1) — disable
    // the engine's gravity here so flying states stay flat without having
    // to fight against it every frame.
    this.body.setAllowGravity(false);
    this.body.setBounce(0, 0);  // hard stop on collision; rebound state handles the bounce manually
    this.body.setMaxVelocity(this.flightSpeed * 2, this.terminalVelocity);
    this.applyShape(SHAPE_FULL);
  }

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.applyShapeForState();
    switch (this.state) {
      case PlayerState.IDLE:          this.idle(dt); break;
      case PlayerState.RISING:        this.rising(dt); break;
      case PlayerState.FLYING_H:      this.flyingH(dt); break;
      case PlayerState.FLYING_UP:     this.flyingUp(dt); break;
      case PlayerState.FLYING_DOWN:   this.flyingDown(dt); break;
      case PlayerState.JUMPING:       this.jumping(dt); break;
      case PlayerState.REBOUNDING:    this.rebounding(dt); break;
      case PlayerState.PAUSED:        this.paused(dt); break;
      case PlayerState.FALLING:       this.falling(dt); break;
      case PlayerState.FALLING_INPUT: this.fallingInput(dt); break;
    }
  }

  // ----- State handlers -----

  private idle(_dt: number): void {
    // Tiny downward velocity keeps the body pressed into the floor each
    // frame so body.blocked.down stays true reliably. Without it, after
    // landing with v=(0,0), the next frame's collider may not register
    // contact and we'd false-positive into FALLING.
    this.body.setVelocity(0, 5);

    if (!this.isOnFloor()) {
      this.state = PlayerState.FALLING;
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.direction = -1;
      this.riseTargetY = this.y - TILE_SIZE;
      this.state = PlayerState.RISING;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.direction = 1;
      this.riseTargetY = this.y - TILE_SIZE;
      this.state = PlayerState.RISING;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.body.setVelocity(0, -this.flightSpeed);
      this.state = PlayerState.FLYING_UP;
    } else if (Phaser.Input.Keyboard.JustDown(this.jumpKey)) {
      this.body.setVelocity(0, -this.jumpInitialVelocity);
      this.state = PlayerState.JUMPING;
    }
    // Down on floor: intentionally a no-op in v1, matching Godot.
  }

  private rising(_dt: number): void {
    this.body.setVelocity(0, -this.flightSpeed);
    if (this.isOnCeiling()) {
      // Ceiling clipped the rise. Start horizontal flight from current y.
      this.state = PlayerState.FLYING_H;
    } else if (this.y <= this.riseTargetY) {
      this.y = this.riseTargetY;  // snap to exact tile boundary
      this.state = PlayerState.FLYING_H;
    }
  }

  private flyingH(_dt: number): void {
    this.body.setVelocity(this.direction * this.flightSpeed, 0);
    if ((this.direction > 0 && this.isOnRightWall()) ||
        (this.direction < 0 && this.isOnLeftWall())) {
      this.startRebound();
    }
  }

  private flyingUp(_dt: number): void {
    this.body.setVelocity(0, -this.flightSpeed);
    if (this.isOnCeiling()) {
      this.body.setVelocity(0, 0);
      this.pauseTimer = PAUSE_TIME_SEC;
      this.postPauseState = PlayerState.FALLING_INPUT;
      this.state = PlayerState.PAUSED;
    }
  }

  private flyingDown(_dt: number): void {
    this.body.setVelocity(0, this.flightSpeed);
    if (this.isOnFloor()) {
      this.body.setVelocity(0, 0);
      this.state = PlayerState.IDLE;
    }
  }

  private jumping(dt: number): void {
    // Apply gravity manually; cap descent at terminal so the jump arc
    // matches free-fall.
    let vy = this.body.velocity.y + this.gravity * dt;
    vy = Math.min(vy, this.terminalVelocity);
    this.body.setVelocityY(vy);

    // Mid-jump arrow input cancels the arc and starts a directional launch.
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.direction = -1;
      this.body.setVelocity(-this.flightSpeed, 0);
      this.state = PlayerState.FLYING_H;
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.direction = 1;
      this.body.setVelocity(this.flightSpeed, 0);
      this.state = PlayerState.FLYING_H;
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.body.setVelocity(0, -this.flightSpeed);
      this.state = PlayerState.FLYING_UP;
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.body.setVelocity(0, this.flightSpeed);
      this.state = PlayerState.FLYING_DOWN;
      return;
    }

    // No directional input — natural arc.
    if (this.isOnCeiling() && vy < 0) {
      this.body.setVelocity(0, 0);
      this.pauseTimer = PAUSE_TIME_SEC;
      this.postPauseState = PlayerState.FALLING_INPUT;
      this.state = PlayerState.PAUSED;
    } else if (this.isOnFloor() && vy >= 0) {
      this.body.setVelocity(0, 0);
      this.state = PlayerState.IDLE;
    }
  }

  private rebounding(_dt: number): void {
    this.body.setVelocity(this.direction * this.flightSpeed, 0);

    // Mid-rebound arrow input cancels the bounce-back and launches in the
    // new direction. Pressing toward the wall just hit produces a
    // bounce-bounce hover loop, which is intentional (matches Godot).
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.direction = -1;
      this.body.setVelocity(-this.flightSpeed, 0);
      this.state = PlayerState.FLYING_H;
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.direction = 1;
      this.body.setVelocity(this.flightSpeed, 0);
      this.state = PlayerState.FLYING_H;
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.body.setVelocity(0, -this.flightSpeed);
      this.state = PlayerState.FLYING_UP;
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.body.setVelocity(0, this.flightSpeed);
      this.state = PlayerState.FLYING_DOWN;
      return;
    }

    let done = false;
    // Hit another wall before completing the 1-tile rebound — stop here.
    if ((this.direction > 0 && this.isOnRightWall()) ||
        (this.direction < 0 && this.isOnLeftWall())) {
      done = true;
    } else if ((this.direction === 1 && this.x >= this.reboundTargetX) ||
               (this.direction === -1 && this.x <= this.reboundTargetX)) {
      this.x = this.reboundTargetX;
      done = true;
    }
    if (done) {
      this.body.setVelocity(0, 0);
      this.pauseTimer = PAUSE_TIME_SEC;
      this.postPauseState = PlayerState.FALLING_INPUT;
      this.state = PlayerState.PAUSED;
    }
  }

  private paused(dt: number): void {
    this.body.setVelocity(0, 0);
    this.pauseTimer -= dt;
    if (this.pauseTimer <= 0) {
      this.state = this.postPauseState;
      this.postPauseState = PlayerState.FALLING;  // reset for next time
    }
  }

  private falling(dt: number): void {
    let vy = this.body.velocity.y + this.gravity * dt;
    vy = Math.min(vy, this.terminalVelocity);
    this.body.setVelocity(0, vy);
    if (this.isOnFloor()) {
      this.body.setVelocity(0, 0);
      this.state = PlayerState.IDLE;
    }
  }

  private fallingInput(dt: number): void {
    let vy = this.body.velocity.y + this.gravity * dt;
    vy = Math.min(vy, this.terminalVelocity);
    this.body.setVelocity(0, vy);

    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.direction = -1;
      this.body.setVelocity(-this.flightSpeed, 0);
      this.state = PlayerState.FLYING_H;
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.direction = 1;
      this.body.setVelocity(this.flightSpeed, 0);
      this.state = PlayerState.FLYING_H;
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.body.setVelocity(0, -this.flightSpeed);
      this.state = PlayerState.FLYING_UP;
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.body.setVelocityY(this.terminalVelocity);
    }

    if (this.isOnFloor()) {
      this.body.setVelocity(0, 0);
      this.state = PlayerState.IDLE;
    }
  }

  // ----- Helpers -----

  private startRebound(): void {
    this.reboundTargetX = this.x - this.direction * this.reboundDistance;
    this.direction = -this.direction;
    this.state = PlayerState.REBOUNDING;
  }

  // Phaser's body.blocked is set when the body collides with the world
  // bounds OR a tile; body.touching is set for two-body collisions
  // (including static bodies). Walls in this scene are static bodies, so
  // touching.* is the relevant signal — but blocked.* also fires in some
  // collision arrangements, so we check both to stay robust.
  private isOnFloor(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }
  private isOnCeiling(): boolean {
    return this.body.blocked.up || this.body.touching.up;
  }
  private isOnLeftWall(): boolean {
    return this.body.blocked.left || this.body.touching.left;
  }
  private isOnRightWall(): boolean {
    return this.body.blocked.right || this.body.touching.right;
  }

  private applyShape(shape: { w: number; h: number }): void {
    if (this.body.width !== shape.w || this.body.height !== shape.h) {
      this.body.setSize(shape.w, shape.h, true);  // re-center on game object
    }
  }

  private applyShapeForState(): void {
    let target: { w: number; h: number };
    switch (this.state) {
      case PlayerState.FLYING_H:
      case PlayerState.REBOUNDING:
        target = SHAPE_HMOVE; break;
      case PlayerState.RISING:
      case PlayerState.FLYING_UP:
      case PlayerState.FLYING_DOWN:
      case PlayerState.JUMPING:
      case PlayerState.FALLING:
      case PlayerState.FALLING_INPUT:
        target = SHAPE_VMOVE; break;
      default:
        target = SHAPE_FULL; break;
    }
    this.applyShape(target);
  }
}
