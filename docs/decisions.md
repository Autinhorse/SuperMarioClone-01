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

---

## ADR-003: Guest accounts via Supabase anonymous sign-in; identity required to publish

**Date:** 2026-08-01
**Status:** Accepted

### Context

A second game is joining the platform (`games/origin/`, the Godot side-scrolling creation engine currently living in a separate working repo). Unlike Ricochet, **its primary distribution is a standalone Windows/macOS binary** — the website becomes marketing and discovery, and the whole create → publish → browse loop has to work from inside the game. That means the client itself has to hold a session, so the "make an account on levelcraft.gg" escape hatch used by the itch build (ADR-002) is no longer available.

Putting a registration wall on first launch of a desktop game is the worst possible conversion point: the player has invested nothing and wants to see the game. The proposal is to mint a **guest identity automatically on first launch**, let it use the network, and ask for an email only when the user has a reason to care.

Two facts shape the design:

1. **Supabase has this natively** (anonymous sign-in). It creates a real `auth.users` row with `is_anonymous = true`, issues a normal JWT, and converting to a permanent account later **keeps the same user id** — so anything the guest accumulated server-side carries over rather than being stranded.
2. **A guest identity is device-bound and unrecoverable.** It exists only as a refresh token in `user://` (desktop) or IndexedDB (browser). Reinstall the OS, switch machines, or clear site data and it is gone with no recovery path — support cannot help, because there is no second factor proving who the user was.

Fact 2 is the whole design constraint. Anything valuable a guest owns is something we will eventually have to tell them we lost.

### Decision

**1. Use Supabase anonymous sign-in, not a homegrown guest id.**
The client calls `POST /auth/v1/signup` with an empty body on first launch and stores the returned refresh token locally. Enable "Anonymous sign-ins" in project auth settings, with captcha enabled on the endpoint (the anon key is public and ships inside the binary — minting guests is free for anyone who asks).

**2. Guests may consume; a permanent account is required to author or to vote.**

| Capability | Guest | Permanent account |
|---|---|---|
| Browse / search / download / play published levels | ✅ | ✅ |
| Create and store levels locally | ✅ | ✅ |
| Report a play (`record_play`) | ✅ | ✅ |
| **Publish a level** | ❌ | ✅ |
| **Like / rate** | ❌ | ✅ |
| **Comment / report content** | ❌ | ✅ |

The gate sits at **publish**, not at launch. That is both the moment the user is most motivated (they just built something they want seen) and the moment identity starts to matter — an unrecoverable author account is a promise we cannot keep, and unattributable user-generated content is not moderatable. Likes and ratings are gated for a different reason: **a ranking signal is only as trustworthy as the identity behind it**, and guests can be minted in unlimited numbers.

**3. Guests get no `profiles` row.**
This is the mechanism that enforces the table above. `levels.creator_id`, `likes.user_id` and `ratings.user_id` all have `references public.profiles(id)`, so **a user with no profile row physically cannot own any of them** — the boundary is a foreign key, not a policy we have to remember to write on every future table. The explicit RLS policies below exist to produce a clean error rather than a raw FK violation, and to state the intent where a reader will look for it.

**4. Conversion happens in place.** The client calls `PUT /auth/v1/user` with `{email, password, data: {username}}`. GoTrue writes `raw_user_meta_data` immediately but only flips `is_anonymous` to false once the email is confirmed; a trigger on that transition creates the profile row. The user id never changes.

**5. Stale guests are purged on a schedule, and the client treats a dead guest session as routine.** Because guests own nothing server-side, deleting one destroys no data. The client must catch a 401 on refresh and silently mint a new guest rather than showing an error.

### Schema changes

**Applied as `web/supabase/migrations/20260801120000_guest_accounts.sql` — that file is the source of truth** (per `web/supabase/migrations/README.md`). It does five things:

