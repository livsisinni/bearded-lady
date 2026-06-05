import { useRef, useState } from 'react';
import type { Actions, AppState, ExportPayload, Project } from '../lib/types';
import { THEMES } from '../lib/store';
import { Icon } from '../components/Icon';

function timeAgo(ts: number): string {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function projectStats(p: Project) {
  let open = 0, locked = 0;
  p.scenes.forEach((s) => s.elements.forEach((e) => (e.locked ? locked++ : open++)));
  return { scenes: p.scenes.length, open, locked };
}

function ProjectCard({ project, actions }: { project: Project; actions: Actions }) {
  const [menu, setMenu] = useState(false);
  const stats = projectStats(project);

  return (
    <div className="proj-card" onClick={() => actions.openProject(project.id)}>
      <div className="proj-preview">
        <span className="proj-film"><Icon name="film" size={20} /></span>
        <div className="proj-mini">
          {project.scenes.slice(0, 6).map((s) => (
            <span key={s.id} className="mini-scene" title={s.title || 'Untitled scene'} />
          ))}
          {project.scenes.length === 0 && <span className="proj-empty-note">empty</span>}
        </div>
      </div>
      <div className="proj-body">
        <div className="proj-titlerow">
          <h3 className="proj-name">{project.name || 'Untitled project'}</h3>
          <button className="proj-menu-btn" title="More"
            onClick={(e) => { e.stopPropagation(); setMenu((m) => !m); }}>
            <Icon name="dot3" size={16} />
          </button>
          {menu && (
            <>
              <div className="scrim" onClick={(e) => { e.stopPropagation(); setMenu(false); }} />
              <div className="proj-menu" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { actions.duplicateProject(project.id); setMenu(false); }}>Duplicate</button>
                <button onClick={() => { actions.exportProject(project.id); setMenu(false); }}>Export / share…</button>
                <button className="danger" onClick={() => {
                  if (confirm(`Delete "${project.name}"? This can't be undone.`)) actions.deleteProject(project.id);
                  setMenu(false);
                }}>Delete project</button>
              </div>
            </>
          )}
        </div>
        <div className="proj-meta">
          {stats.scenes} {stats.scenes === 1 ? 'scene' : 'scenes'}
          <span className="dotsep">·</span>
          <span className="open-count">{stats.open} open</span>
          <span className="dotsep">·</span>
          edited {timeAgo(project.updatedAt)}
        </div>
      </div>
    </div>
  );
}

interface HomeProps {
  st: AppState;
  actions: Actions;
  theme: string;
  setTheme: (t: string) => void;
}

export function Home({ st, actions, theme, setTheme }: HomeProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const newProject = async () => {
    const name = prompt('Name your project:', 'Untitled Script');
    if (name !== null) {
      try {
        await actions.createProject(name.trim() || 'Untitled project');
      } catch (err) {
        console.error('[createProject]', err);
        alert('Could not create project: ' + (err as Error).message);
      }
    }
  };

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result as string) as ExportPayload;
        actions.importProject(payload);
      } catch { alert("That doesn't look like a Scene Builder project file."); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="home">
      <div className="home-topbar">
        <div className="dir-switch small" title="Visual direction">
          {THEMES.map((t) => (
            <button key={t.id} className={theme === t.id ? 'active' : ''} onClick={() => setTheme(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      <header className="home-hero">
        <h1 className="home-title">Scene Builder</h1>
        <p className="home-sub">Exclusively for Bearded Lady Productions</p>
      </header>

      <div className="home-body">
        <div className="home-section-head">
          <h2>Projects</h2>
          <div className="home-actions">
            <button className="btn ghost-tb" onClick={() => fileRef.current?.click()}>
              <Icon name="import" size={15} /> Import
            </button>
            <button className="btn primary" onClick={newProject}>
              <span className="glyph"><Icon name="plus" size={15} /></span> New project
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onImport} />
          </div>
        </div>

        <div className="proj-grid">
          {st.projects.map((p) => (
            <ProjectCard key={p.id} project={p} actions={actions} />
          ))}
          <button className="proj-new" onClick={newProject}>
            <span className="proj-new-plus"><Icon name="plus" size={22} /></span>
            <span>New project</span>
            <span className="proj-new-hint">Start with a blank canvas</span>
          </button>
        </div>

        {st.projects.length === 0 && (
          <p className="home-empty">No projects yet — create your first one to start mapping scenes.</p>
        )}
      </div>

      <footer className="home-foot">Scene Builder · a working tool for the writers' room</footer>
    </div>
  );
}
