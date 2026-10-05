import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkAdminManagement(server) {
  const { createAdminManagement, visibleAdmins } = await server.ssrLoadModule('/src/services/adminManagementState.js');
  const { adminManagementApi } = await server.ssrLoadModule('/src/services/adminManagementApi.js');
  const { AdminManagementView } = await server.ssrLoadModule('/src/pages/AdminManagement.jsx');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const { createAdminSession } = await server.ssrLoadModule('/src/auth/adminSession.js');
  const storage = await server.ssrLoadModule('/src/services/adminAuthStorage.js');
  const originalFetch = globalThis.fetch;
  const secret = 'One-Time-Test123!';
  let records = [
    { id: 1, name: 'API Admin', email: 'api@example.test', status: 'active', created_at: '2026-09-01T00:00:00Z', last_login_at: null },
    { id: 2, name: 'Deactivated API Admin', email: 'old@example.test', status: 'deactivated', created_at: '2026-09-01T00:00:00Z',
      scheduled_for_deletion_at: '2099-01-01T00:00:00Z' },
  ];
  const calls = [];
  let failure;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    if (failure) {
      const current = failure; failure = null;
      return new Response(JSON.stringify(current.body), { status: current.status });
    }
    const path = new URL(url).pathname;
    let body = {};
    let status = 200;
    if (options.method === 'GET') {
      body = { admins: records, summary: { total: records.length,
        active: records.filter((r) => r.status === 'active').length,
        deactivated: records.filter((r) => r.status === 'deactivated').length } };
    } else if (path.endsWith('/admins')) {
      const data = JSON.parse(options.body);
      assert.deepEqual(Object.keys(data).sort(), ['email', 'name']);
      const admin = { ...data, id: 3, role: 'admin', status: 'active', must_change_password: true };
      records.push(admin);
      body = { admin, temporary_password: secret }; status = 201;
    } else {
      const id = Number(path.match(/admins\/(\d+)/)[1]);
      const admin = records.find((row) => row.id === id);
      if (options.method === 'PUT') Object.assign(admin, JSON.parse(options.body));
      if (path.endsWith('/deactivate')) Object.assign(admin, { status: 'deactivated', scheduled_for_deletion_at: '2099-01-01T00:00:00Z' });
      if (path.endsWith('/reactivate')) Object.assign(admin, { status: 'active', scheduled_for_deletion_at: null });
      body = path.endsWith('/send-password-reset') ? { message: 'Instructions requested.' } : { admin };
    }
    return new Response(JSON.stringify(body), { status });
  };
  const model = createAdminManagement((operation) => operation('test-token'));
  const render = (state = model.getSnapshot()) => renderToString(React.createElement(MemoryRouter, null,
    React.createElement(AdminSessionContext.Provider, { value: { role: 'super_admin', currentAdmin: { name: 'Super Admin' }, logout() {} } },
      React.createElement(AdminManagementView, { model, state }))));
  try {
    assert.ok(render().includes('Loading page'));
    await model.load();
    assert.deepEqual(model.getSnapshot().summary, { total: 2, active: 1, deactivated: 1 });
    assert.ok(calls[0].url.endsWith('/admins?status=all'));
    let html = render();
    assert.ok(html.includes('API Admin') && html.includes('Last Login') && html.includes('Reset Password'));
    assert.ok(html.indexOf('Total Admins') < html.indexOf('Search Admins'));
    assert.ok(html.indexOf('aria-label="Admin account status"') < html.indexOf('<table'));
    model.setSearch(' API@EXAMPLE ');
    assert.equal(visibleAdmins(model.getSnapshot()).length, 1);
    model.setTab('deactivated');
    assert.equal(visibleAdmins(model.getSnapshot()).length, 0);
    assert.ok(render().includes('No deactivated Admins found'));
    model.setSearch('');
    assert.ok(render().includes('Recovery deadline') && render().includes('Reactivate'));
    model.setTab('active');
    model.openEditor();
    model.setDraft({ name: 'Created Admin', email: 'created@example.test' });
    await model.save();
    assert.equal(model.getSnapshot().summary.total, 3);
    assert.equal(model.getSnapshot().modal.temporaryPassword, secret);
    html = render();
    assert.ok(html.includes('Admin account created') && html.includes('Copy Password') && html.includes('only be shown once'));
    let copied;
    await model.copyPassword({ writeText: async (value) => { copied = value; } });
    assert.equal(copied, secret);
    assert.equal(model.getSnapshot().copyNotice, 'Password copied.');
    await model.copyPassword({ writeText: async () => { throw new Error('denied'); } });
    assert.ok(model.getSnapshot().copyNotice.includes('manually'));
    model.closeModal();
    assert.ok(!JSON.stringify(model.getSnapshot()).includes(secret));
    assert.ok(!render().includes(secret));
    assert.equal(localStorage.getItem('temporary_password'), null);
    assert.equal(sessionStorage.getItem('temporary_password'), null);
    const created = model.getSnapshot().admins.find((row) => row.id === 3);
    model.openEditor(created);
    assert.ok(!render().includes('Temporary Password:'));
    model.setDraft({ name: 'Edited API Admin', email: 'edited@example.test' });
    await model.save();
    assert.equal(model.getSnapshot().admins.find((row) => row.id === 3).name, 'Edited API Admin');
    model.openAction('deactivate', created);
    await model.confirm();
    assert.equal(model.getSnapshot().summary.deactivated, 2);
    assert.equal(visibleAdmins(model.getSnapshot()).some((row) => row.id === 3), false);
    model.setTab('deactivated');
    const deactivated = model.getSnapshot().admins.find((row) => row.id === 3);
    model.openAction('reactivate', deactivated);
    await model.confirm();
    assert.equal(model.getSnapshot().summary.active, 2);
    model.openAction('reset', created);
    await model.confirm();
    assert.ok(calls.some((call) => call.url.endsWith('/admins/3/send-password-reset')));
    assert.ok(!JSON.stringify(model.getSnapshot()).includes(secret));
    model.openEditor(created);
    failure = { status: 422, body: { message: 'Validation error', errors: { email: ['The email has already been taken.'] } } };
    await model.save();
    assert.ok(render().includes('The email has already been taken.'));
    model.closeModal();
    failure = { status: 500, body: { message: 'internal stack details' } };
    await model.load();
    assert.ok(render().includes('role="alert"') && render().includes('Try again'));
    assert.ok(!render().includes('internal stack details'));
    records = [];
    await model.load();
    model.setTab('active');
    assert.ok(render().includes('No active Admins found'));
    model.openEditor(); model.setDraft({ name: 'Unmounted', email: 'unmounted@example.test' });
    await model.save();
    model.dispose();
    assert.ok(!JSON.stringify(model.getSnapshot()).includes(secret));

    storage.saveToken('test-token');
    const session = createAdminSession({ me: async () => ({ user: { id: 1, name: 'Super', email: 'super@example.test', role: 'super_admin', must_change_password: false } }) });
    await session.refreshSession();
    failure = { status: 401, body: { message: 'Unauthenticated.' } };
    await assert.rejects(session.requestAdmin((token) => adminManagementApi.list(token)));
    assert.equal(session.getSnapshot().isAuthenticated, false);
    assert.equal(storage.readToken(), null);
    process.stdout.write('Admin Management checks passed: real transport/list/counts/search/tabs, create/edit/status/reset, one-time password/copy, loading/errors and expired sessions.\n');
  } finally {
    model.dispose(); storage.clearToken(); globalThis.fetch = originalFetch;
  }
}