1. **`safe_username(candidate, uid)`** — returns the candidate if it is format-valid *and* not already taken, otherwise a placeholder derived from the uuid (`player_` + 10 hex = 17 chars, inside the `^[a-zA-Z0-9_]{3,20}$` CHECK, unique by construction).
2. **`handle_new_user()` rewritten to tolerate anonymous signups.** The version from migration 0001 inserts `raw_user_meta_data->>'username'` straight into a NOT NULL column; an anonymous signup carries no metadata, so the insert raises and **the entire auth transaction rolls back — anonymous sign-in returns a 500 until this is fixed**. Guests now return early with no profile row. Guiding principle: *anything running inside an auth trigger must be incapable of failing*, so the insert also has a `unique_violation` handler that falls back to the id-derived name rather than re-raising.
3. **`handle_user_converted()` + `on_auth_user_converted`** — fires when `is_anonymous` flips false (i.e. after email confirmation) and creates the profile row then. Same no-fail discipline.
4. **`is_guest()`** — reads the `is_anonymous` JWT claim. ⚠️ Anonymous users hold the **`authenticated`** role, not `anon`, so every existing `auth.uid() = <owner>` policy already admits them; enabling anonymous sign-in *without* this migration would let guests publish on day one. The insert policies on `levels` / `likes` / `ratings` gain `and not public.is_guest()`.
5. **`purge_stale_guests(interval)`** — admin-only; pg_cron scheduling is deliberately left out of the migration. **Both of its details were wrong in 0010 and are corrected by `20260801130000_guest_purge_hardening.sql`** — see below.

Dashboard settings that are **not** in the file: enabling "Anonymous sign-ins", and turning on CAPTCHA for the signup endpoint (the anon key is public and ships inside the game binary, so minting guests is free for anyone who asks; guests own nothing, but `auth.users` still grows).

Hardening added while writing the migration, beyond what this ADR originally sketched: the username **uniqueness** check inside `safe_username` (format validity alone is not enough — a taken name would raise inside the trigger and abort the signup, which is the exact failure mode this migration exists to remove), and `drop ... if exists` guards throughout so the file is re-runnable in the SQL editor.

### Verified against a real stack (2026-08-01)

0010 was written by reasoning about Postgres and GoTrue. Running it against a local Supabase stack (Postgres 17.6, GoTrue v2.194.0) **found two defects that reading could not**, both now fixed in migration 0011:

**`revoke execute ... from anon, authenticated` was a no-op, and the function was internet-reachable.** Postgres grants EXECUTE on new functions to **PUBLIC** by default; those two roles never held a direct grant, so revoking from them changed nothing. The ACL read `{=X/postgres,…}` — the leading `=X` is PUBLIC. Reproduced end to end: an anonymous caller holding only the public anon key could `POST /rest/v1/rpc/purge_stale_guests {"older_than":"0 seconds"}` and **delete every anonymous user, including ones created seconds earlier** — 200 OK, 3 of 3 wiped. SECURITY DEFINER meant RLS never entered into it. Fix: `revoke all ... from public`, repeated *after* the `create or replace` (which resets the ACL — exactly how the original revoke ended up meaningless). Generalisable lesson: **any SECURITY DEFINER function in an API-exposed schema is callable over PostgREST unless PUBLIC is revoked.**

**The activity predicate purged active players.** A `grant_type=refresh_token` call does **not** advance `last_sign_in_at`, but it does advance `updated_at` (measured: `10:41:21.094 → 10:41:21.094` vs `10:41:21.095 → 10:41:23.227`). A desktop player who launches daily but never re-authenticates only ever refreshes, so the original predicate would purge them at 90 days. Fix: `greatest(updated_at, last_sign_in_at)` with `created_at` fallbacks.

Everything else checked out: anonymous signup returns 200 (it is a 500 without 0010), the JWT carries `role: authenticated` + `is_anonymous: true`, a guest creates an `auth.users` row and **no** `profiles` row, guest inserts into `levels` / `likes` / `ratings` are refused by RLS, a real signup creates its profile and publishes normally, and a second user claiming a taken username falls back to `player_<uuid>` without the signup failing.

A local-only `web/supabase/seed.sql` was added at the same time: hosted Supabase grants `anon`/`authenticated` table privileges during project bootstrap, the local stack does not. Without it every request fails at the *privilege* layer (`42501 permission denied for table levels`) **before any policy runs** — which cost us a false "guests are correctly blocked ✓" reading, since the guest was blocked by the missing grant rather than by the policy under test.

