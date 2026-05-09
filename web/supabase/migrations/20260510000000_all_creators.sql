-- 0009 — all_creators RPC
-- Powers the /creators page: every profile that has at least one
-- published, non-fork level, with their aggregate stats. Mirrors
-- top_creators in shape but unbounded (no LIMIT) and adds the like /
-- rating aggregates the listing surfaces.
--
-- INNER JOIN excludes profiles with no published levels — the page is
-- a "contributors list", not a user directory. If we ever want to
-- list everyone with an account, that's a different RPC.

create or replace function public.all_creators()
returns table(
  username      text,
  created_at    timestamptz,
  level_count   bigint,
  total_plays   bigint,
  total_likes   bigint,
  rating_sum    bigint,
  rating_count  bigint
)
language sql stable as $$
  select p.username,
         p.created_at,
         count(l.id)::bigint                            as level_count,
         coalesce(sum(l.play_count),    0)::bigint      as total_plays,
         coalesce(sum(l.like_count),    0)::bigint      as total_likes,
         coalesce(sum(l.rating_sum),    0)::bigint      as rating_sum,
         coalesce(sum(l.rating_count),  0)::bigint      as rating_count
    from public.profiles p
    join public.levels l on l.creator_id = p.id
                        and l.status = 'published'
                        and l.parent_id is null
   group by p.id, p.username, p.created_at
   order by total_plays desc, level_count desc, p.username asc;
$$;

grant execute on function public.all_creators() to anon, authenticated;
