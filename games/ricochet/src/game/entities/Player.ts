import Phaser from 'phaser';

import {
  TILE_SIZE,
  FLIGHT_SPEED_TILES,
  GRAVITY_TILES,
  TERMINAL_VELOCITY_TILES,
  JUMP_HEIGHT_TILES,
  RISE_LIFT_TILES,
  REBOUND_DISTANCE_TILES,
  CONVEYOR_SPEED_TILES,
  PAUSE_TIME_SEC,
  DEATH_PAUSE_SEC,
  DEATH_POP_TILES,
  DEATH_SPIN_RAD_PER_SEC,
} from '../config/feel';
import { SOUND_KEYS, SOUND_VOLUMES } from '../sounds';

// GameObjects tagged with this data key carry a +1 (cw) or -1 (ccw)
// number indicating the conveyor's push direction. The Player's idle
// probe reads this from any static body just below it. Kept as a string
// constant so the editor and PlayScene agree on the key.
export const CONVEYOR_DIR_DATA_KEY = 'conveyorDir';

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
  FALLING_INPUT,  // gravity-driven fall (post-obstacle / post-PAUSED); input accepted.
                  //   Design rule: every non-keypress motion accepts input. The
                  //   only input-locked states are the keypress-triggered launches
                  //   (RISING / FLYING_*). There is no input-locked FALLING.
  DEAD,           // pop + spin + freefall animation; collisions disabled
}

// Per-state collision rect sizes. Narrowed by 2px on the perpendicular
// axis during motion so the box doesn't snag on the corner of an adjacent
// wall while sliding along it. Lifted from player.gd's _SHAPE_* constants.
const SHAPE_FULL  = { w: TILE_SIZE - 2, h: TILE_SIZE - 2 };
const SHAPE_HMOVE = { w: TILE_SIZE - 2, h: TILE_SIZE - 4 };
const SHAPE_VMOVE = { w: TILE_SIZE - 4, h: TILE_SIZE - 2 };

// States that should be subject to engine gravity. All others use flat /
// authored motion (we set velocity directly each frame and disable gravity
// so the engine doesn't fight us).
const GRAVITY_STATES = new Set<PlayerState>([
  PlayerState.IDLE,           // gravity keeps the body pressed to the floor
  PlayerState.JUMPING,        // gravity creates the natural arc
  PlayerState.FALLING_INPUT,
  PlayerState.DEAD,           // gravity drives the freefall after the death pop
]);

// "Flight" = directed-launch motion states. Used by syncAnimation to
// fire Fly.wav on the single transition into a launch (non-flight →
// flight) without re-triggering on the brief RISING → FLYING_H step
// or on mid-air re-launches between flight states.
function isFlightState(s: PlayerState): boolean {
  return (
    s === PlayerState.RISING ||
    s === PlayerState.FLYING_H ||
    s === PlayerState.FLYING_UP ||
    s === PlayerState.FLYING_DOWN
  );
}

export class Player extends Phaser.GameObjects.Sprite {
  // Narrow body type — set in constructor via physics.add.existing.
  declare body: Phaser.Physics.Arcade.Body;

  state: PlayerState = PlayerState.IDLE;
  // Tracked for transition-driven animation playback. Updated at the
  // end of each update() after the per-state handler may have changed
  // `state`, so syncAnimation can compare from→to.
  private prevState: PlayerState = PlayerState.IDLE;

  // Pixel-space tuning, cached from feel.ts at construction.
  private readonly flightSpeed: number;
  private readonly terminalVelocity: number;
  private readonly reboundDistance: number;
  private readonly conveyorSpeed: number;
  // Initial up-velocity to reach jumpHeight under gravity: v = sqrt(2 * g * h).
  private readonly jumpInitialVelocity: number;
  // Same formula, applied to DEATH_POP_TILES — initial upward velocity
  // for the death animation's "pop".
  private readonly deathInitialVelocity: number;
  // Physics step dt (fixed, NOT scene render dt). Used by REBOUNDING /
  // RISING to compute a per-step velocity that lands exactly on target
  // without overshoot, regardless of render frame rate.
  private readonly physicsDt: number;