Scheduling: run `purge_stale_guests()` weekly via pg_cron, using the 0011 version.

### Consequences

- **The capability boundary is enforced by a foreign key**, so a future table that references `profiles(id)` inherits it automatically. A future table keyed on `auth.users(id)` directly would *not* — that is the one thing to watch for.
- `homepage_stats().users_count` counts `profiles`, so it stays honest: guests never inflate the public user count. Same for `top_creators`.
- `record_play` is `SECURITY DEFINER` granted to `anon, authenticated` and needs no change — guests can report plays, exactly as unauthenticated web visitors already do.
- **The "same user id survives conversion" property buys nothing today** and is the main reason to adopt this now rather than later. There is currently no per-user server-side state a guest could accumulate (play counts are level-scoped counters, not per-user rows). The moment we add cleared-level tracking, favourites, or follows, retrofitting identity would strand every guest's history — doing it now costs one trigger rewrite.
- The multi-identity problem the founder identified is real but **defanged**: a user who is a guest on desktop and a guest in two browsers has three ids, none of which owns anything. Converting any one of them loses nothing; the others are purged eventually. Had guests been allowed to publish, this would instead be a merge problem (levels stranded under an id whose email is already taken by another id) with no clean solution.
- Local level files stay account-independent. A user who loses their guest session still has their levels on disk and can publish them after signing up. Cloud is a distribution channel, not the store of record — this is what makes the whole "unrecoverable guest" tradeoff acceptable.
- Publish, like and rate now have two failure modes to surface in UI (not signed in / signed in as guest). The client should treat them as one: "Create an account to publish."

### Alternatives considered

- **No guest identity at all.** Since guests may only read published levels and call `record_play`, the plain `anon` API key already permits exactly that today — anonymous sign-in is strictly forward-looking. Rejected because the retrofit cost lands on users (stranded history), not on us.
- **Guests may publish (a fully open guest tier).** Rejected: creates unrecoverable authorship, unattributable UGC with no moderation contact, unlimited free spam identities, and the id-merge problem above.
- **Auto-generate a `guest_xxxx` profile row for every guest** (option A when this was discussed). Rejected: pollutes the username namespace and `/u/{username}`, inflates `users_count`, and re-opens every hole that the missing FK target closes for free.

### Not done / future work
- Client-side conversion UX (where the prompt appears, what it says) is a product decision, not recorded here.
- OAuth linking for guests (`linkIdentity`) — email/password conversion first; Google/Discord from a desktop binary needs a loopback redirect + PKCE and is deferred.
- Whether Steam identity can stand in for a permanent account on a future Steam build. If so, `profiles` will want a `steam_id` column; cheaper to add before launch than after.

---

## ADR-004: Origin ships desktop-first; the game client talks to a versioned API, not to PostgREST

**Date:** 2026-08-01
**Status:** Accepted — **extended by ADR-005** (Origin also gets a web build; it is the same client, and the website stops being an API consumer). Nothing below is overturned; ADR-005 settles questions this one left open.

### Context

`games/origin/` (the Godot 2D platformer creation engine, currently developed in a separate working repo) joins the platform as the second game. Its distribution model is the opposite of Ricochet's:

- **Ricochet** is a web game. The Phaser build runs in an iframe on levelcraft.gg, the host page holds the session, and the game is handed level data via `postMessage` (`games/ricochet/src/embed.ts`). The game never knows who the user is.
- **Origin** ships as a **standalone Windows/macOS binary** (Steam later). It is the product. The website's job is marketing, discovery and SEO — level pages, screenshots, a download button. The entire create → playtest → publish → browse → play-others loop must work inside the executable, with no browser involved.

This changes three things that ADR-002's model relied on: the client must hold its own session (addressed by ADR-003), the client must reach the backend directly, and the client is **shipped software that cannot be updated in lockstep with the database**.

That last point is the crux. A player can be running a build from two years ago. Whatever contract the client depends on has to keep working, or that install is bricked.

