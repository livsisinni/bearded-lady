import { supabase } from './supabase';
import type { Membership, MemberRole, Profile, Project, Scene, SceneElement, Option, VoteDirection } from './types';
import { uid } from './store';

// ─── HELPERS ──────────────────────────────────────────────────

// any because Supabase nested select shapes can't be expressed without generated types
// reason: Supabase JS v2 nested select returns deeply nested unknown; typed queries come in Phase 1+
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function throwOnError<T>(result: { data: T | null; error: any }): T {
  if (result.error) {
    console.error('[Supabase]', result.error);
    throw new Error(result.error.message);
  }
  return result.data as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assembleProject(pRow: any): Project {
  const scenes: Scene[] = ((pRow.scenes ?? []) as any[])
    .sort((a, b) => a.sort - b.sort)
    .map((sc: any): Scene => ({
      id: sc.id, x: sc.x, y: sc.y, title: sc.title, summary: sc.summary,
      elements: ((sc.elements ?? []) as any[])
        .sort((a, b) => a.sort - b.sort)
        .map((el: any): SceneElement => ({
          id: el.id, type: el.type, locked: el.locked, value: el.value, mandatory: el.mandatory,
          options: ((el.options ?? []) as any[])
            .sort((a, b) => a.sort - b.sort)
            .map((opt: any): Option => ({
              id: opt.id, label: opt.label, desc: opt.description, status: opt.status,
              votes: ((opt.votes ?? []) as any[]).map((v: any) => ({ u: v.user_id, d: v.direction as VoteDirection })),
            })),
        })),
    }));
  return {
    id: pRow.id, name: pRow.name,
    createdAt: Date.parse(pRow.created_at), updatedAt: Date.parse(pRow.updated_at),
    scenes,
  };
}

const FULL_PROJECT_QUERY = `*, scenes(*, elements(*, options(*, votes(*))))`;

// ─── PROJECTS ────────────────────────────────────────────────

export async function dbListProjects(): Promise<Project[]> {
  const rows = throwOnError(await supabase
    .from('projects')
    .select(FULL_PROJECT_QUERY)
    .order('created_at'));
  return (rows as any[]).map(assembleProject);
}

export async function dbLoadProjectTree(id: string): Promise<Project> {
  const row = throwOnError(await supabase
    .from('projects')
    .select(FULL_PROJECT_QUERY)
    .eq('id', id)
    .single());
  return assembleProject(row);
}

export async function dbCreateProject(name: string): Promise<Project> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  // Pre-generate UUID so we never need to SELECT the project back before the membership exists.
  // INSERT...SELECT applies the read policy (is_member), which would return 0 rows at this point.
  const projectId = uid();
  throwOnError(await supabase.from('projects').insert({ id: projectId, name }));
  throwOnError(await supabase.from('memberships').insert({
    project_id: projectId, user_id: user.id, role: 'owner',
  }));
  return dbLoadProjectTree(projectId);
}

export async function dbUpdateProject(id: string, data: { name: string }): Promise<void> {
  throwOnError(await supabase.from('projects').update(data).eq('id', id));
}

export async function dbDeleteProject(id: string): Promise<void> {
  throwOnError(await supabase.from('projects').delete().eq('id', id));
}

export async function dbDuplicateProject(src: Project): Promise<Project> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const projectId = uid();
  throwOnError(await supabase.from('projects').insert({ id: projectId, name: src.name + ' (copy)' }));
  throwOnError(await supabase.from('memberships').insert({
    project_id: projectId, user_id: user.id, role: 'owner',
  }));
  await _writeScenes(projectId, src.scenes);
  return dbLoadProjectTree(projectId);
}

// ─── SCENES ──────────────────────────────────────────────────

export async function dbCreateScene(projectId: string, data: { title: string; summary: string; x: number; y: number; sort: number }): Promise<{ id: string }> {
  return throwOnError(await supabase
    .from('scenes').insert({ project_id: projectId, ...data }).select('id').single()) as { id: string };
}

export async function dbUpdateScene(id: string, data: Partial<{ title: string; summary: string; x: number; y: number }>): Promise<void> {
  throwOnError(await supabase.from('scenes').update(data).eq('id', id));
}

export async function dbDeleteScene(id: string): Promise<void> {
  throwOnError(await supabase.from('scenes').delete().eq('id', id));
}

// ─── ELEMENTS ────────────────────────────────────────────────

export async function dbCreateElement(sceneId: string, data: { type: string; locked: boolean; value: string; mandatory: boolean; sort: number }): Promise<{ id: string }> {
  return throwOnError(await supabase
    .from('elements').insert({ scene_id: sceneId, ...data }).select('id').single()) as { id: string };
}

export async function dbUpdateElement(id: string, data: Partial<{ locked: boolean; value: string }>): Promise<void> {
  throwOnError(await supabase.from('elements').update(data).eq('id', id));
}

export async function dbDeleteElement(id: string): Promise<void> {
  throwOnError(await supabase.from('elements').delete().eq('id', id));
}

// ─── OPTIONS ─────────────────────────────────────────────────

