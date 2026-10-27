import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkAuditLogs(server) {
  const { createAuditLogs, formatAuditDate, auditModuleLabel, auditActionLabel } = await server.ssrLoadModule('/src/services/auditLogsApi.js');
  const { createAdminSession } = await server.ssrLoadModule('/src/auth/adminSession.js');
  const { AuditLogsView } = await server.ssrLoadModule('/src/pages/AuditLogs.jsx');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const render = (remote) => renderToString(React.createElement(MemoryRouter, null,
    React.createElement(AdminSessionContext.Provider, { value: { role: 'super_admin', isSuperAdmin: true,
      currentAdmin: { name: 'Reviewer' } } }, React.createElement(AuditLogsView, { remote })))).replace(/<!--.*?-->/g, '');
  const longDetails = '<script>Review reason</script>\n' + 'long-donation-review'.repeat(200);
  const rows = Array.from({ length: 20 }, (_, index) => ({ id: 21 - index, actorName: index === 0 ? 'Alice Reviewer' : 'Recorded Admin',
    actorRole: 'admin', action: index === 0 ? 'verification_needs_revision' : 'reward_updated',
    module: index === 0 ? 'verification' : 'rewards', target: `Donation Participation #${21 - index}`,
    details: index === 0 ? longDetails : null, createdAt: '2026-10-04T01:30:00.000000Z' }));
  rows[1] = { ...rows[1], actorName: 'Unknown User', actorRole: null, createdAt: null, target: null };
  rows[2] = { ...rows[2], module: 'future_module', action: 'future_action' };
  const first = { data: rows, modules: ['admin_accounts', 'future_module', 'rewards', 'verification'],
    pagination: { currentPage: 1, lastPage: 2, perPage: 20, total: 21 } };
  const second = { ...first, data: [{ id: 1, actorName: 'System', actorRole: 'admin', action: 'admin_purged', module: 'admin_accounts',
    target: 'User #12', details: 'Initiator: Scheduler', createdAt: '2026-09-30T16:00:00Z' }],
    pagination: { currentPage: 2, lastPage: 2, perPage: 20, total: 21 } };
  const filtered = { ...first, data: [rows[0]], pagination: { currentPage: 1, lastPage: 1, perPage: 20, total: 1 } };
  const originalFetch = globalThis.fetch;
  let reply = first;
  let status = 200;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(url);
    assert.equal(path.pathname, '/api/admin/audit-logs');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer audit-token');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.body, undefined);
    calls.push(path);
    return Response.json(reply, { status });
  };
  try {
    const source = readFileSync('src/pages/AuditLogs.jsx', 'utf8');
    assert.ok(!source.includes('mockAuditLogs') && !source.includes('data/adminManagement'));
    const model = createAuditLogs((operation) => operation('audit-token'));
    const remote = () => ({ ...model.getSnapshot(), model });
    let html = render(remote());
    assert.ok(html.includes('Loading page') && !html.includes('Alice Reviewer') && !html.includes('No audit logs found'));
    await model.load();
    assert.equal(calls.at(-1).searchParams.get('page'), '1');
    assert.deepEqual(model.getSnapshot().data, first.data);
    html = render(remote());
    for (const label of ['Audit Logs', 'Search activity', 'All modules', 'All Months', 'September', 'Date &amp; Time', 'Admin', 'Action',
      'Module', 'Target / Details', 'Alice Reviewer', 'Verification needs revision', 'Unknown User', 'Unknown role', 'Unknown date',
      'Admin Management', 'Future module', 'Future action', 'Philippine time', '20 of 21 records', 'Page 1 of 2', 'Previous', 'Next']) assert.ok(html.includes(label), label);
    assert.ok(html.includes('value="admin_accounts"'), 'Module options include values outside the loaded page');
    assert.ok(html.includes('&lt;script&gt;Review reason&lt;/script&gt;') && !html.includes('<script>Review reason'));
    assert.ok(html.includes('long-donation-review'.repeat(200)), 'Long details are not truncated or replaced');
    assert.ok(html.includes('[overflow-wrap:anywhere]') && html.includes('overflow-x-auto') && html.includes('min-w-[800px]'));
    const table = html.match(/<table\b[\s\S]*?<\/table>/)[0];
    assert.equal((table.match(/<th /g) ?? []).length, 5);
    assert.ok(!table.includes('<button') && !table.includes('<a ') && !table.includes('Delete') && !table.includes('Edit'));
    assert.ok(html.includes('<button type="button" disabled=""'), 'Previous is disabled on the first page');
    assert.ok(html.indexOf('Donation Participation #21') < html.indexOf('Donation Participation #19'), 'Backend newest-first order is preserved');
    assert.equal(auditModuleLabel('admin_accounts'), 'Admin Management');
    assert.equal(auditModuleLabel('constructor'), 'Constructor', 'Unknown historical modules cannot return object prototype properties');
    assert.equal(auditActionLabel('verification_approved'), 'Verification approved');
    const localTime = formatAuditDate('2026-10-04T01:30:00Z');
    assert.ok(localTime.includes('Oct') && localTime.includes('4') && localTime.includes('9:30'));
    const boundary = formatAuditDate('2026-09-30T16:00:00Z');
    assert.ok(boundary.includes('Oct') && boundary.includes('1'), 'UTC month boundary formats as October in Manila');
    assert.equal(formatAuditDate(null), 'Unknown date');
    assert.equal(formatAuditDate('invalid'), 'Unknown date');

    let count = calls.length;
    await model.setPage(0);
    await model.setPage(3);
    assert.equal(calls.length, count, 'Invalid page changes do not request data');
    reply = second;
    const next = model.setPage(2);
    assert.ok(!render(remote()).includes('Loading page') && render(remote()).includes('Alice Reviewer'), 'Keep previous audit page during refresh');
    await model.setPage(2);
    assert.equal(calls.length, count + 1, 'Pending pagination cannot be double-submitted');
    await next;
    assert.equal(calls.at(-1).searchParams.get('page'), '2');
    html = render(remote());
    assert.ok(html.includes('System') && html.includes('User #12') && html.includes('Initiator: Scheduler') && html.includes('Page 2 of 2'));
    assert.ok(!html.includes('Alice Reviewer'));
    assert.ok(html.match(/<button[^>]*disabled=""[^>]*>Next<\/button>/));

    reply = filtered;
    await model.setFilters({ search: 'Alice & review' });
    assert.equal(calls.at(-1).searchParams.get('search'), 'Alice & review');
    assert.equal(calls.at(-1).searchParams.get('page'), '1');
    assert.equal(model.getSnapshot().page, 1, 'Filter changes reset pagination');
    await model.setFilters({ module: 'verification' });
    await model.setFilters({ month: '09' });
    assert.equal(calls.at(-1).searchParams.get('module'), 'verification');
    assert.equal(calls.at(-1).searchParams.get('month'), '09');
    assert.equal(calls.at(-1).searchParams.get('search'), 'Alice & review');
    assert.equal(calls.at(-1).searchParams.get('page'), '1');
    html = render(remote());
    assert.ok(html.includes('Alice Reviewer') && !html.includes('Recorded Admin') && html.includes('1 of 1 records'));
    assert.ok(html.includes('value="09" selected=""') && !html.includes('type="month"'));
    reply = { ...first, data: [], pagination: { currentPage: 1, lastPage: 1, perPage: 20, total: 0 } };
    await model.load();
    assert.ok(render(remote()).includes('No audit logs match the selected filters'));
    await model.setFilters({ search: '', module: '', month: '' });
    assert.ok(render(remote()).includes('No audit logs found') && !render(remote()).includes('No audit logs match'));
    assert.equal(calls.at(-1).searchParams.has('search'), false);
    assert.equal(calls.at(-1).searchParams.has('module'), false);
    assert.equal(calls.at(-1).searchParams.has('month'), false);

    status = 503; reply = { message: 'Private trace' };
    await model.load();
    html = render(remote());
    assert.ok(html.includes('Something went wrong on our side') && html.includes('Try again'));
    assert.ok(!html.includes('Private trace') && !html.includes('No audit logs found'));
    status = 200; reply = first;
    await model.load();
    assert.equal(model.getSnapshot().error, '');
    assert.ok(render(remote()).includes('Alice Reviewer'));
    model.dispose();

    // An expired token logs out; a 403 refreshes the role used by the existing route guard.
    for (const denied of [401, 403]) {
      let role = 'super_admin';
      const user = () => ({ id: 1, name: 'Reviewer', email: 'staff@example.test', role, must_change_password: false });
      const session = createAdminSession({ login: async () => ({ token: 'audit-token', user: user() }),
        me: async () => ({ user: user() }) }, { readToken: () => null, saveToken() {}, clearToken() {} });
      await session.login({});
      role = 'admin';
      status = denied; reply = { message: 'Access denied' };
      const guarded = createAuditLogs(session.requestAdmin);
      await guarded.load();
      assert.equal(guarded.getSnapshot().data.length, 0);
      assert.equal(guarded.getSnapshot().loading, false);
      assert.equal(session.getSnapshot().isAuthenticated, denied === 403);
      assert.equal(session.getSnapshot().isSuperAdmin, false);
      guarded.dispose();
    }

    const pending = [];
    const race = createAuditLogs((operation) => operation('token'), { list: () => new Promise((resolve, reject) => pending.push({ resolve, reject })) });
    const old = race.load();
    const latest = race.setFilters({ month: '10' });
    pending[1].resolve(first);
    await latest;
    pending[0].reject(new Error('Stale error'));
    await old;
    assert.equal(race.getSnapshot().month, '10');
    assert.equal(race.getSnapshot().error, '');
    assert.equal(race.getSnapshot().data, first.data);
    const disposed = race.load();
    race.dispose();
    pending[2].resolve(second);
    await disposed;
    assert.equal(race.getSnapshot().data, first.data);
    console.log('Audit Logs checks passed: authenticated read-only transport, real rows, search/module/month query filters, pagination/reset/bounds, Manila dates, safe fallbacks/escaping, loading/retry/empty, role refresh and stale/disposed responses.');
  } finally { globalThis.fetch = originalFetch; }
}