Note: this supersedes the platform-level constraint "do not design as if a second game is launching tomorrow" (root `CLAUDE.md`) — it now is. The multi-game architecture this relies on (`levels.game_type`, opaque `levels.data`) already exists and is used as-is; nothing new is being generalized.

### Decision

**1. The client does not talk to PostgREST. It talks to a versioned `/api/v1/` surface on the Next.js app.**

Two independent reasons, either sufficient on its own:

- *Business logic is in Route Handlers, not in RLS.* The playtest gate (`playtest_required`), thumbnail generation, `revalidatePath`, and above all the **fork/swap republish** — where editing a published level forks a draft and republishing swaps its content back into the parent to preserve the parent's id, `play_count`, `like_count` and permalinks (migration `20260509210000_revision_swap.sql`) — all live in `app/api/levels/[id]/route.ts`. A client writing to `levels` directly bypasses every one of them, and would silently destroy play counts and external links on the first edit of a published level.
- *Schema changes must not brick shipped binaries.* A versioned API is the only place a compatibility shim can live.

**2. The API surface is bearer-authenticated and reuses RLS.**

Existing routes authenticate from cookies via `@supabase/ssr`; a desktop client sends `Authorization: Bearer <access_token>`. This is not a config difference — the existing routes are unusable by the client. So: a parallel `/api/v1/` namespace, whose handlers build a Supabase client carrying the caller's JWT.

**`service_role` is not used.** Requests run as the user, so the hard convention "all access control lives in Postgres policies" (`web/CLAUDE.md`) survives intact, and ADR-003's guest boundary applies automatically. Shared logic is extracted from the existing handlers, not duplicated.

```
POST   /api/v1/levels                      create (returns short id)
GET    /api/v1/levels                      browse: q, sort, game_type, page
GET    /api/v1/levels/{id}                 fetch data + metadata
PUT    /api/v1/levels/{id}                 replace data (clears last_cleared_at)
PATCH  /api/v1/levels/{id}                 title / status (publish runs the gate + swap)
DELETE /api/v1/levels/{id}
POST   /api/v1/levels/{id}/thumbnail       client-rendered PNG upload (see 4)
POST   /api/v1/levels/{id}/{play,clear,rate,report}
GET    /api/v1/me/levels                   own drafts + published, for the sync pass
```

Every request carries `X-Client-Version`. The server may answer `426 Upgrade Required` with a human-readable reason; the client surfaces it as "please update", never as a raw error.

**3. Level data crosses the wire as JSON, and the game gains an explicit codec.**

`levels.data` is `jsonb`. Origin currently stores levels as Godot `.tres` resources, which cannot go in that column. A `LevelCodec` (`to_dict` / `from_dict`) becomes the serialization boundary, and local files move to `.json` too — one format, and a local file is directly uploadable.

This has a consequence the game side must absorb: **Origin's entire backward-compatibility mechanism today is implicit** — a `.tres` missing an `@export` field silently keeps the class default. JSON has no such behaviour. Every field needs an explicit default at one place in the codec. That is a cost, but it is also the first place the project has ever had to put a real migration hook (`from_dict` sees `version` and can rewrite old payloads), which it currently lacks entirely.

**4. Thumbnails for Origin are rendered by the client.**

`publishLevelThumbnail` renders Ricochet levels server-side on Vercel. Godot cannot run there. Origin's editor renders a PNG locally and uploads it; the server stores it under **the same storage key convention** (`publicId` = parent id when the row is a fork), so the existing thumbnail URL stability guarantee is unchanged. Ricochet's path is untouched.

**5. Version negotiation is per level, and being unable to render a level is a hard stop.**

Add `levels.format_version smallint not null default 1`; the level JSON carries the same number.

**The number is computed per level from the features it actually uses**, not a global game-version counter — a level built only from first-generation elements stays readable by old clients no matter how many elements the game adds later. The computation and the feature table it depends on are specified game-side in Origin's `docs/level/level_codec.md` §1 (`min_client_format`). Rules:

