-- 0010 — guest accounts (Supabase anonymous sign-in)
--
-- Guests are real auth.users rows with is_anonymous = true. They get NO
-- profiles row, and since levels.creator_id / likes.user_id /
-- ratings.user_id all reference profiles(id), that single fact is what
-- makes a guest unable to author or vote. The policies below are the
-- readable statement of that intent (and produce a clean 403 instead of
-- a raw FK violation) — the foreign key is the actual guarantee.
--
-- Rationale, capability table and alternatives considered: docs/decisions.md ADR-003.
--
-- NOT part of this file (dashboard settings, do them by hand):
--   * Authentication → Sign In / Providers → enable "Anonymous sign-ins"
--   * enable CAPTCHA on the signup endpoint — the anon key is public and
--     ships inside the game binary, so minting guests is free for anyone
--     who asks. Guests own nothing, but the auth.users table still grows.


-- 1. Fallback username.
--
-- Never let a missing, malformed or already-taken username abort a signup:
-- derive a unique, format-valid placeholder from the user id instead.
-- 'player_' + 10 hex chars = 17 chars, inside the profiles.username
-- ^[a-zA-Z0-9_]{3,20}$ CHECK, and unique because the uuid is.
--
-- STABLE, not IMMUTABLE: it reads public.profiles to check availability.
create or replace function public.safe_username(candidate text, uid uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if candidate ~ '^[a-zA-Z0-9_]{3,20}$'
     and not exists (
       select 1 from public.profiles where lower(username) = lower(candidate)
     ) then
    return candidate;
  end if;
  return 'player_' || substr(replace(uid::text, '-', ''), 1, 10);
end;
$$;


-- 2. Signup trigger must tolerate anonymous users.
--
-- The version from migration 0001 inserts raw_user_meta_data->>'username'
-- straight into a NOT NULL column. An anonymous signup carries no
-- metadata, so the insert raises and the ENTIRE auth transaction rolls
-- back — anonymous sign-in returns a 500 until this is fixed.
--
-- Principle: anything running inside an auth trigger must be incapable
-- of failing. Hence safe_username above AND the exception handler below
-- (covers the race where two signups claim the same username between
-- the availability check and the insert).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_anonymous then
    return new;   -- guest: no profile row until they convert
  end if;

  begin
    insert into public.profiles (id, username)
    values (new.id, public.safe_username(new.raw_user_meta_data ->> 'username', new.id));
  exception when unique_violation then
    -- Lost the race on the username. Fall back to the id-derived one,
    -- which cannot collide. Never re-raise: a failed profile insert must
    -- not cost the user their account.
    insert into public.profiles (id, username)
    values (new.id, 'player_' || substr(replace(new.id::text, '-', ''), 1, 10))
    on conflict (id) do nothing;
  end;

  return new;
end;
$$;


-- 3. Conversion: guest -> permanent account creates the profile row.
--
-- The client calls PUT /auth/v1/user with {email, password, data:{username}}.
-- GoTrue writes raw_user_meta_data immediately but only flips is_anonymous
-- to false once the email is confirmed — so this fires at the right moment
-- and the username written earlier is still there. The user id never changes,
-- which is the whole point of using anonymous sign-in rather than a
-- homegrown guest id.
create or replace function public.handle_user_converted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_anonymous and not new.is_anonymous then
    begin
      insert into public.profiles (id, username)
      values (new.id, public.safe_username(new.raw_user_meta_data ->> 'username', new.id))
      on conflict (id) do nothing;
    exception when unique_violation then
      insert into public.profiles (id, username)
      values (new.id, 'player_' || substr(replace(new.id::text, '-', ''), 1, 10))
      on conflict (id) do nothing;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_converted on auth.users;
create trigger on_auth_user_converted
  after update on auth.users
  for each row execute function public.handle_user_converted();


-- 4. Guest predicate for policies.
--
-- ⚠️ Anonymous users hold the `authenticated` role, NOT `anon` — every
-- existing policy written as `auth.uid() = <owner>` already admits them.
-- The is_anonymous JWT claim is the only thing that separates the two,
-- so enabling anonymous sign-in WITHOUT this migration would let guests
-- publish on day one.
--
-- COALESCE covers unauthenticated callers (no claim at all); they fail
-- the auth.uid() half of every policy below anyway.
create or replace function public.is_guest()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;


-- 5. Authoring and voting exclude guests.
--
-- Redundant with the profiles FK by design (a guest has no profiles row,
-- so these inserts cannot succeed regardless). Kept because a policy
-- denial is a clean 403 with a message the client can act on, whereas an
-- FK violation is an opaque 23503 — and because this is where a future
-- reader will look for the rule.
drop policy if exists "users insert own levels" on public.levels;
drop policy if exists "non-guest users insert own levels" on public.levels;
create policy "non-guest users insert own levels"
  on public.levels for insert
  with check (auth.uid() = creator_id and not public.is_guest());

drop policy if exists "users like as themselves" on public.likes;
drop policy if exists "non-guest users like as themselves" on public.likes;
create policy "non-guest users like as themselves"
  on public.likes for insert
  with check (auth.uid() = user_id and not public.is_guest());

drop policy if exists "users rate as themselves" on public.ratings;
drop policy if exists "non-guest users rate as themselves" on public.ratings;
create policy "non-guest users rate as themselves"
  on public.ratings for insert
  with check (auth.uid() = user_id and not public.is_guest());

-- UPDATE / DELETE policies on those tables are deliberately left alone:
-- they are scoped to rows the caller owns, and a guest owns none.
--
-- record_play() is SECURITY DEFINER granted to anon + authenticated and
-- needs no change — guests report plays exactly as unauthenticated web
-- visitors already do.


-- 6. Purge stale guests.
--
-- Guests own nothing (no profiles row => no levels, likes or ratings),
-- so this deletes no user data. Clients MUST treat a dead guest session
-- as routine: catch the 401 on refresh and silently mint a new guest
-- rather than showing an error.
--
-- ⚠️ VERIFY BEFORE SCHEDULING: does a grant_type=refresh_token call
-- actually advance last_sign_in_at? If it does not, an active desktop
-- player who never re-authenticates gets purged at 90 days. That is
-- survivable (the client re-mints) but makes the interval meaningless —
-- in that case switch the predicate to a column we control.
--
-- Scheduling is separate (pg_cron), intentionally not in this migration:
--   select cron.schedule('purge-guests', '0 4 * * 0',
--                        $$select public.purge_stale_guests()$$);
create or replace function public.purge_stale_guests(older_than interval default '90 days')
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  removed integer;
begin
  delete from auth.users
   where is_anonymous
     and coalesce(last_sign_in_at, created_at) < now() - older_than;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- Admin-only: nothing in the client or the web app should be able to
-- wipe accounts. Call it from the SQL editor or from pg_cron.
revoke execute on function public.purge_stale_guests(interval) from anon, authenticated;
