-- 0004 — clear_count + record_clear
-- Tracks how many times a level has been completed (player reached the
-- exit), distinct from play_count (every session start). Ratio of
-- clear_count / play_count is a rough difficulty signal.

alter table public.levels
  add column if not exists clear_count integer not null default 0;

-- Anonymous-allowed, like record_play. WHERE clause restricts to
-- published levels so a draft can't be inflated via direct RPC poking.
create or replace function public.record_clear(level_text text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.levels
     set clear_count = clear_count + 1
   where id = level_text and status = 'published';
end;
$$;

grant execute on function public.record_clear(text) to anon, authenticated;