- The client **refuses to open a level in the editor** whose `format_version` exceeds what it understands. Origin currently skips unknown object types silently — harmless when reading, **destructive on re-save**, because saving would strip every element the old build didn't recognize.
- The client also **refuses to play it**, and says "this level needs a newer version of the game". Silently dropping an unknown hazard or platform changes whether the level is solvable at all; the player would experience a broken level and rate it accordingly. Refusing is the honest failure.
- Browse requests pass the client's max supported version so the server can filter or flag levels it cannot handle, rather than showing them and failing on open.

Silent skipping stays only as the last-resort guard against corrupt data.

**6. Sync is offline-first, with the local library as the source of truth for the user's own drafts.**

Each local level carries a sync block: `{remote_id, remote_updated_at, local_updated_at, published}`.

- Create and edit work fully offline. Publish and browse require network and say so plainly.
- Publishing a level that was already published maps directly onto the existing fork/swap machinery — the client holds the fork's id and republishes it; the server does the swap. No new server concept.
- **Conflicts are resolved by the user, never automatically.** If `remote_updated_at` moved since the client last saw it (the level was edited from another install), the client offers overwrite / discard local / save as a new level. Level data cannot be meaningfully merged; pretending otherwise loses work.
- Downloaded levels are cached in a separate read-only directory so they can never be mistaken for the user's own drafts.
- **No offline publish queue.** Publishing runs the playtest gate, uploads a thumbnail and can fail for reasons the user needs to see. A background queue that fails quietly is worse than an honest "you're offline".

**7. The Godot web export is deferred, not planned.**

With the website demoted to a funnel, `levelcraft.gg/origin` ships as level pages, screenshots and a download CTA. A Godot 4 web build is one to two orders of magnitude larger than Phaser's and drags in COOP/COEP header requirements; none of that is on the critical path any more. Revisit as an optional demo later.

### Consequences

- **Two client shapes now exist against one platform**: Ricochet (host holds the session, game is handed data) and Origin (client holds the session, calls the API). The `levels` table serves both unchanged — the payoff of the one-table + `game_type` decision.
- ADR-002's "no register-to-publish inside the game; go to levelcraft.gg" applies to the *itch standalone build* and is unaffected. Origin deliberately does the opposite, because for Origin there is no host page to defer to.
- `/api/v1/` becomes a contract with a support obligation: once a version ships in a binary, breaking it strands users. Additive changes only; a `/api/v2/` for anything else.
- Two auth paths to keep working: cookie sessions (web) and bearer tokens (client). Shared handler logic must not assume either.
- Extracting logic out of `app/api/levels/[id]/route.ts` touches code the live site depends on. Do it as pure extraction, verified against Ricochet's flows, before adding anything new.
- Play counts and clear reports from a client that runs on the user's machine are unverifiable. This is already true of the web build. Accepted: the playtest gate prevents accidents, not cheating — do not build anti-cheat for it.
- The `.tres` → JSON move is the single largest piece of game-side work and blocks everything else that touches the platform. It is also independently worth doing.

### Alternatives considered

- **Client talks to PostgREST directly with the user JWT** (the standard Supabase client model, which the web frontend uses). Rejected: bypasses the publish gate, thumbnails and the fork/swap republish, and freezes the schema forever the moment a binary ships.
- **Make the existing cookie routes also accept bearer tokens.** Cheaper, and tempting. Rejected because it makes one route surface serve two consumers with different upgrade cadences — the web app can be redeployed at will, an installed binary cannot. Keeping them separate is what makes it safe to change the web-facing ones.
- **Desktop exports a file, user uploads it on the website.** Rejected by the founder: the whole experience must live in the client, and asking a player to leave the game to publish breaks the loop this product is about.
- **Ship Origin as a web game like Ricochet.** Rejected: it is designed as a downloadable game (Steam target), and the Godot web build's size and threading requirements make it a poor primary distribution.

