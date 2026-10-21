import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkSidebar(server) {
  const { default: Sidebar } = await server.ssrLoadModule('/src/components/layout/Sidebar.jsx');
  const { default: Header } = await server.ssrLoadModule('/src/components/layout/Header.jsx');
  const { SidebarContext } = await server.ssrLoadModule('/src/components/layout/useSidebar.js');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const { navigationItems } = await server.ssrLoadModule('/src/components/layout/navigation.js');
  const { hasRole } = await server.ssrLoadModule('/src/auth/roles.js');
  const staff = { name: 'Suffer F.. Cruz', email: 'signed-in@example.test' };
  const main = ['/dashboard', '/announcements', '/verification', '/donors', '/rewards'];
  const system = ['/system-reports', '/admin-management', '/audit-logs'];

  for (const role of ['admin', 'super_admin']) {
    for (const collapsed of [false, true]) {
      for (const mobileOpen of [false, true]) {
        for (const path of navigationItems.filter((item) => hasRole(role, item.allowedRoles)).map((item) => item.path)) {
          const ui = { collapsed, mobileOpen, toggleCollapsed() {}, openMobile() {}, closeMobile() {} };
          const html = renderToString(React.createElement(MemoryRouter, { initialEntries: [path] },
            React.createElement(AdminSessionContext.Provider, { value: { role, currentAdmin: staff, logout() {} } },
              React.createElement(SidebarContext.Provider, { value: ui }, React.createElement(React.Fragment, null,
                React.createElement(Sidebar), React.createElement(Header))))));
          const nav = html.match(/<nav\b[\s\S]*?<\/nav>/u)[0];
          assert.deepEqual([...nav.matchAll(/href="([^"]+)"/gu)].map((match) => match[1]), role === 'admin' ? main : [...main, ...system]);
          assert.equal([...nav.matchAll(/aria-current="page"/gu)].length, 1);
          assert.ok(nav.includes(`aria-current="page" class="sidebar-link is-active" href="${path}"`));
          assert.ok(nav.includes('MAIN MENU'));
          assert.equal(nav.includes('>SYSTEM<'), role === 'super_admin', 'No empty or unauthorized System section');
          assert.ok(html.includes('>USER<') && html.includes('Suffer F. Cruz') && html.includes(staff.email));
          assert.ok(html.includes('sidebar-avatar') && html.includes('>SC</span>'));
          assert.ok(!html.includes('Suffer F.. Cruz'), 'Stored initials are normalized for display only');
          assert.ok(html.includes(collapsed ? 'aria-label="Expand sidebar"' : 'aria-label="Collapse sidebar"'));
          assert.equal(html.includes('is-collapsed'), collapsed);
          assert.equal(html.includes('role="dialog" aria-modal="true"'), mobileOpen);
          assert.ok(html.includes(`aria-controls="admin-sidebar" aria-expanded="${mobileOpen}"`));
          assert.ok(html.includes('aria-label="Logout"') && html.includes('aria-label="Close navigation"'));
          const labels = nav.replace(/<svg[\s\S]*?<\/svg>/gu, '');
          assert.ok(!/badge|counter|notification|<button/iu.test(labels) && !/\d/u.test(labels.replace(/<[^>]*>/gu, '')), 'Sidebar navigation contains labels only, no count, badge, dot or action');
          for (const item of navigationItems.filter((item) => hasRole(role, item.allowedRoles))) {
            assert.ok(nav.includes(`title="${item.name}" aria-label="${item.name}"`), 'Icon-only links retain accessible labels and tooltips');
          }
        }
      }
    }
  }
  assert.equal(staff.name, 'Suffer F.. Cruz', 'Session data remains untouched');
  process.stdout.write('Sidebar checks passed: both roles, route/active state, expanded/collapsed/mobile markup, real formatted identity, accessible labels and no badges/counters.\n');
}
