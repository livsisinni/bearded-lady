import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PresenceUser {
  userId: string;
  name: string;
  color: string;
}

export function useProjectPresence(
  activeId: string | null,
  currentUserId: string,
  currentUserName: string,
  currentUserColor: string,
): PresenceUser[] {
  const [others, setOthers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!activeId || !currentUserId) { setOthers([]); return; }

    const channel = supabase.channel(`presence:${activeId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        // reason: any — Supabase presence state shape is generic
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = channel.presenceState<any>();
        const seen = new Set<string>();
        const users: PresenceUser[] = [];
        for (const entries of Object.values(state)) {
          const u = (entries as PresenceUser[])[0];
          if (!u || u.userId === currentUserId || seen.has(u.userId)) continue;
          seen.add(u.userId);
          users.push({ userId: u.userId, name: u.name, color: u.color });
        }
        setOthers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId: currentUserId, name: currentUserName, color: currentUserColor });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [activeId, currentUserId, currentUserName, currentUserColor]);

  return others;
}
