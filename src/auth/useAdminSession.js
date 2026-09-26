import { createContext, useContext } from 'react';

export const AdminSessionContext = createContext(null);

export function useAdminSession() {
  const session = useContext(AdminSessionContext);
  if (!session) throw new Error('useAdminSession requires AdminSessionProvider');
  return session;
}
