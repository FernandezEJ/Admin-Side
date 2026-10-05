import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkRewards(server) {
  const { createRewards, validateReward } = await server.ssrLoadModule('/src/services/rewardsApi.js');
  const { RewardsView } = await server.ssrLoadModule('/src/pages/Rewards.jsx');
  const { default: RewardsAnalytics } = await server.ssrLoadModule('/src/components/rewards/RewardsAnalytics.jsx');
  const { default: MonthFilter } = await server.ssrLoadModule('/src/components/ui/MonthFilter.jsx');
  const { RewardForm } = await server.ssrLoadModule('/src/pages/AddReward.jsx');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const render = (Component, remote, extra = {}, role = 'admin') => renderToString(React.createElement(MemoryRouter, null,
    React.createElement(AdminSessionContext.Provider, { value: { role, isSuperAdmin: role === 'super_admin', currentAdmin: { name: 'Reward admin' } } },
      React.createElement(Component, { remote, ...extra })))).replace(/<!-- -->/g, '');
  let reward = { id: 81, name: '<b>API grocery</b>', category: 'grocery', amount_mode: 'custom', voucher_value: '125.50', points_cost: 75, stock_quantity: 9, status: 'active', recoverable: false };
  let redemptions = [{ id: 71, donor: 'Real buyer', reward: 'Original grocery', category: 'grocery', voucherValue: 125.5, pointsUsed: 75, redeemedDate: '2026-09-27', status: 'available' }];
  const analytics = { summary: { total_redemptions: 1, total_points_spent: 75, active_inventory: 9 },
    monthly_redemptions: Array.from({ length: 12 }, (_, index) => ({ period: `2026-${String(index + 1).padStart(2, '0')}`, redemptions: index === 8 ? 1 : 0 })), top_rewards: [{ reward_id: 81, reward_name: 'Original grocery', redemptions: 1 }] };
  const calls = [];
  let fail = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer reward-token');
    const endpoint = new URL(url);
    calls.push({ endpoint, options });
    if (fail) return Response.json({ message: 'Unavailable' }, { status: 503 });
    if (endpoint.pathname.endsWith('/analytics')) return Response.json({ ...analytics, year: Number(endpoint.searchParams.get('year')), month: null,
      monthly_redemptions: analytics.monthly_redemptions.map((row) => ({ ...row, period: `${endpoint.searchParams.get('year')}${row.period.slice(4)}` })) });
    if (endpoint.pathname.endsWith('/redemptions')) return Response.json({ data: redemptions });
    if (options.method === 'DELETE') { reward = { ...reward, status: 'deleted', recoverable: true }; return Response.json({ reward }); }
    if (endpoint.pathname.endsWith('/restore')) { reward = { ...reward, status: 'inactive', recoverable: false }; return Response.json({ reward }); }
    if (options.method === 'POST') {
      assert.ok(options.body instanceof FormData);
      assert.equal(options.headers['Content-Type'], undefined);
      assert.equal(options.body.has('amount_mode'), false, 'Management submits manual values without Amount Mode');
      reward = { ...reward, name: options.body.get('name'), category: options.body.get('category'), voucher_value: options.body.get('voucher_value') };
      return Response.json({ reward });
    }
    return Response.json(endpoint.pathname.endsWith('/rewards') ? { data: [reward] } : { reward });
  };
  try {
    const run = (operation) => operation('reward-token');
    const list = createRewards(run);
    const remote = () => ({ ...list.getSnapshot(), model: list });
    assert.ok(render(RewardsView, remote()).includes('Loading page'));
    await list.load();
    assert.equal(remote().items[0].voucherValue, 125.5);
    const descendants = (element) => React.isValidElement(element)
      ? [element, ...React.Children.toArray(element.props.children).flatMap(descendants)] : [];
    const categories = ['grocery', 'medicine', 'fitness', 'other'];
    const statuses = ['active', 'inactive', 'deleted'];
    const cardItems = categories.flatMap((category, group) => statuses.flatMap((status, index) => [0, 1].map((row) => ({
      ...remote().items[0], id: group * 10 + index * 2 + row + 1, category, status,
      name: `${row === 0 ? 'Matching' : 'Other'} ${category} ${status}`, stock: status === 'active' ? 2 : 90,
    }))));
    const originalItems = JSON.stringify(cardItems);
    const labels = ['Active', 'Inactive', 'Deleted'];
    for (const role of ['admin', 'super_admin']) {
      for (const category of categories) {
        const beforeCalls = calls.length;
        const checkedRemote = { ...remote(), items: cardItems, model: { load: () => assert.fail('Card/filter changes do not refetch rewards'),
          transition: () => assert.fail('Card/filter changes do not mutate rewards') } };
        const observed = [];
        const actions = [
          (nodes) => nodes.find((node) => node.props['aria-label'] === 'Category').props.onChange({ target: { value: category } }),
          (nodes) => nodes.find((node) => node.type === 'input' && node.props.type === 'search').props.onChange({ target: { value: 'Matching' } }),
          (nodes) => nodes.find((node) => node.props['aria-label'] === 'Show Inactive vouchers').props.onClick(),
          (nodes) => nodes.find((node) => node.props['aria-label'] === 'Show Deleted vouchers').props.onClick(),
          (nodes) => nodes.find((node) => node.type === 'button' && node.props.children === 'Active').props.onClick(),
          (nodes) => nodes.find((node) => node.type === 'button' && node.props.children === 'Deleted').props.onClick(),
          (nodes) => nodes.find((node) => node.type === 'button' && node.props.children === 'Clear').props.onClick(),
          (nodes) => nodes.find((node) => node.type === 'button' && node.props.children === 'Redemptions').props.onClick(),
          (nodes) => nodes.find((node) => node.props['aria-label'] === 'Show Inactive vouchers').props.onClick(),
        ];
        let step = 0;
        function ExerciseRewards() {
          const view = RewardsView({ remote: checkedRemote });
          const nodes = descendants(view);
          const cards = nodes.filter((node) => node.type === 'button' && node.props['aria-label']?.startsWith('Show '));
          assert.equal(cards.length, 3);
          for (let index = 0; index < cards.length; index++) {
            const card = cards[index];
            assert.equal(card.props.type, 'button', 'Native shortcut buttons support keyboard activation');
            assert.equal(card.props['aria-label'], `Show ${labels[index]} vouchers`);
            assert.ok(card.props.className.includes('cursor-pointer') && card.props.className.includes('hover:') && card.props.className.includes('focus-visible:'));
            assert.ok(card.props.className.includes(card.props['aria-pressed'] ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'));
            const content = descendants(card);
            assert.equal(content.find((node) => node.type === 'span' && node.props.className?.includes('text-2xl')).props.children, 8);
            assert.ok(content.some((node) => node.props.size === 16 && node.props['aria-hidden'] === 'true'), 'Each shortcut has a decorative arrow');
          }
          const stock = nodes.find((node) => node.type === 'article' && descendants(node).some((child) => child.props.children === 'Available Stock'));
          assert.ok(stock && !stock.props.onClick && !stock.props['aria-pressed'] && stock.props.tabIndex === undefined);
          assert.ok(!/cursor-pointer|hover:|focus-visible:/.test(stock.props.className));
          assert.ok(!descendants(stock).some((node) => node.type === 'button' || node.props.size === 16), 'Available Stock has no action or arrow');
          assert.equal(descendants(stock).find((node) => node.type === 'h3').props.children, 16, 'Only active stock counts, regardless of filters/status');
          const filter = nodes.find((node) => node.props['aria-label'] === 'Category');
          const search = nodes.find((node) => node.type === 'input' && node.props.type === 'search');
          const mainTab = nodes.find((node) => node.type === 'button' && node.props.children === 'Reward Management');
          const selected = cards.findIndex((card) => card.props['aria-pressed']);
          const articles = nodes.filter((node) => node.type === 'article' && descendants(node).some((child) => child.type === 'h3' && typeof child.props.children === 'string'));
          if (mainTab.props['aria-pressed']) {
            assert.equal(nodes.filter((node) => node.type === 'select').length, 1, 'Reward Management has only one Category dropdown');
            const options = descendants(filter).filter((node) => node.type === 'option');
            assert.deepEqual(options.map((node) => node.props.children), ['All Categories', 'Grocery', 'Medicine', 'Fitness', 'Other']);
            const tabs = nodes.filter((node) => node.type === 'button' && labels.includes(node.props.children));
            assert.ok(tabs[selected].props.className.includes('border-[#b7192e] text-[#b7192e]'), 'Shortcut and status tab share selection');
          }
          observed.push({ selected, ids: articles.map((node) => Number(node.key.match(/(\d+)$/)[1])), category: filter?.props.value, search: search?.props.value });
          if (step < actions.length) actions[step++](nodes);
          return view;
        }
        const html = render(ExerciseRewards, checkedRemote, {}, role);
        assert.deepEqual(observed.map(({ selected }) => selected), [0, 0, 0, 1, 2, 0, 2, 2, -1, 1]);
        const group = categories.indexOf(category) * 10;
        for (const [offset, id] of [[2, group + 1], [3, group + 3], [4, group + 5], [5, group + 1], [6, group + 5]]) {
          assert.deepEqual(observed[offset].ids, [id]);
          assert.equal(observed[offset].category, category);
          assert.equal(observed[offset].search, 'Matching', 'Shortcuts preserve search/category');
        }
        assert.equal(observed[7].category, 'all');
        assert.equal(observed[7].search, '');
        assert.equal(observed[7].ids.length, 8, 'Clear resets filters and preserves Deleted status');
        assert.equal(observed[9].ids.length, 8, 'A card on Redemptions returns to Reward Management');
        assert.ok(html.includes('LIFEFLOW VOUCHER') && html.includes('Available Stock'));
        assert.equal(calls.length, beforeCalls);
        assert.equal(JSON.stringify(cardItems), originalItems);
      }
    }
    for (const role of ['admin', 'super_admin']) {
      const html = render(RewardsView, remote(), {}, role);
      for (const label of ['Add Voucher', 'Voucher Management', 'Manage LifeFlow vouchers', 'LIFEFLOW VOUCHER', 'Search vouchers...', 'All Categories',
        '&lt;b&gt;API grocery&lt;/b&gt;', 'Delete reward', 'Edit reward', 'Available Stock']) assert.ok(html.includes(label), label);
      for (const absent of ['Add Grocery Voucher', 'Grocery Voucher Management', 'Search grocery vouchers', 'All Voucher Values', 'Total Stock']) assert.ok(!html.includes(absent), absent);
      const categoryFilter = html.match(/<select aria-label="Category"[\s\S]*?<\/select>/)[0];
      assert.deepEqual([...categoryFilter.matchAll(/<option[^>]*>([^<]+)<\/option>/g)].map((match) => match[1]), ['All Categories', 'Grocery', 'Medicine', 'Fitness', 'Other']);
      assert.ok(!html.includes('<b>API grocery</b>'));
    }
    let html = render(RewardsView, remote(), { initialTab: 'redemptions' });
    for (const label of ['Real buyer', 'Original grocery', 'Available', 'All Categories', 'All Months']) assert.ok(html.includes(label));
    assert.ok(!html.includes('Voucher Amount') && !html.includes('All amounts'));
    const redemptionItems = categories.flatMap((category, group) => ['available', 'active', 'redeemed', 'expired'].flatMap((status, index) => [0, 1].map((row) => ({
      ...redemptions[0], id: group * 10 + index * 2 + row + 1, category, status,
      reward: `${row === 0 ? 'Matching' : 'Other'} ${category} ${status}`, redeemedDate: row === 0 ? '2026-09-27' : '2026-08-27',
    }))));
    const originalRedemptions = JSON.stringify(redemptionItems);
    for (const role of ['admin', 'super_admin']) {
      for (const category of categories) {
        for (const status of ['available', 'redeemed', 'expired']) {
          const beforeCalls = calls.length;
          const observed = [];
          let step = 0;
          const actions = [
            (nodes) => nodes.find((node) => node.props['aria-label'] === 'Redemption category').props.onChange({ target: { value: category } }),
            (nodes) => nodes.find((node) => node.props['aria-label'] === 'Search redemptions').props.onChange({ target: { value: 'Matching' } }),
            (nodes) => nodes.find((node) => node.props['aria-label'] === 'Redemption status').props.onChange({ target: { value: status } }),
            (nodes) => nodes.find((node) => node.type === MonthFilter).props.onChange('09'),
            (nodes) => nodes.find((node) => node.type === 'button' && node.props.children === 'Clear').props.onClick(),
          ];
          function ExerciseRedemptions() {
            const view = RewardsView({ remote: { ...remote(), redemptions: redemptionItems }, initialTab: 'redemptions' });
            const nodes = descendants(view);
            const categoryFilter = nodes.find((node) => node.props['aria-label'] === 'Redemption category');
            assert.deepEqual(descendants(categoryFilter).filter((node) => node.type === 'option').map((node) => [node.props.value, node.props.children]),
              [['all', 'All Categories'], ['grocery', 'Grocery'], ['medicine', 'Medicine'], ['fitness', 'Fitness'], ['other', 'Other']]);
            const statusFilter = nodes.find((node) => node.props['aria-label'] === 'Redemption status');
            assert.deepEqual(descendants(statusFilter).filter((node) => node.type === 'option').map((node) => [node.props.value, node.props.children]),
              [['', 'All statuses'], ['available', 'Available'], ['redeemed', 'Redeemed'], ['expired', 'Expired']]);
            const month = nodes.find((node) => node.type === MonthFilter);
            const rows = nodes.filter((node) => node.type === 'tr' && descendants(node).some((child) => child.type === 'td'));
            observed.push({ ids: rows.map((node) => Number(node.key.match(/(\d+)$/)[1])), category: categoryFilter.props.value,
              status: statusFilter.props.value, search: nodes.find((node) => node.props['aria-label'] === 'Search redemptions').props.value, month: month.props.value });
            if (step < actions.length) actions[step++](nodes);
            return view;
          }
          render(ExerciseRedemptions, remote(), {}, role);
          assert.deepEqual(observed.map((row) => row.ids.length), [32, 8, 4, 1, 1, 32]);
          assert.deepEqual(observed[3].ids, [categories.indexOf(category) * 10 + ['available', 'active', 'redeemed', 'expired'].indexOf(status) * 2 + 1]);
          assert.deepEqual(observed[4], { ids: observed[3].ids, category, status, search: 'Matching', month: '09' });
          assert.deepEqual(observed[5], { ids: redemptionItems.map((row) => row.id), category: 'all', status: '', search: '', month: '' });
          assert.equal(calls.length, beforeCalls, 'Existing client-side redemption filters do not refetch or mutate');
        }
      }
      const allStatusesHtml = render(RewardsView, { ...remote(), redemptions: redemptionItems }, { initialTab: 'redemptions' }, role);
      assert.ok(allStatusesHtml.includes('Matching grocery active'), 'Active lifecycle records remain visible in All statuses');
    }
    assert.equal(JSON.stringify(redemptionItems), originalRedemptions);
    html = render(RewardsView, remote(), { initialTab: 'analytics' });
    for (const label of ['Redeemed', 'Points Spent', 'Active Stock', 'Redemption Trend', 'Top 3 Most Redeemed Rewards', '1 redemptions']) assert.ok(html.includes(label));
    assert.ok(!html.includes('Voucher Amount Breakdown'));
    const initialYear = remote().year;
    for (const role of ['admin', 'super_admin']) {
      const view = RewardsAnalytics({ remote: remote() });
      const nodes = descendants(view);
      assert.equal(nodes.filter((node) => node.type === 'select' || node.type === MonthFilter).length, 0);
      const group = nodes.find((node) => node.props['aria-label'] === 'Analytics year');
      const header = nodes.find((node) => React.Children.toArray(node.props.children).some((child) => child.props?.['aria-label'] === 'Analytics year'));
      assert.ok(header.props.className.includes('justify-between') && group.props.className.includes('ml-auto'));
      assert.ok(descendants(header).some((node) => node.type === 'h4' && node.props.children === 'Redemption Trend'));
      const buttons = descendants(group).filter((node) => node.type === 'button');
      assert.deepEqual(buttons.map((node) => node.props['aria-label']), ['Previous year', 'Next year']);
      assert.ok(buttons.every((node) => node.props.type === 'button' && node.props.className.includes('focus-visible:')));
      const cards = nodes.find((node) => node.type === 'dl');
      assert.equal(React.Children.toArray(cards.props.children).length, 3);
      assert.ok(React.Children.toArray(cards.props.children).every((node) => node.type === 'div' && node.props.className.includes('border border-gray-200') && !node.props.onClick));
      const beforeCalls = calls.length;
      const previousAnalytics = remote().analytics;
      const previousItems = remote().items;
      const previousRedemptions = remote().redemptions;
      const down = buttons[0].props.onClick();
      assert.equal(remote().year, String(Number(initialYear) - 1));
      assert.equal(remote().analyticsLoading, true);
      assert.equal(remote().loading, false);
      assert.equal(remote().analytics, previousAnalytics);
      const loadingHtml = render(RewardsView, remote(), { initialTab: 'analytics' }, role);
      assert.ok(!loadingHtml.includes('Loading page') && loadingHtml.includes('Refreshing analytics') && loadingHtml.includes('Redemption Trend'));
      await down;
      assert.equal(remote().analytics.year, Number(initialYear) - 1);
      assert.equal(remote().analyticsLoading, false);
      const upNodes = descendants(RewardsAnalytics({ remote: remote() }));
      await upNodes.find((node) => node.props['aria-label'] === 'Next year').props.onClick();
      assert.equal(remote().year, initialYear);
      assert.equal(remote().items, previousItems);
      assert.equal(remote().redemptions, previousRedemptions);
      assert.equal(calls.length, beforeCalls + 2, 'Year changes fetch only Analytics');
      assert.ok(calls.slice(beforeCalls).every((call) => call.endpoint.pathname.endsWith('/analytics') && !call.endpoint.searchParams.has('month')));
      const analyticsHtml = render(RewardsAnalytics, remote(), {}, role);
      assert.ok(analyticsHtml.includes('lucide-chevron-down') && analyticsHtml.includes('lucide-chevron-up') && !analyticsHtml.includes('<select'));
      assert.ok(analyticsHtml.includes('January: 0 redemptions') && analyticsHtml.includes('December: 0 redemptions'));
    }
    assert.equal(remote().month, undefined, 'No hidden analytics month state');
    for (const [year, label] of [['2000', 'Previous year'], [String(Number(initialYear) + 1), 'Next year']]) {
      const nodes = descendants(RewardsAnalytics({ remote: { ...remote(), year } }));
      assert.equal(nodes.find((node) => node.props['aria-label'] === label).props.disabled, true);
    }
    fail = true;
    const cachedAnalytics = remote().analytics;
    await list.loadAnalytics(String(Number(initialYear) - 1));
    assert.equal(remote().error, '');
    assert.equal(remote().analytics, cachedAnalytics);
    assert.equal(remote().loading, false);
    assert.ok(render(RewardsView, remote(), { initialTab: 'analytics' }).includes('Unable to load Rewards Analytics'));
    fail = false;
    const retry = descendants(RewardsAnalytics({ remote: remote() })).find((node) => node.props.title === 'Unable to load Rewards Analytics');
    await retry.props.onRetry();
    assert.equal(remote().analyticsError, '');
    assert.equal(remote().analytics.year, Number(initialYear) - 1);
    const emptyAnalytics = { ...remote(), analytics: { summary: { total_redemptions: 0, total_points_spent: 0, active_inventory: 9 }, monthly_redemptions: [], top_rewards: [] } };
    assert.ok(render(RewardsAnalytics, emptyAnalytics).includes('No redemptions for this year'));
    assert.ok(render(RewardsAnalytics, emptyAnalytics).includes('No rewards redeemed for this year'));
    await list.transition(81, 'delete');
    assert.equal(remote().items[0].status, 'deleted');
    await list.transition(81, 'restore');
    assert.equal(remote().items[0].status, 'inactive');

    const form = createRewards(run, 'new');
    html = render(RewardForm, { ...form.getSnapshot(), model: form });
    for (const label of ['Voucher Name', 'Category', 'Voucher Value', 'Points Required', 'Available Stock', 'Save Voucher']) assert.ok(html.includes(label));
    assert.ok(!html.includes('Amount Mode') && !html.includes('Custom') && !html.includes('Fixed') && !html.includes('Grocery Voucher Details'));
    assert.ok(html.match(/<input id="voucherValue"[^>]*type="number"[^>]*step="0.01"/));
    const data = { name: 'New voucher', category: 'medicine', voucher_value: '125.50', points_cost: 75, stock_quantity: 9, status: 'active' };
    assert.equal(await form.save({ ...data, stock_quantity: -1 }), false);
    assert.ok(validateReward({ ...data, points_cost: 0 }));
    assert.ok(validateReward({ ...data, category: 'health' }));
    for (const category of ['grocery', 'medicine', 'fitness', 'other']) assert.equal(validateReward({ ...data, category }), '');
    for (const voucher_value of ['0', '-1', '1.001', '', 'abc', '100000.01']) assert.ok(validateReward({ ...data, voucher_value }));
    assert.equal(await form.save(data), true);
    for (const item of [null, { ...remote().items[0], amount_mode: 'fixed', category: 'grocery', voucherValue: 100 }]) {
      let submitted;
      let submission;
      let step = 0;
      const checkedForm = { item, busy: false, error: '', model: { save: async (payload) => { submitted = payload; return false; } } };
      const actions = [
        (nodes) => nodes.find((node) => node.props.name === 'voucherValue').props.onChange({ target: { name: 'voucherValue', value: '152.75' } }),
        (nodes) => nodes.find((node) => node.props.name === 'category').props.onChange({ target: { name: 'category', value: 'fitness' } }),
      ];
      function ExerciseForm() {
        const view = RewardForm({ remote: checkedForm });
        const nodes = descendants(view);
        assert.ok(!nodes.some((node) => node.props.name === 'amountMode'));
        const value = nodes.find((node) => node.props.name === 'voucherValue');
        assert.equal(value.type, 'input');
        assert.equal(value.props.type, 'number');
        if (step === 0) assert.equal(value.props.value, item ? '100' : '');
        if (step >= 1) assert.equal(value.props.value, '152.75', 'Manual value is preserved when category changes');
        if (step < actions.length) actions[step++](nodes);
        else submission = nodes.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
        return view;
      }
      const html = render(ExerciseForm, checkedForm);
      await submission;
      assert.ok(!html.includes('Amount Mode') && !html.includes('Add Grocery Voucher') && !html.includes('Edit Grocery Voucher'));
      assert.equal(submitted.category, 'fitness');
      assert.equal(submitted.voucher_value, '152.75');
      assert.equal(submitted.amount_mode, undefined);
      assert.equal(submitted.expected_stock, item?.stock);
    }
    const edit = createRewards(run, 81);
    await edit.load();
    assert.equal(await edit.save({ ...data, name: 'Edited grocery', expected_stock: 9 }), true);
    assert.equal(calls.at(-1).options.body.get('_method'), 'PUT');
    assert.equal(calls.at(-1).options.body.get('expected_stock'), '9');
    html = render(RewardForm, { ...edit.getSnapshot(), model: edit });
    assert.ok(!html.includes('Amount Mode') && !html.includes('amountMode'));
    assert.ok(html.match(/<input id="voucherValue"[^>]*value="125.5"/));
    assert.ok(html.includes('value="medicine" selected=""'));
    fail = true;
    await list.load();
    assert.ok(render(RewardsView, remote()).includes('Try again'));
    fail = false;
    await list.load();
    assert.equal(remote().error, '');
    redemptions = [];
    await list.load();
    assert.ok(render(RewardsView, remote(), { initialTab: 'redemptions' }).includes('No redemptions found'));
    assert.ok(render(RewardsView, { ...remote(), items: [] }).includes('No vouchers found'));

    let complete;
    let submissions = 0;
    const slow = createRewards(run, 'new', { save: () => { submissions++; return new Promise((resolve) => { complete = resolve; }); } });
    const first = slow.save(data);
    assert.equal(await slow.save(data), false);
    assert.equal(submissions, 1);
    complete(reward);
    assert.equal(await first, true);
    const pending = [];
    const race = createRewards(run, 81, { detail: () => new Promise((resolve) => pending.push(resolve)) });
    const older = race.load(); const newer = race.load();
    pending[1]({ name: 'Latest' }); await newer;
    pending[0]({ name: 'Stale' }); await older;
    assert.equal(race.getSnapshot().item.name, 'Latest');
    const analyticsPending = [];
    const analyticsRace = createRewards(run, undefined, { analytics: (_token, year) => new Promise((resolve) => analyticsPending.push({ year, resolve })) });
    const olderAnalytics = analyticsRace.loadAnalytics('2024');
    const newerAnalytics = analyticsRace.loadAnalytics('2025');
    analyticsPending[1].resolve({ ...analytics, year: 2025 }); await newerAnalytics;
    analyticsPending[0].resolve({ ...analytics, year: 2024 }); await olderAnalytics;
    assert.equal(analyticsRace.getSnapshot().year, '2025');
    assert.equal(analyticsRace.getSnapshot().analytics.year, 2025, 'Older year responses cannot overwrite the latest selection');
    const disposedAnalytics = analyticsRace.loadAnalytics('2026');
    analyticsRace.dispose();
    const disposedSnapshot = analyticsRace.getSnapshot();
    analyticsPending[2].resolve({ ...analytics, year: 2026 }); await disposedAnalytics;
    assert.equal(analyticsRace.getSnapshot(), disposedSnapshot, 'Unmounted Analytics ignores outstanding requests');
    assert.ok(calls.filter((call) => call.endpoint.pathname.endsWith('/analytics')).every((call) => !call.endpoint.searchParams.has('month')), 'Initial load, year changes, retries and mutations all request a whole year');
    race.dispose(); list.dispose(); edit.dispose(); form.dispose(); slow.dispose();

    const source = readFileSync('src/components/rewards/RewardsAnalytics.jsx', 'utf8');
    const dashboard = readFileSync('src/pages/Dashboard.jsx', 'utf8').match(/<BarChart data=\{donationActivity\}>[\s\S]*?<\/BarChart>/)[0];
    const chart = source.match(/<BarChart data=\{chartData\}>[\s\S]*?<\/BarChart>/)[0]
      .replace('data={chartData}', 'data={donationActivity}').replace('dataKey="label"', 'dataKey="month"')
      .replace(/\s*tickFormatter=\{\(label\) => label.slice\(0, 3\)\}/, '').replace('dataKey="redemptions"', 'dataKey="donations"').replace(/\s*name="Redeemed"/, '');
    assert.equal(chart.replace(/\s+/g, ' '), dashboard.replace(/\s+/g, ' '));
    console.log('Rewards checks passed: generic vouchers and manual values, management shortcuts/stock, redemption category/search/status/month and Clear, only Active filter removed, both roles, full-year Analytics with header year chevrons and bordered cards, local refresh/retry/empty, no month queries or inventory refetch, unchanged chart, transport/history/recovery and duplicate/stale requests.');
  } finally { globalThis.fetch = originalFetch; }
}
