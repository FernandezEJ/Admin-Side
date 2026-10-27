import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkAdminManagement(server) {
  const { createAdminManagement, visibleAdmins } = await server.ssrLoadModule('/src/services/adminManagementState.js');
  const { formatStaffName } = await server.ssrLoadModule('/src/services/staffNames.js');
  const { default: Header } = await server.ssrLoadModule('/src/components/layout/Header.jsx');
  const { default: SuperAdminOverview } = await server.ssrLoadModule('/src/components/SuperAdminOverview.jsx');
  const { AuditLogsView } = await server.ssrLoadModule('/src/pages/AuditLogs.jsx');
  const { adminManagementApi } = await server.ssrLoadModule('/src/services/adminManagementApi.js');
  const { AdminManagementView } = await server.ssrLoadModule('/src/pages/AdminManagement.jsx');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const { createAdminSession } = await server.ssrLoadModule('/src/auth/adminSession.js');
  const storage = await server.ssrLoadModule('/src/services/adminAuthStorage.js');
  const originalFetch = globalThis.fetch;
  const secret = 'One-Time-Test123!';
  let records = [
    { id: 1, name: 'API Admin', email: 'api@example.test', role: 'admin', status: 'active', created_at: '2026-09-01T00:00:00Z', last_login_at: null },
    { id: 2, name: 'Deactivated API Admin', email: 'old@example.test', role: 'admin', status: 'deactivated', created_at: '2026-09-01T00:00:00Z',
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
    for (const [raw, expected] of [
      ['Suffer F Cruz', 'Suffer F. Cruz'], ['Suffer F. Cruz', 'Suffer F. Cruz'],
      ['Suffer F... Cruz', 'Suffer F. Cruz'], ['Mary Ann F Cruz', 'Mary Ann F. Cruz'],
      ['Suffer Francisco Cruz', 'Suffer Francisco Cruz'], ['Suffer F C Cruz', 'Suffer F. C. Cruz'],
      ['Suffer Ñ Cruz', 'Suffer Ñ. Cruz'], ['Suffer f Cruz', 'Suffer f. Cruz'],
      ['F Cruz', 'F Cruz'], ['F Suffer C', 'F Suffer C'], ['  Suffer\tF  Cruz ', '  Suffer\tF.  Cruz '],
      ['System', 'System'], ['', ''], [null, ''], [undefined, ''],
    ]) {
      assert.equal(formatStaffName(raw), expected);
      assert.equal(formatStaffName(formatStaffName(raw)), expected, 'Formatting is idempotent');
    }
    const nameRecord = { id: 51, name: 'Suffer F Cruz', email: 'staff@example.test', role: 'admin', status: 'active' };
    const nameState = { ...model.getSnapshot(), loading: false, admins: [nameRecord], summary: { total: 1, active: 1, deactivated: 0 } };
    assert.ok(render(nameState).includes('View Admin: Suffer F. Cruz'));
    for (const type of ['details', 'deactivate', 'reactivate']) {
      assert.ok(render({ ...nameState, modal: { type, admin: nameRecord } }).includes('Suffer F. Cruz'));
    }
    const editName = render({ ...nameState, modal: { type: 'edit', admin: nameRecord }, draft: { name: nameRecord.name, email: nameRecord.email } });
    assert.ok(editName.includes('value="Suffer F Cruz"'), 'Editor retains the raw name');
    for (const query of ['Suffer F Cruz', 'Suffer F. Cruz']) {
      assert.equal(visibleAdmins({ ...nameState, search: query }).length, 1, 'Search matches stored and displayed names');
    }
    const renderStaff = (Component, props, role = 'super_admin') => renderToString(React.createElement(MemoryRouter, null,
      React.createElement(AdminSessionContext.Provider, { value: { role, currentAdmin: { name: nameRecord.name }, logout() {} } }, React.createElement(Component, props))));
    for (const role of ['admin', 'super_admin']) {
      assert.ok(renderStaff(Header, {}, role).includes('Suffer F. Cruz'), 'Both staff headers use the formatter');
    }
    assert.ok(renderStaff(SuperAdminOverview, { overview: { total_admins: 1, active_admins: 1,
      rewards_summary: { total_redemptions: 0, period_label: 'Current month' },
      recent_admin_activity: [{ id: 1, actor_name: 'Suffer F.. Cruz', action_label: 'Admin updated', created_at: '2026-10-19T00:00:00Z' }] } }).includes('Suffer F. Cruz'));
    const auditMarkup = renderStaff(AuditLogsView, { remote: { data: [
      { id: 1, actorName: nameRecord.name, actorRole: 'admin' },
      { id: 2, actorName: 'Super F.. Cruz', actorRole: 'super_admin' },
      { id: 3, actorName: 'Donor F Cruz', actorRole: 'donor' },
    ], modules: [], search: '', module: '', month: '', pagination: { total: 3, currentPage: 1, lastPage: 1 }, loading: false, error: '', model: {} } });
    assert.ok(auditMarkup.includes('Suffer F. Cruz') && auditMarkup.includes('Super F. Cruz'));
    assert.ok(auditMarkup.includes('Donor F. Cruz'), 'Donor actors share the display-only initial formatting');
    let submittedName;
    const rawModel = createAdminManagement(operation => operation('token'), {
      list: async () => ({ admins: [nameRecord], summary: nameState.summary }),
      update: async (_token, _id, draft) => { submittedName = draft.name; return { admin: nameRecord }; },
    });
    await rawModel.load(); await rawModel.openDetails(nameRecord);
    rawModel.openEditor(rawModel.getSnapshot().modal.admin);
    await rawModel.save();
    assert.equal(submittedName, 'Suffer F Cruz', 'Display formatting never changes the update payload');
    assert.equal(nameRecord.name, 'Suffer F Cruz');
    assert.equal(rawModel.getSnapshot().admins[0].name, 'Suffer F Cruz');
    rawModel.dispose();
    assert.ok(render().includes('Loading page'));
    await model.load();
    assert.deepEqual(model.getSnapshot().summary, { total: 2, active: 1, deactivated: 1 });
    assert.ok(calls[0].url.endsWith('/admins?status=all'));
    let html = render();
    assert.ok(html.includes('API Admin') && html.includes('Last Login') && !html.includes('Reset Password'));
    assert.ok(html.indexOf('Total Admins') < html.indexOf('Search Admins'));
    assert.ok(!html.includes('aria-label="Admin account status"') && !html.includes('>Actions<'));
    model.setSearch(' API@EXAMPLE ');
    assert.equal(visibleAdmins(model.getSnapshot()).length, 1);
    model.setTab('deactivated');
    assert.equal(visibleAdmins(model.getSnapshot()).length, 0);
    assert.ok(render().includes('No deactivated Admins found'));
    model.setSearch('');
    assert.ok(render().includes('Recovery deadline') && !render().includes('>Reactivate<'));
    await model.openDetails(model.getSnapshot().admins.find(row => row.id === 2));
    assert.ok(render().includes('Admin Details') && render().includes('Edit Admin') && render().includes('Reactivate'));
    model.closeModal();
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
    await model.openDetails(created);
    model.openEditor(model.getSnapshot().modal.admin);
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
    assert.equal(adminManagementApi.reset, undefined);
    assert.ok(!calls.some(call => call.url.endsWith('/send-password-reset')));
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


    const descendants = element => React.isValidElement(element)
      ? [element, ...React.Children.toArray(element.props.children).flatMap(descendants)] : [];
    const inspect = (state, check, viewModel = model) => {
      function Inspect() {
        const view = AdminManagementView({ state, model: viewModel });
        check(descendants(view));
        return view;
      }
      renderToString(React.createElement(MemoryRouter, null,
        React.createElement(AdminSessionContext.Provider, { value: { role: 'super_admin', currentAdmin: { name: 'Super Admin' }, logout() {} } }, React.createElement(Inspect))));
    };
    const accounts = [
      { id: 11, name: 'Current Admin', email: 'current@example.test', role: 'admin', status: 'active', created_at: null },
      { id: 12, name: 'Recoverable Admin', email: 'recoverable@example.test', role: 'admin', status: 'deactivated', scheduled_for_deletion_at: '2099-01-01T00:00:00Z' },
    ];
    let rows = structuredClone(accounts);
    let listFailure = false, mutationFailure = false, release;
    const managementCalls = [];
    const response = () => ({ admins: structuredClone(rows), summary: {
      total: rows.length, active: rows.filter(row => row.status === 'active').length,
      deactivated: rows.filter(row => row.status === 'deactivated').length,
    } });
    const api = {
      list: async () => { if (listFailure) throw new Error('Unable to load current account'); return response(); },
      update: async (_, id, data) => { managementCalls.push(['update', id]); Object.assign(rows.find(row => row.id === id), data); return { admin: structuredClone(rows.find(row => row.id === id)) }; },
      deactivate: async (_, id) => {
        managementCalls.push(['deactivate', id]);
        if (mutationFailure) throw new Error('Deactivation unavailable');
        if (release !== undefined) await new Promise(resolve => { release = resolve; });
        Object.assign(rows.find(row => row.id === id), { status: 'deactivated', scheduled_for_deletion_at: '2099-01-01T00:00:00Z' });
        return { admin: structuredClone(rows.find(row => row.id === id)) };
      },
      reactivate: async (_, id) => { managementCalls.push(['reactivate', id]); Object.assign(rows.find(row => row.id === id), { status: 'active', scheduled_for_deletion_at: null }); return { admin: structuredClone(rows.find(row => row.id === id)) }; },
    };
    const detailsModel = createAdminManagement(operation => operation('test-token'), api);
    await detailsModel.load();
    for (const [tab, expected] of [['active', [11]], ['deactivated', [12]], ['all', [11, 12]]]) {
      detailsModel.setTab(tab);
      assert.deepEqual(visibleAdmins(detailsModel.getSnapshot()).map(row => row.id), expected);
      inspect(detailsModel.getSnapshot(), nodes => {
        const cards = nodes.filter(node => node.type === 'button' && node.props['aria-label']?.startsWith('Show '));
        assert.deepEqual(cards.map(card => card.props['aria-label']), ['Show Active Admins', 'Show Deactivated Admins', 'Show Total Admins']);
        assert.deepEqual(cards.map(card => card.props['aria-pressed']), ['active', 'deactivated', 'all'].map(value => value === tab));
        assert.ok(cards.every(card => card.props.className.includes('focus-visible:') && card.props.className.includes('hover:')));
        assert.equal(nodes.filter(node => node.type === 'th').length, 5);
        assert.ok(!nodes.some(node => node.props.children === 'Actions' || node.props.children === 'Reset Password' || node.props['aria-label'] === 'Admin account status'));
        const tableRows = nodes.filter(node => node.type === 'tr' && node.props.tabIndex === 0);
        assert.equal(tableRows.length, expected.length);
        const row = tableRows[0];
        const opened = [];
        const target = { focus: () => opened.push('focus') };
        row.props.onClick({ target: { closest: () => false }, currentTarget: target });
        for (const key of ['Enter', ' ']) row.props.onKeyDown({ key, target, currentTarget: target, preventDefault() { opened.push('prevent'); } });
        const length = opened.length;
        row.props.onClick({ target: { closest: () => true }, currentTarget: target });
        row.props.onKeyDown({ key: 'Enter', target: {}, currentTarget: target });
        row.props.onKeyDown({ key: 'Enter', target, currentTarget: target, repeat: true });
        assert.equal(opened.length, length);
        assert.equal(opened.filter(value => value === 'focus').length, 3);
        assert.equal(opened.filter(value => value === 'prevent').length, 2);
        cards[0].props.onClick(); cards[1].props.onClick(); cards[2].props.onClick();
      }, { ...detailsModel, openDetails: admin => { assert.equal(admin.id, expected[0]); } });
    }
    detailsModel.setSearch(' Recoverable@EXAMPLE ');
    assert.equal(visibleAdmins(detailsModel.getSnapshot()).length, 1);
    detailsModel.setSearch('');
    detailsModel.setTab('active');
    await detailsModel.openDetails(accounts[0]);
    assert.equal(managementCalls.length, 0, 'Opening details only reads');
    assert.equal(detailsModel.getSnapshot().modal.type, 'details');
    inspect(detailsModel.getSnapshot(), nodes => {
      assert.ok(nodes.some(node => node.props.title === 'Admin Details' && node.props.dismissOnBackdrop));
      assert.ok(nodes.some(node => node.type === 'button' && node.props.children === 'Edit Admin'));
      assert.ok(nodes.some(node => node.type === 'button' && node.props.children === 'Deactivate'));
      assert.ok(nodes.find(node => node.type === 'button' && node.props.children === 'Deactivate').props.className.includes('bg-warning'));
      assert.ok(!nodes.some(node => node.props.children === 'Reactivate' || node.props.children === 'Reset Password'));
    }, detailsModel);
    detailsModel.openEditor(detailsModel.getSnapshot().modal.admin);
    detailsModel.setDraft({ name: 'Unsaved', email: accounts[0].email });
    detailsModel.closeModal();
    assert.equal(detailsModel.getSnapshot().modal.discard, true);
    detailsModel.keepEditing();
    assert.equal(detailsModel.getSnapshot().draft.name, 'Unsaved');
    detailsModel.closeModal(); detailsModel.discardEdit();
    assert.equal(detailsModel.getSnapshot().modal.type, 'details');
    assert.equal(managementCalls.length, 0);
    detailsModel.openAction('deactivate', detailsModel.getSnapshot().modal.admin);
    detailsModel.closeModal();
    assert.equal(detailsModel.getSnapshot().modal.type, 'details');
    assert.equal(managementCalls.length, 0, 'Cancel never mutates');
    detailsModel.openAction('deactivate', detailsModel.getSnapshot().modal.admin);
    mutationFailure = true;
    await detailsModel.confirm();
    assert.equal(detailsModel.getSnapshot().modal.type, 'deactivate');
    assert.equal(detailsModel.getSnapshot().formError, 'Deactivation unavailable');
    assert.equal(detailsModel.getSnapshot().summary.active, 1);
    mutationFailure = false; release = null;
    const saving = detailsModel.confirm();
    await detailsModel.confirm(); detailsModel.closeModal();
    assert.equal(detailsModel.getSnapshot().busy, true);
    inspect(detailsModel.getSnapshot(), nodes => assert.ok(nodes.some(node => node.props.closeDisabled === true)), detailsModel);
    release(); release = undefined; await saving;
    assert.equal(managementCalls.filter(call => call[0] === 'deactivate').length, 2, 'One failed request and one confirmed request; no duplicate');
    assert.equal(detailsModel.getSnapshot().modal.type, 'details');
    assert.equal(detailsModel.getSnapshot().modal.admin.status, 'deactivated');
    assert.equal(detailsModel.getSnapshot().statusTab, 'active');
    assert.equal(visibleAdmins(detailsModel.getSnapshot()).length, 0);
    assert.deepEqual(detailsModel.getSnapshot().summary, { total: 2, active: 0, deactivated: 2 });
    detailsModel.openEditor(detailsModel.getSnapshot().modal.admin);
    detailsModel.setDraft({ name: 'Edited while deactivated', email: accounts[0].email });
    await detailsModel.save();
    assert.equal(detailsModel.getSnapshot().modal.admin.name, 'Edited while deactivated');
    assert.equal(detailsModel.getSnapshot().modal.admin.status, 'deactivated');
    assert.equal(detailsModel.getSnapshot().statusTab, 'active');
    detailsModel.setTab('deactivated');
    detailsModel.openAction('reactivate', detailsModel.getSnapshot().modal.admin);
    inspect(detailsModel.getSnapshot(), nodes => assert.ok(nodes.find(node => node.type === 'button' && node.props.onClick === detailsModel.confirm).props.className.includes('bg-success')), detailsModel);
    await detailsModel.confirm();
    assert.equal(detailsModel.getSnapshot().modal.admin.status, 'active');
    assert.equal(detailsModel.getSnapshot().statusTab, 'deactivated');
    assert.deepEqual(visibleAdmins(detailsModel.getSnapshot()).map(row => row.id), [12]);
    listFailure = true;
    await detailsModel.openDetails(accounts[1]);
    assert.equal(detailsModel.getSnapshot().modal.unavailable, true);
    inspect(detailsModel.getSnapshot(), nodes => {
      assert.ok(nodes.some(node => node.props.description === detailsModel.getSnapshot().formError && node.props.onRetry));
      assert.ok(nodes.find(node => node.props.children === 'Edit Admin').props.disabled, 'Keep cached details visible but block actions until refresh succeeds');
    }, detailsModel);
    listFailure = false; rows = [];
    await detailsModel.openDetails(accounts[1]);
    assert.equal(detailsModel.getSnapshot().modal.admin, undefined);
    assert.match(detailsModel.getSnapshot().formError, /no longer available/);
    detailsModel.closeModal(); detailsModel.dispose();
    let resolveRead;
    const stale = createAdminManagement(operation => operation('token'), { list: () => new Promise(resolve => { resolveRead = resolve; }) });
    const read = stale.openDetails(accounts[0]);
    stale.closeModal(); resolveRead({ admins: accounts, summary: { total: 2, active: 1, deactivated: 1 } }); await read;
    assert.equal(stale.getSnapshot().modal, null);
    stale.dispose();

    storage.saveToken('test-token');
    const session = createAdminSession({ me: async () => ({ user: { id: 1, name: 'Super', email: 'super@example.test', role: 'super_admin', must_change_password: false } }) });
    await session.refreshSession();
    failure = { status: 401, body: { message: 'Unauthenticated.' } };
    await assert.rejects(session.requestAdmin((token) => adminManagementApi.list(token)));
    assert.equal(session.getSnapshot().isAuthenticated, false);
    assert.equal(storage.readToken(), null);
    process.stdout.write('Admin Management checks passed: real transport, three card filters/counts, five-column keyboard/click rows, current details/retry/missing/stale, create/edit for both statuses, discard/cancel/failure and duplicate guards, deactivate/reactivate refresh with preserved filter, no management reset, one-time password/copy, loading/errors and expired sessions.\n');
  } finally {
    model.dispose(); storage.clearToken(); globalThis.fetch = originalFetch;
  }
}
