# LevelCraft —— Project Context for Claude Code

> This file is the canonical project context. Claude Code should read this **before any other file** to understand what we're building and what platform-wide constraints apply. Per-area context lives in nested `CLAUDE.md` files (loaded automatically when working in those subdirectories):
>
> - `games/CLAUDE.md` — engine context shared across all games (Phaser 4, TS, Vite)
> - `games/ricochet/CLAUDE.md` — the first game (gameplay, source layout, status)
> - `web/CLAUDE.md` — the website platform (URL structure, database schema, web tech stack)

**LevelCraft** is a platform for player-created game levels. It hosts multiple game types as sub-products. The first publicly shipped game is **LevelCraft: Ricochet** (a wall-bouncing pixel platformer).

---

## Naming and Branding

### Always use:
- **Platform name:** `LevelCraft`
- **First game (active development):** `LevelCraft: Ricochet` (or just `Ricochet`)

**When in doubt, err toward making things look and feel original.**

---

## Repository Structure

```
levelcraft/                          (monorepo root)
├── CLAUDE.md                        (this file — platform-wide context)
├── README.md                        (repo README — for GitHub display, leave alone)
├── games/
│   ├── CLAUDE.md                    (shared game-engine context)
│   ├── PHASER_V4_NOTES.md           (Phaser v3 → v4 differences)
│   ├── docs/phaser-skills/          (on-demand Phaser API reference)
│   └── ricochet/                    (the first game — Phaser 4 + TS + Vite)
│       ├── CLAUDE.md
│       ├── design/
│       └── src/
├── web/
│   ├── CLAUDE.md                    (website spec — not yet started)
│   ├── frontend/                    (planned: Next.js + TypeScript)
│   └── backend/                     (planned, stack TBD)
└── docs/
    ├── lessons.md                   (lessons learned)
    └── decisions.md                 (architecture decision records)
```

Game-engine and Phaser specifics live under `games/`. Website specifics live under `web/`. Anything cross-cutting (naming, hard rules, lessons) lives at the root.

---

## Constraints and Things to Avoid

### Hard rules (do not violate)
1. **Do NOT add payment / billing / subscription features.** LevelCraft is a free community platform.
2. **Do NOT add AI features for level creation.** Levels are hand-built by users; that's the product.
3. **Do NOT design features as if a second game is launching tomorrow.** Architecture supports multi-game; product ships with only Ricochet for now.

### Soft guidelines
- **Prefer boring tech.** Use stack choices with clear documentation and large communities.
- **Write structured code, not "quick and dirty".** It's worth doing things properly.
- **Don't over-engineer.** No microservices, no Kubernetes. Single backend, single database, simple deploys.

---

## What "Done" Looks Like for LevelCraft v1.0

Cross-cutting exit criteria — when met, LevelCraft enters maintenance mode:

- ✅ Ricochet game playable in browser, with at least 20 hand-designed levels (see `games/ricochet/CLAUDE.md`)
- ✅ Web platform live with users, level browse/create/share, moderation (see `web/CLAUDE.md`)
- ✅ At least 100 registered users and 50 published levels

**Beyond this, adding more features is anti-goal.**

---

## Lessons Document

A core deliverable, alongside the product itself, is `docs/lessons.md`. **Every time we hit a non-obvious problem, document it.** Format:

```markdown
## YYYY-MM-DD: Short title
- **Context:** What were we trying to do
- **Problem:** What went wrong / what was unexpected
- **Resolution:** How we fixed it
- **Takeaway:** What we want to remember for next time
```

This file is **as important as the code**.

Architecture decisions go in `docs/decisions.md` as ADRs.

---

## Communication Style

When working with the founder:
- The founder uses Claude Code (you) to write most code. Their leverage is **clear specs and good judgment**, not typing.
- Focus on: "what should this look like? what could go wrong? what are the edge cases?"
- Less focus on: low-level implementation details — Claude Code handles those.
- When making architecture decisions, write them up as ADRs in `docs/decisions.md`.
- When you find a non-obvious gotcha, write it to `docs/lessons.md` immediately.

---

## Current Status

- ✅ Ricochet game runtime built (entity set + level loading) — see `games/ricochet/CLAUDE.md` for detail
- 🚧 In progress: Ricochet in-game level editor
- ⏳ Web platform (frontend + backend + database) not started yet
- ⏳ Distribution wrappers (Tauri desktop, Capacitor mobile) not started yet

---

## When You're Unsure

If a request seems to violate any of the constraints above, or you're unsure which area something belongs in (game vs web vs platform), **stop and ask**. The founder would rather clarify than have you build the wrong thing.
