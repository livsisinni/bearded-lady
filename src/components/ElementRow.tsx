import type { Actions, SceneElement, User } from '../lib/types';
import { ELEMENT_TYPES } from '../lib/store';
import { Icon } from './Icon';
import { Editable } from './Editable';
import { OptionCard } from './OptionCard';

interface ElementRowProps {
  sid: string;
  el: SceneElement;
  actions: Actions;
  users: User[];
  currentUserId: string;
  canEdit: boolean;
}

export function ElementRow({ sid, el, actions, users, currentUserId, canEdit }: ElementRowProps) {
  const isSpine = el.mandatory || el.type === 'Plot beat';
  return (
    <div className={`element ${el.locked ? 'locked' : 'open'} ${isSpine ? 'plot-beat' : ''}`}>
      <div className="el-label-row">
        <span className="el-marker"><Icon name={el.locked ? 'lock' : 'fork'} size={13} /></span>
        <span className="el-type">{el.type}{isSpine && <span className="spine-tag">spine</span>}</span>
        {canEdit ? (
          <button
            className="el-state"
            onClick={() => actions.toggleLock(sid, el.id)}
            onMouseDown={(e) => e.stopPropagation()}
            title={el.locked ? 'Locked — click to open into options' : 'Open — click to lock a decision'}
          >
            {el.locked ? 'Locked' : `Open · ${el.options.length}`}
          </button>
        ) : (
          <span className="el-state el-state-ro">{el.locked ? 'Locked' : `Open · ${el.options.length}`}</span>
        )}
        {canEdit && !isSpine && (
          <button className="mini-btn danger el-del" title="Remove element"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => actions.deleteElement(sid, el.id)}>
            <Icon name="trash" size={13} />
          </button>
        )}
      </div>

      {el.locked ? (
        <Editable
          className={`locked-value ${isSpine ? 'spine' : ''}`}
          value={el.value}
          placeholder={isSpine ? 'What happens in this beat?' : 'What\'s decided here…'}
          multiline
          readOnly={!canEdit}
          onCommit={(v) => actions.setElementValue(sid, el.id, v)}
        />
      ) : (
        <div className="fork">
          <div className="options">
            {el.options.map((o) => (
              <div className="option" key={o.id}>
                <OptionCard sid={sid} eid={el.id} opt={o} actions={actions} users={users} currentUserId={currentUserId} canEdit={canEdit} />
              </div>
            ))}
          </div>
          {canEdit && (
            <button className="ghost-btn add-opt" style={{ marginTop: 8 }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => actions.addOption(sid, el.id)}>
              <Icon name="plus" size={13} /> Add option
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// re-export ELEMENT_TYPES so SceneCard can import from one place
export { ELEMENT_TYPES };