### Not done / future work
- Where the level browser lives inside the game's UI, and how much of it is reachable offline — product design, not recorded here.
- Rate limiting and abuse controls on `/api/v1/` writes.
- Whether `format_version` should also gate *browse* results server-side by default or only on request.
- Steam: whether a Steam session can mint a LevelCraft session (see ADR-003's note on `profiles.steam_id`).

---

## ADR-005: Origin's web build is the same client, not a second one; the website is not an API consumer

**Date:** 2026-08-02
**Status:** Accepted

### Context

ADR-004 was drawn against a world where Origin was desktop-only, and it rejected "ship Origin as a web game like Ricochet" as a *primary distribution* choice. That rejection stands. What changed is that Origin will also get a **web build, soon**, as a Demo-like subset — so the question is no longer *whether* Origin runs in a browser, but what that build is architecturally.

Four constraints from the founder (2026-08-02), stated as requirements, not preferences:

1. **One login on levelcraft.gg gets you everything.** Signing in twice on the site — worse, ending up with two different accounts — is unacceptable. The technique is free.
2. **The App is the full feature set**, including accounts and content management. The website is a Demo-like *subset*.
3. A separate **Demo build of the App** with a reduced feature set will follow.
4. **Ricochet is an experiment.** Keeping it running is nice-to-have; folding its gameplay into Origin is under consideration. It does not get a vote on this design.

The immediate confusion this ADR resolves: the codebase appeared to have two API families split by game (`/api/levels/*` for Ricochet, `/api/v1/*` for Origin). It does not. The split is by **client shape** — browser-with-cookies vs native-with-bearer — and today that merely *coincides* with the games. Origin's web build breaks the coincidence, and per-game API paths would break with it.

### Decision

**1. Origin's web build is a Godot Web export of the same project, hosted same-origin, calling `/api/v1/*`.**

It is not a second client. The same GDScript — `AccountService`, `LevelApi`, `LevelEditor.publish_level()`, the publish dialog — runs in both. Web and desktop differ in exactly one place: **where the session comes from.** Same-origin means no CORS work on `/api/v1/`.

**2. Single sign-in: the host page injects its session into the WASM.**

The page embedding the build hands the browser's existing Supabase session to the game through JS interop (`JavaScriptBridge`); `AccountService` gains an *inject session* entry point that skips its own mint/login path. Desktop keeps doing what it does today. The website never asks for a second login, and there is exactly one identity per browser.

⚠️ The interop handoff is **not yet verified** — prove it on a real web export before committing UI to it.

**3. The Ricochet model is rejected for Origin.**

Ricochet's shape is "host page holds the session, the game never knows who the user is, level data arrives via `postMessage`". For Origin that would mean reimplementing the publish gate, thumbnail upload, `swappedToId` handling and content management in the host page — while the App, being the superset, must own that logic anyway. Two implementations of the same rules, one of them secondary, guaranteed to drift.

**4. The website is not an API consumer. `/api/v1/*` is the game client's surface, exclusively.**

This is already almost true: every page reads server-side (`lib/{explore,level,profile,homepage,creators,campaign}.ts` all use the server Supabase client). Only two cross-game browser components deviate — `RatingWidget` and `DeleteLevelButton` — and they **move to Server Actions**. The remaining `/api/levels/*` routes are Ricochet-only and live and die with it.

We do **not** make `/api/v1/*` accept cookies. That is the mirror of the alternative ADR-004 already rejected, and it carries three concrete costs: `proxy.ts` deliberately excludes `api/v1` from cookie refresh (an expired session would surface as intermittent 401s that "fix themselves on reload"), cookie-authenticated mutations are CSRF-reachable where bearer ones are not, and `X-Client-Version` is meaningless for a caller that deploys with the server.

**5. The axis is client shape. Per-game API paths are rejected outright.**

Handlers are game-agnostic — `lib/levels/mutations.ts` never reads `game_type`; it is a column value. Splitting to `/api/{game}/levels` yields byte-identical handlers per game, or a path segment no handler reads. It also fights cross-game browse, where `game_type` is a *query parameter*.

**6. `App ⊇ Web` is a standing obligation on `/api/v1/`.**

Anything the website can do, the client must be able to do. Current gaps: `GET /api/v1/levels` (browse/search/sort/page — specified in ADR-004 §2, never built), `rate`, `play`/`clear`, `report`. Client-side, `LevelApi` already has `my_levels`/`unpublish`/`remove` with no UI behind them.

**7. Demo feature-gating is a third dimension. Do not fold it into `UnlockService`.**

`UnlockService` gates *elements* by player tier, and only in the editor. "This build is the Demo" is orthogonal. Sharing one table would make "why can't I see this button" unanswerable — tier, or build?

### Consequences

- ADR-004's "two client shapes" becomes **one client shape for Origin** (bearer, session injected or self-minted) plus the website as a non-API consumer. Ricochet remains the odd one out until it is merged or retired.
- `/api/v1/` is now on the critical path for the web build too. It can no longer be treated as "the desktop thing".
- Because the website deploys with the server, it can always move to a future `/api/v2/` immediately; v1 stays frozen for shipped binaries only. Letting the website call v1 would have made v1 undeletable — another reason for decision 4.
- Godot web export's size and threading cost (ADR-004's reason to reject web as *primary* distribution) now applies to the Demo subset. Budget it as a real constraint, not an afterthought.
- Two sessions can still exist in one browser (site cookie + a self-minted game session) if decision 2 is implemented incorrectly. That is the failure mode to test for, explicitly.

