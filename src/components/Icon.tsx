interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
}

export function Icon({ name, size = 14, stroke = 1.8 }: IconProps) {
  const c = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const,
    stroke: 'currentColor', strokeWidth: stroke,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'lock':    return <svg {...c} fill="currentColor" stroke="none"><circle cx="12" cy="12" r="6" /></svg>;
    case 'fork':    return <svg {...c}><path d="M6 4v6" /><path d="M6 10h7M13 10l5-4M13 10l5 4" /></svg>;
    case 'plus':    return <svg {...c}><path d="M12 5v14M5 12h14" /></svg>;
    case 'trash':   return <svg {...c}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>;
    case 'x':       return <svg {...c}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case 'up':      return <svg {...c}><path d="M12 19V6M6 12l6-6 6 6" /></svg>;
    case 'down':    return <svg {...c}><path d="M12 5v13M6 12l6 6 6-6" /></svg>;
    case 'zoomin':  return <svg {...c}><circle cx="11" cy="11" r="6" /><path d="M11 8v6M8 11h6M20 20l-4.5-4.5" /></svg>;
    case 'zoomout': return <svg {...c}><circle cx="11" cy="11" r="6" /><path d="M8 11h6M20 20l-4.5-4.5" /></svg>;
    case 'fit':     return <svg {...c}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>;
    case 'back':    return <svg {...c}><path d="M15 5l-7 7 7 7" /></svg>;
    case 'chev':    return <svg {...c}><path d="M6 9l6 6 6-6" /></svg>;
    case 'share':   return <svg {...c}><path d="M12 15V3M8 7l4-4 4 4M5 13v6a1 1 0 001 1h12a1 1 0 001-1v-6" /></svg>;
    case 'import':  return <svg {...c}><path d="M12 3v12M8 11l4 4 4-4M5 13v6a1 1 0 001 1h12a1 1 0 001-1v-6" /></svg>;
    case 'user':    return <svg {...c}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>;
    case 'check':   return <svg {...c}><path d="M5 13l4 4 10-11" /></svg>;
    case 'dot3':    return <svg {...c} fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>;
    case 'film':    return <svg {...c}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 15h18M8 4v16M16 4v16"/></svg>;
    default: return null;
  }
}
