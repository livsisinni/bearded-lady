-- Phase 2: profiles, memberships, invites; wire votes.user_id to auth.users

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text not null,
  name         text not null default '',
  avatar_color text not null default 'oklch(0.65 0.15 250)',
  created_at   timestamptz not null default now()
);

-- ─── MEMBERSHIPS ─────────────────────────────────────────────────────────────
create table public.memberships (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('owner', 'editor', 'viewer')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- ─── INVITES ─────────────────────────────────────────────────────────────────
-- Pending email invitations. Converted to memberships on first login via trigger.
create table public.invites (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  invited_email text not null,
  role          text not null check (role in ('editor', 'viewer')),
  invited_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now(),
  unique (project_id, invited_email)
);

-- ─── UPDATE VOTES.USER_ID ────────────────────────────────────────────────────
-- Phase 1 stored device-local UUIDs as TEXT. Phase 2 uses real auth.users UUIDs.
-- Wipe existing phase-1 vote rows (they reference no real auth users).
truncate public.votes;
alter table public.votes alter column user_id type uuid using user_id::uuid;
alter table public.votes
  add constraint votes_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- ─── RLS HELPER FUNCTIONS ────────────────────────────────────────────────────
-- Security-definer functions bypass RLS internally so that RLS policies
-- on memberships don't recurse. Always set search_path to avoid search-path injection.

create or replace function public.is_member(p_project_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from memberships
    where project_id = p_project_id and user_id = p_user_id
  )
$$;

create or replace function public.member_role(p_project_id uuid, p_user_id uuid)
returns text language sql security definer stable set search_path = public
as $$
  select role from memberships
  where project_id = p_project_id and user_id = p_user_id
  limit 1
$$;

-- ─── PROFILE AUTO-CREATE TRIGGER ─────────────────────────────────────────────
-- Creates a profile row whenever a new user completes sign-in for the first time.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_color)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    (array[
      'oklch(0.65 0.15 250)',
      'oklch(0.65 0.15 30)',
      'oklch(0.65 0.15 150)',
      'oklch(0.65 0.15 200)',
      'oklch(0.70 0.12 80)',
      'oklch(0.65 0.15 320)',
      'oklch(0.65 0.15 180)',
      'oklch(0.65 0.12 60)'
    ])[floor(random() * 8 + 1)::int]
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── INVITE AUTO-ACCEPT TRIGGER ──────────────────────────────────────────────
-- When a profile is created (new user logs in), convert pending email invites
-- for that address into real memberships, then delete the invite rows.
create or replace function public.handle_invite_accept()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.memberships (project_id, user_id, role, invited_by)
  select project_id, new.id, role, invited_by
  from public.invites
  where invited_email = lower(new.email)
  on conflict (project_id, user_id) do nothing;

  delete from public.invites where invited_email = lower(new.email);
  return new;
end;
$$;

create trigger on_profile_created_accept_invites
  after insert on public.profiles
  for each row execute procedure public.handle_invite_accept();
