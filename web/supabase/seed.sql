-- Local-only seed. Runs after migrations on `supabase db reset` / `supabase start`
-- (see [db.seed] in config.toml). NEVER reaches production — seeds are a local
-- development concept; production only ever gets the files in migrations/.
--
-- Why this exists
-- ---------------
-- Hosted Supabase grants the `anon` / `authenticated` roles table privileges on
-- the public schema as part of project bootstrap. The local stack does not
-- reproduce that for tables our migrations create, so without these GRANTs every
-- request from a logged-in user fails at the *privilege* layer:
--
--   42501  permission denied for table levels
--          hint: GRANT SELECT, INSERT ON public.levels TO authenticated
--
-- That looks almost exactly like an RLS denial, and it happens BEFORE any policy
-- is evaluated. It cost us a false "guests are correctly blocked ✓" reading while
-- verifying ADR-003 — the guest was blocked, but by the missing grant, not by the
-- policy we were trying to test. Every local RLS test is meaningless until these
-- run.
--
-- Deliberately NOT granting routines: functions already default to EXECUTE for
-- PUBLIC, and a blanket routine grant here would silently undo the REVOKEs that
-- migration 0011 relies on to keep purge_stale_guests off the public API.

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
