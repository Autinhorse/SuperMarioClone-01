-- Fix: the like_count / rating aggregate triggers have never worked.
--
-- `adjust_like_count` and `adjust_level_rating` both do
-- `update public.levels set <counter> = ... where id = <the level>`, and both ran
-- as the invoking user. The only UPDATE policy on `levels` is
--
--   creators update own levels : auth.uid() = creator_id
--
-- so for a NON-owner the UPDATE matched zero rows. RLS filters rather than
-- raising, so this failed **silently**: the like/rating row is inserted, the API
-- returns 200, and the counter never moves.
--
-- And a non-owner is the only case these triggers exist for — you cannot like or
-- rate your own level (the rate route rejects it; the like button is hidden).
-- So the failure was total, not partial. It surfaced only when the desktop
-- client's rating call was exercised end-to-end against a real database:
-- the ratings row was there, `levels.rating_sum` was still 0.
--
-- The fix is what `record_play` / `record_clear` already do — those are
-- SECURITY DEFINER, which is why the play/clear counters *do* work. This brings
-- the two trigger functions in line.
--
-- `set search_path` is not optional on a SECURITY DEFINER function: without it a
-- caller can prepend a schema they control and have the function resolve
-- `levels` to their own table. Same pinning as handle_new_user / record_play.
--
-- Bodies are unchanged from 20260503130000 / 20260509230000 — only the security
-- context moves.

create or replace function public.adjust_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.levels set like_count = like_count + 1 where id = new.level_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.levels set like_count = greatest(0, like_count - 1) where id = old.level_id;
    return old;
  end if;
  return null;
end;
$$;

create or replace function public.adjust_level_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.levels
       set rating_sum = rating_sum + new.value,
           rating_count = rating_count + 1
     where id = new.level_id;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.value <> old.value then
      update public.levels
         set rating_sum = rating_sum - old.value + new.value
       where id = new.level_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    update public.levels
       set rating_sum = greatest(0, rating_sum - old.value),
           rating_count = greatest(0, rating_count - 1)
     where id = old.level_id;
    return old;
  end if;
  return null;
end;
$$;

-- Rebuild the aggregates from the rows that are actually there. Any like or
-- rating recorded before this migration left the counter behind, so the stored
-- numbers are wrong wherever a row exists. Cheap now; do it before the tables
-- get large.
update public.levels l
   set like_count = coalesce(k.n, 0)
  from (select level_id, count(*) as n from public.likes group by level_id) k
 where k.level_id = l.id and l.like_count <> k.n;

update public.levels l
   set rating_sum = coalesce(r.s, 0),
       rating_count = coalesce(r.n, 0)
  from (select level_id, sum(value) as s, count(*) as n
          from public.ratings group by level_id) r
 where r.level_id = l.id and (l.rating_sum <> r.s or l.rating_count <> r.n);
