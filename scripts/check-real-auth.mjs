import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Navigate, Outlet } from 'react-router-dom';

export async function checkRealAuth(server) {
  const { createAdminSession } = await server.ssrLoadModule('/src/auth/adminSession.js');
  const { adminAuthApi, API_BASE_URL, AuthApiError } = await server.ssrLoadModule('/src/services/adminAuthApi.js');
  const storage = await server.ssrLoadModule('/src/services/adminAuthStorage.js');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const { default: RequireRole } = await server.ssrLoadModule('/src/auth/RequireRole.jsx');
  const { default: Provider } = await server.ssrLoadModule('/src/auth/AdminSessionProvider.jsx');
  const { default: Login } = await server.ssrLoadModule('/src/pages/Login.jsx');
  const { default: ChangePassword } = await server.ssrLoadModule('/src/pages/ChangeInitialPassword.jsx');
  const { default: SessionState } = await server.ssrLoadModule('/src/auth/SessionState.jsx');
  const originalFetch = globalThis.fetch;
  let reply;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  };
  const user = (role = 'admin', pending = false) => ({ id: 1, name: 'Real API Admin', email: 'staff@example.test', role,
    must_change_password: pending, last_login_at: '2026-09-26T00:00:00.000000Z' });
  const credentials = { email: 'staff@example.test', password: 'test-only', remember: true };
  const passwordFields = { current_password: 'OldPassword123!', password: 'NewPassword123!', password_confirmation: 'NewPassword123!' };
  function inspect(snapshot, props = {}) {
    let result;
    function Probe() { result = RequireRole(props); return null; }
    renderToString(React.createElement(AdminSessionContext.Provider, { value: snapshot }, React.createElement(Probe)));
    return result;
  }
  function render(Component, session) {
    return renderToString(React.createElement(MemoryRouter, null,
      React.createElement(AdminSessionContext.Provider, { value: { ...session, ...session.getSnapshot() } }, React.createElement(Component))));
  }
  try {
    for (const role of ['admin', 'super_admin']) {
      storage.clearToken();
      const session = createAdminSession();
      reply = { body: { token: `${role}-token`, user: user(role) } };
      await session.login(credentials);
      assert.equal(localStorage.getItem(storage.TOKEN_KEY), `${role}-token`);
      assert.equal(session.getSnapshot().role, role);
      assert.equal(session.getSnapshot().isAuthenticated, true);
      assert.equal(calls.at(-1).url, `${API_BASE_URL}/admin/login`);
      assert.deepEqual(JSON.parse(calls.at(-1).options.body), { email: credentials.email, password: credentials.password });
      assert.equal(calls.at(-1).options.credentials, 'omit');
      assert.equal(calls.at(-1).options.headers.Authorization, undefined);
      assert.equal(inspect(session.getSnapshot()).type, Outlet);
      assert.equal(inspect(session.getSnapshot(), { allowedRoles: ['super_admin'] }).type, role === 'super_admin' ? Outlet : Navigate);

      const restored = createAdminSession();
      assert.equal(restored.getSnapshot().isLoading, true);
      assert.equal(inspect(restored.getSnapshot()).type, SessionState);
      const loadingHtml = renderToString(React.createElement(MemoryRouter, null, React.createElement(Provider, null, React.createElement(Login))));
      assert.ok(loadingHtml.includes('Loading page') && !loadingHtml.includes('Sign In'));
      reply = { body: { user: user(role) } };
      await restored.refreshSession();
      assert.equal(restored.getSnapshot().role, role);
      assert.equal(calls.at(-1).url, `${API_BASE_URL}/admin/me`);
      assert.equal(calls.at(-1).options.headers.Authorization, `Bearer ${role}-token`);

      reply = { status: 401, body: { message: 'Unauthenticated.' } };
      await restored.logout();
      assert.equal(calls.at(-1).url, `${API_BASE_URL}/admin/logout`);
      assert.equal(calls.at(-1).options.method, 'POST');
      assert.equal(restored.getSnapshot().isAuthenticated, false);
      assert.equal(storage.readToken(), null);
    }

    for (const status of [401, 403]) {
      storage.saveToken('invalid');
      const session = createAdminSession();
      reply = { status, body: { message: 'Access denied.' } };
      await session.refreshSession();
      assert.equal(storage.readToken(), null);
      assert.equal(session.getSnapshot().sessionError, null);
      assert.equal(inspect(session.getSnapshot()).props.to, '/');
    }
    storage.clearToken();
    const invalidLogin = createAdminSession();
    reply = { status: 401, body: { message: 'Invalid email or password.' } };
    await assert.rejects(invalidLogin.login(credentials), /Invalid email or password/);
    assert.equal(invalidLogin.getSnapshot().isAuthenticated, false);
    assert.equal(storage.readToken(), null);
    assert.ok(render(Login, invalidLogin).includes('Sign In'));
    for (const role of ['donor', 'invalid']) {
      reply = { body: { token: 'rejected', user: user(role) } };
      await assert.rejects(invalidLogin.login(credentials), /cannot access/);
      assert.equal(storage.readToken(), null);
    }

    storage.saveToken('pending-token');
    const pending = createAdminSession();
    reply = { body: { user: user('admin', true) } };
    await pending.refreshSession();
    assert.equal(inspect(pending.getSnapshot()).props.to, '/change-initial-password');
    assert.equal(inspect(pending.getSnapshot(), { initialPassword: true }).type, Outlet);
    const changeHtml = render(ChangePassword, pending);
    for (const label of ['Current Temporary Password', 'New Password', 'Confirm New Password', 'Logout']) assert.ok(changeHtml.includes(label));
    reply = { status: 422, body: { message: 'The password is incorrect.', errors: { current_password: ['The password is incorrect.'] } } };
    await assert.rejects(pending.changeInitialPassword(passwordFields), (error) => {
      assert.deepEqual(error.errors, { current_password: ['The password is incorrect.'] }); return true;
    });
    assert.equal(pending.getSnapshot().mustChangePassword, true);
    reply = { body: { message: 'Password changed successfully.' } };
    await pending.changeInitialPassword(passwordFields);
    assert.equal(calls.at(-1).url, `${API_BASE_URL}/admin/change-initial-password`);
    assert.deepEqual(JSON.parse(calls.at(-1).options.body), passwordFields);
    assert.equal(pending.getSnapshot().mustChangePassword, false);
    assert.equal(inspect(pending.getSnapshot()).type, Outlet);
    assert.equal(inspect(pending.getSnapshot(), { initialPassword: true }).props.to, '/dashboard');
    assert.equal(storage.readToken(), 'pending-token');
    assert.ok(!JSON.stringify(pending.getSnapshot()).includes('Password123!'));

    reply = { status: 500, body: { message: 'SQL stack trace secret' } };
    await assert.rejects(adminAuthApi.me('test'), /server is unavailable/);
    reply = new TypeError('Network failure details');
    await pending.refreshSession();
    assert.equal(pending.getSnapshot().isAuthenticated, false);
    assert.equal(storage.readToken(), 'pending-token');
    assert.ok(render(SessionState, pending).includes('Try again'));
    reply = { body: { user: user() } };
    await pending.refreshSession();
    assert.equal(pending.getSnapshot().isAuthenticated, true);
    reply = new TypeError('offline');
    await pending.logout();
    assert.equal(storage.readToken(), null);

    let finishLogin;
    let loginCalls = 0;
    const duplicate = createAdminSession({ login: () => { loginCalls++; return new Promise((resolve) => { finishLogin = resolve; }); } });
    const first = duplicate.login(credentials);
    const second = duplicate.login(credentials);
    assert.equal(first, second);
    assert.equal(loginCalls, 1);
    finishLogin({ token: 'single-token', user: user() });
    await first;
    storage.clearToken();

    storage.saveToken('old-token');
    let finishMe;
    const stale = createAdminSession({ me: () => new Promise((resolve) => { finishMe = resolve; }), logout: async () => ({}) });
    const restoration = stale.refreshSession();
    await stale.logout();
    finishMe({ user: user('super_admin') });
    await restoration;
    assert.equal(stale.getSnapshot().isAuthenticated, false);
    assert.equal(storage.readToken(), null);

    localStorage.setItem('lifeflow.admin.mockSession', JSON.stringify(user('super_admin')));
    assert.equal(createAdminSession().getSnapshot().isAuthenticated, false);
    assert.equal(localStorage.getItem('lifeflow.admin.mockSession'), null);
    for (const path of ['src/auth/AdminSessionProvider.jsx', 'src/auth/adminSession.js', 'src/pages/Login.jsx']) {
      assert.ok(!readFileSync(path, 'utf8').includes('VITE_MOCK_ADMIN_ROLE'));
    }
    assert.ok(new AuthApiError('test') instanceof Error);
    process.stdout.write('Real-auth checks passed: transport, roles, token-only storage, restoration, errors, password gate/change, logout, duplicate submits and stale responses.\n');
  } finally {
    storage.clearToken();
    globalThis.fetch = originalFetch;
  }
}
