# Architecture Decision Records

Append-only log of non-obvious architectural decisions. Each entry captures *why* the decision was made so future contributors (and Claude Code) don't relitigate.

---

## ADR-001: Archive the existing jump game; ship Ricochet first

**Date:** 2026-04-28
**Status:** Accepted

### Context
The repo previously held a single Godot project: a Mario-style side-scrolling jumping platformer with World 1's 4 levels and roughly half of SMB1's tile/entity variety. The play half worked; the editor half was zero. Building a Mario-Maker-style editor for this game would be substantial work — jumping platformer mechanics are richer and editor UX more complex.

In parallel, we want to ship a complete game on the LevelCraft platform quickly to validate the full loop (play → edit → share → discover). LevelCraft itself is the rehearsal product for a longer-term goal (GameByTalk).

### Decision
- Archive the existing jump game in `games/_archive_jump/`. Frozen, bug-fix only, never publicly shipped under any Mario-evoking branding.
- Build **LevelCraft: Ricochet** as a fresh Godot project (`games/ricochet/`) with simpler mechanics that map cleanly onto a player-facing editor.
- Ricochet's design and assets are independent of the archived game (style is shared, files are not).

### Consequences
- Existing jump-game code is preserved as a reference, not progressed.
- Ricochet ships faster because the mechanic is simpler and the editor surface area smaller.
- Repo restructured into a multi-game monorepo (`games/`, `web/`, `shared/`, `docs/`) so adding future games and a web platform is mechanical, not architectural.
- IP hygiene: any `mario` references inside the archive get stripped (folder names, level filenames, code constants). Visual assets that resemble Mario IP stay in the archive only and are explicitly off-limits for any public/Ricochet artwork.

### Migration record
Carried out 2026-04-28. See `../MIGRATION.md` for the step-by-step plan and `_archive_jump/README.md` for the archive's own status.

---

## ADR-002: itch.io as a discovery channel; ship a standalone build that points back to LevelCraft

**Date:** 2026-05-11
**Status:** Accepted

### Context
The full LevelCraft experience (accounts, community levels, browse/like/comment, online publishing) requires a backend — that's Next.js + Supabase, deployed at levelcraft.gg. itch.io, by contrast, is static hosting only: it unzips an HTML5 bundle behind a sandboxed iframe at a path like `https://html.itch.zone/html/<id>/index.html`. No server, no database, and the serving origin is path-based and effectively non-stable, so even calling back to Supabase from an itch-hosted build is awkward (CORS allowlisting, third-party-cookie/OAuth-in-iframe breakage).

We still want itch.io as a low-friction discovery surface. Ricochet's Phaser build already supports a "standalone" boot (`index.html` with no params → MenuScene), so the cost of shipping there is small.

### Decision
- Ship a **self-contained standalone build of Ricochet on itch.io**: the 10-level campaign + an in-browser "Try the Level Editor", with **no backend dependency**. Built via `npm run build:standalone` (relative `--base=./` so assets resolve under itch's path), output to `dist-standalone/`; the zip's contents (`index.html` at the root) are what you upload to itch.
- itch.io is a **funnel, not the platform**. The standalone build's menu footer and the editor's banner link to **levelcraft.gg** for accounts, community levels, and online publishing.
- **Levels built in the standalone editor are not "saved" in any cloud sense.** Save writes the level JSON to the browser's `localStorage` (one scratch slot, key `ricochet:try-draft`), which the editor reloads on the next visit — so a refresh doesn't lose work, but clearing site data does, and there's no cross-device sync. The editor shows a persistent "Try mode" banner stating this, plus a "Download .json" button so a user can keep a file and rebuild the level on levelcraft.gg.
- **No "register to publish" flow inside the standalone build.** Publishing means: go to levelcraft.gg, make an account, recreate the level there (or import the downloaded JSON if/when the web editor grows an import path). Keeping the standalone build backend-free is the point.
- `MenuScene` becomes the player-facing landing (grid plays campaign levels; previously each grid button opened the editor). The old "click a level to edit" authoring shortcut is preserved behind `?dev=1`; the `?level=NN` deep-link still opens EditScene directly.

### Consequences
- The standalone build can never break from a backend outage or CORS misconfig — it has no backend. Cheap to host, cheap to keep working.
- Two builds of the same game now exist: `build:embed` (`--base=/games/ricochet/`, hosted inside the web platform's iframe) and `build:standalone` (`--base=./`, for itch / any static host). Both come from the same source; the only difference visible at runtime is which boot path runs (embed waits for `postMessage` level data; standalone shows MenuScene).
- `EditScene.isTryMode()` (`!embedLevelId && !levelPath`) is the single switch for the standalone-only behaviour (localStorage save + banner). The embedded editor and the dev-server authoring flow are untouched.
- This does **not** violate the "no payment/billing" or "no AI level creation" hard rules, and it doesn't design for a second game — it's just a second *distribution* of the one game we ship.

### Not done / future work
- A blank starting canvas for "Try the Level Editor" — it currently loads the dev sandbox level (`levels/test.json`) on first visit, which is cluttered. Low priority.
- An import path on the web editor so a downloaded standalone `.json` can be uploaded to levelcraft.gg directly (today it's recreate-by-hand).
- itch.io page setup itself (cover art, screenshots, frame size, "mobile friendly" flag) is a publishing task, not a code task.
