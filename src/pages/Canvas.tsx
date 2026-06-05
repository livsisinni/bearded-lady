import { useRef, useState, useEffect } from 'react';
import type { Actions, Membership, MemberRole, Project, User } from '../lib/types';
import { THEMES } from '../lib/store';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { Editable } from '../components/Editable';
import { SceneCard } from '../components/SceneCard';
import { VotingAs } from '../components/VotingAs';
import { useProjectPresence } from '../hooks/useProjectPresence';

interface CanvasProps {
  project: Project;
  actions: Actions;
  users: User[];
  currentUserId: string;
  currentUserRole: MemberRole | null;
  memberships: Membership[];
  canEdit: boolean;
  theme: string;
  setTheme: (t: string) => void;
}

interface ViewState { x: number; y: number; z: number; }

export function Canvas({ project, actions, users, currentUserId, currentUserRole, memberships, canEdit, theme, setTheme }: CanvasProps) {
  const scenes = project.scenes;

  const [view, setView] = useState<ViewState>({ x: 24, y: 16, z: 1 });
  const [vaOpen, setVaOpen] = useState(false);

  const me = memberships.find((m) => m.userId === currentUserId);
  const myName = me?.profile.name || me?.profile.email.split('@')[0] || '';
  const myColor = me?.profile.avatarColor || '';
  const presentUsers = useProjectPresence(project.id, currentUserId, myName, myColor);
  const viewRef = useRef(view);
  viewRef.current = view;
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setView({ x: 24, y: 16, z: 1 }); }, [project.id]);

  const pan = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const onBoardDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    pan.current = { sx: e.clientX, sy: e.clientY, ox: viewRef.current.x, oy: viewRef.current.y };
    setPanning(true);
  };

  const drag = useRef<{ sid: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const onSceneDragStart = (e: React.MouseEvent, sid: string) => {
    if (!canEdit || e.button !== 0) return;
    e.stopPropagation();
    const s = scenes.find((sc) => sc.id === sid);
    if (!s) return;
    drag.current = { sid, sx: e.clientX, sy: e.clientY, ox: s.x, oy: s.y };
    setDraggingId(sid);
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (drag.current) {
        const z = viewRef.current.z;
        const nx = drag.current.ox + (e.clientX - drag.current.sx) / z;
        const ny = drag.current.oy + (e.clientY - drag.current.sy) / z;
        actions.moveScene(drag.current.sid, Math.round(nx), Math.round(ny));
      } else if (pan.current) {
        setView((v) => ({ ...v, x: pan.current!.ox + (e.clientX - pan.current!.sx), y: pan.current!.oy + (e.clientY - pan.current!.sy) }));
      }
    };
    const up = () => { drag.current = null; pan.current = null; setDraggingId(null); setPanning(false); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [actions]);

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = wrapRef.current!.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      setView((v) => {
        const nz = Math.min(2, Math.max(0.35, v.z * (1 - e.deltaY * 0.0015)));
        const k = nz / v.z;
        return { z: nz, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
      });
    } else {
      setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  };

  const zoomBy = (factor: number) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const px = rect.width / 2, py = rect.height / 2;
    setView((v) => {
      const nz = Math.min(2, Math.max(0.35, v.z * factor));
      const k = nz / v.z;
      return { z: nz, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  };

  const fit = () => {
    if (!scenes.length) { setView({ x: 24, y: 16, z: 1 }); return; }
    const pad = 80, W = 360;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    scenes.forEach((s) => {
      minX = Math.min(minX, s.x); minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + W); maxY = Math.max(maxY, s.y + 520);
    });
    const rect = wrapRef.current!.getBoundingClientRect();
    const z = Math.min(1, Math.min((rect.width - pad * 2) / (maxX - minX), (rect.height - pad * 2) / (maxY - minY)));
    setView({ z, x: pad - minX * z, y: pad - minY * z });
  };

  return (
    <div className="app">
      <div className="toolbar">
        <button className="icon-btn back" title="Back to projects" onClick={actions.goHome}>
          <Icon name="back" size={17} />
        </button>
        <div className="brand">
          <span className="kicker">Scene Builder</span>
          <Editable
            className="project-name"
            value={project.name}
            placeholder="Untitled project"
            readOnly={!canEdit}
            onCommit={(v) => actions.renameProject(project.id, v || 'Untitled project')}
          />
        </div>

        <div className="tb-spacer" />

        {presentUsers.length > 0 && (
          <div className="presence-stack" title={presentUsers.map((u) => u.name || 'Someone').join(', ') + ' also here'}>
            {presentUsers.slice(0, 4).map((u) => (
              <Avatar key={u.userId} user={{ id: u.userId, name: u.name, color: u.color }} size={26} />
            ))}
            {presentUsers.length > 4 && (
              <span className="presence-more">+{presentUsers.length - 4}</span>
            )}
          </div>
        )}

        <VotingAs
          members={memberships}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          actions={actions}
          open={vaOpen}
          onOpenChange={setVaOpen}
        />

        <button className="btn ghost-tb" onClick={() => setVaOpen(true)} title="Manage team and invite members">
          <Icon name="user" size={15} /> Invite
        </button>

        <div className="tb-divider" />

        <div className="dir-switch" title="Visual direction">
          {THEMES.map((t) => (
            <button key={t.id} className={theme === t.id ? 'active' : ''} onClick={() => setTheme(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {canEdit && (
          <button className="btn primary" onClick={() => actions.addScene()}>
            <span className="glyph"><Icon name="plus" size={15} /></span> New scene
          </button>
        )}
      </div>

      <div ref={wrapRef} className={`board-wrap ${panning ? 'panning' : ''}`} onMouseDown={onBoardDown} onWheel={onWheel}>
        <div className="board-bg" />
        <div className="board" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
          {scenes.map((s) => (
            <SceneCard
              key={s.id} scene={s} actions={actions}
              users={users} currentUserId={currentUserId}
              canEdit={canEdit}
              onDragStart={onSceneDragStart} dragging={draggingId === s.id}
            />
          ))}
        </div>
        {!scenes.length && (
          <div className="empty-hint">
            {canEdit
              ? <>Blank canvas.<br />Hit <strong>New scene</strong> to start mapping.</>
              : <>Nothing here yet.</>}
          </div>
        )}

        <div className="view-controls">
          <div className="legend">
            <span className="item"><span className="swatch lock" /> Locked</span>
            <span className="item"><span className="swatch open" /> Open · forks</span>
          </div>
          <div className="vc-divider" />
          <button className="vc-btn" title="Zoom out" onClick={() => zoomBy(0.85)}><Icon name="zoomout" size={16} /></button>
          <span className="zoom-readout">{Math.round(view.z * 100)}%</span>
          <button className="vc-btn" title="Zoom in" onClick={() => zoomBy(1.18)}><Icon name="zoomin" size={16} /></button>
          <button className="vc-btn" title="Fit to screen" onClick={fit}><Icon name="fit" size={16} /></button>
        </div>
      </div>
    </div>
  );
}
