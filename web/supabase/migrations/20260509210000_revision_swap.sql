-- 0007 — revision-swap publish for already-published levels
-- Editing a published level forks a draft copy (parent_id set to the
-- published row's id). Republishing the fork swaps its data + thumbnail
-- back into the parent and deletes the fork — preserving the parent's
-- id, play_count, like_count, created_at so external links and stats
-- carry across edits.
--
-- Constraints:
--   * cascade delete: drop the parent → fork goes too (no dangling drafts)
--   * unique (parent_id, creator_id): a creator owns at most one fork
--     per parent, so /ricochet/edit/{id} is idempotent (re-entering the
--     editor always lands on the same fork instead of accumulating)
--   * status check: a fork can only be a draft. Forks reaching
--     'published' would mean the swap path got bypassed — surface that
--     as a constraint violation rather than a silent product bug.

alter table public.levels
  add column parent_id text references public.levels(id) on delete cascade;

create unique index levels_one_fork_per_creator
  on public.levels (parent_id, creator_id)
  where parent_id is not null;

alter table public.levels
  add constraint forks_must_be_draft
  check (parent_id is null or status = 'draft');