### Alternatives considered

- **Split the API by game (`/api/origin/*`, `/api/ricochet/*`).** Rejected — see decision 5. The founder proposed it as a legibility fix; the illegibility is real but the cause is that neither family is *named* after what varies, not that games are missing from the path.
- **Merge everything onto `/api/v1/*` with cookie fallback.** Rejected — see decision 4. Attractive because it yields literally one URL space, but the website already doesn't need URLs.
- **Rename `/api/levels/*` to `/api/web/*` to name the axis.** Dropped: decision 4 makes those routes Ricochet-only, so the name would document a thing we are removing.

### Addendum (2026-08-03): the injected session is an access token only

Decision 2 said "the page hands the browser's existing Supabase session to the game" without saying *which parts* of it. Implementing it forced the question, and the answer is narrower than it sounds: **the host injects the access token and nothing else. It never injects the refresh token.**

Supabase rotates refresh tokens — spending one invalidates the copy you didn't spend. If the host page's supabase-js and the game's `AccountService.refresh()` each held one, they would race about an hour in and knock each other out, surfacing to the player as "I was in the middle of a level and it signed me out". Nothing in the client could fix that, because both sides are behaving correctly.

So the split is:

- **Refreshing belongs to the host page, exclusively.** supabase-js already does it on a timer and writes the cookie.
- **The game pulls, it does not receive.** The host exposes `window.__lcSession()` returning `{access_token, expires_at, user}` or `null`; the game reads it on demand. Pull beats push here for two reasons: `AccountService` is a static-coroutine class (GDScript signals are instance members, so a static class cannot declare one), and token expiry then costs nothing — "ask again" is the same line of code as "ask the first time". No invalidation message, no mailbox, no ready state.
- **`AccountService` on web never mints and never persists.** `ensure_session()` asks the host instead of minting a guest, `_ensure_loaded()` skips `user://settings.cfg` entirely, and `_save()` early-returns. That last one is what actually closes the failure mode this ADR's Consequences section named: `user://` on the web is IndexedDB and survives across sessions, so a guest token minted by an earlier build would otherwise still be sitting there waiting to become a second identity.

Implementation: `components/OriginSession.tsx` (host) ↔ `runtime/net/host_session.gd` (game). The accessor name is the contract between the two repos. Covered by `test/m83_host_session_smoke.gd`, which injects a fake host so the web path runs headless.

### Not done / future work

- ~~Verifying `JavaScriptBridge` session injection on a real Godot web export.~~ Implemented 2026-08-03 (see addendum); still to be exercised end-to-end against a deployed build.
- Filling the remaining `/api/v1/` gaps from decision 6 — `rate`, `play`/`clear`, `report`. (`GET /api/v1/levels` shipped 2026-08-02.) And the client UI (browse, download, rate, my-levels) that makes `App ⊇ Web` true rather than aspirational.
- A "top rated" browse sort. It needs `rating_sum / rating_count` as a generated column — PostgREST cannot order by an expression, and ordering by `rating_sum` alone is popularity wearing a rating's clothes.
- How the Demo build is gated, and whether the gate is compile-time or runtime.
- Whether Ricochet is merged into Origin or retired; either removes `/api/levels/*` entirely.
