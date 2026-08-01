-- 0012 — levels.format_version
--
-- "Minimum client generation required to open this level" (ADR-004 §5).
--
-- ⚠️ This is NOT a global schema version that ticks up whenever the game adds
-- an element. It is computed per level from the features that level actually
-- uses (game side: LevelFormat.min_client_format() in levelcraft.origin).
-- A global counter would break every old client the moment a new element
-- shipped, even for levels that don't contain it; this way a level built only
-- from first-generation elements stays openable forever.
--
-- Default 1 covers every existing row: everything published so far is
-- first-generation by definition.
--
-- This migration only adds storage. Filtering browse results by what the
-- caller can open is deliberately not done yet — ADR-004 lists it as open
-- ("whether format_version should also gate browse results server-side by
-- default or only on request"), and getting it wrong hides levels from people
-- who could play them.
alter table public.levels
  add column format_version smallint not null default 1;

-- Cheap to maintain and the browse filter (when it lands) will want it.
create index levels_format_version_idx on public.levels (format_version);
