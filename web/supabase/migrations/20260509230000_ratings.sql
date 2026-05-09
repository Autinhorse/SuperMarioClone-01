-- 0008 — 1-to-5 star ratings
-- Players rate levels they've played; the level row carries denormalized
-- sum + count so list pages don't need a join to render the average.
-- Aggregates stay in sync via a trigger on insert/update/delete.

create table public.ratings (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  level_id    text not null references public.levels(id) on delete cascade,
  value       smallint not null check (value between 1 and 5),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, level_id)
);

create index ratings_level_idx on public.ratings (level_id);

-- Touch updated_at on every row update. Reuses the helper used by
-- levels (see 20260503120000_profiles.sql / earlier migration for
-- public.touch_updated_at).
create trigger ratings_touch_updated_at
  before update on public.ratings
  for each row execute function public.touch_updated_at();

-- Denormalized aggregates on levels. Avg = sum/count when count > 0.
alter table public.levels
  add column rating_sum   integer not null default 0,
  add column rating_count integer not null default 0;

-- Maintain levels.rating_sum + rating_count via trigger. Mirrors the
-- adjust_like_count pattern from migration 0002.
create or replace function public.adjust_level_rating() returns trigger
language plpgsql as $$
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

create trigger ratings_adjust_level
  after insert or update or delete on public.ratings
  for each row execute function public.adjust_level_rating();

alter table public.ratings enable row level security;

-- Anyone can read aggregates (we don't expose individual rater
-- identities anywhere yet, but ratings rows themselves are public
-- read for forward-compat with a "your friends rated this" feature).
create policy "ratings are public"
  on public.ratings for select using (true);

-- Self-write only. We don't enforce "non-creator" at the RLS layer —
-- that lives in the API route (POST /api/levels/[id]/rate) so we can
-- return a friendly 403 with a code instead of an opaque RLS deny.
create policy "users rate as themselves"
  on public.ratings for insert with check (auth.uid() = user_id);

create policy "users update own ratings"
  on public.ratings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own ratings"
  on public.ratings for delete using (auth.uid() = user_id);
