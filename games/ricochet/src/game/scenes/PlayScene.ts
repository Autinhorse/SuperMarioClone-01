import Phaser from 'phaser';

import {
  TILE_SIZE,
  COLOR_WALL,
  COLOR_SPIKE,
  COLOR_SPIKE_PLATE,
  COLOR_COIN,
  COLOR_GLASS,
  COLOR_CONVEYOR,
  COLOR_TELEPORT,
  COLOR_EXIT,
  COLOR_BACKGROUND,
  COLOR_GRID,
  KEY_COLORS_LIGHT,
  KEY_COLORS_DARK,
  DEFAULT_LEVEL_URL,
  DEFAULT_PAGE_INDEX,
  FADE_DURATION_MS,
} from '../config/feel';
import { Bullet } from '../entities/Bullet';
import { Cannon } from '../entities/Cannon';
import { Gear } from '../entities/Gear';
import { CONVEYOR_DIR_DATA_KEY, Player, PlayerState } from '../entities/Player';
import { Portal } from '../entities/Portal';
import { Turret } from '../entities/Turret';
import { validateLevel } from '../../shared/level-format/load';
import type { CardinalDir, LevelData, PageData } from '../../shared/level-format/types';

// Cell-distance pickup struct used for teleport / exit triggers (manual
// distance check, mirroring the no-body coin/key pattern). Half-tile
// AABB threshold so the player only triggers when meaningfully overlapped.
type Trigger = { x: number; y: number; targetPage: number };

// Spike rect layout per direction. Each cell splits into:
//   - A "plate" (wall — blocks the player, mounts the spikes)
//   - A "spike" (hazard — kills the player on overlap)
//   - Air (the open side the spikes point into)
// Coords are fractions of TILE_SIZE, origin at the cell's top-left. The
// plate's solid body is added first; the spike's hazard body sits on top
// (visually + collision-wise). For 'up' the lethal points stick UP into
// the cell's top-air; for 'right' they stick RIGHT, etc.
type Rect = { x: number; y: number; w: number; h: number };
const SPIKE_LAYOUT: Record<CardinalDir, { plate: Rect; spike: Rect }> = {
  up:    { plate: { x: 0,   y: 0.8, w: 1,   h: 0.2 }, spike: { x: 0,   y: 0.4, w: 1,   h: 0.4 } },
  down:  { plate: { x: 0,   y: 0,   w: 1,   h: 0.2 }, spike: { x: 0,   y: 0.2, w: 1,   h: 0.4 } },
  left:  { plate: { x: 0.8, y: 0,   w: 0.2, h: 1   }, spike: { x: 0.4, y: 0,   w: 0.4, h: 1   } },
  right: { plate: { x: 0,   y: 0,   w: 0.2, h: 1   }, spike: { x: 0,   y: 0,   w: 0.4, h: 1   } },
};

const LEVEL_KEY = 'level-default';

