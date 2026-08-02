-- Level reports (moderation inbox).
--
-- Sketched in ADR-004 §2 alongside play/clear/rate but never built — those three
-- had cookie-route ancestors to mirror, this one had nothing. The desktop client
-- is the first surface that needs it: a player browsing community levels has no
-- other way to flag something, and "email us" is not a moderation pipeline.
--
-- Deliberately minimal. There is no moderator UI yet, so this table is an inbox
-- that a human reads with SQL. What matters now is that the rows are captured
-- with enough structure to act on later (which level, who, why, and whether it
-- has been dealt with) — adding structure after reports exist means backfilling
-- guesses.

create table public.reports (
  id           bigint generated always as identity primary key,
  level_id     text not null references public.levels(id) on delete cascade,
  -- References profiles, not auth.users. That is the ADR-003 guest boundary
  -- doing double duty: a guest has no profiles row, so the FK makes it
  -- impossible for an anonymous session to file a report. Same trick as
  -- levels.creator_id. Reporting carries a moderation cost; it should require
  -- an account the same way publishing does.
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  reason       text not null check (reason in ('inappropriate', 'broken', 'stolen', 'other')),
  -- Optional free text. Capped so one report can't be used as blob storage.
  detail       text check (detail is null or char_length(detail) <= 1000),
  status       text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at   timestamptz not null default now(),
  -- One report per person per level. A second submission should update the
  -- reporter's mind, not inflate the queue — and without this, a single angry
  -- user can bury a level under a hundred rows.
  unique (level_id, reporter_id)
);

create index reports_open_idx on public.reports (created_at desc) where status = 'open';
create index reports_level_idx on public.reports (level_id);

alter table public.reports enable row level security;

-- Reports are NOT public. Unlike ratings (where the aggregate is the point),
-- a visible report queue would itself become an attack surface: "this level has
-- 5 reports" is a claim anyone could manufacture and screenshot. Reporters can
-- see their own submissions so the client can say "you already reported this".
create policy "reporters read own reports"
  on public.reports for select using (auth.uid() = reporter_id);

create policy "users report as themselves"
  on public.reports for insert with check (auth.uid() = reporter_id);

-- Reporters may change or withdraw their own report; nobody may edit `status`
-- into a resolved state from the client. Moderation runs as service_role, which
-- bypasses RLS entirely — so the rule here is simply "status must stay open".
create policy "reporters update own open reports"
  on public.reports for update
  using (auth.uid() = reporter_id and status = 'open')
  with check (auth.uid() = reporter_id and status = 'open');

create policy "reporters withdraw own reports"
  on public.reports for delete using (auth.uid() = reporter_id);

-- No table GRANTs here, matching every prior migration: hosted Supabase's
-- default privileges cover tables the migrations create, and the local stack
-- gets a blanket grant from supabase/seed.sql. If a local test ever fails with
-- 42501 "permission denied for table reports", the seed didn't run — that is a
-- privilege error, not an RLS denial, and they look almost identical.
