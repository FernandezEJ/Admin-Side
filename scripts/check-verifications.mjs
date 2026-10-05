import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkVerifications(server) {
  const { createVerifications, filterVerifications, verificationRow, VERIFICATION_STATUS_LABELS } = await server.ssrLoadModule('/src/services/verificationsApi.js');
  const { VerificationView } = await server.ssrLoadModule('/src/pages/Verification.jsx');
  const { VerificationDetailView } = await server.ssrLoadModule('/src/pages/VerificationDetail.jsx');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const render = (Component, remote) => renderToString(React.createElement(MemoryRouter, null,
    React.createElement(AdminSessionContext.Provider, { value: { role: 'admin', currentAdmin: { name: 'Reviewer' } } },
      React.createElement(Component, { remote }))));
  const originalFetch = globalThis.fetch;
  const record = { id: 9, status: 'for_verification', donor: { name: '<script>Donor</script>', email: 'donor@test.example', blood_type: 'O+' },
    opportunity: { title: 'Real API Drive', location: 'Dagupan', donation_date: '2026-10-01' },
    proof_uploaded_at: '2026-09-30T17:00:00Z', joined_at: '2026-09-29T10:00:00Z',
    proof: { name: 'certificate.png', mime_type: 'image/png', size: 80, version: 'a'.repeat(64) } };
  const unsubmitted = { ...record, id: 10, status: 'pending', donor: { ...record.donor, name: 'Unsubmitted Donor' },
    joined_at: '2024-01-01T00:00:00Z', proof_uploaded_at: null, proof: null };
  let records = [record, unsubmitted];
  let failure;
  let mime = 'image/png';
  const calls = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    const path = new URL(url).pathname;
    calls.push({ path, options });
    if (failure) { const response = failure; failure = null; return response; }
    if (path.endsWith('/proof')) return new Response('private bytes', { headers: { 'Content-Type': mime } });
    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      assert.equal(body.proof_version, 'a'.repeat(64));
      assert.equal(body.points, undefined);
      if (path.endsWith('/approve')) { record.status = 'completed'; record.completion = { points_awarded: 300, verified_at: '2026-10-01T01:00:00Z' }; }
      if (path.endsWith('/needs-revision')) { record.status = 'needs_revision'; record.revision_reason = body.reason; }
      if (path.endsWith('/reject')) { record.status = 'rejected'; record.rejection_reason = body.reason; }
    }
    return Response.json(path.endsWith('/verifications') ? { data: records } : { verification: record });
  };
  try {
    const statuses = ['for_verification', 'needs_revision', 'completed', 'rejected'];
    const labels = ['For Verification', 'Need Revision', 'Completed', 'Rejected'];
    const currentYear = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila', year: 'numeric' });
    assert.deepEqual(Object.entries(VERIFICATION_STATUS_LABELS), statuses.map((status, index) => [status, labels[index]]));
    const descendants = (element) => React.isValidElement(element)
      ? [element, ...React.Children.toArray(element.props.children).flatMap(descendants)] : [];
    const cardItems = statuses.flatMap((status, index) => Array.from({ length: index + 1 }, (_, row) => verificationRow({
      ...record, id: index * 10 + row + 1, status,
      donor: { ...record.donor, name: row === 0 ? `Matching ${status} donor` : `Other ${status} donor` },
      proof_uploaded_at: row === 0 ? `${currentYear}-09-30T17:00:00Z` : `${Number(currentYear) - 1}-11-01T00:00:00Z`,
    })));
    cardItems.push(verificationRow(unsubmitted));
    for (const role of ['admin', 'super_admin']) {
      const cardRemote = { items: cardItems, loading: false, error: '',
        model: { load: () => assert.fail('Card/tab shortcuts must not refetch records') } };
      const originalItems = JSON.stringify(cardItems);
      const beforeCalls = calls.length;
      const observed = [];
      const cardClick = (label) => (nodes) => nodes.find((node) => node.props['aria-label'] === `Show ${label} records`).props.onClick();
      const tabClick = (label) => (nodes) => nodes.find((node) => node.type === 'button' && node.props.children === label).props.onClick();
      const actions = [cardClick('Need Revision'),
        (nodes) => nodes.filter((node) => node.type === 'select')[0].props.onChange({ target: { value: '10' } }),
        (nodes) => { nodes.find((node) => node.props['aria-label'] === 'Previous year').props.onClick(); nodes.find((node) => node.props['aria-label'] === 'Next year').props.onClick(); },
        (nodes) => nodes.find((node) => node.type === 'input').props.onChange({ target: { value: 'Matching' } }),
        cardClick('Completed'), tabClick('Rejected'), cardClick('For Verification'), cardClick('Rejected'), tabClick('Need Revision')];
      let step = 0;
      // Exercise the actual handlers using React's render-phase state updates;
      // the component keeps its existing local tab and search/date state.
      function ExerciseCards() {
        const view = VerificationView({ remote: cardRemote });
        const nodes = descendants(view);
        const cards = nodes.filter((node) => node.type === 'button' && node.props['aria-label']?.startsWith('Show '));
        assert.equal(cards.length, 4);
        const selected = cards.filter((card) => card.props['aria-pressed']);
        assert.equal(selected.length, 1);
        const selectedIndex = cards.indexOf(selected[0]);
        const tabs = nodes.filter((node) => node.type === 'button' && labels.includes(node.props.children));
        assert.equal(tabs.length, 4);
        assert.ok(tabs[selectedIndex].props.className.includes('border-[#b7192e] text-[#b7192e]'), 'Cards and tabs use the same selected state');
        assert.ok(!nodes.some((node) => node.props.children === 'Pending' || node.props['aria-label']?.includes('Pending')));
        cards.forEach((card, index) => {
          assert.equal(card.props.type, 'button', 'Native buttons support keyboard activation');
          assert.equal(card.props['aria-label'], `Show ${labels[index]} records`);
          assert.ok(card.props.className.includes('cursor-pointer') && card.props.className.includes('hover:') && card.props.className.includes('focus-visible:'));
          assert.ok(card.props.className.includes(card.props['aria-pressed'] ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'));
          const content = descendants(card);
          assert.equal(content.find((node) => node.type === 'span' && node.props.className?.includes('text-2xl')).props.children, index + 1,
            'Each status count is distinct and unchanged by search/date filters or Pending records');
          assert.ok(content.some((node) => node.props.size === 16 && node.props['aria-hidden'] === 'true' && node.props.className.includes('shrink-0')), 'Small decorative arrow on every card');
        });
        const body = nodes.find((node) => node.type === 'tbody');
        observed.push({ selectedIndex, rowIds: React.Children.toArray(body.props.children).map((row) => Number(row.key.match(/(\d+)$/)[1])),
          search: nodes.find((node) => node.type === 'input').props.value,
          dates: [nodes.find((node) => node.type === 'select').props.value, nodes.find((node) => node.props['aria-label'] === 'All years').props['aria-pressed'] ? 'all' : nodes.find((node) => node.props['aria-label'] === 'All years').props.children] });
        if (step < actions.length) actions[step++](nodes);
        return view;
      }
      const html = renderToString(React.createElement(MemoryRouter, null,
        React.createElement(AdminSessionContext.Provider, { value: { role, isSuperAdmin: role === 'super_admin', currentAdmin: { name: 'Reviewer' } } },
          React.createElement(ExerciseCards))));
      assert.deepEqual(observed.map(({ selectedIndex }) => selectedIndex), [0, 1, 1, 1, 1, 2, 3, 0, 3, 1]);
      assert.deepEqual(observed[1].rowIds, [11, 12]);
      for (const [offset, expected] of [[5, 21], [6, 31], [7, 1], [8, 31], [9, 11]]) {
        assert.deepEqual(observed[offset].rowIds, [expected]);
        assert.equal(observed[offset].search, 'Matching');
        assert.deepEqual(observed[offset].dates, ['10', currentYear], 'Card/tab clicks preserve search/month/year filters');
      }
      assert.ok(!html.includes('Pending') && !html.includes('Unsubmitted Donor'));
      assert.ok(html.includes('Matching needs_revision donor') && !html.includes('Other needs_revision donor'));
      assert.ok(html.includes('md:grid-cols-2 xl:grid-cols-4') && html.includes('flex shrink-0 items-center gap-2') && html.includes('min-w-[640px] table-fixed'), 'Four-card grid, nonwrapping arrows and original table sizing remain intact');
      assert.equal(calls.length, beforeCalls);
      assert.equal(JSON.stringify(cardItems), originalItems, 'UI filtering does not remove Pending from fetched data');

      const yearItems = [-1, 0, 1].map((offset, index) => ({ ...cardItems[0], id: 901 + index,
        donor: 'Matching year record', submittedDate: `${Number(currentYear) + offset}-10-01` }));
      yearItems.push({ ...cardItems[0], id: 904, donor: 'Matching November record', submittedDate: `${currentYear}-11-01` },
        { ...cardItems[0], id: 905, donor: 'Unrelated October record', submittedDate: `${currentYear}-10-01` });
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
        const view = VerificationView({ remote: { ...cardRemote, items: yearItems } });
        const nodes = descendants(view);
        const selects = nodes.filter((node) => node.type === 'select');
        assert.equal(selects.length, 1, 'Only the existing month dropdown remains');
        assert.deepEqual(descendants(selects[0]).filter((node) => node.type === 'option').map((node) => node.props.value),
          ['all', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']);
        const group = nodes.find((node) => node.props['aria-label'] === 'Verification year');
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

      const pendingDetail = render(VerificationDetailView, { ...cardRemote, item: unsubmitted, proofType: '' });
      assert.ok(pendingDetail.includes('No verification record to review') && pendingDetail.includes('Back to Verification'));
      assert.ok(!pendingDetail.includes('Pending') && !pendingDetail.includes('Unsubmitted Donor') && !pendingDetail.includes('Open Proof') && !pendingDetail.includes('>Approve</button>'));
    }
    const urls = { created: [], revoked: [], createObjectURL(blob) { this.created.push(blob); return `blob:proof-${this.created.length}`; }, revokeObjectURL(url) { this.revoked.push(url); } };
    const run = (operation) => operation('test-token');
    const list = createVerifications(run);
    assert.ok(render(VerificationView, { ...list.getSnapshot(), model: list }).includes('Loading page'));
    await list.load();
    let html = render(VerificationView, { ...list.getSnapshot(), model: list });
    for (const label of ['For Verification', 'Need Revision', 'Completed', 'Rejected', 'View']) assert.ok(html.includes(label));
    assert.ok(!html.includes('Pending') && !html.includes('Unsubmitted Donor') && !html.includes('value="2024"'));
    assert.equal(list.getSnapshot().items.find((item) => item.id === unsubmitted.id).status, 'pending', 'Backend Pending lifecycle data is preserved');
    assert.ok(!html.includes('<script>Donor</script>'));
    assert.ok(!html.includes('certificate.png'), 'No proof in list');
    assert.equal(filterVerifications(list.getSnapshot().items, 'for_verification', 'dagupan', '10', '2026').length, 0);
    assert.equal(filterVerifications(list.getSnapshot().items, 'for_verification', 'drive', '10', '2026').length, 1);
    const detail = createVerifications(run, '9', undefined, urls);
    await detail.load();
    html = render(VerificationDetailView, { ...detail.getSnapshot(), model: detail });
    assert.ok(html.includes('Open Proof') && html.includes('Approve'));
    assert.ok(!html.includes('test-token'));
    await detail.openProof();
    html = render(VerificationDetailView, { ...detail.getSnapshot(), model: detail });
    assert.ok(html.includes('blob:proof-1') && html.includes('Submitted donation proof'));
    mime = 'application/pdf'; await detail.openProof();
    assert.deepEqual(urls.revoked, ['blob:proof-1']);
    html = render(VerificationDetailView, { ...detail.getSnapshot(), model: detail });
    assert.ok(html.includes('Open PDF') && html.includes('noopener noreferrer'));
    mime = 'text/html'; await detail.openProof();
    assert.equal(detail.getSnapshot().proofUrl, '');
    assert.match(detail.getSnapshot().proofError, /format/);
    mime = 'image/png';
    assert.equal(await detail.review('needs-revision', ' '), false);
    const review = detail.review('needs-revision', '  Clearer image please.  ');
    assert.equal(await detail.review('approve'), false, 'Duplicate submit blocked');
    assert.equal(await review, true);
    assert.equal(detail.getSnapshot().item.revision_reason, 'Clearer image please.');
    await list.load(); assert.equal(filterVerifications(list.getSnapshot().items, 'needs_revision', '', 'all', 'all').length, 1);
    record.status = 'for_verification'; record.revision_reason = null; await detail.load();
    failure = Response.json({ message: 'The proof changed. Refresh.' }, { status: 409 });
    assert.equal(await detail.review('approve'), false);
    assert.match(detail.getSnapshot().error, /proof changed/);
    assert.equal(await detail.review('approve'), true);
    html = render(VerificationDetailView, { ...detail.getSnapshot(), model: detail });
    assert.ok(html.includes('300') && html.includes('points awarded'));
    assert.ok(!html.includes('>Approve</button>'));
    assert.equal(await detail.review('approve'), false);
    record.status = 'for_verification'; record.completion = null; await detail.load();
    assert.equal(await detail.review('reject', 'Invalid certificate.'), true);
    html = render(VerificationDetailView, { ...detail.getSnapshot(), model: detail });
    assert.ok(html.includes('Invalid certificate.') && html.includes('read-only'));
    await detail.openProof(); const last = detail.getSnapshot().proofUrl; detail.dispose();
    assert.ok(urls.revoked.includes(last)); assert.equal(detail.getSnapshot().proofUrl, '');
    failure = Response.json({ message: 'Private internal error' }, { status: 500 }); await list.load();
    assert.ok(render(VerificationView, { ...list.getSnapshot(), model: list }).includes('role="alert"'));
    records = [unsubmitted]; await list.load();
    html = render(VerificationView, { ...list.getSnapshot(), model: list });
    assert.ok(html.includes('No verification records found') && !html.includes('Pending') && !html.includes('Unsubmitted Donor'), 'Pending-only responses yield an empty review list');
    records = []; await list.load();
    assert.ok(render(VerificationView, { ...list.getSnapshot(), model: list }).includes('No verification records found'));
    assert.ok(calls.some(({ path }) => path.endsWith('/needs-revision')));
    console.log('Verification checks passed: four-card/tab shortcuts for both roles, Pending hidden from UI and retained in fetched lifecycle data, distinct counts, preserved search/date filters, arrows/selected state, no shortcut API calls, private image/PDF, URL cleanup, decisions, duplicate/stale reviews, state movement and loading/error/empty rendering.');
  } finally { globalThis.fetch = originalFetch; }
}