// Phase 3: data-driven test scene. Loads the default level JSON in
// preload(), reads page DEFAULT_PAGE_INDEX in create(), builds walls
// from the tile grid, spawns the player at page.spawn. The room is
// centered horizontally in the design viewport so smaller pages
// (Godot's default page is 25x20 = 1200x960) sit cleanly inside the
// 1600x960 design space without ugly empty bars on one side.
//
// Optional element arrays (spikes, gears, portals, …) are present in the
// loaded JSON but not yet consumed — those land in Phases 4+.
export class PlayScene extends Phaser.Scene {
  private player!: Player;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private hazards!: Phaser.Physics.Arcade.StaticGroup;
  // Glass walls: act as walls until the player touches them, then break
  // after their per-instance `delay` (seconds). Separate group so we can
  // attach a per-collision callback that's not run for ordinary walls.
  private glassWalls!: Phaser.Physics.Arcade.StaticGroup;
  // Spike blocks: full-cell elements that BLOCK the player AND kill on
  // contact. Separate group so a single collider+overlap pair can apply
  // both behaviors.
  private killableWalls!: Phaser.Physics.Arcade.StaticGroup;
  // Coins: PURE VISUALS (no physics body) — pickup is checked manually
  // each frame via AABB distance. We deliberately avoid the Phaser
  // physics path because `physics.add.overlap` still sets the player
  // body's `touching.left/right/up/down` flags as a side-effect even
  // though it doesn't separate; FLYING_H reads those flags to detect
  // walls, so a coin in the flight path would falsely trigger a rebound.
  private coins!: Phaser.GameObjects.Group;
  private coinCount = 0;
  // Half the player's body height + half the coin's display size; cached
  // so the pickup loop doesn't recompute it 60 times a second.
  private coinPickupThreshold = 0;
  // Cannons fire on a timer; PlayScene.update ticks each one. Bullets
  // are pooled in `bullets` and despawn on contact with anything.
  private cannons: Cannon[] = [];
  private bullets!: Phaser.GameObjects.Group;
  // Keys: pure visuals (same no-body pattern as coins so flying through
  // them doesn't trip the player's wall-detection). Picking up a key
  // removes ALL key_walls of the matching color on the page.
  private keys!: Phaser.GameObjects.Group;
  private keyPickupThreshold = 0;
  // Key walls: solid wall-like static bodies in their own group, so the
  // pickup-driven removal can iterate JUST the matching-color walls.
  private keyWalls!: Phaser.Physics.Arcade.StaticGroup;
  // Gears tick in PlayScene.update; collisions handled via overlap with
  // the player. Bullets pass through gears (matching Godot — gears are
  // collision_mask=2, player only).
  private gears: Gear[] = [];
  // Portals: paired teleporters. Same "bullets pass through, only player
  // triggers" pattern as gears. Tick ticks the cooldown timers.
  private portals: Portal[] = [];
  // Turrets: like cannons (wall-like, fire on a timer) but the barrel
  // tracks the player. Built before the player exists, so PlayScene
  // calls turret.setPlayer() once player is constructed.
  private turrets: Turret[] = [];
  // Teleports + exit use the no-body distance-trigger pattern so the
  // player passes through them visually without their physics body
  // tripping FLYING_H wall-detection (same trick as coins/keys).
  private teleports: Trigger[] = [];
  private exit: Trigger | null = null;
  // Multi-page state. startPageIndex comes in via init() from
  // scene.restart so a teleport can hand off to the next page; the
  // level itself is parsed once per scene run and cached.
  private startPageIndex = DEFAULT_PAGE_INDEX;
  private currentPageIndex = DEFAULT_PAGE_INDEX;
  private shouldFadeIn = false;
  private loadedLevel!: LevelData;
  // Black overlay for transition fade-out / fade-in. Pinned to the
  // camera (scrollFactor 0) so it covers the whole viewport regardless
  // of the centered-room camera scroll.
  private fadeOverlay!: Phaser.GameObjects.Rectangle;
  private transitioning = false;
  private debugText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;

  constructor() {
    super('PlayScene');
  }

  // Receives data from scene.restart on cross-page transitions. First
  // boot has no data, so falls back to DEFAULT_PAGE_INDEX with no
  // fade-in (instant initial render).
  init(data?: { pageIndex?: number; fadeIn?: boolean }): void {
    this.startPageIndex = data?.pageIndex ?? DEFAULT_PAGE_INDEX;
    this.shouldFadeIn = data?.fadeIn ?? false;
  }

  preload(): void {
    this.load.json(LEVEL_KEY, DEFAULT_LEVEL_URL);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_BACKGROUND);

    const raw = this.cache.json.get(LEVEL_KEY) as unknown;
    this.loadedLevel = validateLevel(raw, DEFAULT_LEVEL_URL);
    this.currentPageIndex = this.startPageIndex;
    const page = this.loadedLevel.pages[this.currentPageIndex];
    if (!page) {
      throw new Error(`Level has no page index ${this.currentPageIndex}`);
    }
    this.transitioning = false;

    const cols = page.tiles[0]!.length;
    const rows = page.tiles.length;

