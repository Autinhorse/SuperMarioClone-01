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
levelcraft.gg/ricochet                  Ricochet hub (browse, featured levels)
levelcraft.gg/ricochet/play/{level_id}  Play a specific level
levelcraft.gg/ricochet/create           Level editor (when built)
levelcraft.gg/u/{username}              User profile
```

**Decisions:**
- Subdirectory (`/ricochet`), NOT subdomain. Better for SEO and brand cohesion.
- Game name in URL — URLs are self-documenting.
- User profiles live at platform level (`/u/{username}`), not per-game.
- Level IDs: short alphanumeric (6–8 chars), like `aB3xK9`. NOT sequential integers, NOT UUIDs.

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
