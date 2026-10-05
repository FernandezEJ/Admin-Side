import { ADMIN_ROLES, hasRole, isSupportedRole } from './roles';
import { adminAuthApi, AuthApiError } from '../services/adminAuthApi';
import * as storage from '../services/adminAuthStorage';

function validatedUser(user) {
  if (!user || !isSupportedRole(user.role) || !Number.isInteger(user.id) ||
      typeof user.name !== 'string' || typeof user.email !== 'string' || typeof user.must_change_password !== 'boolean') {
    throw new AuthApiError('This account cannot access the Admin portal.', 403);
  }
  return { id: user.id, name: user.name, email: user.email, role: user.role,
    must_change_password: user.must_change_password, last_login_at: user.last_login_at ?? null };
}

// Session transitions are independent of React so checks exercise the real flow.
export function createAdminSession(api = adminAuthApi, tokenStorage = storage) {
  let token = tokenStorage.readToken();
  let version = 0;
  let loginPending;
  let refreshPending;
  let changePending;
  const listeners = new Set();
  let state;
  function update(user, extra = {}) {
    const role = user?.role ?? null;
    state = { user, currentAdmin: user, role, hasSession: Boolean(token),
      isAuthenticated: Boolean(user && token), isLoading: false, sessionError: null,
      mustChangePassword: user?.must_change_password ?? false,
      isAdmin: hasRole(role), isSuperAdmin: hasRole(role, [ADMIN_ROLES.SUPER_ADMIN]), ...extra };
    listeners.forEach((notify) => notify());
  }
  function clear() {
    version++;
    token = null;
    tokenStorage.clearToken();
    update(null);
  }
  function invalidate(error, expectedVersion) {
    if (version === expectedVersion && [401, 403].includes(error.status)) clear();
  }
  update(null, { isLoading: Boolean(token) });

  const actions = {
    async requestAdmin(operation) {
      const expectedVersion = version;
      if (!token) throw new AuthApiError('Please sign in again.', 401);
      try {
        return await operation(token);
      } catch (error) {
        if (error.status === 401) invalidate(error, expectedVersion);
        if (error.status === 403 && expectedVersion === version) await actions.refreshSession();
        throw error;
      }
    },
    login(credentials) {
      if (loginPending) return loginPending;
      const operation = ++version;
      loginPending = (async () => {
        const result = await api.login(credentials);
        const user = validatedUser(result.user);
        if (typeof result.token !== 'string' || !result.token) throw new AuthApiError('The server did not return a session token.');
        if (operation !== version) {
          await api.logout(result.token).catch(() => {});
          throw new AuthApiError('Sign-in was cancelled. Please try again.');
        }
        token = result.token;
        tokenStorage.saveToken(token, credentials.remember ?? true);
        update(user);
        return user;
      })().finally(() => { loginPending = null; });
      return loginPending;
    },
    refreshSession() {
      if (refreshPending) return refreshPending;
      if (!token) return Promise.resolve(null);
      const operation = version;
      update(state.user, { isLoading: true });
      refreshPending = (async () => {
        try {
          const { user } = await api.me(token);
          const restored = validatedUser(user);
          if (operation === version) update(restored);
          return restored;
        } catch (error) {
          invalidate(error, operation);
          if (operation === version) update(null, { sessionError: error.message });
          return null;
        }
      })().finally(() => { refreshPending = null; });
      return refreshPending;
    },
    async logout() {
      const previousToken = token;
      clear();
      if (previousToken) await api.logout(previousToken).catch(() => {});
    },
    changeInitialPassword(payload) {
      if (changePending) return changePending;
      const operation = version;
      changePending = (async () => {
        try {
          await api.changeInitialPassword(token, payload);
          if (operation === version) update({ ...state.user, must_change_password: false });
        } catch (error) {
          invalidate(error, operation);
          if (error.status === 409 && operation === version) await actions.refreshSession();
          throw error;
        }
      })().finally(() => { changePending = null; });
      return changePending;
    },
  };
  return { ...actions, getSnapshot: () => state, subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  } };
}
