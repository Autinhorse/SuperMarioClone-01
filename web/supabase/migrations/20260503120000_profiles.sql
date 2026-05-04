-- 0001 — profiles
-- Public user-facing info, 1:1 with auth.users.
-- A profile row is auto-created by trigger when a user signs up; the username
-- is read from the auth signup metadata (raw_user_meta_data->>'username').

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]{3,20}$')
);

create index profiles_username_lower_idx on public.profiles (lower(username));

-- Trigger: auto-create profile when an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: keep updated_at fresh on update.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.profiles enable row level security;

-- Public read: anyone can see any profile (usernames are public-facing).
create policy "profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Users can update only their own profile.
create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Note: no INSERT policy needed — the SECURITY DEFINER trigger does the insert,
-- bypassing RLS. No DELETE policy — profile deletion cascades from auth.users.
