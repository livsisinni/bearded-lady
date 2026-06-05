import { useState } from 'react';
import type { Actions, Membership, MemberRole } from '../lib/types';
import { Icon } from './Icon';
import { Avatar } from './Avatar';

interface VotingAsProps {
  members: Membership[];
  currentUserId: string;
  currentUserRole: MemberRole | null;
  actions: Actions;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

export function VotingAs({ members, currentUserId, currentUserRole, actions, open, onOpenChange }: VotingAsProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviting, setInviting] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  const me = members.find((m) => m.userId === currentUserId);
  const meUser = me
    ? { id: me.profile.id, name: me.profile.name || me.profile.email.split('@')[0], color: me.profile.avatarColor }
    : null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await actions.inviteMember(inviteEmail.trim(), inviteRole);
      setInviteSent(true);
      setInviteEmail('');
      setTimeout(() => setInviteSent(false), 3000);
    } catch { /* ignore — error visible in console */ }
    setInviting(false);
  };

  return (
    <div className="voting-as">
      <button className="va-trigger" onClick={() => onOpenChange(!open)} title="Team members">
        {meUser && <Avatar user={meUser} size={22} />}
        <span className="va-name">{meUser?.name ?? '—'}</span>
        <Icon name="chev" size={14} />
      </button>

      {open && (
        <>
          <div className="scrim" onMouseDown={() => onOpenChange(false)} />
          <div className="va-menu">
            <div className="va-head">Team</div>

            {members.map((m) => {
              const u = { id: m.profile.id, name: m.profile.name || m.profile.email.split('@')[0], color: m.profile.avatarColor };
              const isMe = m.userId === currentUserId;
              return (
                <div key={m.userId} className={`va-row ${isMe ? 'active' : ''}`}>
                  <span className="va-pick">
                    <Avatar user={u} size={22} />
                    <span className="va-name">{u.name}{isMe && ' (you)'}</span>
                    <span className="va-role-chip">{ROLE_LABEL[m.role]}</span>
                  </span>
                  {currentUserRole === 'owner' && !isMe && (
                    <button
                      className="va-remove"
                      title="Remove from project"
                      onClick={() => actions.removeMember(m.userId)}
                    >
                      <Icon name="x" size={13} />
                    </button>
                  )}
                </div>
              );
            })}

            {currentUserRole === 'owner' && (
              <form className="va-invite" onSubmit={handleInvite}>
                <div className="va-head va-invite-head">Invite by email</div>
                <div className="va-invite-row">
                  <input
                    type="email"
                    className="va-invite-email"
                    placeholder="name@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  <select
                    className="va-invite-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button type="submit" className="va-invite-btn" disabled={inviting || inviteSent}>
                  {inviteSent ? '✓ Invite sent' : inviting ? 'Sending…' : 'Send invite'}
                </button>
              </form>
            )}

            <div className="va-sep" />
            <button className="va-signout" onClick={() => { actions.signOut(); onOpenChange(false); }}>
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
