import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkSystemReports(server) {
  const { createSystemReports, currentReportPeriod, reportPeriodLabel } = await server.ssrLoadModule('/src/services/systemReportsApi.js');
  const { SystemReportsView } = await server.ssrLoadModule('/src/pages/SystemReports.jsx');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const { createAdminSession } = await server.ssrLoadModule('/src/auth/adminSession.js');
  const { BLOOD_TYPE_COLORS } = await server.ssrLoadModule('/src/data/bloodTypeColors.js');
  const render = (remote) => renderToString(React.createElement(MemoryRouter, null,
    React.createElement(AdminSessionContext.Provider, { value: { role: 'super_admin', isSuperAdmin: true,
      currentAdmin: { name: 'Reviewer' } } }, React.createElement(SystemReportsView, { remote })))).replace(/<!--.*?-->/g, '');
  const fixture = (period = '2026-09', empty = false) => ({ period, generated_at: '2026-09-30T16:15:00Z', data: {
    donor_summary: { total: empty ? 0 : 12, eligible: empty ? 0 : 3, not_eligible: empty ? 0 : 2 },
    donation_summary: { total: empty ? 0 : 8, completed: empty ? 0 : 5, for_verification: empty ? 0 : 2, needs_revision: empty ? 0 : 1, rejected: 0 },
    rewards_summary: { points_issued: empty ? 0 : 1500, total_redemptions: empty ? 0 : 2, points_redeemed: empty ? 0 : 200, most_redeemed_reward: empty ? null : 'Owned Grocery' },
    weekly_donations: Array.from({ length: 5 }, (_, index) => ({ week: `Week ${index + 1}`, donations: empty ? 0 : 1 })),
    blood_types: Object.keys(BLOOD_TYPE_COLORS).reverse().map((name, index) => ({ name, value: empty ? 0 : index })),
    completed_donations: empty ? [] : [{ id: 'participation-1', donor: '<script>Real Donor</script>', bloodType: null, event: 'Donation Drive', date: `${period}-01` }],
    reward_redemptions: empty ? [] : [{ id: 1, donor: 'Real Donor', voucher: 'Owned Grocery', pointsUsed: 100, date: `${period}-01` }],
    notes: 'Tables show up to 20 recent records each; totals cover the entire month.',
  } });
  const source = readFileSync('src/pages/SystemReports.jsx', 'utf8');
  assert.ok(source.includes("../data/bloodTypeColors") && source.includes('BLOOD_TYPE_COLORS[entry.name]') && source.includes('BLOOD_TYPE_COLORS[bloodType.name]'));
  assert.ok(!source.includes('generateMockReport') && !source.includes('../data/systemReports') && !source.includes('bloodTypeColors = ['));
  assert.equal(existsSync('src/data/systemReports.js'), false);
  const hook = readFileSync('src/services/useSystemReports.js', 'utf8');
  assert.ok(!hook.includes('printRequest') && !hook.includes('model.print('), 'Report refreshes never automatically open print');
  assert.ok(!source.includes('Generate Report') && !source.includes('handleGenerateReport') && !source.includes('model.generate'));
  assert.ok(source.includes('model.print()') && source.includes('model.setFilters({ month:') && source.includes('model.setFilters({ year:'));
  const css = readFileSync('src/styles/system-reports.css', 'utf8');
  for (const value of ['@media print', 'A4 portrait', '.report-unavailable #monthly-report', '.report-print-chart', '.report-screen-chart', 'table-header-group', 'min-width: 0']) assert.ok(css.includes(value), value);
  assert.deepEqual(currentReportPeriod(new Date('2026-09-30T16:00:00Z')), { year: '2026', month: '10' });
  assert.equal(reportPeriodLabel('2026-09'), 'September 2026');
  assert.equal(reportPeriodLabel('2026-13'), '');
  const descendants = (element) => React.isValidElement(element)
    ? [element, ...React.Children.toArray(element.props.children).flatMap(descendants)] : [];
  const controls = (remote) => descendants(SystemReportsView({ remote }));
  const explanatoryLine = (html) => html.match(/<p role="status"[^>]*><span>([^<]*)<\/span>/)[1];

  const originalFetch = globalThis.fetch;
  let reply = fixture();
  let status = 200;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const path = new URL(url);
    assert.equal(path.pathname, '/api/admin/system-reports');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer report-token');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.body, undefined, 'Reporting never submits writes');
    calls.push(path);
    return Response.json(reply, { status });
  };
  try {
    let prints = 0;
    const model = createSystemReports((operation) => operation('report-token'), undefined, { year: '2026', month: '09' }, () => { prints++; });
    const remote = () => ({ ...model.getSnapshot(), model });
    let html = render(remote());
    assert.ok(html.includes('Loading page') && !html.includes('id="monthly-report"'));
    assert.equal(model.print(), false);
    await model.load();
    assert.equal(calls.at(-1).searchParams.get('year'), '2026');
    assert.equal(calls.at(-1).searchParams.get('month'), '09');
    html = render(remote());
    for (const label of ['LifeFlow System Report', 'September 2026', 'Points Issued', 'Total Participations', 'Most Redeemed Reward',
      '1,500', 'Owned Grocery', 'Generated on:', 'Oct 1, 2026', 'Unknown', 'Recent Records', 'Week 5', 'Report year', 'Report month', 'Print / Save Report']) assert.ok(html.includes(label), label);
    assert.ok(!html.includes('Generate Report') && !html.includes('Print / Save as PDF'));
    assert.equal(explanatoryLine(html), 'Showing September 2026. Use Print / Save Report to print or choose Save as PDF in the browser print dialog.');
    const yearGroup = controls(remote()).find((node) => node.props['aria-label'] === 'Report year');
    assert.equal(yearGroup.props.role, 'group');
    const yearNodes = descendants(yearGroup);
    const yearButtons = yearNodes.filter((node) => node.type === 'button');
    assert.deepEqual(yearButtons.map((node) => node.props['aria-label']), ['Previous year', 'Next year']);
    assert.ok(yearButtons.every((button) => button.props.type === 'button' && button.props.className.includes('focus-visible:')));
    const yearMarkup = html.slice(html.indexOf('role="group" aria-label="Report year"'), html.indexOf('Print / Save Report'));
    assert.ok(yearMarkup.indexOf('lucide-chevron-down') < yearMarkup.indexOf('>2026<') && yearMarkup.indexOf('>2026<') < yearMarkup.indexOf('lucide-chevron-up'));
    assert.ok(!yearMarkup.includes('lucide-minus') && !yearMarkup.includes('lucide-plus'));
    assert.equal(controls(remote()).filter((node) => node.type === 'select').length, 1, 'Month is the only report dropdown');
    assert.ok(html.includes('&lt;script&gt;Real Donor&lt;/script&gt;') && !html.includes('<script>Real Donor'));
    assert.ok(!html.includes('Sample Records') && !html.includes('Mock data') && !html.includes('Total Admins'));
    for (const [type, color] of Object.entries(BLOOD_TYPE_COLORS)) assert.ok(html.includes(type) && html.includes(`background-color:${color}`), `Stable color for ${type}, regardless of response ordering`);
    const printable = html.slice(html.indexOf('id="monthly-report"'));
    assert.ok(!printable.includes('<nav') && !printable.includes('<select') && !printable.includes('<button'));
    assert.equal((printable.match(/report-print-chart/g) ?? []).length, 2);
    assert.ok(html.includes('overflow-x-auto') && html.includes('min-w-[640px]') && html.includes('lg:grid-cols-3'));
    const beforePrint = JSON.stringify(model.getSnapshot().snapshot);
    const beforeCalls = calls.length;
    const printButton = controls(remote()).find((node) => node.type === 'button' && React.Children.toArray(node.props.children).includes('Print / Save Report'));
    assert.ok(printButton && !printButton.props.disabled);
    printButton.props.onClick();
    assert.equal(prints, 1);
    assert.equal(calls.length, beforeCalls, 'Printing the ready preview makes no API call');
    assert.equal(JSON.stringify(model.getSnapshot().snapshot), beforePrint, 'Print does not mutate report data');

    reply = fixture('2026-08');
    const refresh = model.setFilters({ month: '08' });
    html = render(remote());
    assert.ok(html.includes('aria-busy="true"') && !html.includes('Loading page'));
    assert.ok(html.includes('aria-label="Refreshing report" aria-hidden="false"') && html.includes('animate-spin'));
    const refreshingLine = explanatoryLine(html);
    assert.equal(refreshingLine, 'Showing August 2026. Use Print / Save Report to print or choose Save as PDF in the browser print dialog.');
    assert.ok(!refreshingLine.includes('Loading') && html.includes('LifeFlow System Report') && html.includes('September 2026'), 'Previous report stays mounted until replacement is ready');
    assert.equal(model.print(), false, 'Stale previews cannot be printed while a filter request is pending');
    await refresh;
    assert.equal(calls.at(-1).searchParams.get('month'), '08');
    assert.ok(render(remote()).includes('Showing August 2026'));
    assert.equal(explanatoryLine(render(remote())), refreshingLine, 'Refresh never substitutes loading text');
    assert.ok(render(remote()).includes('aria-label="Refreshing report" aria-hidden="true"'));
    reply = fixture('2025-08');
    const previousYear = controls(remote()).find((node) => node.props['aria-label'] === 'Previous year').props.onClick();
    assert.equal(remote().year, '2025', 'Down arrow subtracts exactly one year');
    assert.ok(explanatoryLine(render(remote())).startsWith('Showing August 2025.'));
    await previousYear;
    assert.equal(calls.at(-1).searchParams.get('year'), '2025');
    assert.ok(render(remote()).includes('August 2025'));
    const unchangedCalls = calls.length;
    await model.setFilters({ year: '2025' });
    assert.equal(calls.length, unchangedCalls);

    reply = fixture('2026-08');
    const nextYear = controls(remote()).find((node) => node.props['aria-label'] === 'Next year').props.onClick();
    assert.equal(remote().year, '2026', 'Up arrow adds exactly one year');
    await nextYear;
    assert.equal(calls.length, unchangedCalls + 1);
    assert.equal(calls.at(-1).searchParams.get('year'), '2026');
    assert.equal(calls.at(-1).searchParams.get('month'), '08', 'Year navigation preserves the selected month');
    reply = fixture('2026-03');
    const monthChange = controls(remote()).find((node) => node.props['aria-label'] === 'Report month')
      .props.onChange({ target: { value: '03' } });
    assert.equal(remote().month, '03');
    assert.ok(explanatoryLine(render(remote())).startsWith('Showing March 2026.'));
    await monthChange;
    assert.equal(calls.at(-1).searchParams.get('month'), '03');
    assert.equal(prints, 1, 'Automatic refresh never opens print');
    assert.equal(model.generate, undefined, 'Generate action is removed from the model');
    reply = fixture('2000-03');
    await model.setFilters({ year: '2000' });
    assert.equal(controls(remote()).find((node) => node.props['aria-label'] === 'Previous year').props.disabled, true);
    const maximumYear = String(Number(currentReportPeriod().year) + 1);
    reply = fixture(`${maximumYear}-03`);
    await model.setFilters({ year: maximumYear });
    assert.equal(controls(remote()).find((node) => node.props['aria-label'] === 'Next year').props.disabled, true);
    reply = fixture('2025-08');
    await model.setFilters({ year: '2025', month: '08' });

    status = 503; reply = { message: 'Private server trace' };
    await model.load();
    html = render(remote());
    assert.ok(html.includes('Unable to load System Reports') && html.includes('Try again') && !html.includes('Private server trace'));
    assert.ok(html.includes('report-unavailable') && html.includes('LifeFlow System Report'), 'Cached preview remains visible but cannot print after errors');
    assert.equal(model.print(), false);
    status = 200; reply = fixture('2025-08', true);
    await model.load();
    html = render(remote());
    for (const label of ['No completed donations this month', 'No reward redemptions this month', 'None this month', 'Week 1: 0']) assert.ok(html.includes(label), label);
    assert.equal(model.canPrint(), true, 'A genuine empty month still has a printable report');

    for (const denied of [401, 403]) {
      let role = 'super_admin';
      const user = () => ({ id: 1, name: 'Reviewer', email: 'staff@example.test', role, must_change_password: false });
      const session = createAdminSession({ login: async () => ({ token: 'report-token', user: user() }), me: async () => ({ user: user() }) },
        { readToken: () => null, saveToken() {}, clearToken() {} });
      await session.login({});
      role = 'admin'; status = denied; reply = { message: 'Access denied' };
      const guarded = createSystemReports(session.requestAdmin, undefined, { year: '2026', month: '09' });
      await guarded.load();
      assert.equal(guarded.getSnapshot().snapshot, null);
      assert.equal(guarded.canPrint(), false);
      assert.equal(session.getSnapshot().isAuthenticated, denied === 403);
      assert.equal(session.getSnapshot().isSuperAdmin, false);
      assert.ok(render({ ...guarded.getSnapshot(), model: guarded }).includes('Try again'));
      guarded.dispose();
    }

    const pending = [];
    const race = createSystemReports((operation) => operation('token'), { load: () => new Promise((resolve, reject) => pending.push({ resolve, reject })) }, { year: '2026', month: '09' });
    const older = race.load();
    const newer = race.setFilters({ month: '10' });
    pending[1].resolve(fixture('2026-10')); await newer;
    pending[0].reject(new Error('Stale failure')); await older;
    assert.equal(race.getSnapshot().snapshot.period, '2026-10');
    assert.equal(race.getSnapshot().error, '');
    const mismatched = race.load();
    pending[2].resolve(fixture('2026-09')); await mismatched;
    assert.equal(race.canPrint(), false, 'A response for the wrong period cannot be printed');
    const beforeDispose = race.getSnapshot().snapshot;
    const disposed = race.load(); race.dispose();
    const disposedReply = fixture('2026-10');
    disposedReply.data.donor_summary.total = 777;
    pending[3].resolve(disposedReply); await disposed;
    assert.equal(race.getSnapshot().snapshot, beforeDispose, 'Disposed requests cannot replace the report after unmount');
    model.dispose();
    console.log('System Reports checks passed: authenticated read-only transport, down/up year controls with -1/+1 and bounds, automatic month/year refresh, stable explanatory text/local spinner/cached layout, one browser Print / Save Report action, shared eight-type colors/print charts, zero/empty/retry/errors, role enforcement and stale/disposed responses.');
  } finally { globalThis.fetch = originalFetch; }
}
