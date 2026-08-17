# LevelCraft Web Platform — context

The website that hosts user accounts, game hubs, embedded gameplay, level browsing, sharing, and moderation.

For platform-wide context (naming, hard rules), see `../CLAUDE.md`. For game-engine context, see `../games/CLAUDE.md`.

---

## Layout

```
web/
├── CLAUDE.md           (this file)
├── design/             (visual style, page layouts, reference mockups)
└── frontend/           (Next.js 15 + TypeScript + Tailwind, App Router)
    ├── app/            (routes — App Router conventions)
    ├── components/     (shared React components)
    ├── lib/            (Supabase client, helpers, types)
    └── public/         (static assets, including built game bundles under games/)
```

`frontend/` is a single Next.js app that handles all routes (pages + API). We don't run a separate backend service — Supabase covers data, auth, and storage; Next.js Route Handlers cover any custom server logic we need. Read `design/` before doing UI work.

---

## URL structure

```
levelcraft.gg/                          Platform homepage
levelcraft.gg/explore                   All published levels, every game
levelcraft.gg/u/{username}              User profile

levelcraft.gg/ricochet                  Ricochet hub (campaign picker)
levelcraft.gg/ricochet/play/{level_id}  Play a specific level (iframe)
levelcraft.gg/ricochet/create           Level editor

levelcraft.gg/origin                    Origin hub (what it is + published levels)
levelcraft.gg/origin/play/{level_id}    Level page (thumbnail + readout, see below)
```

**2026-08-04 — levelcraft.gg is Origin's site.** Ricochet is being retired: its
routes still resolve so already-shared links keep working, but nothing links to
it, it is filtered out of `/explore`, and the homepage no longer mentions it.
The homepage is now banner + the same three doors the game opens with — Arcade /
My Levels / World Levels (`components/HomeColumns.tsx`), using the game's own
button art copied into `public/origin/`.

**Arcade** (`/origin/arcade`, `lib/arcade.ts`) is the levels that ship *inside*
the build. **The level data is never on the website** — pressing Play goes to
`/origin/web?arcade=<slug>`, the game reads the slug and loads from `res://`:
zero download, works offline, version always matches. The site only holds the
catalog, generated in the game repo by `test/tools/make_arcade_bundle.gd` into
`data/arcade-catalog.json` + `public/origin-arcade/<slug>.png`. **Don't hand-edit
either** — add the level to `ui/arcade/arcade_catalog.tres`, re-run the tool, copy.

Two accessors the host installs for the embedded game (names are the contract
with the game repo): **`window.__lcSession`** hands over the signed-in session
(`OriginSession`), **`window.__lcExit`** lets the game hand navigation back
(`OriginHostNav`). A deep-linked player never saw the game's own front page, so
its "back" must return to the web page they came from rather than dropping them
into the app's parallel navigation. Every embed also carries a plain link
outside the canvas, which works even if the wasm never loads.

> ⚠️ `LevelThumbnail`'s fallback is Ricochet's SVG renderer and **cannot read an
> Origin payload** — it paints a blank green grid that reads as a broken image.
> Only mount it when `thumbnailUrl` is set; otherwise render your own placeholder.

**Decisions:**
- Subdirectory (`/ricochet`), NOT subdomain. Better for SEO and brand cohesion.
- Game name in URL — URLs are self-documenting.
- User profiles live at platform level (`/u/{username}`), not per-game.
- Level IDs: short alphanumeric (6–8 chars), like `aB3xK9`. NOT sequential integers, NOT UUIDs.
- **Every game gets the same URL shape, even when it can't be played here.**
  Origin is a Godot **desktop** app — no web export is deployed, so
  `/origin/play/{id}` shows the level's thumbnail and a readout of what's in it
  instead of a game frame. Same path shape means the permalink doesn't have to
  change the day a web build lands.

**Never hardcode `/ricochet/...` when turning a level row into a URL.** Levels
of different games share one table, so a card built from `levels` can be either
game. `lib/games.ts` is the single registry (`levelHref` / `editHref` /
`GAMES`); routing by hand is how every level card ended up pointing at
`/ricochet/play/{id}` and 404ing for Origin levels. `POST /api/v1/levels`
rejects a `game_type` that isn't in that registry, so no row can exist that
nothing on the site can render.

