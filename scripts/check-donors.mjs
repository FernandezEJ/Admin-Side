import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkDonors(server) {
  const { createDonors } = await server.ssrLoadModule('/src/services/donorsApi.js');
  const { createAdminSession } = await server.ssrLoadModule('/src/auth/adminSession.js');
  const { DonorsView } = await server.ssrLoadModule('/src/pages/Donors.jsx');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const render = (remote, role = 'admin') => renderToString(React.createElement(MemoryRouter, null,
    React.createElement(AdminSessionContext.Provider, { value: { role, isSuperAdmin: role === 'super_admin',
      currentAdmin: { name: 'Reviewer' } } }, React.createElement(DonorsView, { remote })))).replace(/<!--.*?-->/g, '');
  const fixture = { summary: { totalDonors: 6, eligible: 2, temporarilyIneligible: 2 }, donors: [
    { id: 9, name: '<script>New donor</script>', bloodType: null, eligibility: 'unassessed', totalDonations: 0, achievement: 'New Donor', joinedDate: null },
    { id: 7, name: 'First donor', bloodType: 'O+', eligibility: 'eligible', totalDonations: 1, achievement: 'First-Time Donor', joinedDate: '2026-09-04' },
    { id: 2, name: 'Bronze donor', bloodType: 'A-', eligibility: 'temporarily_ineligible', totalDonations: 3, achievement: 'Bronze Donor', joinedDate: '2026-09-04' },
    { id: 8, name: 'Silver donor', bloodType: 'AB+', eligibility: 'indeterminate', totalDonations: 5, achievement: 'Silver Donor', joinedDate: '2026-09-04' },
    { id: 4, name: 'Gold donor', bloodType: 'O+', eligibility: 'eligible', totalDonations: 10, achievement: 'Gold Donor', joinedDate: '2026-09-04' },
    { id: 5, name: 'Tied donor', bloodType: 'B-', eligibility: 'temporarily_ineligible', totalDonations: 10, achievement: 'Gold Donor', joinedDate: '2026-09-04' },
  ] };
  fixture.topDonors = [4, 5, 8, 2, 7, 9].map((id) => fixture.donors.find((donor) => donor.id === id));
  fixture.bloodTypes = ['A-', 'AB+', 'B-', 'O+', 'Unknown'];
  fixture.pagination = { currentPage: 1, lastPage: 1, perPage: 20, total: 6 };
  // Explicit server responses test that the client sends filters and trusts the returned page.
  const searchRows = { 'bRoNzE': [2], 'o+': [7, 4] };
  const originalFetch = globalThis.fetch;
  let response = fixture;
  let status = 200;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/api/admin/donors');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer donors-token');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.body, undefined);
    calls.push(url);
    if (response === fixture) {
      const query = new URL(url).searchParams;
      assert.equal(query.get('per_page'), '20');
      let ids = searchRows[query.get('search')] ?? [9, 7, 2, 8, 4, 5];
      if (query.has('blood_type')) ids = ids.filter((id) => (fixture.donors.find((row) => row.id === id).bloodType ?? 'Unknown') === query.get('blood_type'));
      if (query.has('eligibility')) ids = ids.filter((id) => fixture.donors.find((row) => row.id === id).eligibility === query.get('eligibility'));
      return Response.json({ ...fixture, donors: ids.map((id) => fixture.donors.find((row) => row.id === id)),
        pagination: { ...fixture.pagination, total: ids.length } });
    }
    return Response.json(response, { status });
  };
  try {
    assert.equal(existsSync('src/data/donors.js'), false, 'Unreferenced mock donor file is removed');
    const source = readFileSync('src/pages/Donors.jsx', 'utf8');
    assert.ok(!source.includes('data/donors') && !source.includes('Eye') && !source.includes('/donors/'));
    assert.ok(!source.includes('filterDonors') && !source.includes('rankDonors'), 'Filtering and ranking use backend results');
    const model = createDonors((operation) => operation('donors-token'));
    const remote = () => ({ ...model.getSnapshot(), model });
    assert.ok(render(remote()).includes('Loading page') && !render(remote()).includes('New donor'));
    await model.load();
    assert.equal(calls.length, 1);
    assert.deepEqual(model.getSnapshot().data, fixture);
    const metrics = (html) => [...html.matchAll(/<h3 class="mt-2 text-2xl font-bold text-gray-900">(\d+)<\/h3>/g)].map((match) => Number(match[1]));
    for (const role of ['admin', 'super_admin']) {
      const html = render(remote(), role);
      assert.deepEqual(metrics(html), [6, 2, 2]);
      for (const text of ['Total Donors', 'Eligible', 'Temporarily Ineligible', 'All Donors', 'Top Donors', 'Blood Type', 'Achievement',
        'Not Assessed', 'Needs Screening', 'Unknown', 'Joined Unknown', 'Sep 4, 2026', 'First-Time Donor', 'Bronze Donor', 'Silver Donor', 'Gold Donor', 'New Donor']) assert.ok(html.includes(text), text);
      assert.ok(html.includes('&lt;script&gt;New donor&lt;/script&gt;') && !html.includes('<script>New donor'));
      const table = html.match(/<table\b[\s\S]*?<\/table>/)[0];
      assert.equal((table.match(/<th /g) ?? []).length, 5);
      assert.ok(!table.includes('<button') && !table.includes('<a ') && !table.includes('View') && !table.includes('Actions'));
      const cards = html.match(/<section class="grid gap-4 md:grid-cols-3">([\s\S]*?)<\/section>/)[1];
      assert.equal((cards.match(/<article /g) ?? []).length, 3);
      assert.ok(!/<button|<a |hover:|aria-pressed|tabindex|lucide-arrow|lucide-chevron/.test(cards), 'Summary cards remain non-clickable');
    }
    const visible = () => model.getSnapshot().data.donors.map((donor) => donor.id);
    await model.setSearchTerm(' bRoNzE ');
    assert.deepEqual(visible(), [2]);
    assert.ok(render(remote()).includes('Bronze donor') && !render(remote()).includes('Gold donor'));
    assert.deepEqual(metrics(render(remote())), [6, 2, 2], 'Filtering never changes system summary');
    await model.setSearchTerm(' o+ ');
    assert.deepEqual(visible(), [7, 4]);
    await model.setSelectedBloodType('A-');
    assert.deepEqual(visible(), []);
    assert.ok(render(remote()).includes('No donors found') && !render(remote()).includes('No donors registered'));
    await model.setSearchTerm('');
    assert.deepEqual(visible(), [2]);
    await model.setSelectedEligibility('eligible');
    assert.deepEqual(visible(), []);
    await model.clearFilters();
    assert.deepEqual(visible(), [9, 7, 2, 8, 4, 5]);
    assert.equal(model.getSnapshot().searchTerm, '');
    assert.equal(model.getSnapshot().selectedBloodType, 'all');
    assert.equal(model.getSnapshot().selectedEligibility, 'all');
    for (const [eligibility, expected] of [['eligible', [7, 4]], ['temporarily_ineligible', [2, 5]], ['unassessed', [9]], ['indeterminate', [8]]]) {
      await model.setSelectedEligibility(eligibility);
      assert.deepEqual(visible(), expected);
    }
    await model.clearFilters();
    await model.setSelectedBloodType('Unknown');
    assert.deepEqual(visible(), [9]);
    await model.clearFilters();
    const originalRows = JSON.stringify(fixture.donors);
    assert.deepEqual(model.getSnapshot().data.topDonors.map((donor) => donor.id), [4, 5, 8, 2, 7, 9]);
    assert.equal(JSON.stringify(fixture.donors), originalRows, 'Backend leaderboard leaves API list order intact');
    const beforeTab = calls.length;
    model.setActiveTab('top');
    for (const role of ['admin', 'super_admin']) {
      const html = render(remote(), role);
      const leaderboard = html.slice(html.indexOf('Top Donors Leaderboard'));
      const names = ['Gold donor', 'Tied donor', 'Silver donor', 'Bronze donor', 'First donor', '&lt;script&gt;New donor'];
      assert.ok(names.every((name, index) => index === 0 || leaderboard.indexOf(names[index - 1]) < leaderboard.indexOf(name)));
      assert.ok(leaderboard.includes('#1') && leaderboard.includes('#6'));
      assert.ok(!leaderboard.includes('/donors/') && !leaderboard.includes('View'));
    }
    model.setActiveTab('all');
    assert.equal(calls.length, beforeTab, 'Tab switches reuse the global leaderboard without another request');

    const pageRows = Array.from({ length: 43 }, (_, index) => ({ ...fixture.donors[1], id: 143 - index,
      name: `Paged donor ${143 - index}`, totalDonations: 0, achievement: 'New Donor' }));
    const topTen = Array.from({ length: 10 }, (_, index) => ({ ...pageRows[42 - index],
      totalDonations: 5, achievement: 'Silver Donor' }));
    const pageReply = (page) => ({ summary: { totalDonors: 43, eligible: 43, temporarilyIneligible: 0 },
      donors: pageRows.slice((page - 1) * 20, page * 20), topDonors: topTen, bloodTypes: ['O+', 'Unknown'],
      pagination: { currentPage: page, lastPage: 3, perPage: 20, total: 43 } });
    const paging = createDonors((operation) => operation('donors-token'));
    const pagingRemote = () => ({ ...paging.getSnapshot(), model: paging });
    const descendants = (element) => React.isValidElement(element)
      ? [element, ...React.Children.toArray(element.props.children).flatMap(descendants)] : [];
    const pageButton = (label) => descendants(DonorsView({ remote: pagingRemote() }))
      .find((node) => node.type === 'button' && node.props.children === label);
    const rowCount = () => (render(pagingRemote()).match(/<tbody>([\s\S]*?)<\/tbody>/)[1].match(/<tr\b/g) ?? []).length;
    response = pageReply(1);
    await paging.load();
    for (const role of ['admin', 'super_admin']) {
      const html = render(pagingRemote(), role);
      assert.ok(html.includes('Page 1 of 3'));
      assert.ok(html.indexOf('Paged donor 143') < html.indexOf('Paged donor 124'), 'The UI preserves backend newest-first order');
      assert.ok(html.includes('value="Unknown"'), 'Blood options can include values outside the current page');
    }
    assert.equal(rowCount(), 20);
    assert.equal(pageButton('Previous').props.disabled, true);
    assert.equal(pageButton('Next').props.disabled, false);
    let count = calls.length;
    for (const invalid of [0, 4, 1, 1.5]) await paging.setPage(invalid);
    assert.equal(calls.length, count);
    response = pageReply(2);
    const nextPage = pageButton('Next').props.onClick();
    assert.ok(render(pagingRemote()).includes('Loading page') && !render(pagingRemote()).includes('<table'));
    assert.ok(render(pagingRemote()).includes('Search donor or blood type'), 'Search stays mounted while results load');
    await paging.setPage(2);
    assert.equal(calls.length, count + 1, 'Pending page navigation cannot be double-submitted');
    await nextPage;
    assert.equal(new URL(calls.at(-1)).searchParams.get('page'), '2');
    assert.ok(render(pagingRemote()).includes('Page 2 of 3') && !render(pagingRemote()).includes('Paged donor 143'));
    assert.equal(rowCount(), 20);
    assert.equal(pageButton('Previous').props.disabled, false);
    response = pageReply(3);
    await pageButton('Next').props.onClick();
    assert.equal(rowCount(), 3);
    assert.ok(render(pagingRemote()).includes('Page 3 of 3'));
    assert.equal(pageButton('Next').props.disabled, true);
    response = pageReply(2);
    await pageButton('Previous').props.onClick();
    assert.ok(render(pagingRemote()).includes('Page 2 of 3'));

    const currentQuery = () => new URL(calls.at(-1)).searchParams;
    response = pageReply(1);
    await paging.setSearchTerm(' Paged donor ');
    assert.equal(currentQuery().get('page'), '1');
    assert.equal(currentQuery().get('search'), 'Paged donor');
    response = pageReply(2);
    await paging.setPage(2);
    response = pageReply(1);
    await paging.setSelectedBloodType('O+');
    assert.equal(currentQuery().get('page'), '1');
    assert.equal(currentQuery().get('blood_type'), 'O+');
    assert.equal(currentQuery().get('search'), 'Paged donor');
    response = pageReply(2);
    await paging.setPage(2);
    response = pageReply(1);
    await paging.setSelectedEligibility('eligible');
    assert.equal(currentQuery().get('page'), '1');
    response = pageReply(2);
    await paging.setPage(2);
    assert.deepEqual(Object.fromEntries(currentQuery()), { page: '2', per_page: '20', search: 'Paged donor', blood_type: 'O+', eligibility: 'eligible' });
    assert.equal(paging.getSnapshot().searchTerm, ' Paged donor ');
    assert.equal(paging.getSnapshot().selectedBloodType, 'O+');
    assert.equal(paging.getSnapshot().selectedEligibility, 'eligible');
    paging.setActiveTab('top');
    for (const role of ['admin', 'super_admin']) {
      const leaderboard = render(pagingRemote(), role).split('Top Donors Leaderboard')[1];
      assert.equal((leaderboard.match(/>#\d+<\/div>/g) ?? []).length, 10);
      assert.ok(leaderboard.includes('#10') && !leaderboard.includes('#11'));
      assert.ok(leaderboard.indexOf('Paged donor 101') < leaderboard.indexOf('Paged donor 110'), 'Global server rank is preserved despite a different table page');
      assert.ok(!leaderboard.includes('Paged donor 143'));
    }
    response = pageReply(1);
    await paging.clearFilters();
    assert.deepEqual(Object.fromEntries(currentQuery()), { page: '1', per_page: '20' });
    assert.equal(paging.getSnapshot().page, 1);
    paging.dispose();

    status = 503; response = { message: 'Private server trace' };
    await model.load();
    let html = render(remote());
    assert.ok(html.includes('Unable to load Donors') && html.includes('Try again'));
    assert.ok(!html.includes('Private server trace') && !html.includes('<table'));
    status = 200; response = fixture;
    const retry = model.load();
    assert.ok(render(remote()).includes('Loading page') && !render(remote()).includes('<table'));
    await retry;
    assert.equal(model.getSnapshot().error, '');
    assert.ok(render(remote()).includes('Gold donor'));
    response = { summary: { totalDonors: 0, eligible: 0, temporarilyIneligible: 0 }, donors: [], topDonors: [], bloodTypes: [],
      pagination: { currentPage: 1, lastPage: 1, perPage: 20, total: 0 } };
    await model.load();
    assert.ok(render(remote()).includes('No donors registered'));
    assert.deepEqual(metrics(render(remote())), [0, 0, 0]);
    model.setActiveTab('top');
    assert.ok(render(remote()).includes('No donors registered') && !render(remote()).includes('#1'));
    model.dispose();

    // Donors requests use the shared session's actual 401 and password-gate handling.
    for (const denied of [401, 403]) {
      let pendingPassword = false;
      const user = () => ({ id: 1, name: 'Reviewer', email: 'staff@example.test', role: 'admin', must_change_password: pendingPassword });
      const session = createAdminSession({ login: async () => ({ token: 'donors-token', user: user() }),
        me: async () => ({ user: user() }) }, { readToken: () => null, saveToken() {}, clearToken() {} });
      await session.login({});
      pendingPassword = denied === 403;
      status = denied; response = { message: 'Access denied' };
      const guarded = createDonors(session.requestAdmin);
      await guarded.load();
      assert.equal(guarded.getSnapshot().loading, false);
      assert.equal(guarded.getSnapshot().data, null);
      assert.equal(session.getSnapshot().isAuthenticated, denied === 403);
      assert.equal(session.getSnapshot().mustChangePassword, denied === 403);
      guarded.dispose();
    }

    const pending = [];
    const race = createDonors((operation) => operation('token'), { load: () => new Promise((resolve, reject) => pending.push({ resolve, reject })) });
    const oldLoad = race.load();
    const newest = race.load();
    pending[1].resolve(fixture);
    await newest;
    pending[0].reject(new Error('Stale error'));
    await oldLoad;
    assert.equal(race.getSnapshot().error, '');
    assert.equal(race.getSnapshot().data, fixture);
    const disposed = race.load();
    race.dispose();
    pending[2].resolve(response);
    await disposed;
    assert.equal(race.getSnapshot().data, fixture);
    console.log('Donors checks passed: authenticated read-only API, both roles, backend pages of up to 20/newest-first order, Previous/Next bounds/handlers, filter reset/preservation, global Top 10/server ranking, non-clickable summary cards, null-safe display, loading/retry/empty, escaping, session guards and stale/disposed responses.');
  } finally { globalThis.fetch = originalFetch; }
}