  // Per-state working values.
  private direction = 0;            // -1 left, 0, +1 right
  private riseTargetY = 0;          // y-coord to stop the pre-launch rise at
  private reboundTargetX = 0;       // x-coord to stop the rebound at
  private pauseTimer = 0;
  private postPauseState: PlayerState = PlayerState.FALLING_INPUT;
  // Brief immunity after dying — debounces double-deaths from multiple
  // overlapping hazard bodies in the same frame, and gives the player a
  // moment at spawn before any spawn-adjacent hazard re-kills them.
  private dyingTimer = 0;
  // Position captured at the moment we entered the current motion
  // state. Read at wall-hit time to derive cells-flown for camera
  // shake. motionStartX is only meaningful while in FLYING_H;
  // motionStartY is meaningful while in FLYING_UP / FLYING_DOWN /
  // JUMPING / FALLING_INPUT. Transitions out of these states leave
  // stale values, but no consumer reads them outside their state.
  private motionStartX = 0;
  private motionStartY = 0;
  // Original spawn coordinates, captured at construction. die() teleports
  // the body back here.
  private readonly spawnPosition: Phaser.Math.Vector2;

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
    // Native sprite is 144×144; setDisplaySize scales it down to the
    // 48px world grid. The body is added by physics.add.existing using
    // the post-scale display size, then narrowed per-state by applyShape.
    super(scene, x, y, 'player_idle');
    this.setDisplaySize(TILE_SIZE, TILE_SIZE);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.cursors = cursors;
    this.jumpKey = jumpKey;
    this.spawnPosition = new Phaser.Math.Vector2(x, y);

    // Cache pixel values from tile units.
    this.flightSpeed = FLIGHT_SPEED_TILES * TILE_SIZE;
    this.terminalVelocity = TERMINAL_VELOCITY_TILES * TILE_SIZE;
    this.reboundDistance = REBOUND_DISTANCE_TILES * TILE_SIZE;
    this.conveyorSpeed = CONVEYOR_SPEED_TILES * TILE_SIZE;
    const gravity = GRAVITY_TILES * TILE_SIZE;
    const jumpHeight = JUMP_HEIGHT_TILES * TILE_SIZE;
    this.jumpInitialVelocity = Math.sqrt(2 * gravity * jumpHeight);
    this.deathInitialVelocity = Math.sqrt(2 * gravity * DEATH_POP_TILES * TILE_SIZE);
    this.physicsDt = 1 / scene.physics.world.fps;

