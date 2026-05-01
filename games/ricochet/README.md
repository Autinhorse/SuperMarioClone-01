# LevelCraft: Ricochet

The first publicly-shipped game on the LevelCraft platform. A 2D tile-based platformer where the player launches the hero in cardinal directions; the hero flies until hitting something. See `design/design.md` for the full spec.

## Migration in progress (May 2026)

This game is being ported from **Godot 4** to **Phaser 4 + TypeScript** for a smaller web bundle and a cleaner web/desktop/mobile distribution story.

```
games/ricochet/
├── godot/          ← Godot reference implementation. FROZEN — no new features.
│                     Bug fixes only. Will be deleted when Phaser parity is reached.
├── design/         ← Game design doc (canonical for both implementations).
├── devlogs/        ← Development journal.
└── README.md       ← This file.

(After Phase 1, the Phaser project files — package.json, vite.config.ts,
 src/, public/, index.html — will live at this folder's root, alongside
 godot/, design/, and devlogs/.)
```

## Running the Godot version (reference)

1. Open Godot 4.6 (Compatibility renderer is fine — that's what `godot/project.godot` selects).
2. **Project → Import…** → point at `games/ricochet/godot/project.godot`.
3. Open the project, then F5 (Run main scene).
4. The editor scene loads with the test level; click Playtest to enter the play scene.

### Controls
| Key | On the floor | Mid-jump (Space arc) |
| --- | --- | --- |
| ← / → | Rise 1 tile, then launch horizontally at flight speed | Cancel arc, launch left/right from current air position |
| ↑ | Launch straight up | Same as on-floor |
| ↓ | (no-op in v1, reserved) | Cancel arc, launch straight down |
| Space | Vertical jump, 2-tile peak; arrow keys remain active during full arc | — |

After a horizontal launch hits a wall: rebound 1 tile, brief pause, fall under gravity. After a vertical-up launch hits a ceiling: brief pause, fall.

## Phaser port plan

See `CLAUDE_PHASER.md` and `PHASER_V4_NOTES.md` at the repo root for the engine-specific conventions and v3-vs-v4 gotchas.

The port proceeds in disciplined slices:
- **Phase 0 (done)** — folder reorganization. Godot moved into `godot/`, no behavior change.
- **Phase 1** — scaffold the Phaser project at this folder's root (Vite + TypeScript + Phaser 4.1.0+, one empty scene that boots).
- **Phase 2** — port the player and a one-room playtest (no editor yet, no JSON loading, hardcoded room). Validates the launch-and-stop feel in Phaser.
- **Phase 3+** — port game elements (walls, hazards, conveyors, gears, portals, turrets, …), then JSON level loader, then editor.
