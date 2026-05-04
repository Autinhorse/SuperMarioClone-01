-- 0003 — username canonicalize
-- Prevent two users from registering with case-only differences
-- (e.g. "Autinhorse" and "autinhorse" would otherwise both succeed).
-- Existing capitalization is preserved; URL lookups stay case-insensitive in app code.

drop index if exists public.profiles_username_lower_idx;
create unique index profiles_username_lower_unique on public.profiles (lower(username));
