import type { Actions, Option, User, VoteDirection } from '../lib/types';
import { tallyVotes, STATUS_LABEL } from '../lib/store';
import { Icon } from './Icon';
import { Avatar } from './Avatar';
import { Editable } from './Editable';

interface OptionCardProps {
  sid: string;
  eid: string;
  opt: Option;
  actions: Actions;
  users: User[];
  currentUserId: string;
  canEdit: boolean;
}

export function OptionCard({ sid, eid, opt, actions, users, currentUserId, canEdit }: OptionCardProps) {
  const status = opt.status || 'none';
  const { up, down, mine, upUsers, downUsers } = tallyVotes(opt, currentUserId);
  const byId = (id: string) => users.find((u) => u.id === id);
  const upVoters = upUsers.map(byId).filter((u): u is User => u !== undefined);
  const shown = upVoters.slice(0, 4);
  const extra = upVoters.length - shown.length;
  const downNames = downUsers.map((id) => (byId(id) || {}).name).filter(Boolean).join(', ');

  return (
    <div className={`opt-card ${status}`}>
      <div className="opt-top">
        <Editable
          className="opt-label"
          value={opt.label}
          placeholder="Name this option…"
          readOnly={!canEdit}
          onCommit={(v) => actions.setOptionField(sid, eid, opt.id, 'label', v)}
        />
        {canEdit && (
          <button className="opt-del" title="Delete option"
            onClick={() => actions.deleteOption(sid, eid, opt.id)}>
            <Icon name="x" size={13} />
          </button>
        )}
      </div>
      <Editable
        className="opt-desc"
        value={opt.desc}
        placeholder="Add a note…"
        multiline
        readOnly={!canEdit}
        onCommit={(v) => actions.setOptionField(sid, eid, opt.id, 'desc', v)}
      />
      <div className="opt-foot">
        {canEdit ? (
          <button
            className={`status-pill ${status}`}
            onClick={() => actions.cycleStatus(sid, eid, opt.id)}
            onMouseDown={(e) => e.stopPropagation()}
            title="Click to change status"
          >
            {status !== 'none' && <span className="dot" />}
            {STATUS_LABEL[status]}
          </button>
        ) : (
          <span className={`status-pill ${status}`}>
            {status !== 'none' && <span className="dot" />}
            {STATUS_LABEL[status]}
          </span>
        )}
        <div className="votes">
          <button
            className={`vote-btn up ${mine === 'up' ? 'voted' : ''}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => actions.toggleVote(sid, eid, opt.id, 'up' as VoteDirection)}
            title={mine === 'up' ? 'Remove your vote for this' : 'Vote for this option'}
          >
            <Icon name="up" size={13} />{up}
          </button>
          <button
            className={`vote-btn down ${mine === 'down' ? 'voted' : ''}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => actions.toggleVote(sid, eid, opt.id, 'down' as VoteDirection)}
            title={down ? `Against: ${downNames}` : 'Vote against'}
          >
            <Icon name="down" size={13} />{down}
          </button>
        </div>
      </div>
      {upVoters.length > 0 && (
        <div className="champions" title={`In favor: ${upVoters.map((u) => u.name).join(', ')}`}>
          <div className="champ-stack">
            {shown.map((u) => <Avatar key={u.id} user={u} size={18} ring />)}
            {extra > 0 && <span className="champ-more">+{extra}</span>}
          </div>
          <span className="champ-label">in favor</span>
        </div>
      )}
    </div>
  );
}
