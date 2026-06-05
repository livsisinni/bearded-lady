import { useEffect } from 'react';
import type { AppState, Option, Scene, SceneElement } from '../lib/types';
import { supabase } from '../lib/supabase';

type SetSt = React.Dispatch<React.SetStateAction<AppState>>;

// reason: Supabase Realtime payload rows are untyped without generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

export function useProjectRealtime(activeId: string | null, setSt: SetSt): void {
  useEffect(() => {
    if (!activeId) return;

    const channel = supabase.channel(`project:${activeId}`)

      // ── scenes ──────────────────────────────────────────────
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'scenes',
        filter: `project_id=eq.${activeId}`,
      }, ({ new: row }: { new: Row; old: Row }) => {
        setSt((s) => {
          const project = s.projects.find((p) => p.id === activeId);
          if (!project) return s;
          if (project.scenes.some((sc) => sc.id === row.id)) return s;
          const scene: Scene = {
            id: row.id, x: row.x, y: row.y,
            title: row.title ?? '', summary: row.summary ?? '', elements: [],
          };
          return {
            ...s,
            projects: s.projects.map((p) =>
              p.id === activeId ? { ...p, scenes: [...p.scenes, scene] } : p),
          };
        });
      })

      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'scenes',
        filter: `project_id=eq.${activeId}`,
      }, ({ new: row }: { new: Row; old: Row }) => {
        setSt((s) => ({
          ...s,
          projects: s.projects.map((p) =>
            p.id !== activeId ? p : {
              ...p,
              scenes: p.scenes.map((sc) =>
                sc.id !== row.id ? sc
                  : { ...sc, x: row.x, y: row.y, title: row.title ?? '', summary: row.summary ?? '' }),
            }),
        }));
      })

      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'scenes',
        filter: `project_id=eq.${activeId}`,
      }, ({ old: row }: { new: Row; old: Row }) => {
        setSt((s) => ({
          ...s,
          projects: s.projects.map((p) =>
            p.id !== activeId ? p : { ...p, scenes: p.scenes.filter((sc) => sc.id !== row.id) }),
        }));
      })

      // ── elements ────────────────────────────────────────────
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'elements',
      }, ({ new: row }: { new: Row; old: Row }) => {
        setSt((s) => {
          const project = s.projects.find((p) => p.id === activeId);
          if (!project) return s;
          const scene = project.scenes.find((sc) => sc.id === row.scene_id);
          if (!scene || scene.elements.some((e) => e.id === row.id)) return s;
          const el: SceneElement = {
            id: row.id, type: row.type, locked: row.locked,
            value: row.value ?? '', mandatory: row.mandatory, options: [],
          };
          return {
            ...s,
            projects: s.projects.map((p) =>
              p.id !== activeId ? p : {
                ...p,
                scenes: p.scenes.map((sc) =>
                  sc.id !== row.scene_id ? sc
                    : { ...sc, elements: [...sc.elements, el] }),
              }),
          };
        });
      })

      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'elements',
      }, ({ new: row }: { new: Row; old: Row }) => {
        setSt((s) => {
          if (!s.projects.find((p) => p.id === activeId)) return s;
          return {
            ...s,
            projects: s.projects.map((p) =>
              p.id !== activeId ? p : {
                ...p,
                scenes: p.scenes.map((sc) => ({
                  ...sc,
                  elements: sc.elements.map((e) =>
                    e.id !== row.id ? e : { ...e, locked: row.locked, value: row.value ?? '' }),
                })),
              }),
          };
        });
      })

      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'elements',
      }, ({ old: row }: { new: Row; old: Row }) => {
        setSt((s) => {
          if (!s.projects.find((p) => p.id === activeId)) return s;
          return {
            ...s,
            projects: s.projects.map((p) =>
              p.id !== activeId ? p : {
                ...p,
                scenes: p.scenes.map((sc) => ({
                  ...sc,
                  elements: sc.elements.filter((e) => e.id !== row.id || e.mandatory),
                })),
              }),
          };
        });
      })

      // ── options ─────────────────────────────────────────────
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'options',
      }, ({ new: row }: { new: Row; old: Row }) => {
        setSt((s) => {
          const project = s.projects.find((p) => p.id === activeId);
          if (!project) return s;
          for (const sc of project.scenes) {
            const el = sc.elements.find((e) => e.id === row.element_id);
            if (!el) continue;
            if (el.options.some((o) => o.id === row.id)) return s;
            const opt: Option = {
              id: row.id, label: row.label ?? '', desc: row.description ?? '',
              status: row.status ?? 'none', votes: [],
            };
            return {
              ...s,
              projects: s.projects.map((p) =>
                p.id !== activeId ? p : {
                  ...p,
                  scenes: p.scenes.map((scene) =>
                    scene.id !== sc.id ? scene : {
                      ...scene,
                      elements: scene.elements.map((e) =>
                        e.id !== row.element_id ? e : { ...e, options: [...e.options, opt] }),
                    }),
                }),
            };
          }
          return s;
        });
      })

      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'options',
      }, ({ new: row }: { new: Row; old: Row }) => {
        setSt((s) => {
          if (!s.projects.find((p) => p.id === activeId)) return s;
          return {
            ...s,
            projects: s.projects.map((p) =>
              p.id !== activeId ? p : {
                ...p,
                scenes: p.scenes.map((sc) => ({
                  ...sc,
                  elements: sc.elements.map((e) => ({
                    ...e,
                    options: e.options.map((o) =>
                      o.id !== row.id ? o
                        : { ...o, label: row.label ?? '', desc: row.description ?? '', status: row.status ?? 'none' }),
                  })),
                })),
              }),
          };
        });
      })

      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'options',
      }, ({ old: row }: { new: Row; old: Row }) => {
        setSt((s) => {
          if (!s.projects.find((p) => p.id === activeId)) return s;
          return {
            ...s,
            projects: s.projects.map((p) =>
              p.id !== activeId ? p : {
                ...p,
                scenes: p.scenes.map((sc) => ({
                  ...sc,
                  elements: sc.elements.map((e) => ({
                    ...e,
                    options: e.options.filter((o) => o.id !== row.id),
                  })),
                })),
              }),
          };
        });
      })

      // ── votes ───────────────────────────────────────────────
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'votes',
      }, ({ new: row }: { new: Row; old: Row }) => {
        setSt((s) => {
          if (!s.projects.find((p) => p.id === activeId)) return s;
          return {
            ...s,
            projects: s.projects.map((p) =>
              p.id !== activeId ? p : {
                ...p,
                scenes: p.scenes.map((sc) => ({
                  ...sc,
                  elements: sc.elements.map((e) => ({
                    ...e,
                    options: e.options.map((o) => {
                      if (o.id !== row.option_id || o.votes.some((v) => v.u === row.user_id)) return o;
                      return { ...o, votes: [...o.votes, { u: row.user_id, d: row.direction }] };
                    }),
                  })),
                })),
              }),
          };
        });
      })

      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'votes',
      }, ({ new: row }: { new: Row; old: Row }) => {
        setSt((s) => {
          if (!s.projects.find((p) => p.id === activeId)) return s;
          return {
            ...s,
            projects: s.projects.map((p) =>
              p.id !== activeId ? p : {
                ...p,
                scenes: p.scenes.map((sc) => ({
                  ...sc,
                  elements: sc.elements.map((e) => ({
                    ...e,
                    options: e.options.map((o) => {
                      if (o.id !== row.option_id) return o;
                      return { ...o, votes: o.votes.map((v) => v.u === row.user_id ? { ...v, d: row.direction } : v) };
                    }),
                  })),
                })),
              }),
          };
        });
      })

      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'votes',
      }, ({ old: row }: { new: Row; old: Row }) => {
        setSt((s) => {
          if (!s.projects.find((p) => p.id === activeId)) return s;
          return {
            ...s,
            projects: s.projects.map((p) =>
              p.id !== activeId ? p : {
                ...p,
                scenes: p.scenes.map((sc) => ({
                  ...sc,
                  elements: sc.elements.map((e) => ({
                    ...e,
                    options: e.options.map((o) => {
                      if (o.id !== row.option_id) return o;
                      return { ...o, votes: o.votes.filter((v) => v.u !== row.user_id) };
                    }),
                  })),
                })),
              }),
          };
        });
      })

      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeId, setSt]);
}
