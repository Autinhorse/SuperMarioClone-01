-- 0002 — levels + likes (and homepage RPCs)
-- All games share this table; `game_type` is the discriminator.
-- `data` JSONB is opaque to the platform; each game owns its own schema.

-- Short alphanumeric ID generator. ~55^6 = 27B combinations, collisions
-- statistically negligible until billions of rows. Excludes visually
-- ambiguous chars (0/O/o, 1/I/l/i).
create or replace function public.generate_short_id() returns text
language plpgsql as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
begin
  for i in 1..6 loop
    result := result || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
  end loop;
  return result;
end;
$$;

create table public.levels (
  id            text primary key default public.generate_short_id(),
  game_type     text not null,
  creator_id    uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  data          jsonb not null default '{}'::jsonb,
  status        text not null default 'draft' check (status in ('draft', 'published', 'removed')),
  is_featured   boolean not null default false,
  play_count    integer not null default 0,
  like_count    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  constraint title_length check (char_length(title) between 1 and 100)
);

create index levels_creator_idx on public.levels (creator_id);
create index levels_published_idx on public.levels (status, published_at desc) where status = 'published';
create index levels_featured_idx on public.levels (is_featured, published_at desc) where is_featured and status = 'published';

create trigger levels_touch_updated_at
  before update on public.levels
  for each row execute function public.touch_updated_at();

-- Set published_at on first transition to 'published'.
create or replace function public.set_published_at() returns trigger
language plpgsql as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger levels_set_published_at
  before update on public.levels
  for each row execute function public.set_published_at();

alter table public.levels enable row level security;

create policy "published levels are public"
  on public.levels for select using (status = 'published');

create policy "creators read own levels at any status"
  on public.levels for select using (auth.uid() = creator_id);

create policy "users insert own levels"
  on public.levels for insert with check (auth.uid() = creator_id);

create policy "creators update own levels"
  on public.levels for update using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

create policy "creators delete own levels"
  on public.levels for delete using (auth.uid() = creator_id);


-- Likes
create table public.likes (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  level_id    text not null references public.levels(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, level_id)
);

create index likes_level_idx on public.likes (level_id);

-- Maintain levels.like_count via trigger (denormalized for fast list rendering).
create or replace function public.adjust_like_count() returns trigger
language plpgsql as $$
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

create trigger likes_adjust_count
  after insert or delete on public.likes
  for each row execute function public.adjust_like_count();

alter table public.likes enable row level security;

create policy "likes are public"
  on public.likes for select using (true);

create policy "users like as themselves"
  on public.likes for insert with check (auth.uid() = user_id);

create policy "users unlike own"
  on public.likes for delete using (auth.uid() = user_id);


-- Anyone (including anon) can record a play. SECURITY DEFINER bypasses RLS,
-- but the WHERE clause restricts to published levels only.
create or replace function public.record_play(level_text text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.levels
     set play_count = play_count + 1
   where id = level_text and status = 'published';
end;
$$;

grant execute on function public.record_play(text) to anon, authenticated;


-- Homepage aggregate: one round-trip for the stats strip.
create or replace function public.homepage_stats() returns json
language sql stable as $$
  select json_build_object(
    'levels_count',    (select count(*) from public.levels where status = 'published'),
    'users_count',     (select count(*) from public.profiles),
    'total_plays',     (select coalesce(sum(play_count), 0) from public.levels where status = 'published'),
    'daily_creators',  (select count(distinct creator_id) from public.levels where created_at >= now() - interval '24 hours')
  );
$$;

grant execute on function public.homepage_stats() to anon, authenticated;


-- Top creators by total plays across their published levels.
create or replace function public.top_creators(limit_count int default 3)
returns table(username text, total_plays bigint, level_count bigint)
language sql stable as $$
  select p.username,
         coalesce(sum(l.play_count), 0)::bigint as total_plays,
         count(l.id)::bigint as level_count
    from public.profiles p
    join public.levels l on l.creator_id = p.id and l.status = 'published'
   group by p.id, p.username
   order by total_plays desc, level_count desc
   limit limit_count;
$$;

grant execute on function public.top_creators(int) to anon, authenticated;
