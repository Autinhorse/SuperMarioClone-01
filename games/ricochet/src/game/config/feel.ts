// Game-feel tuning constants. Single source of truth so playtesting can
// dial in numbers in one file. Mirrors the Godot version's
// player_tuning.json so the port preserves identical mechanic feel; tweak
// here, not scattered across the codebase.

// ----- World geometry -----

export const TILE_SIZE = 48;

// Phase 2 hardcoded test room. Will be replaced by JSON-loaded levels in
// a later phase.
export const ROOM_COLS = 33;
export const ROOM_ROWS = 20;
export const SPAWN_COL = 16;
export const SPAWN_ROW = 17;

// ----- Player tuning (in tiles; converted to px in Player.ts via TILE_SIZE) -----

export const FLIGHT_SPEED_TILES = 40.0;       // every directed launch
export const GRAVITY_TILES = 40.0;            // tiles/sec^2
export const TERMINAL_VELOCITY_TILES = 40.0;  // fall-speed cap, tiles/sec
export const JUMP_HEIGHT_TILES = 2.0;         // peak above the floor
export const REBOUND_DISTANCE_TILES = 1.0;    // wall-bounce backoff

// ----- Timing (seconds) -----

export const PAUSE_TIME_SEC = 0.1;            // brief delay at apex / after rebound

// ----- Visuals -----

export const COLOR_PLAYER = 0x4ca6ff;         // sky blue (matches Godot COLOR_PLAYER)
export const COLOR_WALL = 0x73757f;           // gray (matches Godot COLOR_WALL)
export const COLOR_BACKGROUND = '#22252c';    // page background
export const COLOR_GRID = 0x2a2f36;           // subtle grid behind everything
