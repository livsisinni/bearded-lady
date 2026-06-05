import { useState } from 'react';
import type { Actions, Scene, User } from '../lib/types';
import { ELEMENT_TYPES } from '../lib/store';
import { Icon } from './Icon';
import { Editable } from './Editable';
import { ElementRow } from './ElementRow';

interface SceneCardProps {
  scene: Scene;
  actions: Actions;
  onDragStart: (e: React.MouseEvent, sid: string) => void;
  dragging: boolean;
  users: User[];
  currentUserId: string;
  canEdit: boolean;
}

export function SceneCard({ scene, actions, onDragStart, dragging, users, currentUserId, canEdit }: SceneCardProps) {
  const [picker, setPicker] = useState(false);
  const used = new Set(scene.elements.map((e) => e.type));

  return (
    <div
      className={`scene ${dragging ? 'dragging' : ''}`}
      style={{ left: scene.x, top: scene.y }}
    >
      <div className="scene-head" onMouseDown={(e) => onDragStart(e, scene.id)}>
        <span className="scene-index">{scene.title ? scene.title[0].toUpperCase() : '•'}</span>
        <div className="scene-titles">
          <Editable
            className="scene-title"
            value={scene.title}
            placeholder="Untitled scene"
            readOnly={!canEdit}
            onCommit={(v) => actions.setSceneField(scene.id, 'title', v)}
          />
          <Editable
            className="scene-summary"
            value={scene.summary}
            placeholder="What happens in this scene?"
            multiline
            readOnly={!canEdit}
            onCommit={(v) => actions.setSceneField(scene.id, 'summary', v)}
          />
        </div>
        {canEdit && (
          <div className="scene-head-actions">
            <button className="mini-btn danger" title="Delete scene"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => { if (confirm(`Delete scene "${scene.title || 'Untitled'}"?`)) actions.deleteScene(scene.id); }}>
              <Icon name="trash" size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="elements">
        {scene.elements.map((el) => (
          <ElementRow key={el.id} sid={scene.id} el={el} actions={actions} users={users} currentUserId={currentUserId} canEdit={canEdit} />
        ))}

        {canEdit && (
          <div style={{ position: 'relative', marginTop: scene.elements.length ? 10 : 4 }}>
            <button className="ghost-btn full"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setPicker((p) => !p)}>
              <Icon name="plus" size={13} /> Add element
            </button>
            {picker && (
              <>
                <div className="scrim" onMouseDown={() => setPicker(false)} />
                <div className="popover" style={{ top: 40, left: 0, right: 0 }}>
                  {ELEMENT_TYPES.map((t) => (
                    <button key={t}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => { actions.addElement(scene.id, t); setPicker(false); }}>
                      <span style={{ flex: 1 }}>{t}</span>
                      {used.has(t) && <span className="pop-type">added</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
