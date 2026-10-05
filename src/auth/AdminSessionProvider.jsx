import { useEffect, useState, useSyncExternalStore } from 'react';
import { AdminSessionContext } from './useAdminSession';
import { createAdminSession } from './adminSession';

export default function AdminSessionProvider({ children }) {
  const [session] = useState(() => createAdminSession());
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEffect(() => { session.refreshSession(); }, [session]);

  return (
    <AdminSessionContext.Provider value={{
      ...state,
      login: session.login,
      logout: session.logout,
      refreshSession: session.refreshSession,
      changeInitialPassword: session.changeInitialPassword,
      requestAdmin: session.requestAdmin,
    }}>
      {children}
    </AdminSessionContext.Provider>
  );
}
