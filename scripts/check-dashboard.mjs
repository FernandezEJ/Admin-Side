import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkDashboard(server) {
  const { createDashboard } = await server.ssrLoadModule('/src/services/dashboardApi.js');
  const { DashboardView } = await server.ssrLoadModule('/src/pages/Dashboard.jsx');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const { BLOOD_TYPE_COLORS } = await server.ssrLoadModule('/src/data/bloodTypeColors.js');
  const render = (remote, isSuperAdmin = false) => renderToString(React.createElement(MemoryRouter, null,
    React.createElement(AdminSessionContext.Provider, { value: { role: isSuperAdmin ? 'super_admin' : 'admin', isSuperAdmin,
      currentAdmin: { name: 'Reviewer' } } }, React.createElement(DashboardView, { remote }))));
  const fixture = { months: 6, timezone: 'Asia/Manila', stats: { donors: 71, eligible: 45, not_eligible: 20 },
    donation_activity: [{ period: '2026-09', month: 'Sep', donations: 11 }],
    blood_types: [{ bloodType: 'O+', count: 37 }],
    recent_verifications: [{ id: 91, donor: '<script>Real donor</script>', bloodType: 'O+', event: 'API donation drive',
      status: 'needs_revision', proof_uploaded_at: '2026-09-30T17:00:00Z' }],
    overview: { total_admins: 7, active_admins: 6, rewards_summary: { total_redemptions: 4, period_label: 'September 2026 recorded redemptions', most_redeemed_reward: 'Recorded reward' },
      recent_admin_activity: [{ id: 6, actor_name: 'Real admin', action_label: 'Admin created', created_at: '2026-09-26T00:00:00Z' }] } };
  const originalFetch = globalThis.fetch;
  const calls = [];
  let failure = false;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer dashboard-token');
    assert.equal(options.method, 'GET');
    calls.push(new URL(url));
    if (failure) return Response.json({ message: 'Unavailable' }, { status: 503 });
    return Response.json({ ...fixture, months: Number(new URL(url).searchParams.get('months')) });
  };
  try {
    const model = createDashboard((operation) => operation('dashboard-token'));
    const remote = () => ({ ...model.getSnapshot(), model });
    assert.ok(render(remote()).includes('Loading page'));
    await model.load();
    assert.equal(calls.at(-1).pathname, '/api/admin/dashboard');
    assert.equal(calls.at(-1).searchParams.get('months'), '6');
    assert.equal(model.getSnapshot().data.stats.donors, 71);
    assert.equal(model.getSnapshot().data.donation_activity[0].donations, 11);
    let html = render(remote());
    for (const label of ['Donors', 'Total Eligible', 'Total Not Eligible', 'Donation Activity', 'Blood Types', 'Recent Verification Requests',
      'Last 6 months', 'Last 12 months', 'API donation drive', 'Need Revision', 'Oct 1, 2026', '37', '71', '45', '20']) assert.ok(html.includes(label), label);
    assert.ok(html.includes('href="/verification/91"') && html.includes('href="/verification"'));
    assert.ok(html.includes('&lt;script&gt;Real donor&lt;/script&gt;') && !html.includes('<script>Real donor'));
    assert.ok(!html.includes('Super Admin Overview'));
    html = render(remote(), true);
    for (const label of ['Super Admin Overview', 'Total Admins', 'Active Admins', 'Rewards Redeemed', 'Real admin', 'Recorded reward']) assert.ok(html.includes(label));
    const snapshot = model.getSnapshot().data;
    const loadingChart = model.load(12);
    assert.equal(model.getSnapshot().data, snapshot, 'Cached Dashboard stays mounted during a range change');
    assert.equal(model.getSnapshot().loading, false);
    assert.equal(model.getSnapshot().chartLoading, true);
    html = render(remote(), true);
    assert.ok(html.includes('aria-label="Loading Donation Activity"') && !html.includes('Loading page'));
    assert.ok(!html.includes('>Loading Donation Activity'), 'No visible loading sentence');
    for (const label of ['Active registered donors', 'Registered donor distribution', 'API donation drive', 'Super Admin Overview']) assert.ok(html.includes(label));
    await loadingChart;
    assert.equal(calls.at(-1).searchParams.get('months'), '12');
    assert.equal(model.getSnapshot().months, 12);
    assert.ok(render(remote()).includes('value="12" selected=""'));
    failure = true;
    await model.load();
    html = render(remote());
    assert.ok(html.includes('Unable to load Donation Activity') && html.includes('Try again'));
    assert.ok(html.includes('API donation drive') && html.includes('Registered donor distribution'));
    assert.ok(!html.includes('Unable to load Dashboard'));
    assert.equal(model.getSnapshot().data.stats, snapshot.stats);
    failure = false;
    await model.load();
    assert.equal(model.getSnapshot().error, '');
    assert.equal(model.getSnapshot().chartError, '');
    assert.equal(model.getSnapshot().chartLoading, false);
    // Initial failures still use the existing page error/retry path.
    failure = true;
    const initialFailure = createDashboard((operation) => operation('dashboard-token'));
    await initialFailure.load();
    assert.ok(render({ ...initialFailure.getSnapshot(), model: initialFailure }).includes('Unable to load Dashboard'));
    failure = false;
    await initialFailure.load();
    assert.equal(initialFailure.getSnapshot().data.stats.donors, 71);
    initialFailure.dispose();

    // Keyed palette remains stable with zero-count rows, reordered rows and missing groups.
    assert.deepEqual(Object.keys(BLOOD_TYPE_COLORS).sort(), ['A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-'].sort());
    assert.equal(new Set(Object.values(BLOOD_TYPE_COLORS)).size, 8);
    const blood = Object.keys(BLOOD_TYPE_COLORS).map((bloodType, index) => ({ bloodType, count: index }));
    for (const rows of [blood, [...blood].reverse(), blood.slice(2)]) {
      const paletteHtml = render({ ...remote(), data: { ...fixture, blood_types: rows } });
      for (const row of rows) assert.ok(paletteHtml.includes(`background-color:${BLOOD_TYPE_COLORS[row.bloodType]}`));
    }
    // Only meaningful summary destinations become keyboard-accessible links.
    const card = (markup, label) => [...markup.matchAll(/<(a|article)\b([^>]*)>([\s\S]*?)<\/\1>/g)]
      .find((match) => match[3].includes(`>${label}</`));
    html = render(remote());
    assert.equal(card(html, 'Donors')[1], 'a');
    assert.ok(card(html, 'Donors')[2].includes('href="/donors"'));
    for (const label of ['Total Eligible', 'Total Not Eligible']) assert.equal(card(html, label)[1], 'article');
    assert.equal((html.match(/<h2 class="mt-6 text-3xl font-bold text-gray-900">/g) ?? []).length, 3);
    assert.ok(html.includes('focus-visible:outline') && html.includes('cursor-pointer'));
    assert.ok(!html.includes('Admin accounts'));
    html = render(remote(), true);
    for (const label of ['Total Admins', 'Active Admins']) {
      assert.equal(card(html, label)[1], 'a');
      assert.ok(card(html, label)[2].includes('href="/admin-management"'));
    }
    assert.equal(card(html, 'Rewards Redeemed')[1], 'article');
    assert.equal((html.match(/<h2 class="mt-6 text-3xl font-bold text-gray-900">/g) ?? []).length, 3);
    assert.ok(calls.every((url) => url.pathname === '/api/admin/dashboard'), 'No new verification/count API calls');
    const zero = { ...fixture, stats: { donors: 0, eligible: 0, not_eligible: 0 },
      donation_activity: [{ month: 'Sep', donations: 0 }], blood_types: [{ bloodType: 'O+', count: 0 }], recent_verifications: [] };
    html = render({ ...remote(), data: zero });
    for (const label of ['No completed donations in this period', 'No blood type data', 'No verification requests']) assert.ok(html.includes(label));

    const pending = [];
    const race = createDashboard((operation) => operation('token'), { load: () => new Promise((resolve, reject) => pending.push({ resolve, reject })) });
    const oldLoad = race.load(6);
    const newLoad = race.load(12);
    pending[1].resolve({ ...fixture, months: 12 });
    await newLoad;
    pending[0].reject(new Error('Stale failure'));
    await oldLoad;
    assert.equal(race.getSnapshot().data.months, 12);
    assert.equal(race.getSnapshot().error, '');
    const disposedLoad = race.load(6);
    race.dispose();
    pending[2].resolve(fixture);
    await disposedLoad;
    assert.equal(race.getSnapshot().data.months, 12, 'Disposal must not replace cached data');
    // After a successful initial load, changed metrics in a chart response cannot replace other widgets.
    const initial = race.getSnapshot().data;
    const update = race.load(6);
    pending[3].resolve({ ...fixture, months: 6, stats: { donors: 999 }, blood_types: [], recent_verifications: [] });
    await update;
    assert.equal(race.getSnapshot().data.stats, initial.stats);
    assert.equal(race.getSnapshot().data.blood_types, initial.blood_types);
    assert.equal(race.getSnapshot().data.recent_verifications, initial.recent_verifications);
    assert.equal(race.getSnapshot().data.donation_activity, fixture.donation_activity);
    const olderChart = race.load(12);
    const newerChart = race.load(6);
    const newRows = [{ period: '2026-10', month: 'Oct', donations: 19 }];
    pending[5].resolve({ ...fixture, months: 6, donation_activity: newRows });
    await newerChart;
    pending[4].reject(new Error('Stale chart failure'));
    await olderChart;
    assert.equal(race.getSnapshot().months, 6);
    assert.equal(race.getSnapshot().data.donation_activity, newRows);
    assert.equal(race.getSnapshot().chartLoading, false);
    assert.equal(race.getSnapshot().chartError, '');
    race.dispose();
    model.dispose();
    console.log('Dashboard checks passed: authenticated data, isolated rolling-chart loading/error/retry, preserved widgets, stale/disposed responses, keyed blood colors, existing card destinations and both roles.');
  } finally { globalThis.fetch = originalFetch; }
}
