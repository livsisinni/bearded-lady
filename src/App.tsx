import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useStore } from './hooks/useStore';
import { Home } from './pages/Home';
import { Canvas } from './pages/Canvas';
import { Auth } from './pages/Auth';

export default function App() {
  const { session, loading: authLoading } = useAuth();
  const { st, activeProject, actions, loading: dataLoading, memberships } = useStore();

  const [theme, setTheme] = useState(
    () => localStorage.getItem('scene-builder-theme-v1') || 'daylight'
  );
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    try { localStorage.setItem('scene-builder-theme-v1', theme); } catch { /* ignore */ }
  }, [theme]);

  if (authLoading) return <div className="app-loading">Loading…</div>;
  if (!session) return <Auth />;
  if (dataLoading) return <div className="app-loading">Loading…</div>;

  if (!activeProject) {
    return <Home st={st} actions={actions} theme={theme} setTheme={setTheme} />;
  }
  return (
    <Canvas
      project={activeProject}
      actions={actions}
      users={st.users}
      currentUserId={st.currentUserId}
      currentUserRole={st.currentUserRole}
      memberships={memberships}
      canEdit={st.currentUserRole !== 'viewer'}
      theme={theme}
      setTheme={setTheme}
    />
  );
}
