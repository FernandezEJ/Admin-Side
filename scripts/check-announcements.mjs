import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkAnnouncements(server) {
  const { createAnnouncements, filterAnnouncements } = await server.ssrLoadModule('/src/services/announcementsApi.js');
  const { AnnouncementsView } = await server.ssrLoadModule('/src/pages/Announcements.jsx');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const render = (remote) => renderToString(React.createElement(MemoryRouter, null,
    React.createElement(AdminSessionContext.Provider, { value: { role: 'admin', currentAdmin: { name: 'Admin' } } },
      React.createElement(AnnouncementsView, { remote }))));
  const originalFetch = globalThis.fetch;
  let records = [];
  const calls = [];
  let failure;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    const path = new URL(url).pathname;
    calls.push({ path, ...options });
    if (failure) { const response = failure; failure = null; return response; }
    let item;
    if (options.body) {
      assert.ok(options.body instanceof FormData);
      assert.equal(options.headers['Content-Type'], undefined, 'Browser supplies multipart boundary');
      const data = Object.fromEntries(options.body);
      assert.equal(data.points_reward, undefined);
      assert.equal(data.created_by, undefined);
      const id = Number(path.split('/').at(-1)) || records.length + 1;
      item = { ...data, id, status: data.status === 'published' ? 'active' : 'draft',
        expires_at: `${data.expires_at}T15:59:59Z`, published_at: data.status === 'published' ? '2026-09-27T05:00:00Z' : null,
        image_url: data.image ? 'http://api.test/storage/announcements/test.png' : null };
      records = [...records.filter((row) => row.id !== id), item];
    } else if (options.method === 'GET' && path.endsWith('/announcements')) {
      return Response.json({ data: records });
    } else {
      const id = Number(path.match(/announcements\/(\d+)/)[1]);
      item = records.find((row) => row.id === id);
      if (options.method === 'DELETE') item.status = 'deleted';
      if (path.endsWith('/restore') || path.endsWith('/draft')) item.status = 'draft';
      if (path.endsWith('/publish')) item.status = 'active';
    }
    return Response.json({ announcement: item });
  };
  try {
    // Run the real card/tab handlers through React's render-phase state updates,
    // without introducing a DOM library or changing the production filter state.
    const descendants = (element) => {
      if (!React.isValidElement(element)) return [];
      return [element, ...React.Children.toArray(element.props.children).flatMap(descendants)];
    };
    const statuses = ['active', 'draft', 'expired', 'deleted'];
    const labels = ['Active', 'Drafts', 'Expired', 'Deleted'];
    const currentYear = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila', year: 'numeric' });
    const cardItems = statuses.flatMap((status, index) => Array.from({ length: index + 1 }, (_, row) => ({
      id: index * 10 + row + 1, status, title: row === 0 ? `Matching ${status} drive` : `Other ${status} drive`,
      location: 'Dagupan', donationDate: row === 0 ? `${currentYear}-10-01` : `${Number(currentYear) - 1}-11-01`,
      publishedDate: '', expiresDate: '',
    })));
    for (const role of ['admin', 'super_admin']) {
      const cardRemote = { items: cardItems, loading: false, error: '', busy: false,
        model: { load: () => assert.fail('Status shortcuts must not refetch announcements'),
          action: () => assert.fail('Status shortcuts must not mutate announcements') } };
      const originalItems = JSON.stringify(cardItems);
      const beforeCalls = calls.length;
      const observed = [];
      const actions = [
        (nodes) => nodes.find((node) => node.props['aria-label'] === 'Show Drafts announcements').props.onClick(),
        (nodes) => nodes.filter((node) => node.type === 'select')[0].props.onChange({ target: { value: '10' } }),
        (nodes) => { nodes.find((node) => node.props['aria-label'] === 'Previous year').props.onClick(); nodes.find((node) => node.props['aria-label'] === 'Next year').props.onClick(); },
        (nodes) => nodes.find((node) => node.type === 'input' && node.props.type === 'search').props.onChange({ target: { value: 'Matching' } }),
        (nodes) => nodes.find((node) => node.props['aria-label'] === 'Show Expired announcements').props.onClick(),
        (nodes) => nodes.find((node) => node.type === 'button' && node.props.children === 'Deleted').props.onClick(),
        (nodes) => nodes.find((node) => node.props['aria-label'] === 'Show Active announcements').props.onClick(),
        (nodes) => nodes.find((node) => node.props['aria-label'] === 'Show Deleted announcements').props.onClick(),
        (nodes) => nodes.find((node) => node.type === 'button' && node.props.children === 'Drafts').props.onClick(),
      ];
      let step = 0;
      function ExerciseCards() {
        const view = AnnouncementsView({ remote: cardRemote });
        const nodes = descendants(view);
        const cards = nodes.filter((node) => node.type === 'button' && node.props['aria-label']?.startsWith('Show '));
        assert.equal(cards.length, 4);
        const selected = cards.filter((card) => card.props['aria-pressed']);
        assert.equal(selected.length, 1);
        for (let index = 0; index < cards.length; index++) {
          const card = cards[index];
          assert.equal(card.props.type, 'button', 'Native buttons support Enter and Space');
          assert.equal(card.props['aria-label'], `Show ${labels[index]} announcements`);
          assert.ok(card.props.className.includes('cursor-pointer') && card.props.className.includes('hover:') && card.props.className.includes('focus-visible:'));
          assert.ok(card.props.className.includes(card.props['aria-pressed'] ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'));
          const content = descendants(card);
          const count = content.find((node) => node.type === 'span' && node.props.className?.includes('text-2xl'));
          assert.equal(count.props.children, index + 1, 'Counts remain independent of the selected tab and search/date filters');
          assert.ok(content.some((node) => node.props.size === 16 && node.props['aria-hidden'] === 'true' && node.props.className.includes('shrink-0')), 'Every card has a small decorative arrow');
        }
        const tabs = nodes.filter((node) => node.type === 'button' && labels.includes(node.props.children));
        assert.equal(tabs.length, 4, 'Existing tabs are retained');
        const selectedIndex = cards.indexOf(selected[0]);
        assert.ok(tabs[selectedIndex].props.className.includes('border-[#b7192e] text-[#b7192e]'), 'Cards and tabs reflect the same selected state');
        const body = nodes.find((node) => node.type === 'tbody');
        const rowIds = React.Children.toArray(body.props.children).map((row) => Number(row.key.match(/(\d+)$/)[1]));
        observed.push({ selectedIndex, rowIds,
          search: nodes.find((node) => node.type === 'input' && node.props.type === 'search').props.value,
          dates: [nodes.find((node) => node.type === 'select').props.value, nodes.find((node) => node.props['aria-label'] === 'All years').props['aria-pressed'] ? 'all' : nodes.find((node) => node.props['aria-label'] === 'All years').props.children] });
        if (step < actions.length) actions[step++](nodes);
        return view;
      }
      const html = renderToString(React.createElement(MemoryRouter, null,
        React.createElement(AdminSessionContext.Provider, { value: { role, isSuperAdmin: role === 'super_admin', currentAdmin: { name: 'Admin' } } },
          React.createElement(ExerciseCards))));
      assert.deepEqual(observed.map(({ selectedIndex }) => selectedIndex), [0, 1, 1, 1, 1, 2, 3, 0, 3, 1]);
      assert.deepEqual(observed[1].rowIds, [11, 12], 'Drafts card shows the existing Draft list');
      for (const [offset, expected] of [[5, 21], [6, 31], [7, 1], [8, 31], [9, 11]]) {
        assert.deepEqual(observed[offset].rowIds, [expected]);
        assert.equal(observed[offset].search, 'Matching');
        assert.deepEqual(observed[offset].dates, ['10', currentYear], 'Card/tab clicks preserve month/year filters');
      }
      assert.ok(html.includes('Matching draft drive') && !html.includes('Other draft drive'));
      assert.ok(html.includes('sm:grid-cols-2 xl:grid-cols-4') && html.includes('flex shrink-0 items-center gap-2'), 'Existing responsive grid and nonwrapping icon/arrow group are preserved');
      assert.equal(calls.length, beforeCalls, 'Card/tab clicks do not issue API requests');
      assert.equal(JSON.stringify(cardItems), originalItems);

      const yearItems = [-1, 0, 1].map((offset, index) => ({ ...cardItems[0], id: 901 + index,
        title: 'Matching year record', donationDate: `${Number(currentYear) + offset}-10-01` }));
      yearItems.push({ ...cardItems[0], id: 904, title: 'Matching November record', donationDate: `${currentYear}-11-01` },
        { ...cardItems[0], id: 905, title: 'Unrelated October record', donationDate: `${currentYear}-10-01` });
      const yearObserved = [];
      const yearActions = [
        (nodes) => nodes.find((node) => node.type === 'select').props.onChange({ target: { value: '10' } }),
        (nodes) => nodes.find((node) => node.type === 'input' && node.props.type === 'search').props.onChange({ target: { value: 'Matching' } }),
        ...['Previous year', 'Next year', 'Next year', 'Previous year', 'All years', 'Next year'].map((label) =>
          (nodes) => nodes.find((node) => node.props['aria-label'] === label).props.onClick()),
        (nodes) => nodes.find((node) => node.type === 'button' && node.props.children === 'Clear').props.onClick(),
      ];
      let yearStep = 0;
      function ExerciseYear() {
        const view = AnnouncementsView({ remote: { ...cardRemote, items: yearItems } });
        const nodes = descendants(view);
        const selects = nodes.filter((node) => node.type === 'select');
        assert.equal(selects.length, 1, 'Only the existing month dropdown remains');
        assert.deepEqual(descendants(selects[0]).filter((node) => node.type === 'option').map((node) => node.props.value),
          ['all', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']);
        const group = nodes.find((node) => node.props['aria-label'] === 'Announcement year');
        assert.equal(group.props.role, 'group');
        assert.ok(group.props.className.includes('h-11') && group.props.className.includes('shrink-0'));
        const buttons = descendants(group).filter((node) => node.type === 'button');
        assert.deepEqual(buttons.map((node) => node.props['aria-label']), ['Previous year', 'All years', 'Next year']);
        assert.ok(buttons.every((node) => node.props.type === 'button' && node.props.className.includes('focus-visible:')));
        assert.ok(buttons[1].props.className.includes('w-24') && buttons[1].props.className.includes('text-center'), 'Fixed centered width avoids layout shift between All Years and a year');
        const body = nodes.find((node) => node.type === 'tbody');
        yearObserved.push({ year: buttons[1].props['aria-pressed'] ? 'all' : buttons[1].props.children,
          month: selects[0].props.value, search: nodes.find((node) => node.type === 'input' && node.props.type === 'search').props.value,
          ids: React.Children.toArray(body.props.children).map((row) => Number(row.key.match(/(\d+)$/)[1])) });
        if (yearStep < yearActions.length) yearActions[yearStep++](nodes);
        return view;
      }
      const yearHtml = renderToString(React.createElement(MemoryRouter, null,
        React.createElement(AdminSessionContext.Provider, { value: { role, isSuperAdmin: role === 'super_admin', currentAdmin: { name: 'Admin' } } },
          React.createElement(ExerciseYear))));
      assert.deepEqual(yearObserved.map((row) => row.year), ['all', 'all', 'all', String(Number(currentYear) - 1), currentYear,
        String(Number(currentYear) + 1), currentYear, 'all', String(Number(currentYear) + 1), 'all']);
      assert.deepEqual(yearObserved.map((row) => row.ids), [[901, 902, 903, 904, 905], [901, 902, 903, 905], [901, 902, 903],
        [901], [902], [903], [902], [901, 902, 903], [903], [901, 902, 903, 904, 905]]);
      for (const row of yearObserved.slice(2, -1)) {
        assert.equal(row.month, '10', 'Year changes preserve the month');
        assert.equal(row.search, 'Matching', 'Year changes preserve search');
      }
      assert.equal(yearObserved.at(-1).month, 'all');
      assert.equal(yearObserved.at(-1).search, '');
      assert.ok(yearHtml.includes('All Years') && yearHtml.includes('lucide-chevron-down') && yearHtml.includes('lucide-chevron-up'));
      assert.equal(calls.length, beforeCalls, 'Year controls remain client-side without new API requests');

    }
    const run = (operation) => operation('test-token');
    const list = createAnnouncements(run);
    assert.equal(list.getSnapshot().loading, true);
    assert.ok(render({ ...list.getSnapshot(), model: list }).includes('Loading page'));
    await list.load(); assert.deepEqual(list.getSnapshot().items, []);
    assert.ok(render({ ...list.getSnapshot(), model: list }).includes('No announcements found'));
    const draft = { title: 'Real API drive', description: '<script>plain text</script>', location: 'Dagupan',
      donationDate: '2026-10-01', expiresDate: '2026-10-01', notifyDonors: true };
    const form = createAnnouncements(run, 'create');
    const image = new File(['test-image'], 'image.png', { type: 'image/png' });
    const save = form.save(draft, image, 'draft');
    assert.equal(await form.save(draft, image, 'published'), false, 'Duplicate submission blocked');
    assert.equal(await save, true);
    assert.equal(form.getSnapshot().item.status, 'draft');
    assert.equal(calls.at(-1).body.get('image').name, 'image.png');
    await list.load();
    assert.equal(filterAnnouncements(list.getSnapshot().items, 'draft', 'API', '10', '2026').length, 1);
    assert.equal(filterAnnouncements(list.getSnapshot().items, 'draft', '', '09', 'all').length, 0);
    await list.action(1, 'publish'); assert.equal(list.getSnapshot().items[0].status, 'active');
    assert.ok(render({ ...list.getSnapshot(), model: list }).includes('Real API drive'));
    await list.action(1, 'draft'); assert.equal(list.getSnapshot().items[0].status, 'draft');
    const edit = createAnnouncements(run, '1'); await edit.load();
    assert.equal(edit.getSnapshot().item.title, draft.title);
    assert.equal(await edit.save({ ...draft, title: 'Edited drive' }, image, 'published'), true);
    assert.equal(calls.at(-1).body.get('_method'), 'PUT');
    assert.equal(edit.getSnapshot().item.expiresDate, '2026-10-01');
    await list.load(); await list.action(1, 'delete'); assert.equal(list.getSnapshot().items[0].status, 'deleted');
    await list.action(1, 'restore'); assert.equal(list.getSnapshot().items[0].status, 'draft');
    failure = Response.json({ message: 'Invalid', errors: { title: ['Enter a title.'] } }, { status: 422 });
    assert.equal(await form.save({ ...draft, title: '' }, null, 'draft'), false);
    assert.equal(form.getSnapshot().error, 'Enter a title.');
    failure = Response.json({ message: 'Internal detail' }, { status: 500 });
    await list.load(); assert.equal(list.getSnapshot().loading, false);
    assert.equal(list.getSnapshot().error, 'The server is unavailable. Please try again.');
    assert.ok(render({ ...list.getSnapshot(), model: list }).includes('role="alert"'));
    await list.load(); assert.equal(list.getSnapshot().error, '');
    let finish;
    const pending = createAnnouncements(() => new Promise((resolve) => { finish = resolve; }));
    const loading = pending.load(); pending.dispose(); finish([]); await loading;
    assert.equal(pending.getSnapshot().loading, true, 'Unmounted response ignored');
    console.log('Announcement checks passed: four-card/tab shortcuts for both roles, unchanged counts/data, preserved search/date filters, keyboard buttons/arrows/selected styling, no shortcut API calls, real transport, multipart image/create/edit, draft/publish/delete/restore, loading/errors, duplicate submits and stale responses.');
  } finally { globalThis.fetch = originalFetch; }
}
