# LevelCraft: Ricochet — game context

The first game shipped on the LevelCraft platform. A 2D tile-based platformer with a deliberate, launch-and-stop movement mechanic.

For shared engine and Phaser context, see `../CLAUDE.md`. For platform-level context, see `../../CLAUDE.md`.

---

## Gameplay summary

The player is a small robot character with a 1×1 collision box, on a grid of solid tiles.

- **Floor state (input accepted):** arrow keys launch the player at a constant speed in that direction. Left/right first lift the player one cell, then fly horizontally. Up flies straight up. Once launched, keyboard input is locked.
- **In-flight:** the player keeps moving until they hit something. On a wall: rebound by 1 cell, pause briefly, then fall under gravity until they land back on a floor (input accepted again).
- **Jump (Space):** vertical jump of 2 cells from the floor. During **both ascent and descent of the jump**, keyboard input is accepted — pressing any arrow key launches in that direction from the current mid-air position.
- Hazards kill the player; special tiles (sticky, teleporter, etc.) trigger their own behaviors.

Full gameplay design: `design/design.md`. Level editor design: `design/editor.md`.

---

## Source layout

- `src/main.ts` — Phaser game config, scene registration, URL-mode boot (`?mode=edit` selects EditScene)
- `src/game/scenes/` — `PlayScene` (runtime), `EditScene` (level editor)
- `src/game/entities/` — `Player`, `Bullet`, `Cannon`, `Turret`, `Gear`, etc.
- `src/game/config/feel.ts` — tunable constants (colors, speeds, gravity, etc.)
- `src/shared/level-format/` — level JSON schema + loader, shared between Play and Edit scenes (NOT shared with other games — "shared" here means within Ricochet)
- `public/` — static assets, default level JSON

---

## Visual style

Ricochet's look:

- **Grayscale palette:** `#000000`, `#333333`, `#666666`, `#999999`, `#CCCCCC`, `#FFFFFF`
- **Sci-fi/tech aesthetic:** small robot characters, energy collectibles, futuristic backgrounds
- **Resolution:** 64×64 base tile/character grid; 32×32 for collectibles
- **Hand-illustrated, detailed** (not minimalist 1-bit pixel art) with dark-to-light gradient shading

Asset prompt template: *"grayscale palette (#000–#FFF), sci-fi robot/tech aesthetic, hand-illustrated 64×64 sprites with dark-to-light gradient shading"*.

---

## Current status

- ✅ Runtime + entity set built on Phaser 4: player, walls, glass walls, spike blocks, directional spikes, conveyors, cannons, keys + key walls, gears, portals, turrets, teleports, cross-page exit
- 🚧 In progress: in-game level editor (`?mode=edit`) — placement / drag-place / drag-move / gear path editing
- ⏳ Wiring into the LevelCraft web platform (browse, embed, share) not started