    // Center the room within the 1600x960 design viewport. Camera
    // scrollX = -offsetX makes world (0,0) appear at screen (offsetX, 0).
    const offsetX = (this.scale.gameSize.width - cols * TILE_SIZE) / 2;
    const offsetY = (this.scale.gameSize.height - rows * TILE_SIZE) / 2;
    this.cameras.main.setScroll(-offsetX, -offsetY);

    this.drawGridBackground(cols, rows);
    this.ensureWallTexture();

    this.walls = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.glassWalls = this.physics.add.staticGroup();
    this.killableWalls = this.physics.add.staticGroup();
    this.coins = this.add.group();  // plain group — no physics, see field comment
    this.coinCount = 0;
    this.bullets = this.add.group();
    this.cannons = [];
    this.keys = this.add.group();
    this.keyWalls = this.physics.add.staticGroup();
    this.gears = [];
    this.portals = [];
    this.turrets = [];
    this.teleports = [];
    this.exit = null;
    this.buildWalls(page);
    this.buildSpikes(page);
    this.buildGlassWalls(page);
    this.buildSpikeBlocks(page);
    this.buildConveyors(page);
    this.buildCannons(page);
    this.buildKeyWalls(page);
    this.buildKeys(page);
    this.buildGears(page);
    this.buildPortals(page);
    this.buildTurrets(page);
    this.buildTeleports(page);
    this.buildExit();

