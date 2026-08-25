-- 001_profiles.sql
-- Run this in Supabase SQL Editor after deploying.

-- 1. Profiles table
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 2. Trigger: create a profiles row on first sign-in, hardcoding is_admin = false.
--    This function is SECURITY DEFINER so it can insert into profiles
--    even when called from an anon/authenticated context via the auth webhook.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, false);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 3. Public can read profiles (needed for displaying author info later).
create policy "Profiles are publicly readable"
  on public.profiles
  for select
  using (true);

-- 4. Users can update their own profile, but NOT the is_admin column.
--    Two complementary policies:
--
--    4a. ALLOW update on own row when is_admin is NOT being changed.
create policy "Users can update own profile (non-admin fields)"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id and is_admin = false);

--    4b. ALLOW update on own row where is_admin stays false (covers the
--        case where the client doesn't touch is_admin at all — the
--        with-check above already handles that; this is belt-and-suspenders
--        via a trigger below).
--
--    The real lockdown for is_admin is the BEFORE UPDATE trigger below,
--    which reverts any attempt to set is_admin = true unless the caller
--    is a superuser (i.e. running from SQL Editor or service role).
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- 5. Trigger: revert is_admin changes unless made by superuser (service role / SQL Editor).
--    This is the hard lockdown — even if a future RLS policy has a hole,
--    this trigger catches it.
create or replace function public.protect_is_admin()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

create trigger protect_is_admin_on_update
  before update on public.profiles
  for each row
  execute function public.protect_is_admin();

-- 6. No one except superuser can delete profiles.
create policy "Only superuser can delete profiles"
  on public.profiles
  for delete
  using (false);
