import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthProvider.jsx';

const AppContext = createContext(null);

/** Estado global liviano: settings del estudio + toasts. */
export function AppStore({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState({ nombre_estudio: '', moneda: 'ARS', timezone: 'America/Argentina/Buenos_Aires' });
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (user) api.get('/settings').then(setSettings).catch(() => {});
  }, [user]);

  const toast = useCallback((msg, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <AppContext.Provider value={{ settings, setSettings, toast }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type === 'error' ? 'error' : ''}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
