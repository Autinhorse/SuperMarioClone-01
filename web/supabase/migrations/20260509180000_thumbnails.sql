-- 0006 — published-level thumbnails
-- Renders a small PNG of each level's first page at publish time and
-- stores it in a public Supabase Storage bucket. The URL is cached on
-- the row so card listings don't have to call getPublicUrl() per item.
--
-- NULL thumbnail_url = "use the inline SVG fallback" (LevelThumb).
-- Drafts always carry NULL (the image is only written on publish).
-- Republishing a level overwrites the same key in the bucket.

alter table public.levels
  add column thumbnail_url text;

-- Public bucket. We store one file per level, keyed by level id, so
-- file_size_limit is generous and content-type is whatever we upload
-- (start with image/png; switch to image/webp later without migration).
insert into storage.buckets (id, name, public, file_size_limit)
values ('level-thumbnails', 'level-thumbnails', true, 1048576)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- Anyone can read; only the service role uploads (the publish API uses
-- the service role key — see lib/supabase/service.ts). No "creator can
-- upload" policy because no client-side path writes here.
drop policy if exists "thumbnails are public" on storage.objects;
create policy "thumbnails are public"
  on storage.objects for select
  using (bucket_id = 'level-thumbnails');