---

## Database schema (core tables)

**Critical decision:** levels for all games live in **one table** with a `game_type` column. Do NOT create separate tables per game.

```sql
users (
  id              uuid primary key,
  username        text unique not null,
  email           text unique not null,
  email_verified  boolean default false,
  created_at      timestamptz
)

levels (
  id              text primary key,    -- short alphanumeric ID
  slug            text,                 -- optional human-readable slug
  game_type       text not null,        -- 'ricochet', future games...
  creator_id      uuid references users,
  title           text,
  description     text,
  data            jsonb,                -- game-specific level data (schema owned by the game)
  status          text,                 -- draft, published, removed
  created_at      timestamptz,
  updated_at      timestamptz
)

-- Standard tables: likes, comments, plays_log, reports, follows
```

`levels.data` is opaque JSONB — its schema is owned by each game (e.g. Ricochet's level schema lives in `games/ricochet/src/shared/level-format/`). The web platform never parses level contents; it just stores and serves them by `game_type`.

---

## Tech stack (locked)

- **Framework:** Next.js 16 + React 19 + TypeScript, **App Router** (`create-next-app@latest` as of 2026-05; bumped automatically)
- **Styling:** Tailwind CSS v4 — theme tokens defined via `@theme` directive in `app/globals.css` (no `tailwind.config.js` in v4). Palette matches `design/style.md`.
- **UI components:** custom (no shadcn/ui — its default style fights the cartoon look). React + Tailwind primitives, hand-rolled.
- **Forms:** react-hook-form + zod
- **Data + Auth:** Supabase (Postgres + Auth + Storage)
- **Supabase client:** `@supabase/supabase-js` (and `@supabase/ssr` for Next.js server-side auth)
- **No ORM** at start — write Supabase queries directly. Add Drizzle later only if queries get gnarly.
- **OAuth providers:** at least one (Google or Discord — pick during Supabase setup)
- **Email:** Supabase built-in for dev; swap to Resend for production sending
- **Hosting:** Vercel (frontend) + Supabase (data/auth/storage). No separate backend service.
- **Assets:** Supabase Storage (level thumbnails, user avatars). Migrate to Cloudflare R2 only if we outgrow it.
- **Analytics:** Vercel Analytics for site PV/UV. Business metrics (plays, likes, creator counts) live in Postgres tables, incremented via RPC. Add PostHog only when we need behavioral analytics.

### Hard conventions

- **Row Level Security (RLS) on every table from day one.** All access control lives in Postgres policies, not application code. A user can only mutate their own rows; reads are policy-controlled per table.
- **Generated TS types:** run `supabase gen types typescript` and check the output into `lib/supabase/types.ts`. Regenerate after every schema change.
- **Game embedding:** each game ships as a Vite static build into `frontend/public/games/<game>/`. The play page (`/ricochet/play/{id}`) hosts the game in an `<iframe>`. Level data is passed via URL query param or `postMessage`. Phaser stays fully isolated from React.

Prefer boring tech. Single Next.js app, single Postgres database, simple deploys. No microservices.

---

## Visual style

The web platform's visual identity is **separate** from any individual game's look. The site is a **hand-drawn cartoon notebook** — warm cream paper, thick wobbly outlines, mascot illustrations, saturated accent colors. Playful but not babyish.

- Slogan: "Build your world. Share the challenge. Play together." (short: "Build. Share. Play.")
- Full visual language: `design/style.md`
- Homepage layout: `design/homepage.md`
- Reference mockup: `design/reference-homepage.png`

Each game's hub or play page may carry that game's color/feel inside the platform shell, but the chrome (nav, footer, browse, profiles) stays consistently in the cartoon-notebook style.

---

## What "Done" looks like for the web platform

- ✅ User registration, login, OAuth (at least one provider), email verification
- ✅ Game hub pages (Ricochet first)
- ✅ Browse levels page with sort/filter
- ✅ User profile pages showing their levels
- ✅ Embedded HTML5 player loads a level by ID
- ✅ Like, comment, report mechanics functional
- ✅ Basic admin panel for moderating reported content
- ✅ Deployment automated, with monitoring and error alerts
