-- Scene Builder — initial schema (Phase 1)
-- Run this in the Supabase dashboard SQL editor.
-- profiles and memberships are deferred to Phase 2 (auth).

-- ─── PROJECTS ────────────────────────────────────────────────
create table projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Untitled project',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── SCENES ──────────────────────────────────────────────────
create table scenes (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null default '',
  summary     text not null default '',
  x           float not null default 0,
  y           float not null default 0,
  sort        float not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index scenes_project_id on scenes(project_id);

-- ─── ELEMENTS ────────────────────────────────────────────────
create table elements (
  id          uuid primary key default gen_random_uuid(),
  scene_id    uuid not null references scenes(id) on delete cascade,
  type        text not null,
  locked      boolean not null default true,
  value       text not null default '',
  mandatory   boolean not null default false,
  sort        float not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index elements_scene_id on elements(scene_id);

-- ─── OPTIONS ─────────────────────────────────────────────────
create table options (
  id          uuid primary key default gen_random_uuid(),
  element_id  uuid not null references elements(id) on delete cascade,
  label       text not null default '',
  description text not null default '',
  status      text not null default 'none'
                check (status in ('none', 'frontrunner', 'maybe', 'rejected')),
  sort        float not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index options_element_id on options(element_id);

-- ─── VOTES ───────────────────────────────────────────────────
-- One row per (option, user). Composite PK enforces the uniqueness constraint.
-- user_id is a device-local UUID in Phase 1; becomes auth.users ref in Phase 2.
create table votes (
  option_id   uuid not null references options(id) on delete cascade,
  user_id     text not null,
  direction   text not null check (direction in ('up', 'down')),
  created_at  timestamptz not null default now(),
  primary key (option_id, user_id)
);

create index votes_option_id on votes(option_id);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at before update on projects
  for each row execute function touch_updated_at();
create trigger scenes_updated_at before update on scenes
  for each row execute function touch_updated_at();
create trigger elements_updated_at before update on elements
  for each row execute function touch_updated_at();
create trigger options_updated_at before update on options
  for each row execute function touch_updated_at();
