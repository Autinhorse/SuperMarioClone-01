# Where we left off — 2026-05-04

Hand-off note for the next session. Read this first.

## Done today

Built the Ricochet ↔ web platform integration end-to-end:

1. **Embed play flow** — `/ricochet/play/{id}` server-fetches level from
   Supabase and posts it into the iframe via `postMessage`. Game posts
   `play-started` / `level-completed` back; counts hit `record_play` /
   `record_clear` RPCs.
2. **Embed edit flow** — `/ricochet/edit/{id}` (auth + ownership gated).
   Editor's Save button posts the level back to host, host calls
   `PUT /api/levels/[id]` (RLS enforces ownership). Test-plays from
   inside the editor don't count toward stats.
3. **DB seed** — 12 levels (`seed01`..`seed12`) loaded via
   `web/supabase/seeds/02_seed_level_data.mjs`. 01–05 published+featured,
   06–12 draft sandboxes for editor testing.
4. **Layout fix** — embed-edit shrinks `#game` by 200px so the palette
   doesn't overlap the canvas.

## Verified working

- Play `/ricochet/play/seed01` → loads + plays + replay counts go up
- Edit `/ricochet/edit/seed06` → loads, edits persist, ownership gates 404 non-owners
- Editor palette no longer overlaps map

## Queued next (in order)

The user picked **editor-write-back-to-Supabase** as priority 1; that's
done. Next from earlier list:

1. **Hub / explore listing** — `/ricochet` should list published levels
   in a card grid. Need a `getLevels()` query and probably card UI.
2. **Level metadata UI** — editor only writes `data`. To rename, edit
   description, or publish a draft, the user currently has to go to
   Supabase Dashboard. Build a small metadata sidebar / form on the
   edit page.
3. **Create-new-level** — `/ricochet/create` route + flow. Currently
   you can only edit existing seed rows.
4. **Thumbnails** — no thumbnails anywhere. Strategy TBD: editor
   captures canvas → uploads to Supabase Storage on save, vs SSR-render
   from `data`.
5. **Drop local `levels/*.json`** — the standalone (non-embed)
   game still loads from these files via MenuScene. Once we don't
   care about the standalone path, remove them and have MenuScene
   either disappear or fetch from Supabase.

Ask the user which to do first.

## Key files to know

- Game embed protocol: `games/ricochet/src/embed.ts`
- Game boot dispatch: `games/ricochet/src/main.ts`
- Play page bridge: `web/frontend/app/(main)/ricochet/play/[id]/{page,GameFrame}.tsx`
- Edit page bridge: `web/frontend/app/(main)/ricochet/edit/[id]/{page,EditFrame}.tsx`
- API routes: `web/frontend/app/api/levels/[id]/{route.ts,play/route.ts,clear/route.ts}`
- Server-side level fetch: `web/frontend/lib/level.ts`
- Migrations: `web/supabase/migrations/` (latest: `20260503150000_clear_count.sql`)
- Seed: `web/supabase/seeds/02_seed_level_data.mjs`

## Workflow reminders

- Game changes need rebuild + copy:
  ```
  cd games/ricochet && npm run build:embed
  rm -rf ../../web/frontend/public/games/ricochet
  mkdir -p ../../web/frontend/public/games/ricochet
  cp -r dist/. ../../web/frontend/public/games/ricochet/
  ```
- Seed re-run (after JSON edits): `node web/supabase/seeds/02_seed_level_data.mjs`
  (needs `SUPABASE_SECRET_KEY` in `web/frontend/.env.local`).
- New migrations: paste SQL into Supabase Dashboard → SQL Editor (no CLI yet).
