import { ADMIN_ROLES, isSupportedRole } from './roles';

export const SESSION_KEY = 'lifeflow.admin.mockSession';

export function createMockAdmin() {
  const configuredRole = import.meta.env.DEV ? import.meta.env.VITE_MOCK_ADMIN_ROLE : null;
  return {
    id: 1,
    name: 'Sample Admin',
    email: 'admin@lifeflow.test',
    role: isSupportedRole(configuredRole) ? configuredRole : ADMIN_ROLES.ADMIN,
  };
}

export function readMockSession() {
  try {
    const admin = JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY));
    if (admin && Number.isInteger(admin.id) && typeof admin.name === 'string' &&
        typeof admin.email === 'string' && isSupportedRole(admin.role)) {
      return { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
    }
  } catch {
    // Invalid or unavailable storage starts logged out.
  }
  return null;
}

export function clearMockSession() {
  for (const storageName of ['localStorage', 'sessionStorage']) {
    try {
      window[storageName].removeItem(SESSION_KEY);
    } catch {
      // In-memory login/logout still works when browser storage is unavailable.
    }
  }
}

export function saveMockSession(admin, remember) {
  clearMockSession();
  try {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(SESSION_KEY, JSON.stringify(admin));
  } catch {
    // Fall back to the provider's in-memory session.
  }
}
