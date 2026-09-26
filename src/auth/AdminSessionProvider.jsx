import { useState } from 'react';
import { AdminSessionContext } from './useAdminSession';
import { ADMIN_ROLES, hasRole } from './roles';
import { clearMockSession, createMockAdmin, readMockSession, saveMockSession } from './mockSession';

export default function AdminSessionProvider({ children }) {
  const [currentAdmin, setCurrentAdmin] = useState(readMockSession);
  const role = currentAdmin?.role ?? null;

  function login({ remember = false } = {}) {
    const admin = createMockAdmin();
    saveMockSession(admin, remember);
    setCurrentAdmin(admin);
    return admin;
  }

  function logout() {
    clearMockSession();
    setCurrentAdmin(null);
  }

  return (
    <AdminSessionContext.Provider value={{
      currentAdmin,
      role,
      isAuthenticated: currentAdmin !== null,
      isAdmin: hasRole(role, [ADMIN_ROLES.ADMIN]),
      isSuperAdmin: hasRole(role, [ADMIN_ROLES.SUPER_ADMIN]),
      login,
      logout,
    }}>
      {children}
    </AdminSessionContext.Provider>
  );
}