    // Body setup. World gravity (configured in main.ts) handles the
    // gravity arithmetic; allowGravity toggles per state. Bounce 0 so wall
    // contact is a hard stop (the REBOUNDING state authors the visible
    // bounce manually — Phaser bounce would interfere).
    this.body.setBounce(0, 0);
    this.body.setMaxVelocity(this.flightSpeed * 2, this.terminalVelocity);
    this.applyShape(SHAPE_FULL);
  }

  update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.applyShapeForState();
    this.applyGravityForState();
    switch (this.state) {
      case PlayerState.IDLE:          this.idle(dt); break;
      case PlayerState.RISING:        this.rising(dt); break;
      case PlayerState.FLYING_H:      this.flyingH(dt); break;
      case PlayerState.FLYING_UP:     this.flyingUp(dt); break;
      case PlayerState.FLYING_DOWN:   this.flyingDown(dt); break;
      case PlayerState.JUMPING:       this.jumping(dt); break;
      case PlayerState.REBOUNDING:    this.rebounding(dt); break;
      case PlayerState.PAUSED:        this.paused(dt); break;
      case PlayerState.FALLING_INPUT: this.fallingInput(dt); break;
      case PlayerState.DEAD:          this.dead(dt); break;
    }
    this.syncAnimation();
  }

  // Drives sprite animation off state transitions. Run AFTER the per-
  // state handler — handlers may have changed `state`, so the comparison
  // here is "what did we transition into this frame?". Three meaningful
  // transitions trigger animation changes; everything else lets the
  // currently-playing animation continue (so a chained intro→loop or
  // a cruising loop doesn't get reset by every wall touch / rebound /
  // mid-air re-launch).
  private syncAnimation(): void {
    const from = this.prevState;
    const to = this.state;
    if (from === to) return;
    this.prevState = to;

    // Wall-hit shake: capture the position where the new motion state
    // begins so the wall-hit handler can compute cells flown. Scoped
    // to motion states that can terminate against a wall.
    if (to === PlayerState.FLYING_H) {
      this.motionStartX = this.x;
    }
    if (
      to === PlayerState.FLYING_UP ||
      to === PlayerState.FLYING_DOWN ||
      to === PlayerState.JUMPING ||
      to === PlayerState.FALLING_INPUT
    ) {
      this.motionStartY = this.y;
    }

    // Sound-effect cues on motion-state transitions. Jump fires on the
    // single IDLE → JUMPING entry. Fly fires on every transition INTO
    // a flight state from a non-flight state — so a fresh launch sounds
    // once even though the engine briefly passes through RISING before
    // FLYING_H, and a mid-air re-launch (FLYING_X → other FLYING_X) is
    // skipped because both sides are flight states.
    if (from === PlayerState.IDLE && to === PlayerState.JUMPING) {
      this.scene.sound.play(SOUND_KEYS.jump, { volume: SOUND_VOLUMES.sfx });
    }
    if (isFlightState(to) && !isFlightState(from)) {
      this.scene.sound.play(SOUND_KEYS.fly, { volume: SOUND_VOLUMES.sfx });
    }

    // Land: any motion → IDLE. Plays roll_0 briefly then snaps to idle.
    // Skipped if the transition came from DEAD (respawn handles its own
    // texture reset so we don't flash a roll frame at the spawn point).
    if (to === PlayerState.IDLE && from !== PlayerState.DEAD) {
      this.anims.play('player_land');
      return;
    }

    // Ceiling bump: FLYING_UP / JUMPING → PAUSED is specifically the
    // ceiling-collision branch (FLYING_UP/JUMPING set postPauseState =
    // FALLING_INPUT after isOnCeiling). REBOUNDING → PAUSED hits this
    // method too but is excluded here, leaving the roll loop running.
    if (to === PlayerState.PAUSED &&
        (from === PlayerState.FLYING_UP || from === PlayerState.JUMPING)) {
      this.anims.play('player_ceiling_intro');
      this.anims.chain('player_roll_loop');
      return;
    }

    // Initial launch from floor: IDLE → any motion state. Plays the
    // 2-frame intro that chains into the rolling loop.
    if (from === PlayerState.IDLE) {
      this.anims.play('player_roll_intro');
      this.anims.chain('player_roll_loop');
      return;
    }

    // Other motion-to-motion transitions (rebound, mid-air relaunch,
    // pause-to-fall) leave the current animation running. If nothing
    // is currently playing — e.g., we landed (idle) and immediately
    // re-launched, interrupting the land anim — kick the loop so the
    // sprite doesn't sit on a stale frame.
    if (!this.anims.isPlaying) {
      this.anims.play('player_roll_loop');
    }
  }

  // ----- State handlers -----

  private idle(dt: number): void {
    // Conveyor push (zero if not standing on a conveyor). x is set EVERY
    // frame so stepping off a conveyor immediately stops the drift.
    // Engine gravity handles y (presses into floor each frame, collider
    // keeps touching.down / blocked.down set).
    const conveyorDir = this.getConveyorDirBelow();
    this.body.setVelocityX(conveyorDir * this.conveyorSpeed);

    if (!this.isOnFloor()) {
      // No floor under us — most commonly a spawn cell with no wall
      // below (initial or post-page-transition), but also reached when
      // a floor vanishes mid-stand (glass shatter, retracting block,
      // conveyor push past an edge). FALLING_INPUT accepts directional
      // input; we re-enter it on the SAME frame so the first launch
      // press from a mid-air spawn isn't swallowed by an idle no-op
      // followed by a frame of pure gravity.
      this.state = PlayerState.FALLING_INPUT;
      this.fallingInput(dt);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.direction = -1;
      this.riseTargetY = this.y - RISE_LIFT_TILES * TILE_SIZE;
      // Set velocity *now* (not next frame in rising) so the same-frame
      // physics step applies pure vertical motion. Without this, any
      // residual vx from idle's conveyor write would slant the first
      // frame of the rise.
      this.body.setVelocity(0, -this.flightSpeed);
      this.state = PlayerState.RISING;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.direction = 1;
      this.riseTargetY = this.y - RISE_LIFT_TILES * TILE_SIZE;
      this.body.setVelocity(0, -this.flightSpeed);
      this.state = PlayerState.RISING;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      // Up-launch is straight up — explicitly drop conveyor momentum.
      this.body.setVelocity(0, -this.flightSpeed);
      this.state = PlayerState.FLYING_UP;
    } else if (Phaser.Input.Keyboard.JustDown(this.jumpKey)) {
      // Jump preserves horizontal velocity from the conveyor (set above)
      // so jumping off a moving belt arcs forward. setVelocityY only —
      // don't touch vx.
      this.body.setVelocityY(-this.jumpInitialVelocity);
      this.state = PlayerState.JUMPING;
    }
    // Down on floor: intentionally a no-op in v1, matching Godot.
  }

  private rising(_dt: number): void {
    this.body.setVelocity(0, -this.flightSpeed);
    if (this.isOnCeiling()) {
      // Ceiling clipped the rise. Start horizontal flight from current
      // y; flip to horizontal velocity now so this frame's physics step
      // doesn't push another tick of upward motion.
      this.body.setVelocity(this.direction * this.flightSpeed, 0);
      this.state = PlayerState.FLYING_H;
    } else if (this.y <= this.riseTargetY) {
      this.y = this.riseTargetY;  // snap to exact tile boundary
      // Same fix as the ceiling branch: replace the upward velocity
      // with horizontal NOW. Without this the post-update physics step
      // still applies vy = -flightSpeed for one frame, overshooting the
      // 1-tile rise by ~0.5–0.67 of a tile (flightSpeed * dt at 60 fps).
      this.body.setVelocity(this.direction * this.flightSpeed, 0);
      this.state = PlayerState.FLYING_H;
    }
  }

  private flyingH(_dt: number): void {
    this.body.setVelocity(this.direction * this.flightSpeed, 0);
    if ((this.direction > 0 && this.isOnRightWall()) ||
        (this.direction < 0 && this.isOnLeftWall())) {
      this.emitWallHit('wall', Math.abs(this.x - this.motionStartX));
      this.startRebound();
    }
  }

  private flyingUp(_dt: number): void {
    this.body.setVelocity(0, -this.flightSpeed);
    if (this.isOnCeiling()) {
      this.emitWallHit('ceiling', Math.abs(this.y - this.motionStartY));
      this.body.setVelocity(0, 0);
      this.pauseTimer = PAUSE_TIME_SEC;
      this.postPauseState = PlayerState.FALLING_INPUT;
      this.state = PlayerState.PAUSED;
    }
  }

  private flyingDown(_dt: number): void {
    this.body.setVelocity(0, this.flightSpeed);
    if (this.isOnFloor()) {
      this.emitWallHit('floor', Math.abs(this.y - this.motionStartY));
      this.body.setVelocity(0, 0);
      this.state = PlayerState.IDLE;
    }
  }

  private jumping(_dt: number): void {
    // Engine gravity handles vy; vx is intentionally NOT zeroed so any
    // horizontal velocity carried over from a conveyor push survives the
    // jump (a moving player can leap forward off a belt). The mid-jump
    // arrow-input branches below override vx when the player launches.

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
    const vy = this.body.velocity.y;
    if (this.isOnCeiling() && vy < 0) {
      this.emitWallHit('ceiling', Math.abs(this.y - this.motionStartY));
      this.body.setVelocity(0, 0);
      this.pauseTimer = PAUSE_TIME_SEC;
      this.postPauseState = PlayerState.FALLING_INPUT;
      this.state = PlayerState.PAUSED;
    } else if (this.isOnFloor() && vy >= 0) {
      this.emitWallHit('floor', Math.abs(this.y - this.motionStartY));
      this.body.setVelocity(0, 0);
      this.state = PlayerState.IDLE;
    }
  }

  private rebounding(_dt: number): void {
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

    // Hit another wall before completing the rebound — stop here.
    if ((this.direction > 0 && this.isOnRightWall()) ||
        (this.direction < 0 && this.isOnLeftWall())) {
      this.endRebound();
      return;
    }

    // Distance still to travel along the rebound direction. Positive =
    // target is ahead of us; zero or negative = at/past target.
    const distRemaining = (this.reboundTargetX - this.x) * this.direction;

    if (distRemaining <= 0) {
      // Already at or past target. Snap (body.reset syncs body +
      // gameObject + zeroes velocity in one call) and end.
      this.body.reset(this.reboundTargetX, this.y);
      this.endRebound();
      return;
    }

    // Look ahead: if a full-speed step would overshoot, slow down so the
    // upcoming physics step lands EXACTLY on target. Uses the physics
    // step's fixed dt (NOT scene render dt) so the math matches what the
    // physics step will actually do, regardless of render frame rate.
    const maxStep = this.flightSpeed * this.physicsDt;
    const speed = distRemaining < maxStep
      ? distRemaining / this.physicsDt
      : this.flightSpeed;
    this.body.setVelocity(this.direction * speed, 0);
  }

  private endRebound(): void {
    this.body.setVelocity(0, 0);
    this.pauseTimer = PAUSE_TIME_SEC;
    this.postPauseState = PlayerState.FALLING_INPUT;
    this.state = PlayerState.PAUSED;
  }

  private paused(dt: number): void {
    this.body.setVelocity(0, 0);
    this.pauseTimer -= dt;
    if (this.pauseTimer <= 0) {
      this.state = this.postPauseState;
      this.postPauseState = PlayerState.FALLING_INPUT;  // reset for next time
    }
  }

  private fallingInput(_dt: number): void {
    this.body.setVelocityX(0);

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
      this.emitWallHit('floor', Math.abs(this.y - this.motionStartY));
      this.body.setVelocity(0, 0);
      this.state = PlayerState.IDLE;
    }
  }

  // Wall-hit notifier consumed by PlayScene for camera shake AND for
  // selecting between HitWall vs LandGround sound effects. `surface`
  // is the contact type (wall = side, ceiling = top, floor = bottom);
  // axis derives from it (wall → horizontal, ceiling/floor → vertical).
  // Distances under any SHAKE_MIN_CELLS-style threshold are still
  // emitted — consumers gate themselves.
  private emitWallHit(
    surface: 'wall' | 'ceiling' | 'floor',
    distancePx: number,
  ): void {
    const axis: 'horizontal' | 'vertical' = surface === 'wall' ? 'horizontal' : 'vertical';
    const cells = distancePx / TILE_SIZE;
    this.emit('wall-hit', { axis, surface, cells });
  }

  // ----- Public API -----

  /** Hazard contact callback. Enters DEAD state: pops the body upward,
   *  disables collisions (so it falls through floors during the
   *  animation), and starts the death timer. Already-DEAD calls are
   *  no-ops, which debounces multiple overlapping hazards in the same
   *  frame. The actual respawn happens when the timer expires inside
   *  dead(). */
  die(): void {
    if (this.state === PlayerState.DEAD) {
      return;
    }
    this.scene.sound.play(SOUND_KEYS.death, { volume: SOUND_VOLUMES.sfx });
    this.body.setVelocity(0, -this.deathInitialVelocity);
    // Disable collisions in all directions so the body can fall through
    // walls / floors during the death animation. Restored on respawn.
    this.body.checkCollision.up = false;
    this.body.checkCollision.down = false;
    this.body.checkCollision.left = false;
    this.body.checkCollision.right = false;
    this.dyingTimer = DEATH_PAUSE_SEC;
    this.state = PlayerState.DEAD;
  }

  private dead(dt: number): void {
    // Engine gravity (DEAD is in GRAVITY_STATES) handles the freefall
    // arc; we just spin the visual and count down.
    this.rotation += DEATH_SPIN_RAD_PER_SEC * dt;
    this.dyingTimer -= dt;
    if (this.dyingTimer <= 0) {
      this.respawn();
    }
  }

  private respawn(): void {
    // body.reset teleports body+gameObject + zeros velocity in one call.
    this.body.reset(this.spawnPosition.x, this.spawnPosition.y);
    // Restore collisions (disabled by die()).
    this.body.checkCollision.up = true;
    this.body.checkCollision.down = true;
    this.body.checkCollision.left = true;
    this.body.checkCollision.right = true;
    this.rotation = 0;
    this.direction = 0;
    this.pauseTimer = 0;
    this.postPauseState = PlayerState.FALLING_INPUT;
    this.dyingTimer = 0;
    this.state = PlayerState.IDLE;
    // Visual reset: stop whatever roll frame the death animation froze
    // on, restore the idle texture, and seed prevState so syncAnimation
    // sees no transition on the next update.
    this.anims.stop();
    this.setTexture('player_idle');
    this.prevState = PlayerState.IDLE;
    // Notify PlayScene so it can restore page-level reset-on-death
    // state (glass walls, keys, key walls).
    this.emit('respawn');
  }

  // ----- Helpers -----

  private startRebound(): void {
    this.reboundTargetX = this.x - this.direction * this.reboundDistance;
    this.direction = -this.direction;
    this.state = PlayerState.REBOUNDING;
  }

  // Probes a thin strip of pixels just beneath the player's body for
  // any static body tagged with the conveyor data key, returning that
  // body's direction (+1 right / -1 left) or 0 if no conveyor is below.
  // physics.overlapRect uses the world's RTree, so this is fast even
  // with many static bodies on the page. Mirrors the Godot version's
  // 3-point physics probe (the strip is roughly equivalent to sampling
  // at the player's left, center, and right foot-points).
  private getConveyorDirBelow(): number {
    const b = this.body;
    const probeBodies = this.scene.physics.overlapRect(
      b.x,                // left edge
      b.y + b.height,     // just below the body
      b.width,            // strip width = player width
      2,                  // 2px tall strip
      false,              // include dynamic bodies? no
      true,               // include static bodies? yes
    );
    for (const body of probeBodies) {
      const obj = body.gameObject;
      if (obj) {
        const dir = obj.getData(CONVEYOR_DIR_DATA_KEY);
        if (typeof dir === 'number') {
          return dir;
        }
      }
    }
    return 0;
  }

  // touching.* fires for collisions with other bodies (including static).
  // blocked.* fires for tile / world-bounds collisions. Walls in this
  // scene are static bodies, so touching is the load-bearing check;
  // blocked is included for forward-compat with tilemap-backed walls.
  private isOnFloor(): boolean {
    return this.body.touching.down || this.body.blocked.down;
  }
  private isOnCeiling(): boolean {
    return this.body.touching.up || this.body.blocked.up;
  }
  private isOnLeftWall(): boolean {
    return this.body.touching.left || this.body.blocked.left;
  }
  private isOnRightWall(): boolean {
    return this.body.touching.right || this.body.blocked.right;
  }

  private applyShape(shape: { w: number; h: number }): void {
    // Body.setSize takes source-pixel dimensions (texture-frame coords);
    // Phaser then computes body.width as sourceWidth × gameObject.scaleX.
    // Our shapes are in target world pixels, so divide by scale to get
    // the source size. Without this, scaling player_idle (144×144) down
    // to TILE_SIZE shrinks the body proportionally — a 46×46 shape
    // becomes a ~15×15 body and the player tunnels through walls.
    const sourceW = shape.w / this.scaleX;
    const sourceH = shape.h / this.scaleY;
    if (this.body.width !== shape.w || this.body.height !== shape.h) {
      this.body.setSize(sourceW, sourceH, true);  // re-center on game object
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
      case PlayerState.FALLING_INPUT:
        target = SHAPE_VMOVE; break;
      default:
        target = SHAPE_FULL; break;
    }
    this.applyShape(target);
  }

  private applyGravityForState(): void {
    const useGravity = GRAVITY_STATES.has(this.state);
    if (this.body.allowGravity !== useGravity) {
      this.body.setAllowGravity(useGravity);
    }
  }
}
