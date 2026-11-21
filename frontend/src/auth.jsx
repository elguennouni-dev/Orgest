import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ensureCsrf } from './api.js';
import { clearCache } from './lib/offline.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      try { await ensureCsrf(); } catch { /* hors ligne : on tente le cache */ }
      setMe(await api('/auth/me'));
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const onUnauth = () => setMe(null);
    const onExpired = () => refresh();
    window.addEventListener('orgest:unauth', onUnauth);
    window.addEventListener('orgest:expired', onExpired);
    return () => {
      window.removeEventListener('orgest:unauth', onUnauth);
      window.removeEventListener('orgest:expired', onExpired);
    };
  }, [refresh]);

  const login = async (username, password) => {
    const user = await api('/auth/login', { method: 'POST', body: { username, password } });
    setMe(user);
    return user;
  };
  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } finally { setMe(null); clearCache().catch(() => {}); }
  };

  return <Ctx.Provider value={{ me, setMe, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
