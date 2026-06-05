-- ============================================================
-- Row-Level Security Policies — Phase 2
-- ⚠️  HUMAN REVIEW REQUIRED before applying in production.
-- Read the plain-English explanation above each block.
-- Apply by running this file in the Supabase SQL editor
-- AFTER running 002_auth_memberships.sql.
-- ============================================================

-- Enable RLS on all tables. Nothing is readable until a matching
-- policy grants access — default is deny.
alter table public.profiles    enable row level security;
alter table public.projects    enable row level security;
alter table public.memberships enable row level security;
alter table public.scenes      enable row level security;
alter table public.elements    enable row level security;
alter table public.options     enable row level security;
alter table public.votes       enable row level security;
alter table public.invites     enable row level security;

-- ─── PROFILES ────────────────────────────────────────────────────────────────
-- Any signed-in user can read any profile.
-- Needed so project members can see each other's names and avatars.
create policy "profiles: authenticated users can read all"
  on public.profiles for select
  to authenticated
  using (true);

-- Each user may only write their own profile row.
create policy "profiles: users can insert own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles: users can update own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- ─── PROJECTS ────────────────────────────────────────────────────────────────
-- A user can read a project only if they are a member.
create policy "projects: members can read"
  on public.projects for select
  to authenticated
  using (public.is_member(id, auth.uid()));

-- Any authenticated user may create a project.
-- The app inserts an owner membership immediately after creation.
create policy "projects: authenticated users can create"
  on public.projects for insert
  to authenticated
  with check (true);

-- Only owners and editors may update project metadata (e.g. rename).
create policy "projects: owners and editors can update"
  on public.projects for update
  to authenticated
  using (public.member_role(id, auth.uid()) in ('owner', 'editor'));

-- Only the project owner may delete the project.
create policy "projects: owners can delete"
  on public.projects for delete
  to authenticated
  using (public.member_role(id, auth.uid()) = 'owner');

-- ─── MEMBERSHIPS ─────────────────────────────────────────────────────────────
-- Members of a project can see who else is on it.
create policy "memberships: members can read"
  on public.memberships for select
  to authenticated
  using (public.is_member(project_id, auth.uid()));

-- A user may insert their own owner-role membership for a project they just created,
-- OR an existing owner may add other members.
create policy "memberships: owners can invite or self-owner"
  on public.memberships for insert
  to authenticated
  with check (
    (user_id = auth.uid() and role = 'owner')
    or public.member_role(project_id, auth.uid()) = 'owner'
  );

-- Owners may change a member's role.
create policy "memberships: owners can update"
  on public.memberships for update
  to authenticated
  using (public.member_role(project_id, auth.uid()) = 'owner');

-- Owners may remove any member. Members may remove themselves (leave project).
create policy "memberships: owners can delete or users can leave"
  on public.memberships for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.member_role(project_id, auth.uid()) = 'owner'
  );

-- ─── SCENES ──────────────────────────────────────────────────────────────────
-- Scenes have project_id directly — membership check is simple.
create policy "scenes: members can read"
  on public.scenes for select
  to authenticated
  using (public.is_member(project_id, auth.uid()));

create policy "scenes: owners and editors can insert"
  on public.scenes for insert
  to authenticated
  with check (public.member_role(project_id, auth.uid()) in ('owner', 'editor'));

create policy "scenes: owners and editors can update"
  on public.scenes for update
  to authenticated
  using (public.member_role(project_id, auth.uid()) in ('owner', 'editor'));

create policy "scenes: owners and editors can delete"
  on public.scenes for delete
  to authenticated
  using (public.member_role(project_id, auth.uid()) in ('owner', 'editor'));

-- ─── ELEMENTS ────────────────────────────────────────────────────────────────
-- Elements have scene_id; we join to scenes to get project_id.
create policy "elements: members can read"
  on public.elements for select
  to authenticated
  using (
    exists (
      select 1 from public.scenes s
      where s.id = scene_id and public.is_member(s.project_id, auth.uid())
    )
  );

create policy "elements: owners and editors can insert"
  on public.elements for insert
  to authenticated
  with check (
    exists (
      select 1 from public.scenes s
      where s.id = scene_id
        and public.member_role(s.project_id, auth.uid()) in ('owner', 'editor')
    )
  );

create policy "elements: owners and editors can update"
  on public.elements for update
  to authenticated
  using (
    exists (
      select 1 from public.scenes s
      where s.id = scene_id
        and public.member_role(s.project_id, auth.uid()) in ('owner', 'editor')
    )
  );

create policy "elements: owners and editors can delete"
  on public.elements for delete
  to authenticated
  using (
    exists (
      select 1 from public.scenes s
      where s.id = scene_id
        and public.member_role(s.project_id, auth.uid()) in ('owner', 'editor')
    )
  );

-- ─── OPTIONS ─────────────────────────────────────────────────────────────────
-- Options join through elements → scenes to reach project_id.
create policy "options: members can read"
  on public.options for select
  to authenticated
  using (
    exists (
      select 1 from public.elements e
      join public.scenes s on s.id = e.scene_id
      where e.id = element_id and public.is_member(s.project_id, auth.uid())
    )
  );

create policy "options: owners and editors can insert"
  on public.options for insert
  to authenticated
  with check (
    exists (
      select 1 from public.elements e
      join public.scenes s on s.id = e.scene_id
      where e.id = element_id
        and public.member_role(s.project_id, auth.uid()) in ('owner', 'editor')
    )
  );

create policy "options: owners and editors can update"
  on public.options for update
  to authenticated
  using (
    exists (
      select 1 from public.elements e
      join public.scenes s on s.id = e.scene_id
      where e.id = element_id
        and public.member_role(s.project_id, auth.uid()) in ('owner', 'editor')
    )
  );

create policy "options: owners and editors can delete"
  on public.options for delete
  to authenticated
  using (
    exists (
      select 1 from public.elements e
      join public.scenes s on s.id = e.scene_id
      where e.id = element_id
        and public.member_role(s.project_id, auth.uid()) in ('owner', 'editor')
    )
  );

-- ─── VOTES ───────────────────────────────────────────────────────────────────
-- All members (owners, editors, AND viewers) can read and cast votes.
-- Users may only modify or delete their own vote row.
create policy "votes: members can read"
  on public.votes for select
  to authenticated
  using (
    exists (
      select 1 from public.options o
      join public.elements e on e.id = o.element_id
      join public.scenes s on s.id = e.scene_id
      where o.id = option_id and public.is_member(s.project_id, auth.uid())
    )
  );

create policy "votes: members can vote"
  on public.votes for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.options o
      join public.elements e on e.id = o.element_id
      join public.scenes s on s.id = e.scene_id
      where o.id = option_id and public.is_member(s.project_id, auth.uid())
    )
  );

create policy "votes: users can update own"
  on public.votes for update
  to authenticated
  using (user_id = auth.uid());

create policy "votes: users can delete own"
  on public.votes for delete
  to authenticated
  using (user_id = auth.uid());

-- ─── INVITES ─────────────────────────────────────────────────────────────────
-- Members of a project can see pending invites for that project.
create policy "invites: members can read"
  on public.invites for select
  to authenticated
  using (public.is_member(project_id, auth.uid()));

-- Only project owners can send invites.
create policy "invites: owners can insert"
  on public.invites for insert
  to authenticated
  with check (
    invited_by = auth.uid()
    and public.member_role(project_id, auth.uid()) = 'owner'
  );

-- Only project owners can revoke pending invites.
create policy "invites: owners can delete"
  on public.invites for delete
  to authenticated
  using (public.member_role(project_id, auth.uid()) = 'owner');
