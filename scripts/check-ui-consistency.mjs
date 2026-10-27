import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export async function checkUiConsistency(server) {
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const modules = {};
  for (const name of ['Dashboard', 'Announcements', 'EducationalContent', 'Verification', 'Donors', 'Rewards', 'AdminManagement']) {
    modules[name] = await server.ssrLoadModule(`/src/pages/${name}.jsx`);
  }
  const descendants = element => !React.isValidElement(element) ? [] : [element, ...React.Children.toArray(element.props.children).flatMap(descendants)];
  const inspect = (View, props, role, check) => {
    function Inspect() { const tree = View(props);check(descendants(tree));return null; }
    renderToString(React.createElement(MemoryRouter, null, React.createElement(AdminSessionContext.Provider,
      { value: { role, isSuperAdmin: role === 'super_admin', currentAdmin: { name: 'Reviewer' } } }, React.createElement(Inspect))));
  };
  const badges = nodes => nodes.filter(node => node.props.className?.split(' ').includes('lf-icon-badge'));
  const chevrons = nodes => nodes.filter(node => node.type === ChevronRight);
  const assertBadges = (nodes, paints) => {
    const icons = badges(nodes);assert.equal(icons.length, paints.length);
    icons.forEach((badge, index) => {
      assert.ok(badge.props.className.includes(paints[index]));
      const [icon] = React.Children.toArray(badge.props.children);
      assert.equal(icon.props.size, 22);assert.equal(icon.props['aria-hidden'], 'true');
      assert.equal(badge.props.onClick, undefined, 'Decorative icon badges do not become controls');
    });
  };
  const remote = { items: [], redemptions: [], loading: false, error: '', hasLoaded: true, model: {},
    filters: { status: 'published', category: 'all', search: '', page: 1 }, categories: {}, counts: { published: 0, draft: 0, deleted: 0 }, meta: { total: 0, current_page: 1, last_page: 1 } };
  const summary = nodes => nodes.filter(node => node.type === 'button' && node.props['aria-label']?.startsWith('Show '));
  for (const role of ['admin', 'super_admin']) {
    for (const [name, paints] of [
      ['Announcements', ['text-success-foreground', 'text-neutral-foreground', 'text-warning-foreground', 'text-danger-foreground']],
      ['EducationalContent', ['text-success-foreground', 'text-neutral-foreground', 'text-danger-foreground']],
      ['Verification', ['text-warning-foreground', 'text-warning-foreground', 'text-success-foreground', 'text-danger-foreground']],
      ['Rewards', ['lf-icon-brand', 'text-success-foreground', 'text-gray-500', 'text-danger-foreground']],
    ]) {
      inspect(modules[name][`${name}View`], { remote }, role, nodes => {
        const cards = summary(nodes);assert.equal(cards.length, paints.length);
        cards.forEach((card, index) => {
          const content = descendants(card);assertBadges(content, [paints[index]]);
          assert.equal(chevrons(content).length, 1);assert.equal(chevrons(content)[0].props.size, 18);
          assert.ok(card.props.className.includes('focus-visible:') && card.props.className.includes('hover:'));
          assert.equal(typeof card.props.onClick, 'function');assert.equal(typeof card.props['aria-pressed'], 'boolean');
        });
      });
    }
    const data = { stats: { donors: 1, eligible: 1, not_eligible: 0 }, donation_activity: [], blood_types: [], recent_verifications: [] };
    inspect(modules.Dashboard.DashboardView, { remote: { data, months: 6, loading: false, model: {} } }, role, nodes => {
      const section = nodes.find(node => node.type === 'section' && node.props.className === 'grid gap-5 md:grid-cols-2 xl:grid-cols-3');
      const cards = React.Children.toArray(section.props.children);
      assertBadges(descendants(section), ['lf-icon-brand', 'text-success-foreground', 'text-warning-foreground']);
      assert.equal(cards[0].props.to, '/donors');assert.equal(chevrons(descendants(cards[0])).length, 1);
      for (const card of cards.slice(1)) {
        assert.equal(card.type, 'article');assert.equal(card.props.onClick, undefined);assert.equal(chevrons(descendants(card)).length, 0);
        assert.ok(!/hover:|cursor-pointer|focus-visible:/.test(card.props.className), 'Passive metrics remain inert');
      }
    });
    const donor = { id: 1, name: 'Donor F. Example', totalDonations: 1, achievement: 'First-Time Donor', eligibility: 'eligible', joinedDate: null };
    inspect(modules.Donors.DonorsView, { remote: { ...remote, activeTab: 'all', searchTerm: '', selectedBloodType: 'all', selectedEligibility: 'all',
      data: { summary: { totalDonors: 1, eligible: 1, temporarilyIneligible: 0 }, donors: [donor], topDonors: [], bloodTypes: [], pagination: { currentPage: 1, lastPage: 1 } } } }, role, nodes => {
      assertBadges(nodes, ['lf-icon-brand', 'text-success-foreground', 'text-warning-foreground']);
      const body = nodes.find(node => node.type === 'tbody');
      for (const row of React.Children.toArray(body.props.children)) {
        assert.equal(row.props.onClick, undefined);assert.equal(row.props.tabIndex, undefined);assert.equal(chevrons(descendants(row)).length, 0);
      }
    });
    inspect(modules.Rewards.RewardsView, { initialTab: 'redemptions', remote: { ...remote, redemptions: [{ id: 1, donor: 'Buyer', reward: 'Saved reward', pointsUsed: 300, redeemedDate: '2026-10-01', status: 'available' }] } }, role, nodes => {
      const body = nodes.find(node => node.type === 'tbody');
      for (const row of React.Children.toArray(body.props.children)) { assert.equal(row.props.onClick, undefined);assert.equal(chevrons(descendants(row)).length, 0); }
    });
  }
  const { createAdminManagement } = await server.ssrLoadModule('/src/services/adminManagementState.js');
  const model = createAdminManagement(() => { throw Error('Visual checks must not make requests'); });
  const state = { ...model.getSnapshot(), loading: false, hasLoaded: true, admins: [{ id: 1, name: 'Staff F. Example', status: 'active' }], summary: { active: 1, deactivated: 0, total: 1 } };
  inspect(modules.AdminManagement.AdminManagementView, { state, model }, 'super_admin', nodes => {
    assertBadges(nodes, ['text-success-foreground', 'text-neutral-foreground', 'lf-icon-brand']);
    summary(nodes).forEach(card => assert.equal(chevrons(descendants(card)).length, 1));
    const row = nodes.find(node => node.type === 'tr' && node.props.tabIndex === 0);
    assert.equal(descendants(row).filter(node => node.type === 'td').length, 5);assert.equal(chevrons(descendants(row)).length, 1);
    assert.ok(row.props.className.includes('hover:bg-primary-soft') && row.props.className.includes('focus-visible:bg-primary-soft'));
  });
  const { default: Overview } = await server.ssrLoadModule('/src/components/SuperAdminOverview.jsx');
  inspect(Overview, { overview: { total_admins: 2, active_admins: 1, rewards_summary: { total_redemptions: 1 }, recent_admin_activity: [] } }, 'super_admin', nodes => {
    const section = nodes.find(node => node.props.className === 'grid gap-5 md:grid-cols-2 xl:grid-cols-3');
    const cards = React.Children.toArray(section.props.children);
    assertBadges(descendants(section), ['lf-icon-brand', 'text-success-foreground', 'lf-icon-brand']);
    assert.equal(chevrons(descendants(cards[0])).length, 1);assert.equal(chevrons(descendants(cards[1])).length, 1);
    assert.equal(cards[2].type, 'article');assert.equal(chevrons(descendants(cards[2])).length, 0);assert.ok(!cards[2].props.className.includes('hover:'));
  });
  const { EmptyState, ErrorState } = await server.ssrLoadModule('/src/components/ui/PageState.jsx');
  const empty = renderToString(React.createElement(EmptyState));
  assert.ok(empty.includes('lf-icon-badge lf-icon-brand') && empty.includes('role="status"') && !/<(?:button|a)\b/.test(empty));
  assert.ok(renderToString(React.createElement(ErrorState)).includes('text-danger'), 'Error indicators stay semantic red');
  const { default: Dialog } = await server.ssrLoadModule('/src/components/ui/AdminDialog.jsx');
  const dialog = renderToString(React.createElement(Dialog, { title: 'Details', closeDisabled: true }));
  assert.ok(dialog.includes('aria-label="Close dialog"') && dialog.includes('min-h-10 min-w-10') && dialog.includes('disabled=""'));
  for (const [path, name, props] of [
    ['/src/components/rewards/RewardCover.jsx', 'default', {}],
    ['/src/components/announcements/EducationalArticlePreview.jsx', 'ArticleCover', {}],
  ]) {
    const module = await server.ssrLoadModule(path);const html = renderToString(React.createElement(module[name], props));
    assert.ok(html.includes('width="28"') && /lf-icon-brand|bg-primary-soft/.test(html) && html.includes('aria-label="No '));
  }
  const css = readFileSync('src/index.css', 'utf8');
  const badge = css.match(/\.lf-icon-badge\s*\{([^}]+)\}/)[1];
  assert.ok(badge.includes('width: 2.75rem') && badge.includes('height: 2.75rem') && badge.includes('flex-shrink: 0'));
  assert.ok(!/cursor|transition|hover/.test(badge));assert.ok(css.includes('stroke-width: 1.8'));
  assert.match(css, /\.lf-icon-brand\s*\{[^}]*color: var\(--color-primary\);[^}]*background-color: var\(--color-primary-soft\)/);
  const luminance = hex => hex.match(/[a-f\d]{2}/gi).map(pair => parseInt(pair, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  assert.ok((luminance('#FFF0F1') + 0.05) / (luminance('#892325') + 0.05) > 4.5, 'Berry icons on quiet pink exceed AA text contrast');
  const review = readFileSync('src/styles/verification-review.css', 'utf8');
  assert.match(review, /\.verification-proof-toolbar button\s*\{[^}]*width: 36px; height: 36px/);
  assert.ok(review.includes('button:focus-visible') && review.includes(':hover:not(:disabled)'));
  for (const semantic of ['success', 'warning', 'danger']) assert.ok(review.includes(`var(--color-${semantic})`));
  assert.ok(css.includes('prefers-reduced-motion: reduce') && css.includes('transition-duration: 0s !important'));
  console.log('UI consistency checks passed: both roles, 22px badges/quiet brand colors, semantic status colors, clickable card/row chevrons, inert metrics/donor/redemption rows, decorative accessibility, dialog/proof targets, image fallbacks, AA brand contrast and reduced motion.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { createServer } = await import('vite');const server = await createServer({ server: { middlewareMode: true, hmr: false } });
  try { await checkUiConsistency(server); } finally { await server.close(); }
}