    // Input wiring — the player gets references to the cursor keys and
    // jump key so it doesn't have to reach into the scene's input plugin.
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('PlayScene requires the keyboard plugin');
    }
    const cursors = keyboard.createCursorKeys();
    const jumpKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    const spawnX = (page.spawn.x + 0.5) * TILE_SIZE;
    const spawnY = (page.spawn.y + 0.5) * TILE_SIZE;
    this.player = new Player(this, spawnX, spawnY, cursors, jumpKey);
    // Turrets are built before the player; hand them the player ref now
    // so trackPlayer() can read its position each frame.
    for (const turret of this.turrets) {
      turret.setPlayer(this.player);
    }

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.overlap(this.player, this.hazards, () => this.player.die());
    // Glass walls: collide normally; the callback starts the break timer
    // on first contact and ignores subsequent contacts until the wall
    // self-destructs.
    this.physics.add.collider(this.player, this.glassWalls, (_player, glass) => {
      this.triggerGlassWall(glass as Phaser.GameObjects.GameObject);
    });
    // Spike blocks: collide (player physically stops) AND overlap (player
    // dies). Both fire on contact; the death animation's collision-off
    // takes care of the body separating cleanly afterward.
    this.physics.add.collider(this.player, this.killableWalls);
    this.physics.add.overlap(this.player, this.killableWalls, () => this.player.die());
    // (Coin pickup is handled manually in update() via distance check —
    // see the field comment on `coins`.) Pre-compute the AABB threshold:
    // half player width (TILE_SIZE/2) plus half coin width (0.55 * TILE_SIZE / 2).
    this.coinPickupThreshold = TILE_SIZE * 0.5 + TILE_SIZE * 0.275;
    // Same trick for keys (radius 0.25 tile, so threshold = 0.5 + 0.25).
    this.keyPickupThreshold = TILE_SIZE * 0.5 + TILE_SIZE * 0.25;
    // Key walls are walls — block the player. Bullet despawn against
    // them is added below alongside the other wall-like groups.
    this.physics.add.collider(this.player, this.keyWalls);

    // Bullets despawn on contact with anything wall-like. The same callback
    // handles all wall-like groups; the per-bullet `ignoreBody`/`ignoreTimer`
    // pattern lets future shooters (turrets) exempt themselves at oblique
    // firing angles. Cannons fire perpendicular so they never set ignoreBody.
    const handleBulletWallHit: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (bullet, wall) => {
      const b = bullet as unknown as Bullet;
      if (!b.active) return;  // already destroyed (multi-overlap same frame)
      if (b.ignoreBody === (wall as unknown as Phaser.GameObjects.GameObject) && b.ignoreTimer > 0) return;
      b.destroy();
    };
    this.physics.add.overlap(this.bullets, this.walls, handleBulletWallHit);
    this.physics.add.overlap(this.bullets, this.glassWalls, handleBulletWallHit);
    this.physics.add.overlap(this.bullets, this.killableWalls, handleBulletWallHit);
    this.physics.add.overlap(this.bullets, this.hazards, handleBulletWallHit);
    this.physics.add.overlap(this.bullets, this.keyWalls, handleBulletWallHit);
    // Bullet vs player: kill + despawn.
    this.physics.add.overlap(this.player, this.bullets, (_player, bullet) => {
      this.player.die();
      bullet.destroy();
    });
    // Player vs gears (overlap kills). Gears are intentionally NOT in
    // the bullet wall-hit handler — bullets pass through them, mirroring
    // the Godot collision_mask=2 (player only) configuration.
    this.physics.add.overlap(this.player, this.gears, () => this.player.die());
    // Portals: same "player only" pattern. The portal's own callback
    // does the teleport + cooldown.
    this.physics.add.overlap(this.player, this.portals, (_player, portal) => {
      (portal as Portal).handlePlayerOverlap(this.player);
    });

    // HUD — anchored to the screen, not the world, so it doesn't move
    // when the camera scrolls (setScrollFactor(0) is the standard idiom).
    this.add
      .text(
        16,
        this.scale.gameSize.height - 28,
        `${this.loadedLevel.name}  (page ${this.currentPageIndex + 1}/${this.loadedLevel.pages.length})  |  Arrows: launch  |  Space: jump`,
        { color: '#9aa0a8', fontSize: '14px' },
      )
      .setScrollFactor(0);

    // Coin counter — top-right.
    this.hudText = this.add
      .text(this.scale.gameSize.width - 16, 16, '', {
        color: '#ffd933',
        fontSize: '20px',
        fontFamily: 'monospace',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.debugText = this.add
      .text(16, 16, '', {
        color: '#cccccc',
        fontSize: '14px',
        fontFamily: 'monospace',
      })
      .setScrollFactor(0);

    // Fade overlay (full design viewport, scroll-locked, on top of
    // everything). Starts opaque on a transition entrance so the player
    // sees a clean fade-in; instant-render on the very first scene boot.
    this.fadeOverlay = this.add
      .rectangle(0, 0, this.scale.gameSize.width, this.scale.gameSize.height, 0x000000)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(this.shouldFadeIn ? 1 : 0);
    if (this.shouldFadeIn) {
      this.tweens.add({
        targets: this.fadeOverlay,
        alpha: 0,
        duration: FADE_DURATION_MS,
      });
    }
  }

  update(time: number, delta: number): void {
    this.player.update(time, delta);
    this.checkCoinPickups();
    this.checkKeyPickups();
    this.checkPageTriggers();

    const dt = delta / 1000;
    for (const cannon of this.cannons) {
      cannon.tick(dt);
    }
    for (const gear of this.gears) {
      gear.tick(dt);
    }
    for (const portal of this.portals) {
      portal.tick(dt);
    }
    for (const turret of this.turrets) {
      turret.tick(dt);
    }
    // Tick all live bullets (decrements ignoreTimer + lifetime).
    this.bullets.getChildren().forEach((b) => {
      const bullet = b as Bullet;
      if (bullet.active) bullet.tick(dt);
    });

    const t = this.player.body.touching;
    const b = this.player.body.blocked;
    this.debugText.setText([
      `state: ${PlayerState[this.player.state]}`,
      `vel: (${this.player.body.velocity.x.toFixed(0)}, ${this.player.body.velocity.y.toFixed(0)})`,
      `touching: ${t.up ? 'U' : '-'}${t.down ? 'D' : '-'}${t.left ? 'L' : '-'}${t.right ? 'R' : '-'}`,
      `blocked:  ${b.up ? 'U' : '-'}${b.down ? 'D' : '-'}${b.left ? 'L' : '-'}${b.right ? 'R' : '-'}`,
    ]);
    this.hudText.setText(`coins: ${this.coinCount}`);
  }

  private buildWalls(page: PageData): void {
    // Tile-grid pass: 'W' = wall, 'C' = coin, '.' = empty. Other chars are
    // ignored (forward-compat for future tile-char additions).
    for (let r = 0; r < page.tiles.length; r++) {
      const row = page.tiles[r]!;
      for (let c = 0; c < row.length; c++) {
        const ch = row.charAt(c);
        if (ch === 'W') {
          this.makeWall(c, r);
        } else if (ch === 'C') {
          this.makeCoin(c, r);
        }
      }
    }
  }

  private makeCoin(col: number, row: number): void {
    const x = (col + 0.5) * TILE_SIZE;
    const y = (row + 0.5) * TILE_SIZE;
    // Smaller than a tile so the coin reads as a pickup, not a tile.
    // No physics body — pickup is handled by checkCoinPickups() below.
    const size = TILE_SIZE * 0.55;
    const visual = this.add.rectangle(x, y, size, size, COLOR_COIN);
    this.coins.add(visual);
  }

  // AABB-style pickup check. The player's body width is roughly TILE_SIZE
  // (the per-state shape narrows by 2-4px on the perpendicular axis;
  // ignoring those few pixels here doesn't matter for pickup feel).
  private checkCoinPickups(): void {
    const px = this.player.x;
    const py = this.player.y;
    const t = this.coinPickupThreshold;
    const children = this.coins.getChildren();
    // Iterate backwards so destroying mid-loop doesn't skip elements.
    for (let i = children.length - 1; i >= 0; i--) {
      const coin = children[i] as Phaser.GameObjects.Rectangle;
      if (Math.abs(coin.x - px) < t && Math.abs(coin.y - py) < t) {
        coin.destroy();
        this.coinCount += 1;
      }
    }
  }

  private makeWall(col: number, row: number): void {
    const x = (col + 0.5) * TILE_SIZE;
    const y = (row + 0.5) * TILE_SIZE;
    this.walls.create(x, y, 'wall');
  }

  private buildSpikes(page: PageData): void {
    if (!page.spikes) {
      return;
    }
    for (const spike of page.spikes) {
      this.makeSpike(spike.x, spike.y, spike.dir);
    }
  }

  private makeSpike(col: number, row: number, dir: CardinalDir): void {
    const layout = SPIKE_LAYOUT[dir];
    // Plate first (visually beneath the spike where they overlap), spike on top.
    this.makeSpikePart(col, row, layout.plate, COLOR_SPIKE_PLATE, /* hazard= */ false);
    this.makeSpikePart(col, row, layout.spike, COLOR_SPIKE, /* hazard= */ true);
  }

  private makeSpikePart(
    col: number,
    row: number,
    rect: Rect,
    color: number,
    hazard: boolean,
  ): void {
    const w = rect.w * TILE_SIZE;
    const h = rect.h * TILE_SIZE;
    const x = col * TILE_SIZE + rect.x * TILE_SIZE + w / 2;
    const y = row * TILE_SIZE + rect.y * TILE_SIZE + h / 2;

    const visual = this.add.rectangle(x, y, w, h, color);
    const group = hazard ? this.hazards : this.walls;
    group.add(visual);
    // After group.add gives the rect a static body, sync the body's size
    // to the rect's actual dimensions (default static body uses display
    // size — usually fine, but be explicit so future layout changes can't
    // bite us).
    const body = visual.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(w, h);
    body.updateFromGameObject();
  }

  private buildGlassWalls(page: PageData): void {
    if (!page.glass_walls) {
      return;
    }
    for (const gw of page.glass_walls) {
      this.makeGlassWall(gw.x, gw.y, gw.delay);
    }
  }

  private makeGlassWall(col: number, row: number, delay: number): void {
    const x = (col + 0.5) * TILE_SIZE;
    const y = (row + 0.5) * TILE_SIZE;
    const visual = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, COLOR_GLASS);
    visual.setAlpha(0.55);  // semi-transparent for the "glass" look
    this.glassWalls.add(visual);
    visual.setData('delay', delay);
    visual.setData('triggered', false);
    const body = visual.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(TILE_SIZE, TILE_SIZE);
    body.updateFromGameObject();
  }

  // First player contact starts the break timer; subsequent contacts
  // before destruction are no-ops. The wall keeps blocking through the
  // delay; on expiry it just disappears (the static body + visual are
  // destroyed together).
  private triggerGlassWall(glass: Phaser.GameObjects.GameObject): void {
    if (glass.getData('triggered')) {
      return;
    }
    glass.setData('triggered', true);
    const delaySec = (glass.getData('delay') as number) ?? 1.0;
    this.time.delayedCall(delaySec * 1000, () => glass.destroy());
  }

  private buildSpikeBlocks(page: PageData): void {
    if (!page.spike_blocks) {
      return;
    }
    for (const sb of page.spike_blocks) {
      this.makeSpikeBlock(sb.x, sb.y);
    }
  }

  private makeSpikeBlock(col: number, row: number): void {
    const x = (col + 0.5) * TILE_SIZE;
    const y = (row + 0.5) * TILE_SIZE;
    // Full-cell red — the entire footprint is lethal AND solid (block +
    // kill). The killableWalls group has both a collider and an overlap
    // attached.
    const visual = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, COLOR_SPIKE);
    this.killableWalls.add(visual);
    const body = visual.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(TILE_SIZE, TILE_SIZE);
    body.updateFromGameObject();

    // Decorative central plate (visual only, no body) — matches the
    // Godot version's "spikes radiating from a central core" reading.
    const plateSize = TILE_SIZE / 3;
    this.add.rectangle(x, y, plateSize, plateSize, COLOR_SPIKE_PLATE);
  }

  private buildConveyors(page: PageData): void {
    if (!page.conveyors) {
      return;
    }
    for (const cv of page.conveyors) {
      this.makeConveyor(cv.x, cv.y, cv.dir === 'cw' ? 1 : -1);
    }
  }

  // Conveyor: a wall-like static body (so the player can stand on it
  // and it blocks horizontal flight) with a `conveyorDir` data tag the
  // player's idle probe reads to apply horizontal push. Lives in the
  // walls group so the existing player↔walls collider handles it.
  private makeConveyor(col: number, row: number, dir: 1 | -1): void {
    const x = (col + 0.5) * TILE_SIZE;
    const y = (row + 0.5) * TILE_SIZE;
    const visual = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, COLOR_CONVEYOR);
    this.walls.add(visual);
    visual.setData(CONVEYOR_DIR_DATA_KEY, dir);
    const body = visual.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(TILE_SIZE, TILE_SIZE);
    body.updateFromGameObject();

    // Direction arrow (visual only). Makes the push direction obvious
    // at a glance.
    this.add
      .text(x, y, dir === 1 ? '→' : '←', {
        color: '#ffffff',
        fontSize: '24px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  private buildCannons(page: PageData): void {
    if (!page.cannons) {
      return;
    }
    for (const c of page.cannons) {
      const cannon = new Cannon(
        this,
        c.x,
        c.y,
        c.dir,
        c.period,
        c.bullet_speed,
        this.bullets,
      );
      // Add to the walls group so the existing player↔walls collider
      // physically blocks the player against the cannon's cell.
      this.walls.add(cannon);
      this.cannons.push(cannon);
    }
  }

  private buildKeys(page: PageData): void {
    if (!page.keys) {
      return;
    }
    for (const k of page.keys) {
      this.makeKey(k.x, k.y, k.color);
    }
  }

  // No physics body — same pattern as coins (a body would set the
  // player's `touching.X` flags as a side-effect and trip FLYING_H's
  // wall-detection). Pickup is a manual distance check in update().
  private makeKey(col: number, row: number, colorIdx: number): void {
    const x = (col + 0.5) * TILE_SIZE;
    const y = (row + 0.5) * TILE_SIZE;
    const radius = TILE_SIZE * 0.25;
    const palette = KEY_COLORS_LIGHT[colorIdx] ?? 0xffffff;
    const visual = this.add.circle(x, y, radius, palette);
    visual.setData('color', colorIdx);
    this.keys.add(visual);
  }

  private buildKeyWalls(page: PageData): void {
    if (!page.key_walls) {
      return;
    }
    for (const kw of page.key_walls) {
      this.makeKeyWall(kw.x, kw.y, kw.color);
    }
  }

  // Solid wall — player can't pass; bullet hits despawn it. Same group
  // shape as `walls`/`glassWalls`, just kept separate so picking up a
  // matching-color key only iterates these and not every wall on the page.
  private makeKeyWall(col: number, row: number, colorIdx: number): void {
    const x = (col + 0.5) * TILE_SIZE;
    const y = (row + 0.5) * TILE_SIZE;
    const palette = KEY_COLORS_DARK[colorIdx] ?? 0x444444;
    const visual = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, palette);
    visual.setData('color', colorIdx);
    this.keyWalls.add(visual);
    const body = visual.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(TILE_SIZE, TILE_SIZE);
    body.updateFromGameObject();
  }

  private checkKeyPickups(): void {
    const px = this.player.x;
    const py = this.player.y;
    const t = this.keyPickupThreshold;
    const children = this.keys.getChildren();
    for (let i = children.length - 1; i >= 0; i--) {
      const key = children[i] as Phaser.GameObjects.Arc;
      if (Math.abs(key.x - px) < t && Math.abs(key.y - py) < t) {
        const colorIdx = key.getData('color') as number;
        key.destroy();
        this.removeKeyWallsByColor(colorIdx);
      }
    }
  }

  // Cascade: collecting a key destroys ALL key_walls that share its color.
  private removeKeyWallsByColor(colorIdx: number): void {
    const walls = this.keyWalls.getChildren();
    // Iterate backwards because destroy() removes from the group's list.
    for (let i = walls.length - 1; i >= 0; i--) {
      const wall = walls[i] as Phaser.GameObjects.Rectangle;
      if (wall.getData('color') === colorIdx) {
        wall.destroy();
      }
    }
  }

  private buildTurrets(page: PageData): void {
    if (!page.turrets) {
      return;
    }
    for (const t of page.turrets) {
      const turret = new Turret(
        this,
        t.x,
        t.y,
        t.period,
        t.bullet_speed,
        this.bullets,
      );
      // Add to walls group so the player + bullets collide with the
      // turret's cell exactly like with a cannon.
      this.walls.add(turret);
      this.turrets.push(turret);
    }
  }

  private buildPortals(page: PageData): void {
    if (!page.portals) {
      return;
    }
    for (const pair of page.portals) {
      const built: Portal[] = [];
      for (const point of pair.points) {
        const portal = new Portal(this, point.x, point.y, pair.color);
        built.push(portal);
        this.portals.push(portal);
      }
      // Pair completion — only fully-formed (2-point) pairs are
      // functional; orphan singletons stay non-teleporting (partner null).
      if (built.length === 2) {
        built[0]!.partner = built[1]!;
        built[1]!.partner = built[0]!;
      }
    }
  }

  private buildGears(page: PageData): void {
    if (!page.gears) {
      return;
    }
    for (const g of page.gears) {
      const radiusPx = (g.size * TILE_SIZE) / 2;
      const speedPx = g.speed * TILE_SIZE;
      // Build the path in pixel coords. Index 0 is home, then each
      // waypoint cell-center.
      const path: Phaser.Math.Vector2[] = [
        new Phaser.Math.Vector2((g.x + 0.5) * TILE_SIZE, (g.y + 0.5) * TILE_SIZE),
      ];
      for (const wp of g.waypoints) {
        path.push(new Phaser.Math.Vector2((wp.x + 0.5) * TILE_SIZE, (wp.y + 0.5) * TILE_SIZE));
      }
      const gear = new Gear(
        this,
        path[0]!.x,
        path[0]!.y,
        radiusPx,
        speedPx,
        g.spin,
        path,
        g.closed,
      );
      this.gears.push(gear);
    }
  }

  private buildTeleports(page: PageData): void {
    if (!page.teleports) {
      return;
    }
    for (const tp of page.teleports) {
      const x = (tp.x + 0.5) * TILE_SIZE;
      const y = (tp.y + 0.5) * TILE_SIZE;
      // No body — manual distance trigger in checkPageTriggers. The
      // visual is a cell-sized orange rect with a "→N" label showing
      // the destination page (1-indexed for human readability).
      this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, COLOR_TELEPORT);
      this.add
        .text(x, y, `→${tp.target_page + 1}`, {
          color: '#000000',
          fontSize: '20px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.teleports.push({ x, y, targetPage: tp.target_page });
    }
  }

  // The level's exit is a single point; only renders if it's on this
  // page. Reaching it currently transitions back to page 0 (i.e.
  // restart the level); a future phase swaps that for a proper
  // "level complete" UX.
  private buildExit(): void {
    const exit = this.loadedLevel.exit;
    if (!exit || exit.page !== this.currentPageIndex) {
      return;
    }
    const x = (exit.x + 0.5) * TILE_SIZE;
    const y = (exit.y + 0.5) * TILE_SIZE;
    this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, COLOR_EXIT);
    this.add
      .text(x, y, 'EXIT', {
        color: '#000000',
        fontSize: '14px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.exit = { x, y, targetPage: 0 };
  }

  // AABB-style trigger check for teleports + exit (same pattern as
  // coins / keys). No-op while a transition is already in progress so
  // a single touch can't queue multiple page jumps.
  private checkPageTriggers(): void {
    if (this.transitioning) {
      return;
    }
    const px = this.player.x;
    const py = this.player.y;
    const t = TILE_SIZE * 0.5;  // half-tile threshold; exit + teleport are full-cell
    for (const tp of this.teleports) {
      if (Math.abs(tp.x - px) < t && Math.abs(tp.y - py) < t) {
        this.transitionToPage(tp.targetPage);
        return;
      }
    }
    if (this.exit && Math.abs(this.exit.x - px) < t && Math.abs(this.exit.y - py) < t) {
      this.transitionToPage(this.exit.targetPage);
    }
  }

  // Cross-page transition. Fades to black, then scene.restart with the
  // target page index — restart re-runs init/preload/create cleanly,
  // tearing down all entities for free. The new scene fades in via the
  // shouldFadeIn flag we pass through init data.
  private transitionToPage(targetPage: number): void {
    if (
      targetPage < 0 ||
      targetPage >= this.loadedLevel.pages.length ||
      this.transitioning
    ) {
      return;
    }
    this.transitioning = true;
    this.tweens.add({
      targets: this.fadeOverlay,
      alpha: 1,
      duration: FADE_DURATION_MS,
      onComplete: () => {
        this.scene.restart({ pageIndex: targetPage, fadeIn: true });
      },
    });
  }

  private ensureWallTexture(): void {
    if (this.textures.exists('wall')) {
      return;
    }
    const gfx = this.add.graphics();
    gfx.fillStyle(COLOR_WALL, 1);
    gfx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    gfx.generateTexture('wall', TILE_SIZE, TILE_SIZE);
    gfx.destroy();
  }

  private drawGridBackground(cols: number, rows: number): void {
    const gfx = this.add.graphics();
    gfx.lineStyle(1, COLOR_GRID, 0.6);
    const w = cols * TILE_SIZE;
    const h = rows * TILE_SIZE;
    for (let x = 0; x <= w; x += TILE_SIZE) {
      gfx.lineBetween(x, 0, x, h);
    }
    for (let y = 0; y <= h; y += TILE_SIZE) {
      gfx.lineBetween(0, y, w, y);
    }
    gfx.setDepth(-100);
  }
}
