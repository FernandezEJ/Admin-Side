/* global global, process */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Navigate, Outlet, createRoutesFromElements, matchRoutes } from 'react-router-dom';
import { checkRealAuth } from './check-real-auth.mjs';
import { checkLoginRecovery } from './check-login-recovery.mjs';
import { checkAdminManagement } from './check-admin-management.mjs';
import { checkAnnouncements } from './check-announcements.mjs';
import { checkVerifications } from './check-verifications.mjs';
import { checkDashboard } from './check-dashboard.mjs';
import { checkRewards } from './check-rewards.mjs';
import { checkRewardClaims } from './check-reward-claims.mjs';
import { checkDonors } from './check-donors.mjs';
import { checkDonorNames } from './check-donor-names.mjs';
import { checkAuditLogs } from './check-audit-logs.mjs';
import { checkSystemReports } from './check-system-reports.mjs';
import { checkSidebar } from './check-sidebar.mjs';

const server = await createServer({ server: { middlewareMode: true } });
// Palette checks stay in the existing runner; no browser or live API is simulated here.
function checkColorPalette() {
  const css = readFileSync('src/index.css', 'utf8');
  const tokens = Object.fromEntries([...css.matchAll(/--color-([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
  const approved = {
    primary: '#9B1238', danger: '#B42318', success: '#15803D', warning: '#B45309', info: '#1D4ED8', neutral: '#64748B',
    page: '#F8FAFC', surface: '#FFFFFF', content: '#0F172A', line: '#E2E8F0', selected: '#FFF1F3',
    'success-surface': '#ECFDF3', 'success-foreground': '#166534', 'warning-surface': '#FFF7E6', 'warning-foreground': '#92400E',
    'danger-surface': '#FEF3F2', 'danger-foreground': '#B42318', 'info-surface': '#EFF6FF', 'info-foreground': '#1D4ED8',
    'neutral-surface': '#F1F5F9', 'neutral-foreground': '#475569',
  };
  for (const [name, value] of Object.entries(approved)) assert.equal(tokens[name], value, `Approved ${name}`);
  const resolve = name => tokens[name].startsWith('var(') ? resolve(tokens[name].match(/--color-([\w-]+)/)[1]) : tokens[name];
  const luminance = name => {
    const channels = resolve(name).slice(1).match(/../g).map(hex => parseInt(hex, 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const pairs = [['content', 'page'], ['neutral', 'page'], ['neutral', 'surface'], ['primary', 'selected'], ['neutral-foreground', 'selected']];
  for (const semantic of ['primary', 'danger', 'success', 'warning', 'info']) pairs.push(['surface', semantic], ['surface', `${semantic}-hover`]);
  for (const semantic of ['danger', 'success', 'warning', 'info', 'neutral']) pairs.push([`${semantic}-foreground`, `${semantic}-surface`]);
  for (const [foreground, background] of pairs) {
    const a = luminance(foreground), b = luminance(background);
    assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, `${foreground} on ${background} meets AA text contrast`);
  }
  for (const shade of [400, 500, 600]) assert.equal(resolve(`gray-${shade}`), approved.neutral);
  assert.equal(resolve('gray-200'), approved.line);
  assert.ok(css.includes(':focus-visible') && css.includes('border-color: var(--color-danger)'));
  const review = readFileSync('src/styles/verification-review.css', 'utf8');
  for (const semantic of ['success', 'warning', 'danger']) assert.ok(review.includes(`var(--color-${semantic})`));
  const sidebar = readFileSync('src/styles/sidebar.css', 'utf8');
  assert.ok(sidebar.includes('.sidebar-link.is-active { background: var(--color-selected); color: var(--color-primary); }'));
  process.stdout.write(`Palette checks passed: ${Object.keys(approved).length} approved tokens, ${pairs.length} AA text pairs, legacy neutral aliases, semantic review actions, sidebar selection and error/focus colors.\n`);
}
const storage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};
global.localStorage = storage();
global.sessionStorage = storage();
global.window = { localStorage, sessionStorage };

try {
  checkColorPalette();
  for (const path of ['src/pages/AdminManagement.jsx', 'src/pages/AuditLogs.jsx', 'src/pages/SystemReports.jsx', 'src/styles/system-reports.css']) {
    assert.ok(existsSync(path), `${path} is in the active structure`);
  }
  for (const path of ['src/reserved', 'src/pages/Reports.jsx', 'src/pages/Reports.css', 'src/pages/Feedback.jsx', 'src/App.css']) {
    assert.equal(existsSync(path), false, `${path} is removed`);
  }
  const reportCss = readFileSync('src/styles/system-reports.css', 'utf8');
  assert.ok(reportCss.includes('min-width: 0') && reportCss.includes('table-header-group'));
  const { EmptyState, ErrorState, PageSkeleton } = await server.ssrLoadModule('/src/components/ui/PageState.jsx');
  assert.ok(renderToString(React.createElement(EmptyState)).includes('role="status"'));
  assert.ok(renderToString(React.createElement(ErrorState)).includes('role="alert"'));
  assert.ok(renderToString(React.createElement(PageSkeleton)).includes('Loading page'));
  const { AdminSessionContext, useAdminSession } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const { createAdminSession } = await server.ssrLoadModule('/src/auth/adminSession.js');
  let backendRole = 'admin';
  const fixture = createAdminSession({
    login: async () => ({ token: 'test-token', user: { id: 1, name: 'Sample Admin', email: 'admin@example.test', role: backendRole, must_change_password: false } }),
    logout: async () => ({}),
  });
  function Provider({ children }) {
    return React.createElement(AdminSessionContext.Provider, { value: { ...fixture, ...fixture.getSnapshot() } }, children);
  }
  const { default: RequireRole } = await server.ssrLoadModule('/src/auth/RequireRole.jsx');
  const { ADMIN_ROLES, hasRole } = await server.ssrLoadModule('/src/auth/roles.js');
  const { TOKEN_KEY } = await server.ssrLoadModule('/src/services/adminAuthStorage.js');
  const { AppRoutes } = await server.ssrLoadModule('/src/AppRoutes.jsx');
  const { recoveryDates, clearRecoveryDates, monthKey, isRecoverable } = await server.ssrLoadModule('/src/data/recoveryPolicy.js');
  const deletedAt = '2026-09-23T05:00:00Z';
  assert.equal(recoveryDates(deletedAt).scheduled_for_deletion_at, '2026-10-23T05:00:00.000Z');
  assert.equal(clearRecoveryDates().scheduled_for_deletion_at, null);
  assert.equal(isRecoverable(recoveryDates(deletedAt), Date.parse('2026-10-22T05:00:00Z')), true);
  assert.equal(isRecoverable(recoveryDates(deletedAt), Date.parse('2026-10-23T05:00:00Z')), false);
  assert.equal(monthKey('2026-08-31T17:00:00Z'), '2026-09');
  const { mockRedemptions, filterRedemptions } = await server.ssrLoadModule('/src/data/rewardRedemptions.js');
  const { default: MonthFilter } = await server.ssrLoadModule('/src/components/ui/MonthFilter.jsx');
  const monthDropdown = renderToString(React.createElement(MonthFilter, { value: '', onChange: () => {} }));
  assert.equal((monthDropdown.match(/<option /g) ?? []).length, 13);
  assert.ok(monthDropdown.includes('All Months') && monthDropdown.includes('January') && monthDropdown.includes('December'));
  assert.ok(!monthDropdown.includes('type="month"') && !monthDropdown.includes('2026-09'));
  assert.equal(filterRedemptions(mockRedemptions, 'active', '09').length, 1);
  assert.equal(filterRedemptions(mockRedemptions, 'expired', '08').length, 1);
  assert.equal(filterRedemptions(mockRedemptions, '', '01').length, 0);
  for (const status of ['active', 'inactive', 'expired']) {
    assert.equal(filterRedemptions(mockRedemptions, status).length, 1);
  }
  assert.equal(filterRedemptions(mockRedemptions, 'expired', '2026-09').length, 0);
  assert.equal(filterRedemptions(mockRedemptions, 'expired', '2026-08').length, 1);
  assert.equal(filterRedemptions(mockRedemptions, '', '2026-09').length, 2);
  const { default: ReportChart } = await server.ssrLoadModule('/src/components/ReportChart.jsx');
  const printChart = renderToString(React.createElement(ReportChart, null, React.createElement('svg', null, React.createElement('circle', { r: 30 }))));
  assert.ok(printChart.includes('report-print-chart') && printChart.includes('width="640"') && printChart.includes('height="260"'));
  const appSource = readFileSync('src/App.jsx', 'utf8');
  assert.ok(appSource.includes('lazy(() => import') && appSource.includes('fallback={<PageSkeleton />'));
  const { getRewardsAnalytics, mockRewardRedemptions, analyticsPeriods } = await server.ssrLoadModule('/src/data/rewardsAnalytics.js');
  const { getRewardsAnalyticsForPeriod } = await server.ssrLoadModule('/src/data/rewardsAnalytics.js');
  const inventory = [
    { id: 1, status: 'active', stock: 20 }, { id: 2, status: 'active', stock: 12 },
    { id: 3, status: 'inactive', stock: 7 }, { id: 4, status: 'deleted', stock: 10 },
  ];
  const originalRedemptions = JSON.stringify(mockRewardRedemptions);
  const annual = getRewardsAnalyticsForPeriod(inventory, '2026');
  assert.equal(annual.summary.total_redemptions, 58);
  assert.equal(annual.summary.total_points_spent, 16800);
  assert.equal(annual.summary.active_inventory, 32);
  assert.deepEqual(annual.top_rewards.map((reward) => reward.redemptions), [30, 21, 7]);
  assert.equal(getRewardsAnalyticsForPeriod(inventory, '2026', '09').summary.total_redemptions, 23);
  assert.equal(getRewardsAnalyticsForPeriod(inventory, '2026', '01').summary.total_redemptions, 0);
  assert.equal(getRewardsAnalyticsForPeriod(inventory, '2025').summary.total_redemptions, 0);
  for (const { value } of analyticsPeriods) {
    const analytics = getRewardsAnalytics(inventory, value);
    assert.equal(analytics.summary.active_inventory, 32);
    for (const rows of [analytics.monthly_redemptions, analytics.reward_breakdown, analytics.top_rewards]) {
      assert.equal(rows.reduce((sum, row) => sum + row.redemptions, 0), analytics.summary.total_redemptions);
    }
    assert.equal(analytics.top_rewards.reduce((sum, row) => sum + row.points_spent, 0), analytics.summary.total_points_spent);
    assert.equal(analytics.summary.most_redeemed_reward, analytics.top_rewards[0].reward_name);
    assert.ok(analytics.top_rewards.every((row, index, rows) => index === 0 || rows[index - 1].redemptions >= row.redemptions));
    if (value !== 'all') assert.deepEqual(analytics.monthly_redemptions.map((row) => row.period), [value]);
  }
  assert.equal(getRewardsAnalytics(inventory, '2026-09').summary.total_redemptions, 23);
  assert.equal(getRewardsAnalytics(inventory, '2026-09').summary.total_points_spent, 6750);
  assert.equal(getRewardsAnalytics(inventory, '2026-08').summary.total_points_spent, 5450);
  assert.equal(getRewardsAnalytics(inventory).summary.total_redemptions, 58);
  const deletedInventory = inventory.map((row) => row.id === 1 ? { ...row, status: 'deleted' } : row);
  assert.equal(getRewardsAnalytics(deletedInventory).summary.active_inventory, 12);
  assert.deepEqual(getRewardsAnalytics(deletedInventory).top_rewards, getRewardsAnalytics(inventory).top_rewards);
  assert.equal(getRewardsAnalytics([], '2024-01').summary.most_redeemed_reward, null);
  assert.equal(getRewardsAnalytics([], '2024-01').summary.total_redemptions, 0);
  assert.equal(JSON.stringify(mockRewardRedemptions), originalRedemptions);
  const { mockAdmins, mockAuditLogs, saveAdmin, setAdminStatus, filterAdmins, filterAuditLogs } =
    await server.ssrLoadModule('/src/data/adminManagement.js');
  const { getDashboardOverview } = await server.ssrLoadModule('/src/data/dashboardOverview.js');
  const overview = getDashboardOverview();
  assert.equal(overview.total_admins, mockAdmins.length);
  assert.equal(overview.active_admins, mockAdmins.filter((admin) => admin.status === 'active').length);
  assert.deepEqual(overview.recent_admin_activity, [...mockAuditLogs]
    .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3));
  const dashboardRewards = getRewardsAnalytics([], overview.rewards_summary.period).summary;
  assert.equal(overview.rewards_summary.total_redemptions, dashboardRewards.total_redemptions);
  assert.equal(overview.rewards_summary.most_redeemed_reward, dashboardRewards.most_redeemed_reward);
  const originalAdmins = JSON.stringify(mockAdmins);
  const deactivated = setAdminStatus(mockAdmins, 1, 'inactive', deletedAt);
  assert.equal(filterAdmins(deactivated, '', 'active').some((admin) => admin.id === 1), false);
  assert.equal(filterAdmins(deactivated, '', 'inactive').find((admin) => admin.id === 1).scheduled_for_deletion_at, '2026-10-23T05:00:00.000Z');
  assert.equal(setAdminStatus(deactivated, 1, 'active')[0].deactivated_at, null);
  assert.equal(filterAuditLogs(mockAuditLogs, '', '', '2026-08').length, 0);
  assert.equal(filterAuditLogs(mockAuditLogs, ' MARIA ', 'Verification', '2026-09').length, 2);
  assert.equal(filterAuditLogs(mockAuditLogs, ' MARIA ', 'Verification', '09').length, 2);
  assert.equal(filterAuditLogs(mockAuditLogs, '', '', '01').length, 0);
  let editedAdmins = saveAdmin(mockAdmins, { name: ' Test Admin ', email: ' TEST@lifeflow.test ', role: 'super_admin' });
  const addedAdmin = editedAdmins.at(-1);
  assert.equal(addedAdmin.role, ADMIN_ROLES.ADMIN);
  assert.equal(addedAdmin.name, 'Test Admin');
  assert.equal(addedAdmin.email, 'test@lifeflow.test');
  assert.equal(addedAdmin.status, 'active');
  assert.ok(!Number.isNaN(Date.parse(addedAdmin.created_at)));
  assert.throws(() => saveAdmin(editedAdmins, { name: 'Duplicate', email: 'TEST@lifeflow.test' }), /already exists/);
  assert.throws(() => saveAdmin(editedAdmins, { name: ' ', email: 'bad' }), /valid email/);
  editedAdmins = saveAdmin(editedAdmins, { name: 'Updated Admin', email: addedAdmin.email }, addedAdmin.id);
  assert.equal(editedAdmins.at(-1).name, 'Updated Admin');
  assert.equal(editedAdmins.at(-1).created_at, addedAdmin.created_at);
  editedAdmins = setAdminStatus(editedAdmins, addedAdmin.id, 'inactive');
  assert.equal(editedAdmins.at(-1).status, 'inactive');
  editedAdmins = setAdminStatus(editedAdmins, addedAdmin.id, 'active');
  assert.equal(editedAdmins.at(-1).status, 'active');
  assert.equal(JSON.stringify(mockAdmins), originalAdmins);
  assert.equal(filterAdmins(editedAdmins, '  UPDATED ').length, 1);
  assert.equal(filterAdmins(editedAdmins, 'test@lifeflow.test').length, 1);
  assert.equal(filterAdmins(editedAdmins, 'no-match').length, 0);
  assert.equal(filterAuditLogs(mockAuditLogs, ' MARIA ', 'Verification').length, 2);
  assert.equal(filterAuditLogs(mockAuditLogs, 'requested proof').length, 1);
  assert.equal(filterAuditLogs(mockAuditLogs, '', 'Rewards').length, 1);
  assert.equal(filterAuditLogs(mockAuditLogs, 'no-match').length, 0);
  const routes = createRoutesFromElements(AppRoutes().props.children);
  const normalPaths = ['/dashboard', '/announcements', '/verification', '/donors', '/rewards'];
  const restrictedPages = [
    ['/system-reports', 'System Reports'],
    ['/admin-management', 'Admin Management'],
    ['/audit-logs', 'Audit Logs'],
  ];
  function renderPath(path) {
    return renderToString(React.createElement(MemoryRouter, { initialEntries: [path] },
      React.createElement(Provider, null, React.createElement(AppRoutes))));
  }
  let session;
  let guard;
  function Probe({ allowedRoles, initialPassword }) {
    session = useAdminSession();
    guard = RequireRole({ allowedRoles, initialPassword });
    return null;
  }
  function inspect(allowedRoles) {
    renderToString(React.createElement(Provider, null, React.createElement(Probe, { allowedRoles })));
  }

  inspect();
  assert.equal(session.isAuthenticated, false);
  assert.equal(guard.type, Navigate);
  assert.equal(guard.props.to, '/');
  for (const path of [...normalPaths, ...restrictedPages.map(([path]) => path)]) {
    assert.equal(renderPath(path), '', `Logged out: ${path} does not render`);
  }
  await session.login({ email: 'admin@example.test', password: 'test-only', remember: false });
  assert.ok(sessionStorage.getItem(TOKEN_KEY));
  assert.equal(localStorage.getItem(TOKEN_KEY), null);
  inspect();
  assert.equal(session.isAuthenticated, true);

  for (const role of Object.values(ADMIN_ROLES)) {
    backendRole = role;
    await fixture.logout();
    await fixture.login({ email: 'admin@example.test', password: 'test-only' });
    inspect();
    assert.equal(session.role, role);
    assert.equal(session.isAdmin, true);
    assert.equal(session.isSuperAdmin, role === ADMIN_ROLES.SUPER_ADMIN);
    assert.equal(guard.type, Outlet);
    inspect([ADMIN_ROLES.SUPER_ADMIN]);
    assert.equal(guard.type, role === ADMIN_ROLES.SUPER_ADMIN ? Outlet : Navigate);
    if (guard.type === Navigate) assert.equal(guard.props.to, '/dashboard');

    for (const path of normalPaths) {
      const html = renderPath(path);
      assert.ok(html.includes('Sample Admin'), `${role}: ${path} loads session profile`);
      if (path === '/donors') {
        assert.ok(!html.includes('/donors/'));
        assert.ok(html.includes('Loading page') && !html.includes('Juan Dela Cruz'), 'Donors waits for authenticated API data');
      }
      if (path === '/dashboard') {
        assert.ok(html.includes('Loading page'), 'Dashboard waits for authenticated API data');
        assert.ok(!html.includes('1,248') && !html.includes('Super Admin Overview'));
      }
      if (path === '/rewards') assert.ok(html.includes('Loading page'), 'Rewards waits for real API data');
      const nav = html.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/)[1];
      const paths = [...nav.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
      assert.deepEqual(paths, role === ADMIN_ROLES.ADMIN ? normalPaths :
        [...normalPaths, ...restrictedPages.map(([path]) => path)]);
      assert.ok(html.includes('Logout'));
      assert.ok(!nav.includes('Feedback'));
      assert.ok(!paths.includes('/reports'));
    }
    for (const [path, label] of restrictedPages) {
      const matches = matchRoutes(routes, path);
      const roleGuard = matches.find(({ route }) => route.element?.props.allowedRoles);
      assert.ok(roleGuard, `${path} is role-guarded`);
      inspect(roleGuard.route.element.props.allowedRoles);
      const html = renderPath(path);
      if (role === ADMIN_ROLES.ADMIN) {
        assert.equal(guard.type, Navigate);
        assert.equal(guard.props.to, '/dashboard');
        assert.equal(html, '', `Admin cannot render ${path}`);
      } else {
        assert.equal(guard.type, Outlet);
        assert.match(html, new RegExp(`<h1[^>]*>${label}</h1>`));
        if (path === '/system-reports') {
          assert.ok(html.includes('Print / Save Report') && !html.includes('Generate Report'));
          assert.ok(html.includes('Report month') && html.includes('Report year'));
          assert.ok(html.includes('Loading page') && !html.includes('Mock data:'));
          assert.ok(!html.includes('id="monthly-report"'), 'Reports wait for authenticated backend data');
        }
        if (path === '/audit-logs') {
          assert.ok(!html.includes('type="month"'));
          assert.ok(html.includes('All Months') && html.includes('September'));
          assert.ok(html.indexOf('All modules') < html.indexOf('All Months'));
          const table = html.match(/<table\b[\s\S]*?<\/table>/)[0];
          assert.ok(!table.includes('<button'), 'Audit records have no mutation actions');
          assert.ok(table.includes('Target / Details'));
          assert.ok(html.includes('Loading page') && !html.includes('Read-only sample records'), 'Audit Logs waits for real authenticated data');
        }
        if (path === '/admin-management') {
          const content = html.slice(html.indexOf('<main'));
          assert.ok(content.indexOf('Total Admins') < content.indexOf('Search Admins'));
          assert.ok(content.indexOf('Show Active Admins') < content.indexOf('Show Deactivated Admins'));
          assert.ok(content.indexOf('Show Deactivated Admins') < content.indexOf('Show Total Admins'));
          assert.ok(!content.includes('aria-label="Admin account status"'));
          assert.ok(html.includes('Create Admin') && html.includes('Loading page'));
          assert.ok(html.includes('Deactivated Admins'));
          assert.ok(!html.includes('maria@lifeflow.test'), 'Real Admin list starts with loading, not mock accounts');
        }
      }
    }
    const legacyMatches = matchRoutes(routes, '/reports');
    inspect(legacyMatches.find(({ route }) => route.element?.props.allowedRoles).route.element.props.allowedRoles);
    assert.equal(guard.type, role === ADMIN_ROLES.ADMIN ? Navigate : Outlet);
    assert.equal(legacyMatches.at(-1).route.element.props.to, '/system-reports');
    const feedbackMatch = matchRoutes(routes, '/feedback').at(-1).route;
    assert.equal(feedbackMatch.path, '*');
    assert.equal(feedbackMatch.element.props.to, '/dashboard');
    assert.equal(renderPath('/feedback'), '');
  }

  await session.logout();
  assert.equal(localStorage.getItem(TOKEN_KEY), null);
  assert.equal(sessionStorage.getItem(TOKEN_KEY), null);
  inspect();
  assert.equal(guard.props.to, '/');
  await session.login({ email: 'admin@example.test', password: 'test-only', remember: true });
  assert.ok(localStorage.getItem(TOKEN_KEY));
  assert.equal(sessionStorage.getItem(TOKEN_KEY), null);
  await session.logout();
  await checkRealAuth(server);
  await checkLoginRecovery(server);
  await checkAdminManagement(server);
  await checkAnnouncements(server);
  await checkVerifications(server);
  await checkDashboard(server);
  await checkRewards(server);
  await checkRewardClaims(server);
  await checkDonors(server);
  await checkDonorNames(server);
  await checkAuditLogs(server);
  await checkSystemReports(server);
  await checkSidebar(server);
  assert.equal(hasRole('unknown'), false);
  assert.equal(hasRole(ADMIN_ROLES.ADMIN, []), false);
  process.stdout.write('Auth/navigation checks passed: both sidebars, protected routes, restricted pages, legacy URLs, persistence, logout, invalid sessions.\n');
} finally {
  await server.close();
}
