-- 0005 — playtest gate (last_cleared_at)
-- Records when the creator last cleared their own level end-to-end via
-- the editor's publish-verify playthrough. Compared against
-- levels.updated_at by the publish API so each published version has
-- been actually played through after its last edit.
--
-- Gate rule (enforced in /api/levels/[id] PATCH when transitioning to
-- 'published'):
--   last_cleared_at IS NOT NULL AND last_cleared_at >= updated_at
--
-- Editing the level bumps updated_at (existing levels_touch_updated_at
-- trigger), which automatically invalidates any prior clear.

alter table public.levels
  add column last_cleared_at timestamptz;

-- Grandfather existing published levels: stamp last_cleared_at = updated_at
-- so a no-edit republish (e.g. via Unpublish→Publish) doesn't force a
-- re-test on a level that hasn't changed since release. Editing any
-- such level will bump updated_at and re-engage the gate as expected.
update public.levels
   set last_cleared_at = updated_at
 where status = 'published';
