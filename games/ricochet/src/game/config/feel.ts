// Game-feel tuning constants. Single source of truth so playtesting can
// dial in numbers in one file. Mirrors the Godot version's
// player_tuning.json so the port preserves identical mechanic feel; tweak
// here, not scattered across the codebase.

// ----- World geometry -----

export const TILE_SIZE = 48;

// (Room dimensions and spawn position were here in Phase 2; they're now
// per-level data, read from the level JSON by the level loader.)

// Default level to load on game boot. Will become user-selectable once
// the level browser exists.
export const DEFAULT_LEVEL_URL = 'levels/test.json';
export const DEFAULT_PAGE_INDEX = 0;

// Number of campaign levels shipped today. Drives both the level-select
// grid in MenuScene and the "is this the last level?" check in
// PlayScene's campaign-complete dialog. Bump this when adding new
// `level-NN.json` files (and also place the JSON under public/levels).
export const CAMPAIGN_LEVEL_COUNT = 10;

// ----- Player tuning (in tiles; converted to px in Player.ts via TILE_SIZE) -----

export const FLIGHT_SPEED_TILES = 40.0;       // every directed launch
export const GRAVITY_TILES = 40.0;            // tiles/sec^2
export const TERMINAL_VELOCITY_TILES = 40.0;  // fall-speed cap, tiles/sec
export const JUMP_HEIGHT_TILES = 2.0;         // peak above the floor
// Vertical lift on left/right launches from the floor. Player rises
// this much (constant-velocity, no gravity) before transitioning to
// horizontal flight. Originally 1 tile; halved per playtesting.
export const RISE_LIFT_TILES = 0.0;
export const REBOUND_DISTANCE_TILES = 0.5;    // wall-bounce backoff
export const CONVEYOR_SPEED_TILES = 4.0;      // horizontal push while standing on a conveyor
export const TURRET_TRACK_SPEED = 3.0;        // rad/sec — how fast the turret barrel rotates toward the player

// ----- Timing (seconds) -----

export const PAUSE_TIME_SEC = 0.1;            // brief delay at apex / after rebound
// How long the death animation plays before the player respawns at spawn.
// Long enough for the body to clearly fall off-screen + spin a few times.
export const DEATH_PAUSE_SEC = 1.2;
// After a portal teleports the player, the SOURCE portal disables for
// this many seconds — short, just covers the moment the player passes
// out of its overlap circle.
export const PORTAL_COOLDOWN_SEC = 0.3;
// Destination portal stays disabled longer: roughly the time it takes
// the player to move ~2 tiles after materialising. Covers the worst
// real-world case — flying into a wall right next to the portal,
// rebounding 0.5 tiles + PAUSE_TIME + ~2 tiles of gravity-driven fall
// ≈ 0.5 s — without which the player drifts back into the destination
// and gets teleported again.
export const PORTAL_DESTINATION_COOLDOWN_SEC = 0.5;
// Fade-to-black duration for cross-page teleport / exit transitions.
// One leg (fade-out OR fade-in); the full transition is 2 × this.
export const FADE_DURATION_MS = 200;

// ----- Camera shake on wall hit -----

// Distance (in tiles) flown before the impact at which shake fires at
// 100% magnitude. Below this, no shake — short bumps shouldn't wiggle
// the screen. Linear scaling above this; see SHAKE_SLOPE_*.
export const SHAKE_MIN_CELLS = 10;

// Per-cell magnitude growth above SHAKE_MIN_CELLS. Same slope on both
// axes today — kept as separate constants so each can be retuned
// independently without touching the formula.
//   horizontal: 10 cells → 100%, 30 cells → 300%   (slope 10% per cell)
//   vertical:   10 cells → 100%, 15 cells → 150%   (slope 10% per cell)
export const SHAKE_SLOPE_PER_CELL_H = 0.10;
export const SHAKE_SLOPE_PER_CELL_V = 0.10;

// 100% shake magnitude expressed as a Phaser camera-shake intensity
// (fraction of the viewport size each frame can offset). 0.0025 ≈ 2 px
// max shift on a 768 px viewport — gentle "thunk" for a wall bump,
// scales up to ~6 px at 300%.
export const SHAKE_BASE_INTENSITY = 0.0025;

// Shake duration in ms. Fixed regardless of magnitude — amplitude
// already encodes "how hard". Short enough not to interfere with the
// PAUSE_TIME_SEC + rebound feel.
export const SHAKE_DURATION_MS = 180;

