import { useRef, useEffect, useState } from 'react';
import { useProjectRealtime } from './useProjectRealtime';
import type { Actions, AppState, ExportPayload, Membership, MemberRole, Option, Project, SceneElement, VoteDirection } from '../lib/types';
import { uid, mapById, STATUS_ORDER } from '../lib/store';
import { supabase } from '../lib/supabase';
import {
  dbListProjects as dbListProjectsInit, dbCreateProject, dbUpdateProject, dbDeleteProject, dbDuplicateProject,
  dbCreateScene, dbUpdateScene, dbDeleteScene,
  dbCreateElement, dbUpdateElement, dbDeleteElement,
  dbCreateOption, dbUpdateOption, dbDeleteOption,
  dbSetVote, dbRemoveVote,
  dbImportProject,
  dbGetMemberships, dbInviteMember, dbRemoveMember,
} from '../lib/queries';

function initialState(): AppState {
  return { projects: [], users: [], currentUserId: '', currentUserRole: null, activeId: null };
}

function membershipToUser(m: Membership) {
  return { id: m.profile.id, name: m.profile.name || m.profile.email.split('@')[0], color: m.profile.avatarColor };
}

export function useStore(): {
  st: AppState;
  activeProject: Project | null;
  actions: Actions;
  loading: boolean;
  memberships: Membership[];
} {
  const [st, setSt] = useState<AppState>(initialState);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const ref = useRef<AppState>(st);
  ref.current = st;

  // ── auth + initial data load ────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function loadForUser(userId: string) {
      const projects = await dbListProjectsInit();
      if (!mounted) return;
      setSt((s) => ({ ...s, projects, currentUserId: userId }));
      setLoading(false);
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) loadForUser(session.user.id).catch(console.error);
      else setLoading(false);
    });

    // React to login / logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session) {
        setLoading(true);
        loadForUser(session.user.id).catch(console.error);
      } else if (event === 'SIGNED_OUT') {
        setSt(initialState());
        setMemberships([]);
        setLoading(false);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // ── realtime sync ────────────────────────────────────────────
  useProjectRealtime(st.activeId, setSt);

  // ── load memberships when active project changes ─────────────
  useEffect(() => {
    const pid = st.activeId;
    if (!pid) {
      setMemberships([]);
      setSt((s) => ({ ...s, users: [], currentUserRole: null }));
      return;
    }
    dbGetMemberships(pid).then((ms) => {
      if (ref.current.activeId !== pid) return; // guard stale response
      setMemberships(ms);
      const myRole = (ms.find((m) => m.userId === ref.current.currentUserId)?.role ?? null) as MemberRole | null;
      setSt((s) => ({ ...s, users: ms.map(membershipToUser), currentUserRole: myRole }));
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.activeId]);

  // ── patch helpers ────────────────────────────────────────────
  const patchProjects = (fn: (ps: Project[]) => Project[]) =>
    setSt((s) => ({ ...s, projects: fn(s.projects) }));

  const patchProject = (id: string, fn: (p: Project) => Project) =>
    patchProjects((ps) => mapById(ps, id, (p) => ({ ...fn(p), updatedAt: Date.now() })));

  const patchScene = (pid: string, sid: string, fn: (sc: AppState['projects'][0]['scenes'][0]) => AppState['projects'][0]['scenes'][0]) =>
    patchProject(pid, (p) => ({ ...p, scenes: mapById(p.scenes, sid, fn) }));

  const patchEl = (pid: string, sid: string, eid: string, fn: (e: SceneElement) => SceneElement) =>
    patchScene(pid, sid, (sc) => ({ ...sc, elements: mapById(sc.elements, eid, fn) }));

  const patchOpt = (pid: string, sid: string, eid: string, oid: string, fn: (o: Option) => Option) =>
    patchEl(pid, sid, eid, (el) => ({ ...el, options: mapById(el.options, oid, fn) }));

  const activeId = () => ref.current.activeId;

  const actions: Actions = {
    // ── projects ──────────────────────────────────────────────
    async createProject(name) {
      const project = await dbCreateProject(name || 'Untitled project');
      setSt((s) => ({ ...s, projects: [...s.projects, project], activeId: project.id }));
      return project.id;
    },

    openProject: (id) => setSt((s) => ({ ...s, activeId: id })),
    goHome: () => setSt((s) => ({ ...s, activeId: null })),

    async renameProject(id, name) {
      patchProject(id, (p) => ({ ...p, name }));
      await dbUpdateProject(id, { name }).catch(console.error);
    },

    async deleteProject(id) {
      setSt((s) => ({
        ...s,
        projects: s.projects.filter((p) => p.id !== id),
        activeId: s.activeId === id ? null : s.activeId,
      }));
      await dbDeleteProject(id).catch(console.error);
    },

    async duplicateProject(id) {
      const src = ref.current.projects.find((p) => p.id === id);
      if (!src) return;
      const copy = await dbDuplicateProject(src);
      setSt((s) => ({ ...s, projects: [...s.projects, copy] }));
    },

    exportProject(id) {
      const s = ref.current;
      const p = s.projects.find((x) => x.id === id);
      if (!p) return;
      const payload: ExportPayload = { kind: 'scene-builder-project', version: 1, exportedAt: Date.now(), project: p, users: s.users };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (p.name || 'project').replace(/[^\w-]+/g, '_') + '.scenebuilder.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },

    async importProject(payload: ExportPayload) {
      if (!payload.project) return;
      const imported = await dbImportProject(payload.project);
      setSt((s) => ({ ...s, projects: [...s.projects, imported], activeId: imported.id }));
    },

    // ── members ───────────────────────────────────────────────
    async inviteMember(email, role) {
      await dbInviteMember(activeId()!, email, role);
    },

    async removeMember(userId) {
      const pid = activeId()!;
      await dbRemoveMember(pid, userId);
      const ms = await dbGetMemberships(pid);
      setMemberships(ms);
      const myRole = (ms.find((m) => m.userId === ref.current.currentUserId)?.role ?? null) as MemberRole | null;
      setSt((s) => ({ ...s, users: ms.map(membershipToUser), currentUserRole: myRole }));
    },

    async signOut() {
      await supabase.auth.signOut();
    },

    // ── scenes ────────────────────────────────────────────────
    async addScene() {
      const pid = activeId()!;
      const scenes = ref.current.projects.find((p) => p.id === pid)?.scenes ?? [];
      const last = scenes[scenes.length - 1];
      const x = last ? last.x + 60 : 120;
      const y = last ? last.y + 60 : 120;
      const { id: sceneId } = await dbCreateScene(pid, { title: '', summary: '', x, y, sort: scenes.length });
      const { id: elId } = await dbCreateElement(sceneId, { type: 'Plot beat', locked: true, value: '', mandatory: true, sort: 0 });
      const plotBeat: SceneElement = { id: elId, type: 'Plot beat', locked: true, value: '', options: [], mandatory: true };
      patchProject(pid, (p) => ({ ...p, scenes: [...p.scenes, { id: sceneId, x, y, title: '', summary: '', elements: [plotBeat] }] }));
    },

    async deleteScene(sid) {
      const pid = activeId()!;
      patchProject(pid, (p) => ({ ...p, scenes: p.scenes.filter((s) => s.id !== sid) }));
      await dbDeleteScene(sid).catch(console.error);
    },

    async moveScene(sid, x, y) {
      const pid = activeId()!;
      patchScene(pid, sid, (s) => ({ ...s, x, y }));
      await dbUpdateScene(sid, { x, y }).catch(console.error);
    },

    async setSceneField(sid, field, val) {
      const pid = activeId()!;
      patchScene(pid, sid, (s) => ({ ...s, [field]: val }));
      await dbUpdateScene(sid, { [field]: val }).catch(console.error);
    },

    // ── elements ──────────────────────────────────────────────
    async addElement(sid, type) {
      const pid = activeId()!;
      const scene = ref.current.projects.find((p) => p.id === pid)?.scenes.find((s) => s.id === sid);
      const sort = scene ? scene.elements.length : 0;
      const tempId = uid();
      const tempEl: SceneElement = { id: tempId, type, locked: true, value: '', options: [], mandatory: type === 'Plot beat' };
      patchScene(pid, sid, (sc) => ({ ...sc, elements: [...sc.elements, tempEl] }));
      const { id: elId } = await dbCreateElement(sid, { type, locked: true, value: '', mandatory: type === 'Plot beat', sort });
      patchScene(pid, sid, (sc) => ({ ...sc, elements: sc.elements.map((e) => e.id === tempId ? { ...tempEl, id: elId } : e) }));
    },

    async deleteElement(sid, eid) {
      const pid = activeId()!;
      patchScene(pid, sid, (sc) => ({ ...sc, elements: sc.elements.filter((e) => e.id !== eid || e.mandatory) }));
      await dbDeleteElement(eid).catch(console.error);
    },

    async setElementValue(sid, eid, val) {
      const pid = activeId()!;
      patchEl(pid, sid, eid, (e) => ({ ...e, value: val }));
      await dbUpdateElement(eid, { value: val }).catch(console.error);
    },

    async toggleLock(sid, eid) {
      const pid = activeId()!;
      const el = ref.current.projects.find((p) => p.id === pid)?.scenes.find((s) => s.id === sid)?.elements.find((e) => e.id === eid);
      if (!el) return;

      if (el.locked) {
        let options = el.options;
        if (!options.length) {
          const label = el.value && el.value.trim() ? el.value.split('\n')[0].slice(0, 60) : 'Option A';
          const status = el.value && el.value.trim() ? 'frontrunner' as const : 'none' as const;
          const tempId = uid();
          const tempOpt: Option = { id: tempId, label, desc: '', votes: [], status };
          options = [tempOpt];
          patchEl(pid, sid, eid, (e) => ({ ...e, locked: false, options }));
          const { id: optId } = await dbCreateOption(eid, { label, desc: '', status, sort: 0 });
          patchEl(pid, sid, eid, (e) => ({
            ...e, options: e.options.map((o) => o.id === tempId ? { ...o, id: optId } : o),
          }));
        } else {
          patchEl(pid, sid, eid, (e) => ({ ...e, locked: false }));
        }
        await dbUpdateElement(eid, { locked: false }).catch(console.error);
      } else {
        const pick = el.options.find((o) => o.status === 'frontrunner') || el.options[0];
        const value = pick ? pick.label : el.value;
        patchEl(pid, sid, eid, (e) => ({ ...e, locked: true, value }));
        await dbUpdateElement(eid, { locked: true, value }).catch(console.error);
      }
    },

    // ── options ───────────────────────────────────────────────
    async addOption(sid, eid) {
      const pid = activeId()!;
      const el = ref.current.projects.find((p) => p.id === pid)?.scenes.find((s) => s.id === sid)?.elements.find((e) => e.id === eid);
      const sort = el ? el.options.length : 0;
      const tempId = uid();
      const tempOpt: Option = { id: tempId, label: '', desc: '', votes: [], status: 'none' };
      patchEl(pid, sid, eid, (e) => ({ ...e, options: [...e.options, tempOpt] }));
      const { id: optId } = await dbCreateOption(eid, { label: '', desc: '', status: 'none', sort });
      patchEl(pid, sid, eid, (e) => ({ ...e, options: e.options.map((o) => o.id === tempId ? { ...o, id: optId } : o) }));
    },

    async deleteOption(sid, eid, oid) {
      const pid = activeId()!;
      patchEl(pid, sid, eid, (e) => ({ ...e, options: e.options.filter((o) => o.id !== oid) }));
      await dbDeleteOption(oid).catch(console.error);
    },

    async setOptionField(sid, eid, oid, field, val) {
      const pid = activeId()!;
      patchOpt(pid, sid, eid, oid, (o) => ({ ...o, [field]: val }));
      await dbUpdateOption(oid, { [field]: val }).catch(console.error);
    },

    async cycleStatus(sid, eid, oid) {
      const pid = activeId()!;
      const opt = ref.current.projects.find((p) => p.id === pid)?.scenes.find((s) => s.id === sid)?.elements.find((e) => e.id === eid)?.options.find((o) => o.id === oid);
      if (!opt) return;
      const i = STATUS_ORDER.indexOf(opt.status || 'none');
      const status = STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
      patchOpt(pid, sid, eid, oid, (o) => ({ ...o, status }));
      await dbUpdateOption(oid, { status }).catch(console.error);
    },

    async toggleVote(sid, eid, oid, dir: VoteDirection) {
      const pid = activeId()!;
      const u = ref.current.currentUserId;
      const opt = ref.current.projects.find((p) => p.id === pid)?.scenes.find((s) => s.id === sid)?.elements.find((e) => e.id === eid)?.options.find((o) => o.id === oid);
      if (!opt) return;

      const votes = (opt.votes || []).slice();
      const i = votes.findIndex((v) => v.u === u);
      let removing = false;
      if (i >= 0) {
        if (votes[i].d === dir) { votes.splice(i, 1); removing = true; }
        else votes[i] = { u, d: dir };
      } else votes.push({ u, d: dir });

      patchOpt(pid, sid, eid, oid, (o) => ({ ...o, votes }));
      if (removing) await dbRemoveVote(oid, u).catch(console.error);
      else await dbSetVote(oid, u, dir).catch(console.error);
    },
  };

  const activeProject = st.projects.find((p) => p.id === st.activeId) ?? null;
  return { st, activeProject, actions, loading, memberships };
}
