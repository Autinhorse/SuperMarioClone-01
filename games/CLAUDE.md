# Games — shared engine context

This directory holds all game projects. The root `CLAUDE.md` covers platform-wide context; this file covers what's true of *every* game in this repo. Per-game specifics live in each game's own `CLAUDE.md` (e.g. `ricochet/CLAUDE.md`).

## Layout

```
games/
├── CLAUDE.md             (this file)
├── PHASER_V4_NOTES.md    (Phaser v3 → v4 differences, shared across all games)
├── docs/
│   └── phaser-skills/    (on-demand Phaser API reference, shared)
└── <game>/               (one subdir per game, self-contained)
    ├── CLAUDE.md
    ├── package.json
    ├── src/
    └── ...
```

Each game is a self-contained project: its own `package.json`, build, assets, and design docs. Games do **not** share runtime code or assets. They share the engine choice and the docs in this directory.

## Tech stack (all games)

- **Engine:** Phaser 4 (4.1.0+ "Salusa") — WebGL renderer, Arcade Physics
- **Language / build:** TypeScript + Vite
- **Distribution:** browser-native; optional native wrappers later (Tauri desktop, Capacitor mobile) wrap the same web build

## Phaser version matters

This project uses **Phaser 4**, not Phaser 3. Most online tutorials, Stack Overflow answers, and AI-training data describe v3. v3 and v4 share most of the public API but have breaking changes — assume things may have moved and verify before copying patterns from the web.

## Phaser docs in this directory (read on demand — NOT auto-loaded)

These files are **not** auto-loaded by any CLAUDE.md, to keep per-conversation token cost low. Read them with the Read tool only when the task actually involves the relevant Phaser area.

- **`PHASER_V4_NOTES.md`** — practical v3 → v4 differences and gotchas this project has hit. Check first when you suspect a v3-vs-v4 mismatch.
- **`docs/phaser-skills/<topic>/SKILL.md`** — official-style topic guides. Topics include: `physics-arcade`, `physics-matter`, `scenes`, `cameras`, `tilemaps`, `tweens`, `input-keyboard-mouse-touch`, `sprites-and-images`, `groups-and-containers`, `text-and-bitmaptext`, `time-and-timers`, `events-system`, `data-manager`, `loading-assets`, `animations`, `audio-and-sound`, `particles`, `filters-and-postfx`, `render-textures`, `geometry-and-math`, `curves-and-paths`, `actions-and-utilities`, `game-object-components`, `graphics-and-shapes`, `scale-and-responsive`, `game-setup-and-config`, `v3-to-v4-migration`, `v4-new-features`. Read the topic that matches the area you're touching.

## Visual style

Each game owns its own visual identity, asset pipeline, and color palette. There is **no shared asset pipeline** between games. If a game has a documented style, it's in that game's own `CLAUDE.md` or design docs.