// ----- Death animation -----

// Initial upward "pop" height (in tiles) when the player dies. Computed
// into a velocity via sqrt(2 * gravity * height), same formula as a jump.
export const DEATH_POP_TILES = 2.0;
// Visual rotation rate while dying, in radians/sec. ~6 rad/s ≈ one full
// rotation per second.
export const DEATH_SPIN_RAD_PER_SEC = 6.0;

// ----- Visuals -----

export const COLOR_PLAYER = 0x4ca6ff;         // sky blue (matches Godot COLOR_PLAYER)
export const COLOR_WALL = 0x73757f;           // gray (matches Godot COLOR_WALL)
export const COLOR_SPIKE = 0xd84040;          // red (matches Godot COLOR_SPIKE)
export const COLOR_SPIKE_PLATE = 0x73757f;    // matches wall — the spike's mounting backplate IS a wall
export const COLOR_COIN = 0xffd933;           // bright yellow (matches Godot COLOR_COIN)
export const COLOR_GLASS = 0x8cd9ff;          // light cyan (matches Godot COLOR_GLASS)
export const COLOR_CONVEYOR = 0x666c8c;       // muted blue-gray (matches Godot COLOR_CONVEYOR)
export const COLOR_CANNON = 0x4d4d52;         // dark gray (matches Godot COLOR_CANNON)
export const COLOR_CANNON_BARREL = 0x8c8c99;  // lighter gray (matches Godot COLOR_CANNON_BARREL)
export const COLOR_TURRET_HUB = 0xd9d933;     // bright yellow — marks the rotation pivot for turrets
export const COLOR_BULLET = 0xf27240;         // orange-red (matches Godot bullet color)
export const COLOR_GEAR = 0x999999;           // medium gray (the disc)
export const COLOR_GEAR_SPOKE = 0x333333;     // dark gray (the rotating spokes)
export const COLOR_GEAR_HUB = 0xff9933;       // bright orange (the center hub — makes spin readable)
export const COLOR_TELEPORT = 0xf28c33;       // orange (matches Godot COLOR_TELEPORT) — cross-page teleporter
export const COLOR_EXIT = 0x66d973;           // green (matches Godot COLOR_EXIT) — level goal

// Laser cannon — base + barrel reuse the cannon palette so the family
// is recognizable; the hub + beam are bright red so danger reads at
// a glance and the beam is visible against any tile color.
export const COLOR_LASER_CANNON = 0x4d4d52;
export const COLOR_LASER_CANNON_BARREL = 0x8c8c99;
export const COLOR_LASER_HUB = 0xff3333;
export const COLOR_LASER_BEAM = 0xff3333;
// Rotation speed for cw / ccw modes. π/4 rad/s = 45°/s = one full
// rotation in 8 seconds. Slow enough that players can plan around it.
export const LASER_ROTATION_SPEED = Math.PI / 4;
// Beam thickness in tile units. 0.2 ≈ 9.6 px at TILE_SIZE 48 — thin
// enough to look like a beam, thick enough that the player AABB
// (one tile) reliably overlaps it without sub-pixel near-misses.
export const LASER_BEAM_THICKNESS_TILES = 0.2;

// Six maximally-distinct key colors (mirrors Godot KEY_COLORS). Each
// index pairs a "light" variant for the bright key pickup with a "dark"
// variant for the matching key-wall (so they read as related but
// distinguishable). Dark = 70% of light per channel — same lerp Godot
// uses via Color.darkened(0.3).
export const KEY_COLORS_LIGHT: readonly number[] = [
  0xf24c4c,  // 0 red
  0xf29933,  // 1 orange
  0xf2e633,  // 2 yellow
  0x4cd959,  // 3 green
  0x33bff2,  // 4 cyan
  0xb366f2,  // 5 purple
];
export const KEY_COLORS_DARK: readonly number[] = KEY_COLORS_LIGHT.map((c) => {
  const r = Math.floor(((c >> 16) & 0xff) * 0.7);
  const g = Math.floor(((c >> 8) & 0xff) * 0.7);
  const b = Math.floor((c & 0xff) * 0.7);
  return (r << 16) | (g << 8) | b;
});
export const COLOR_BACKGROUND = '#22252c';    // page background
export const COLOR_GRID = 0x2a2f36;           // subtle grid behind everything
