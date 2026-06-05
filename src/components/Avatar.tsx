import type { User } from '../lib/types';
import { initials } from '../lib/store';

interface AvatarProps {
  user: User | undefined;
  size?: number;
  ring?: boolean;
}

export function Avatar({ user, size = 18, ring = false }: AvatarProps) {
  if (!user) return null;
  return (
    <span
      className={`avatar ${ring ? 'ring' : ''}`}
      title={user.name}
      style={{ background: user.color, width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initials(user.name)}
    </span>
  );
}