export async function dbCreateOption(elementId: string, data: { label: string; desc: string; status: string; sort: number }): Promise<{ id: string }> {
  const { desc, ...rest } = data;
  return throwOnError(await supabase
    .from('options').insert({ element_id: elementId, description: desc, ...rest }).select('id').single()) as { id: string };
}

export async function dbUpdateOption(id: string, data: Partial<{ label: string; desc: string; status: string }>): Promise<void> {
  const { desc, ...rest } = data;
  const payload = desc !== undefined ? { description: desc, ...rest } : rest;
  throwOnError(await supabase.from('options').update(payload).eq('id', id));
}

export async function dbDeleteOption(id: string): Promise<void> {
  throwOnError(await supabase.from('options').delete().eq('id', id));
}

// ─── VOTES ───────────────────────────────────────────────────

export async function dbSetVote(optionId: string, userId: string, direction: VoteDirection): Promise<void> {
  throwOnError(await supabase
    .from('votes')
    .upsert({ option_id: optionId, user_id: userId, direction }, { onConflict: 'option_id,user_id' }));
}

export async function dbRemoveVote(optionId: string, userId: string): Promise<void> {
  throwOnError(await supabase.from('votes').delete().eq('option_id', optionId).eq('user_id', userId));
}

// ─── IMPORT ──────────────────────────────────────────────────

export async function dbImportProject(src: Project): Promise<Project> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const projectId = uid();
  throwOnError(await supabase.from('projects').insert({ id: projectId, name: src.name }));
  throwOnError(await supabase.from('memberships').insert({
    project_id: projectId, user_id: user.id, role: 'owner',
  }));
  // Strip votes: exported user IDs don't exist in auth.users for new installs
  const stripped = src.scenes.map((sc) => ({
    ...sc,
    elements: sc.elements.map((el) => ({
      ...el, options: el.options.map((o) => ({ ...o, votes: [] })),
    })),
  }));
  await _writeScenes(projectId, stripped);
  return dbLoadProjectTree(projectId);
}

// ─── PROFILES ────────────────────────────────────────────────

export async function dbGetProfile(userId: string): Promise<Profile | null> {
  const result = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (result.error) return null;
  // reason: any — Supabase returns untyped rows without generated types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = result.data as any;
  return { id: r.id, email: r.email, name: r.name, avatarColor: r.avatar_color };
}

export async function dbUpdateProfile(userId: string, data: { name: string }): Promise<void> {
  throwOnError(await supabase.from('profiles').update(data).eq('id', userId));
}

// ─── MEMBERSHIPS ─────────────────────────────────────────────

export async function dbGetMemberships(projectId: string): Promise<Membership[]> {
  const rows = throwOnError(await supabase
    .from('memberships')
    .select('user_id, role, profiles(id, email, name, avatar_color)')
    .eq('project_id', projectId));
  // reason: any — Supabase nested select returns opaque shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rows as any[]).map((r: any): Membership => ({
    userId: r.user_id,
    role: r.role as MemberRole,
    profile: {
      id: r.profiles?.id ?? r.user_id,
      email: r.profiles?.email ?? '',
      name: r.profiles?.name ?? '',
      avatarColor: r.profiles?.avatar_color ?? 'oklch(0.62 0.13 250)',
    },
  }));
}

export async function dbRemoveMember(projectId: string, userId: string): Promise<void> {
  throwOnError(await supabase.from('memberships').delete().eq('project_id', projectId).eq('user_id', userId));
}

// ─── INVITES ─────────────────────────────────────────────────

export async function dbInviteMember(projectId: string, email: string, role: MemberRole): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  throwOnError(await supabase.from('invites').upsert(
    { project_id: projectId, invited_email: email.toLowerCase(), role, invited_by: user.id },
    { onConflict: 'project_id,invited_email' },
  ));
}

// ─── INTERNAL HELPERS ────────────────────────────────────────

async function _writeScenes(projectId: string, scenes: Scene[]): Promise<void> {
  for (let si = 0; si < scenes.length; si++) {
    const sc = scenes[si];
    const newSc = throwOnError(await supabase
      .from('scenes')
      .insert({ project_id: projectId, title: sc.title, summary: sc.summary, x: sc.x, y: sc.y, sort: si })
      .select('id').single()) as { id: string };
    for (let ei = 0; ei < sc.elements.length; ei++) {
      const el = sc.elements[ei];
      const newEl = throwOnError(await supabase
        .from('elements')
        .insert({ scene_id: newSc.id, type: el.type, locked: el.locked, value: el.value, mandatory: el.mandatory, sort: ei })
        .select('id').single()) as { id: string };
      for (let oi = 0; oi < el.options.length; oi++) {
        const opt = el.options[oi];
        const newOpt = throwOnError(await supabase
          .from('options')
          .insert({ element_id: newEl.id, label: opt.label, description: opt.desc, status: opt.status, sort: oi })
          .select('id').single()) as { id: string };
        if (opt.votes.length > 0) {
          await supabase.from('votes').insert(
            opt.votes.map((v) => ({ option_id: newOpt.id, user_id: v.u, direction: v.d }))
          );
        }
      }
    }
  }
}
