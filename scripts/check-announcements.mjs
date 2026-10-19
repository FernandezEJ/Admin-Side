import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkAnnouncements(server) {
  const { createAnnouncements, filterAnnouncements } = await server.ssrLoadModule('/src/services/announcementsApi.js');
  const { AnnouncementsView } = await server.ssrLoadModule('/src/pages/Announcements.jsx');
  const { AnnouncementPopup, AnnouncementPopupView, JoinedParticipants, AnnouncementParticipants } = await server.ssrLoadModule('/src/pages/ViewAnnouncement.jsx');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const render = (remote) => renderToString(React.createElement(MemoryRouter, null,
    React.createElement(AdminSessionContext.Provider, { value: { role: 'admin', currentAdmin: { name: 'Admin' } } },
      React.createElement(AnnouncementsView, { remote }))));
  const originalFetch = globalThis.fetch;
  let records = [];
  const calls = [];
  let failure;
  const history = Array.from({ length: 21 }, (_, index) => ({ id: index + 1, status: index ? 'completed' : 'pending',
    joined_at: '2026-10-19T04:00:00Z', cancelled_at: null, donor: { id: index + 1, name: `Test donor ${index + 1}` } }));
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
      if (data.description_document) data.description_document = JSON.parse(data.description_document);
      assert.equal(data.points_reward, undefined);
      assert.equal(data.created_by, undefined);
      const id = Number(path.split('/').at(-1)) || records.length + 1;
      item = { ...data, id, status: data.status === 'published' ? 'active' : 'draft',
        expires_at: `${data.expires_at}T15:59:59Z`, published_at: data.status === 'published' ? '2026-09-27T05:00:00Z' : null,
        image_url: data.image ? 'http://api.test/storage/announcements/test.png' : null };
      records = [...records.filter((row) => row.id !== id), item];
    } else if (options.method === 'GET' && path.endsWith('/announcements')) {
      return Response.json({ data: records });
    } else if (options.method === 'GET' && path.endsWith('/participants')) {
      const page = Number(new URL(url).searchParams.get('page') || 1);
      return Response.json({ data: history.slice((page - 1) * 20, page * 20), meta: { current_page: page, last_page: 2, total: 21, per_page: 20 } });
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
    const descendants = (element) => !React.isValidElement(element) ? [] : [element, ...React.Children.toArray(element.props.children).flatMap(descendants)];
    for (const role of ['admin', 'super_admin']) {
      const items = ['active', 'draft', 'expired', 'deleted'].flatMap((status, index) => [
        { id: index * 10 + 1, status, title: 'Matching drive', location: 'Dagupan', donationDate: '2027-10-01' },
        { id: index * 10 + 2, status, title: 'Other drive', location: 'Manila', donationDate: '2023-11-01' },
      ]);
      const before = JSON.stringify(items), beforeCalls = calls.length, observed = [];
      const remote = { items, loading: false, error: '', busy: false, model: {} };
      const pick = (nodes, label) => nodes.find((node) => node.props['aria-label'] === label);
      const actions = [
        (nodes) => pick(nodes, 'Show Drafts announcements').props.onClick(),
        (nodes) => pick(nodes, 'Announcement month').props.onChange({ target: { value: '10' } }),
        (nodes) => pick(nodes, 'Announcement year').props.onChange({ target: { value: '2027' } }),
        (nodes) => nodes.find((node) => node.props.type === 'search').props.onChange({ target: { value: 'Matching' } }),
        (nodes) => pick(nodes, 'Show Expired announcements').props.onClick(),
        (nodes) => pick(nodes, 'Show Deleted announcements').props.onClick(),
        (nodes) => nodes.find((node) => node.type === 'button' && node.props.children === 'Clear Filters').props.onClick(),
        (nodes) => pick(nodes, 'Show Active announcements').props.onClick(),
        (nodes) => pick(nodes, 'Announcement year').props.onChange({ target: { value: '2023' } }),
      ];
      let step = 0;
      function Exercise() {
        const view = AnnouncementsView({ remote }), nodes = descendants(view);
        const cards = nodes.filter((node) => node.type === 'button' && node.props['aria-label']?.startsWith('Show '));
        assert.equal(cards.length, 4); assert.equal(cards.filter((node) => node.props['aria-pressed']).length, 1);
        assert.equal(nodes.filter((node) => node.type === 'button' && ['Active', 'Drafts', 'Expired', 'Deleted'].includes(node.props.children)).length, 0, 'No duplicate tabs');
        cards.forEach((card) => { assert.equal(card.props.type, 'button'); assert.ok(card.props.className.includes('focus-visible:')); assert.equal(descendants(card).find((node) => node.props.className?.includes('text-2xl')).props.children, 2); });
        const selects = nodes.filter((node) => node.type === 'select'); assert.equal(selects.length, 2);
        assert.deepEqual(descendants(selects[1]).filter((node) => node.type === 'option').map((node) => node.props.value), ['all', '2027', '2023'], 'Year choices cover the entire dataset, independent of status/time/search');
        const body = nodes.find((node) => node.type === 'tbody');
        assert.equal(nodes.filter((node) => node.type === 'th').length, 5, 'Actions column removed');
        for (const row of React.Children.toArray(body.props.children)) {
          assert.equal(descendants(row).filter((node) => node.type === 'td').length, 5);
          assert.equal(descendants(row).filter((node) => node.type === 'button').length, 0, 'No table actions remain');
          assert.equal(row.props.tabIndex, 0);
          assert.equal(row.props['aria-haspopup'], 'dialog');
          assert.ok(row.props.className.includes('cursor-pointer') && row.props.className.includes('hover:') && row.props.className.includes('focus-visible:'));
        }
        observed.push({ status: cards.find((node) => node.props['aria-pressed']).props['aria-label'], month: selects[0].props.value, year: selects[1].props.value,
          search: nodes.find((node) => node.props.type === 'search').props.value,
          ids: React.Children.toArray(body.props.children).filter((row) => row.key?.match(/(\d+)$/)).map((row) => Number(row.key.match(/(\d+)$/)[1])) });
        if (step < actions.length) actions[step++](nodes);
        return view;
      }
      renderToString(React.createElement(MemoryRouter, null, React.createElement(AdminSessionContext.Provider, { value: { role, currentAdmin: { name: 'Admin' } } }, React.createElement(Exercise))));
      assert.deepEqual(observed.map((row) => row.ids), [[1, 2], [11, 12], [11], [11], [11], [21], [31], [31, 32], [1, 2], [2]]);
      assert.equal(observed[6].year, '2027'); assert.equal(observed[6].month, '10'); assert.equal(observed[6].search, 'Matching');
      assert.equal(observed[7].status, 'Show Deleted announcements'); assert.equal(observed[7].year, 'all'); assert.equal(observed[7].month, 'all'); assert.equal(observed[7].search, '');
      assert.equal(calls.length, beforeCalls); assert.equal(JSON.stringify(items), before);
      for (const status of ['active', 'draft', 'expired', 'deleted']) {
        const opened = [], keys = [], focused = [];
        let step = 0;
        const actions = [
          (row) => row.props.onClick({ target: { closest: () => null }, currentTarget: { focus: () => focused.push('click') } }),
          (_, popup) => { opened.push(popup.props.id); popup.props.onClose(); },
          (row) => { const target = { focus: () => focused.push('keyboard') }; row.props.onKeyDown({ target, currentTarget: target, key: 'Enter', preventDefault: () => keys.push('Enter') }); },
          (_, popup) => { opened.push(popup.props.id); popup.props.onClose(); },
          (row) => { const target = { focus: () => focused.push('keyboard') }; row.props.onKeyDown({ target, currentTarget: target, key: ' ', preventDefault: () => keys.push('Space') }); },
          (_, popup) => { opened.push(popup.props.id); popup.props.onClose(); },
        ];
        // The event's currentTarget is a focusable DOM row in the browser.
        function ExerciseRows() {
          const view = AnnouncementsView({ remote }), nodes = descendants(view);
          const row = nodes.find((node) => node.type === 'tbody').props.children[0];
          const popup = nodes.find((node) => node.type === AnnouncementPopup);
          assert.ok(row.props['aria-label'].includes('Matching drive'));
          if (step < actions.length) actions[step++](row, popup);
          else {
            assert.equal(popup, undefined);
            row.props.onClick({ target: { closest: () => ({ tagName: 'BUTTON' }) }, currentTarget: row });
            row.props.onKeyDown({ target: {}, currentTarget: row, key: 'Enter', preventDefault: () => assert.fail('Nested keyboard control') });
            row.props.onKeyDown({ target: row, currentTarget: row, key: 'Enter', repeat: true, preventDefault: () => assert.fail('Repeated activation') });
          }
          return view;
        }
        renderToString(React.createElement(MemoryRouter, { initialEntries: [{ pathname: '/announcements', state: { announcementFilters: { status, search: 'Matching', month: '10', year: '2027' } } }] },
          React.createElement(AdminSessionContext.Provider, { value: { role, currentAdmin: { name: 'Admin' } } }, React.createElement(ExerciseRows))));
        const id = items.find((item) => item.status === status).id;
        assert.deepEqual(opened, [id, id, id], 'Click, Enter and Space open the same popup for each status');
        assert.deepEqual(keys, ['Enter', 'Space']); assert.equal(focused.length, 3);
      }
    }
    const { validDocument, plainDocument, documentText, blankParagraph, announcementContentError } = await server.ssrLoadModule('/src/services/announcementContent.js');
    const { default: Body } = await server.ssrLoadModule('/src/components/announcements/AnnouncementBody.jsx');
    const { default: Editor } = await server.ssrLoadModule('/src/components/announcements/AnnouncementEditor.jsx');
    const rich = { version: 1, blocks: [{ type: 'paragraph', content: [{ text: 'Hello', bold: true, italic: true }] },
      { type: 'bullet_list', items: [[{ text: 'Bring ID' }]] }, { type: 'ordered_list', items: [[{ text: 'Register' }]] }] };
    assert.equal(validDocument(rich), true); assert.ok(documentText(rich).includes('Hello\n\n• Bring ID\n\n1. Register'));
    assert.equal(validDocument({ ...rich, html: '<script>' }), false); assert.equal(validDocument({ version: 1, blocks: [{ type: 'iframe', content: [] }] }), false);
    assert.equal(validDocument(plainDocument('old\n'.repeat(300))), true, 'Long legacy multiline records stay editable');
    const formatted = renderToString(React.createElement(Body, { announcement: { description: 'preview', description_document: rich } }));
    assert.ok(formatted.includes('font-bold italic') && formatted.includes('<ul') && formatted.includes('<ol'));
    const plain = renderToString(React.createElement(Body, { announcement: { description: '<script>alert(1)</script>\n**literal**' } }));
    assert.ok(plain.includes('&lt;script&gt;') && plain.includes('**literal**') && !plain.includes('<script>'));
    const toolbar = renderToString(React.createElement(Editor, { value: rich, onChange: () => {} }));
    for (const label of ['Bold', 'Italic', 'Bulleted list', 'Numbered list', 'Undo', 'Redo']) assert.ok(toolbar.includes('aria-label="' + label + '"'));
    assert.ok(toolbar.includes('announcement-editor') && toolbar.includes('data-invalid="false"'));
    const untouched = renderToString(React.createElement(Editor, { value: plainDocument(''), onChange: () => {} }));
    assert.ok(untouched.includes('aria-invalid="false"') && !untouched.includes('Enter an announcement description.'));
    const submitted = renderToString(React.createElement(Editor, { value: plainDocument(''), submitted: true, onChange: () => {} }));
    assert.ok(submitted.includes('data-invalid="true"') && submitted.includes('aria-invalid="true"') && submitted.includes('Enter an announcement description.'));
    assert.equal(announcementContentError(plainDocument(''), false), '');
    assert.equal(announcementContentError(plainDocument(''), true), 'Enter an announcement description.');
    assert.equal(announcementContentError(rich, true), '');
    assert.ok(announcementContentError(plainDocument('x'.repeat(10001))).includes('10,000'));
    const sample = { id: 9, title: 'Popup drive', location: 'Dagupan', description: 'preview', description_document: rich,
      image_url: 'https://example.test/image.png', donationDate: '2027-10-01', publishedDate: '2026-10-01', expiresDate: '2027-10-01' };
    const popupRemote = (status, extra = {}) => ({ item: { ...sample, status, scheduled_for_deletion_at: '2999-10-01' }, loading: false, busy: false, error: '', model: {}, ...extra });
    const popupHtml = (remote) => renderToString(React.createElement(AnnouncementPopupView, { remote, onClose: () => {}, onEdit: () => {}, onAction: () => {} }));
    for (const status of ['active', 'draft', 'expired']) {
      const html = popupHtml(popupRemote(status));
      assert.ok(html.includes('<dialog') && html.includes('View Announcement') && html.includes('announcement-popup'));
      assert.ok(html.includes('Popup drive') && html.includes('Dagupan') && html.includes('2027-10-01') && html.includes('2026-10-01'));
      assert.ok(html.includes('Edit Announcement') && html.includes('>Delete</button>'));
      assert.ok(html.includes('font-bold italic') && html.includes('<ul') && html.includes('<ol') && html.includes('image.png'));
    }
    const deletedHtml = popupHtml(popupRemote('deleted'));
    assert.ok(!deletedHtml.includes('Edit Announcement') && !deletedHtml.includes('>Delete</button>') && deletedHtml.includes('Restore Announcement'));
    assert.ok(popupHtml(popupRemote('deleted', { item: { ...sample, status: 'deleted', scheduled_for_deletion_at: '2000-01-01' } })).includes('disabled=""'));
    assert.ok(popupHtml(popupRemote('active', { error: 'Unable to delete.' })).includes('role="alert"'));
    assert.ok(popupHtml(popupRemote('active', { loading: true })).includes('Loading page'));
    assert.ok(popupHtml(popupRemote('active', { busy: true })).includes('Deleting...'));
    const summary = renderToString(React.createElement(JoinedParticipants, { announcement: { participants_count: 1, participants_preview: [{ id: 1, name: 'Saved donor name' }] }, onView: () => {} }));
    assert.ok(summary.includes('1 joined') && summary.includes('Saved donor name') && summary.includes('View Participants'));
    const zero = renderToString(React.createElement(JoinedParticipants, { announcement: { participants_count: 0, participants_preview: [] }, onView: () => {} }));
    assert.ok(zero.includes('0 joined') && zero.includes('View Participants') && !zero.includes('disabled=""'));
    assert.ok(renderToString(React.createElement(JoinedParticipants, { announcement: {} })).includes('Participant count unavailable'), 'Missing data never pretends to be zero');
    const historyHtml = renderToString(React.createElement(AnnouncementParticipants, { remote: { participants: [history[0], { ...history[1], status: 'cancelled' }],
      participantsMeta: { total: 21, current_page: 1, last_page: 2 }, model: {} } })).replace(/<!-- -->/g, '');
    assert.ok(historyHtml.includes('Test donor 1') && historyHtml.includes('Pending') && historyHtml.includes('Cancelled') && historyHtml.includes('Page 1 of 2'));
    const emptyHistory = renderToString(React.createElement(AnnouncementParticipants, { remote: { participants: [], participantsMeta: { total: 0, current_page: 1, last_page: 1 }, model: {} } }));
    assert.ok(emptyHistory.includes('No participants have joined'));
    const empty = { type: 'paragraph', content: [] }, paragraph = { type: 'paragraph', content: [{ text: 'Keep\nline breaks', bold: true }] };
    const compactText = renderToString(React.createElement(Body, { announcement: { description_document: { version: 1, blocks: [empty, paragraph, empty, paragraph, empty] } }, compact: true }));
    assert.equal((compactText.match(/<p(?:\s[^>]*)?>/g) || []).length, 3, 'Only empty edge placeholders removed; interior blank paragraph remains');
    assert.ok(compactText.includes('Keep\nline breaks'));
    const savedShape = { version: 1, blocks: [{ type: 'paragraph', content: [{ text: 'Heading', bold: true }] }, empty,
      { type: 'paragraph', content: [{ text: '\n', bold: true }] }, { type: 'paragraph', content: [{ text: 'First\nSecond', italic: true }] }] };
    const originalShape = JSON.stringify(savedShape);
    const shapeHtml = renderToString(React.createElement(Body, { announcement: { description_document: savedShape }, compact: true }));
    assert.equal((shapeHtml.match(/data-empty-paragraph="true"/g) || []).length, 2, 'Saved blank paragraphs are retained and identified for spacing');
    assert.ok(shapeHtml.includes('First\nSecond') && shapeHtml.includes('announcement-rich-text'));
    assert.equal(JSON.stringify(savedShape), originalShape, 'Rendering never rewrites saved content');
    assert.equal(blankParagraph(savedShape.blocks[2]), true);
    assert.equal(blankParagraph(savedShape.blocks[3]), false);
    const run = (operation) => operation('test-token');
    const list = createAnnouncements(run);
    assert.equal(list.getSnapshot().loading, true);
    assert.ok(render({ ...list.getSnapshot(), model: list }).includes('Loading page'));
    await list.load(); assert.deepEqual(list.getSnapshot().items, []);
    assert.ok(render({ ...list.getSnapshot(), model: list }).includes('No announcements found'));
    const draft = { title: 'Real API drive', description: documentText(rich), description_document: rich, location: 'Dagupan',
      donationDate: '2026-10-01', expiresDate: '2026-10-01', notifyDonors: true };
    const form = createAnnouncements(run, 'create');
    const image = new File(['test-image'], 'image.png', { type: 'image/png' });
    const save = form.save(draft, image, 'draft');
    assert.equal(await form.save(draft, image, 'published'), false, 'Duplicate submission blocked');
    assert.equal(await save, true);
    assert.equal(form.getSnapshot().item.status, 'draft');
    assert.deepEqual(JSON.parse(calls.at(-1).body.get('description_document')), rich);
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
    const detail = createAnnouncements(run, '1'); await detail.load();
    assert.equal(await detail.loadParticipants(), true);
    assert.equal(detail.getSnapshot().participants.length, 20);
    assert.equal(detail.getSnapshot().participantsMeta.total, 21);
    assert.equal(calls.at(-1).path, '/api/admin/announcements/1/participants');
    assert.equal(await detail.loadParticipants(2), true);
    assert.equal(detail.getSnapshot().participants.length, 1);
    assert.equal(detail.getSnapshot().participantsMeta.current_page, 2);
    failure = Response.json({ message: 'History unavailable.' }, { status: 503 });
    assert.equal(await detail.loadParticipants(), false);
    assert.ok(detail.getSnapshot().participantsError.includes('server'));
    failure = Response.json({ data: [] });
    assert.equal(await detail.loadParticipants(), false, 'Malformed data is not an honest empty history');
    assert.ok(detail.getSnapshot().participantsError.includes('participation history'));
    assert.equal(await detail.action(1, 'delete'), true);
    assert.equal(detail.getSnapshot().item.status, 'deleted', 'Popup detail action updates its own item');
    failure = Response.json({ message: 'Unable to restore.' }, { status: 409 });
    assert.equal(await detail.action(1, 'restore'), false);
    assert.equal(detail.getSnapshot().item.status, 'deleted');
    assert.equal(detail.getSnapshot().error, 'Unable to restore.');
    assert.equal(await detail.action(1, 'restore'), true);
    assert.equal(detail.getSnapshot().item.status, 'draft');
    let finishAction;
    const isolated = createAnnouncements(run, '9', { detail: async () => ({ ...sample, status: 'draft' }), action: () => new Promise((resolve) => { finishAction = resolve; }) });
    await isolated.load();
    const action = isolated.action(9, 'delete');
    assert.equal(await isolated.action(9, 'delete'), false, 'Duplicate popup mutation blocked');
    isolated.dispose(); finishAction({ ...sample, status: 'deleted' });
    assert.equal(await action, false, 'Disposed popup cannot report a successful mutation');
    assert.equal(isolated.getSnapshot().item.status, 'draft');
    let finishParticipants;
    const participantRequest = createAnnouncements(run, '9', { participants: () => new Promise((resolve) => { finishParticipants = resolve; }) });
    const pendingParticipants = participantRequest.loadParticipants();
    assert.equal(await participantRequest.loadParticipants(), false, 'Duplicate history request blocked');
    participantRequest.dispose(); finishParticipants({ data: history, meta: { total: 21 } });
    assert.equal(await pendingParticipants, false);
    assert.deepEqual(participantRequest.getSnapshot().participants, [], 'Late private history is ignored after closing');
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
    console.log('Announcement checks passed: five columns without table actions; row click/Enter/Space and nested/repeat guards for both roles/all statuses; centered popup details/rich text and legal Edit/Delete/Restore states; preserved cards/dropdowns/return filters; real transport, lifecycle, loading/errors, duplicate and stale mutations.');
  } finally { globalThis.fetch = originalFetch; }
}
