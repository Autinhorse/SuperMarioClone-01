-- 0011 — purge_stale_guests: fix the activity predicate and actually lock it down
--
-- Two defects in 0010, both found by running the migration against a local
-- Supabase stack (postgres 17.6, GoTrue v2.194.0) instead of reasoning about it.
-- 0010 is already applied to production, hence a follow-up rather than an edit.


-- ── Defect 1: the function was callable by anyone, with a caller-controlled interval ──
--
-- 0010 ended with `revoke execute ... from anon, authenticated`, which is a
-- NO-OP: those roles never held a direct grant. Postgres grants EXECUTE on new
-- functions to PUBLIC by default, and both roles inherit it from there. The ACL
-- read {=X/postgres,postgres=X/postgres} — that leading `=X` is PUBLIC.
--
-- Consequence, reproduced end to end on the local stack: an anonymous caller
-- holding nothing but the (public, ships-in-the-binary) anon key could do
--
--   POST /rest/v1/rpc/purge_stale_guests  {"older_than": "0 seconds"}
--
-- and delete EVERY anonymous user, including ones that signed up seconds ago.
-- It returned 200 and wiped 3 of 3. SECURITY DEFINER means it ran with owner
-- privileges, so RLS never entered into it.
--
-- Blast radius today is bounded (guests own nothing server-side, so the client
-- just mints a new guest), but this is an internet-exposed mass-DELETE on
-- auth.users, and ADR-003 adopts anonymous auth precisely so that per-user
-- state can be attached later — at which point it becomes real data loss.
--
-- REVOKE FROM PUBLIC is the line that matters. The other two are belt-and-braces
-- and documentation.
revoke all on function public.purge_stale_guests(interval) from public;
revoke all on function public.purge_stale_guests(interval) from anon;
revoke all on function public.purge_stale_guests(interval) from authenticated;

-- Lesson worth generalising: any SECURITY DEFINER function in an API-exposed
-- schema is reachable over PostgREST unless PUBLIC is revoked. Audited the rest
-- of the schema while here — record_play / record_clear are anon-callable *by
-- design* (see 0002), handle_new_user / handle_user_converted return `trigger`
-- so PostgREST cannot invoke them usefully, and safe_username is read-only.
-- purge_stale_guests was the only genuine hole.


-- ── Defect 2: the activity predicate purged active players ──
--
-- 0010 used `coalesce(last_sign_in_at, created_at)` with a note to verify it
-- before scheduling. Verified; it is wrong. A grant_type=refresh_token call
-- does NOT advance last_sign_in_at, but it DOES advance updated_at:
--
--   before refresh:  last_sign_in_at 10:41:21.094 | updated_at 10:41:21.095
--   after  refresh:  last_sign_in_at 10:41:21.094 | updated_at 10:41:23.227
--
-- A desktop player who launches the game daily but never re-authenticates only
-- ever refreshes, so under the old predicate they would be purged at 90 days.
--
-- GREATEST over both columns rather than just updated_at: costs nothing, and
-- keeps this correct if a future GoTrue starts touching last_sign_in_at again.
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
     and greatest(
           coalesce(updated_at, created_at),
           coalesce(last_sign_in_at, created_at)
         ) < now() - older_than;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- CREATE OR REPLACE resets the ACL to the default (PUBLIC gets EXECUTE), so the
-- revokes have to be repeated *after* it. Order matters here — this is exactly
-- how 0010's revoke ended up meaningless.
revoke all on function public.purge_stale_guests(interval) from public;
revoke all on function public.purge_stale_guests(interval) from anon;
revoke all on function public.purge_stale_guests(interval) from authenticated;
