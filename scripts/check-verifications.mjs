import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export async function checkVerifications(server) {
  const { createVerifications, filterVerifications, verificationRow, VERIFICATION_STATUS_LABELS } = await server.ssrLoadModule('/src/services/verificationsApi.js');
  const { VerificationView } = await server.ssrLoadModule('/src/pages/Verification.jsx');
  const { VerificationDetailView } = await server.ssrLoadModule('/src/pages/VerificationDetail.jsx');
  const { default: VerificationReviewDrawer, VerificationReviewPanel, VerificationProofViewer } = await server.ssrLoadModule('/src/components/verification/VerificationReviewDrawer.jsx');
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
        model: { load: () => assert.fail('Status cards must not refetch records') } };
      const originalItems = JSON.stringify(cardItems);
      const beforeCalls = calls.length;
      const observed = [];
      const cardClick = (label) => (nodes) => nodes.find((node) => node.props['aria-label'] === `Show ${label} records`).props.onClick();
      const actions = [cardClick('Need Revision'),
        (nodes) => nodes.filter((node) => node.type === 'select')[0].props.onChange({ target: { value: '10' } }),
        (nodes) => { nodes.find((node) => node.props['aria-label'] === 'Previous year').props.onClick(); nodes.find((node) => node.props['aria-label'] === 'Next year').props.onClick(); },
        (nodes) => nodes.find((node) => node.type === 'input').props.onChange({ target: { value: 'Matching' } }),
        cardClick('Completed'), cardClick('Rejected'), cardClick('For Verification'), cardClick('Rejected'), cardClick('Need Revision')];
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
        assert.equal(tabs.length, 0, 'No duplicate text status tabs');
        assert.equal(nodes.filter(node => node.props['aria-label'] === 'Verification status').length, 1);
        assert.ok(!nodes.some((node) => node.props.children === 'Pending' || node.props['aria-label']?.includes('Pending')));
        cards.forEach((card, index) => {
          assert.equal(card.props.type, 'button', 'Native buttons support keyboard activation');
          assert.equal(card.props['aria-label'], `Show ${labels[index]} records`);
          assert.ok(card.props.className.includes('cursor-pointer') && card.props.className.includes('hover:') && card.props.className.includes('focus-visible:'));
          assert.ok(card.props.className.includes(card.props['aria-pressed'] ? 'border-primary bg-selected' : 'border-gray-200 bg-white'));
          const content = descendants(card);
          assert.equal(content.find((node) => node.type === 'span' && node.props.className?.includes('text-2xl')).props.children, index + 1,
            'Each status count is distinct and unchanged by search/date filters or Pending records');
          assert.ok(content.some((node) => node.props.size === 18 && node.props['aria-hidden'] === 'true' && node.props.className.includes('shrink-0')), 'Small decorative chevron on every card');
          const indicator = content.find(node => node.props.className?.includes('lf-icon-badge'));
          assert.ok(indicator.props.className.includes(index === 2 ? 'text-success-foreground' : index === 3 ? 'text-danger-foreground' : 'text-warning-foreground'), 'Status indicators retain their semantic colors');
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
        assert.deepEqual(observed[offset].dates, ['10', currentYear], 'Card clicks preserve search/month/year filters');
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
    for (const label of ['For Verification', 'Need Revision', 'Completed', 'Rejected']) assert.ok(html.includes(label));
    assert.ok(!html.includes('View verification for') && !html.includes('Actions'));
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
    assert.ok(html.includes('No requests in this status') && !html.includes('Pending') && !html.includes('Unsubmitted Donor'), 'Pending-only responses yield an empty review list');
    records = []; await list.load();
    assert.ok(render(VerificationView, { ...list.getSnapshot(), model: list }).includes('No requests in this status'));
    assert.ok(calls.some(({ path }) => path.endsWith('/needs-revision')));
    // Rows open a panel in place. Closing and successful decisions keep filters;
    // only a successful decision requests a fresh list/status-card snapshot.
    for (const role of ['admin', 'super_admin']) for (const status of statuses) for (const key of ['click', 'Enter', ' ']) {
      let phase = 0, refreshes = 0, focuses = 0, prevented = 0;
      const checkedRow = verificationRow({ ...record, status, proof_uploaded_at: `${currentYear}-09-30T17:00:00Z`, donor: { ...record.donor, name: 'Matching drawer donor' } });
      const checked = { items: [checkedRow, { ...checkedRow, id: 19 }], loading: false, error: '', model: { load() { refreshes++; } } };
      function ExerciseRow() {
        const view = VerificationView({ remote: checked });
        const nodes = descendants(view);
        const cleared = phase === 6;
        const search = nodes.find((node) => node.type === 'input');
        const drawer = nodes.find((node) => node.type === VerificationReviewDrawer);
        const rows = nodes.filter((node) => node.type === 'tr' && node.props.tabIndex === 0);
        const headers = nodes.filter((node) => node.type === 'th');
        assert.deepEqual(headers.map(node => node.props.children.trim()), ['Donor', 'Blood Type', 'Donation Event', 'Submitted', 'Status']);
        assert.equal(nodes.filter((node) => node.type === VerificationReviewDrawer).length, drawer ? 1 : 0);
        for (const row of rows) {
          const children = descendants(row);
          assert.equal(children.filter(node => node.type === 'td').length, 5);
          assert.equal(children.filter(node => node.type === 'button' || node.type === 'a').length, 0, 'The row is the single review target');
          assert.ok(row.props.className.includes('hover:bg-primary-soft') && row.props.className.includes('focus-visible:'));
          const indicators = children.filter(node => node.props.size === 17);
          assert.equal(indicators.length, 1, 'Exactly one decorative chevron per record');
          assert.equal(indicators[0].props['aria-hidden'], 'true');
          assert.ok(indicators[0].props.className.includes('shrink-0'));
        }
        if (phase === 0) {
          phase++; search.props.onChange({ target: { value: 'Matching' } });
          nodes.find(node => node.props['aria-label'] === `Show ${VERIFICATION_STATUS_LABELS[status]} records`).props.onClick();
          nodes.find(node => node.type === 'select').props.onChange({ target: { value: '10' } });
          nodes.find(node => node.props['aria-label'] === 'Previous year').props.onClick();
          nodes.find(node => node.props['aria-label'] === 'Next year').props.onClick();
        }
        else if (phase === 1) {
          phase++; const row = rows[0];
          assert.equal(row.props['aria-haspopup'], 'dialog'); assert.match(row.props['aria-label'], /Matching drawer donor/);
          const rowTarget = { focus() { focuses++; }, closest() { return null; } };
          const buttonTarget = { closest() { return { tagName: 'BUTTON' }; } };
          // Defensive nested-control guards stay even though the row has no buttons.
          row.props.onKeyDown({ key: 'Enter', target: buttonTarget, currentTarget: rowTarget, preventDefault() { assert.fail('Do not cancel native button keyboard activation'); } });
          row.props.onKeyDown({ key: ' ', target: buttonTarget, currentTarget: rowTarget, preventDefault() { assert.fail('Do not cancel native button keyboard activation'); } });
          row.props.onClick({ target: buttonTarget, currentTarget: rowTarget }); assert.equal(focuses, 0);
          row.props.onKeyDown({ key: 'Enter', target: rowTarget, currentTarget: rowTarget, repeat: true, preventDefault() { assert.fail('Held key must not reopen review'); } });
          assert.equal(focuses, 0);
          const event = { key, target: rowTarget, currentTarget: rowTarget, preventDefault() { prevented++; } };
          if (key === 'click') row.props.onClick(event);
          else row.props.onKeyDown(event);
          row.props.onClick({ target: rowTarget, currentTarget: { focus() { assert.fail('Rapid duplicate activation must not refocus/reopen'); } } });
          rows[1].props.onClick({ target: rowTarget, currentTarget: { focus() { assert.fail('Another record must not replace an open review'); } } });
        } else if (phase === 2) { phase++; assert.equal(drawer.props.id, 9); assert.equal(search.props.value, 'Matching'); assert.equal(drawer.props.fallbackFocusRef, nodes.find(node => node.props['aria-label'] === 'Verification records').props.ref); drawer.props.onClose(); }
        else if (phase === 3) { phase++; assert.ok(!drawer); assert.equal(refreshes, 0); rows[0].props.onClick({ target: { closest() { return null; } }, currentTarget: { focus() {} } }); }
        else if (phase === 4) { phase++; drawer.props.onDecision(); }
        else if (phase === 5) { phase++; assert.ok(!drawer); assert.equal(refreshes, 1); nodes.find(node => node.type === 'button' && node.props.children === 'Clear').props.onClick(); }
        else { assert.ok(!drawer); assert.equal(refreshes, 1); assert.equal(search.props.value, ''); }
        if (phase >= 2) {
          assert.equal(search.props.value, cleared ? '' : 'Matching');
          assert.equal(nodes.find(node => node.type === 'select').props.value, cleared ? 'all' : '10');
          assert.equal(nodes.find(node => node.props['aria-label'] === 'All years').props.children, cleared ? 'All Years' : currentYear);
          assert.equal(nodes.find(node => node.props['aria-label'] === `Show ${VERIFICATION_STATUS_LABELS[status]} records`).props['aria-pressed'], true);
        }
        return view;
      }
      const rowHtml = renderToString(React.createElement(MemoryRouter, null, React.createElement(AdminSessionContext.Provider,
        { value: { role, currentAdmin: { name: 'Reviewer' } } }, React.createElement(ExerciseRow))));
      const renderedBody = rowHtml.match(/<tbody>[\s\S]*?<\/tbody>/u)[0];
      assert.equal((renderedBody.match(/<svg\b/g) ?? []).length, 2);
      assert.equal((renderedBody.match(/class="[^"]*lucide-chevron-right[^"]*"/g) ?? []).length, 2);
      assert.equal(focuses, 1); assert.equal(prevented, key === 'click' ? 0 : 1);
    }
    const submitted = { ...record, status: 'for_verification', revision_reason: null, rejection_reason: null, completion: null };
    const drawerRemote = { item: submitted, loading: false, busy: false, error: '', proofUrl: 'blob:secure-proof', proofType: 'image/png', proofLoading: false, proofError: '', model: { openProof() {}, load() {} } };
    html = renderToString(React.createElement(VerificationReviewPanel, { remote: drawerRemote, onClose() {}, onDecision() {} }));
    for (const label of ['Verification Review', 'Donor Information', 'Donation Information', 'Submitted Proof', 'Real API Drive', 'Dagupan', 'certificate.png', 'Rotate proof', 'Zoom proof', 'Needs Revision', 'Reject Permanently', 'Approve']) assert.ok(html.includes(label), label);
    assert.ok(!html.includes('Confirm arrangements') && !html.includes('/storage/'));
    assert.ok(html.indexOf('Submitted Proof') < html.indexOf('Donor Information') && html.indexOf('Donor Information') < html.indexOf('Donation Information'));
    assert.ok(html.includes('verification-review-modal') && html.includes('verification-review-grid') && html.includes('verification-review-information'));
    assert.ok(html.indexOf('Needs Revision') < html.indexOf('Reject Permanently') && html.indexOf('Reject Permanently') < html.indexOf('Approve'));
    for (const status of ['completed', 'rejected', 'needs_revision', 'pending']) {
      const page = renderToString(React.createElement(VerificationReviewPanel, { remote: { ...drawerRemote, item: { ...submitted, status } }, onClose() {} }));
      assert.ok(!page.includes('verification-decision-approve') && !page.includes('verification-decision-reject'));
      assert.ok(page.includes('read-only') || page.includes('Waiting for replacement'));
    }
    const absent = renderToString(React.createElement(VerificationReviewPanel, { remote: { ...drawerRemote, item: { ...submitted, donor: null, opportunity: null, proof: null }, proofUrl: '' }, onClose() {} }));
    assert.ok(absent.includes('Unavailable donor') && absent.includes('No proof has been submitted') && !absent.includes('Confirm arrangements'));
    for (const action of ['approve', 'needs-revision', 'reject']) {
      let phase = 0, form, panel, posted = 0, decision = 0, finish;
      const checkedRemote = { ...drawerRemote, model: { ...drawerRemote.model, getSnapshot: () => ({ item: submitted }), review: (receivedAction, reason) => {
        posted++; assert.equal(receivedAction, action); if (action !== 'approve') assert.equal(reason, 'Clearer proof required');
        return new Promise((resolve) => { finish = resolve; });
      } } };
      function ExerciseConfirmation() {
        panel = VerificationReviewPanel({ remote: checkedRemote, onClose() {}, onDecision() { decision++; } });
        const nodes = descendants(panel);
        if (phase === 0) {
          phase++;
          nodes.find((node) => node.type === 'button' && node.props.className === `verification-decision-${action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'revision'}`).props.onClick();
        } else if (phase === 1 && action !== 'approve') {
          phase++; nodes.find((node) => node.type === 'textarea').props.onChange({ target: { value: 'Clearer proof required' } });
        } else {
          form = nodes.find((node) => node.type === 'form');
          assert.ok(form); assert.equal(panel.props.locked, true);
          const confirm = nodes.find((node) => node.type === 'button' && node.props.type === 'submit');
          assert.ok(confirm.props.className.includes(`bg-${action === 'approve' ? 'success' : action === 'needs-revision' ? 'warning' : 'danger'} `));
          if (action !== 'approve') assert.equal(nodes.find((node) => node.type === 'textarea').props.required, true);
        }
        return panel;
      }
      renderToString(React.createElement(ExerciseConfirmation));
      assert.equal(posted, 0, 'Opening the confirmation does not submit');
      const first = form.props.onSubmit({ preventDefault() {} });
      await form.props.onSubmit({ preventDefault() {} }); assert.equal(posted, 1); assert.equal(decision, 0);
      finish(false); await first; assert.equal(decision, 0, 'Failed decisions keep the panel open');
      const retry = form.props.onSubmit({ preventDefault() {} }); finish(true); await retry; assert.equal(decision, 1);
    }
    // Zoom/rotate affect only the private image view, never its URL or backend.
    let proofPhase = 0;
    function ExerciseProof() {
      const view = VerificationProofViewer({ url: 'blob:secure-proof', type: 'image/png', name: 'proof.png' });
      const nodes = descendants(view), image = nodes.find((node) => node.type === 'img');
      if (proofPhase === 0) { proofPhase++; image.props.onLoad({ currentTarget: { naturalWidth: 600, naturalHeight: 900 } }); }
      else if (proofPhase === 1) { proofPhase++; nodes.find((node) => node.props['aria-label'] === 'Rotate proof').props.onClick(); }
      else if (proofPhase === 2) { proofPhase++; nodes.find((node) => node.props['aria-label'] === 'Zoom proof').props.onClick(); }
      else { assert.ok(image.props.style.transform.includes('90deg')); assert.equal(image.props.src, 'blob:secure-proof'); assert.equal(nodes.find((node) => node.props.className === 'verification-proof-stage').props.style.width, '150%'); }
      return view;
    }
    renderToString(React.createElement(ExerciseProof));
    const pdf = renderToString(React.createElement(VerificationProofViewer, { url: 'blob:pdf-proof', type: 'application/pdf', name: 'proof.pdf' }));
    assert.ok(pdf.includes('<iframe') && pdf.includes('Open PDF') && pdf.includes('noopener noreferrer'));
    // In-flight detail, proof and review requests are discarded after close/switch.
    let finishDetail, finishProof, finishReview;
    const raceUrls = { created: [], revoked: [], createObjectURL() { this.created.push('blob:race'); return 'blob:race'; }, revokeObjectURL(url) { this.revoked.push(url); } };
    const delayedApi = { detail: async () => submitted, proof: () => new Promise((resolve) => { finishProof = resolve; }), review: () => new Promise((resolve) => { finishReview = resolve; }) };
    const race = createVerifications(run, '9', delayedApi, raceUrls); await race.load();
    const proofRequest = race.openProof(); race.dispose(); finishProof(new Blob(['bytes'], { type: 'image/png' })); await proofRequest;
    assert.equal(raceUrls.created.length, 0); assert.equal(race.getSnapshot().proofUrl, '');
    await race.load(); const reviewRequest = race.review('approve'); race.dispose(); const afterClose = race.getSnapshot();
    finishReview({ ...submitted, status: 'completed' }); assert.equal(await reviewRequest, false); assert.equal(race.getSnapshot(), afterClose);
    delayedApi.detail = () => new Promise((resolve) => { finishDetail = resolve; });
    const detailRequest = race.load(); race.dispose(); const afterSwitch = race.getSnapshot(); finishDetail(submitted); await detailRequest;
    assert.equal(race.getSnapshot(), afterSwitch);
    // Failed conflict refresh must remove the old proof/version and prevent review.
    let detailReads = 0;
    const conflict = createVerifications(run, '9', { detail: async () => { if (++detailReads > 1) throw new Error('Offline'); return submitted; },
      review: async () => { throw Object.assign(new Error('The proof changed. Refresh.'), { status: 409 }); } }, raceUrls);
    await conflict.load(); assert.equal(await conflict.review('approve'), false);
    assert.equal(conflict.getSnapshot().item, null); assert.equal(await conflict.review('approve'), false);
    for (const status of [401, 403, 422, 429, 503, 0]) {
      const failedReview = createVerifications(run, '9', { detail: async () => submitted,
        review: async () => { throw Object.assign(new Error(status ? `Review failed (${status})` : 'Offline'), { status, ...(status === 422 ? { errors: { reason: ['Check the reason.'] } } : {}) }); } }, raceUrls);
      await failedReview.load();
      assert.equal(await failedReview.review('approve'), false);
      assert.equal(failedReview.getSnapshot().item, submitted, 'An unsuccessful decision retains the current record');
      assert.equal(failedReview.getSnapshot().busy, false);
      assert.match(failedReview.getSnapshot().error, status === 422 ? /Check the reason/ : status ? /Review failed/ : /Offline/);
      failedReview.dispose();
    }
    const partialReview = createVerifications(run, '9', { detail: async () => submitted, review: async () => ({}) }, raceUrls);
    await partialReview.load(); assert.equal(await partialReview.review('approve'), false); assert.match(partialReview.getSnapshot().error, /incomplete/);
    const css = readFileSync('src/styles/verification-review.css', 'utf8');
    for (const value of ['width: min(1080px, calc(100vw - 48px))', 'margin: auto', 'inset: 0;', 'grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr)', 'overflow-y: auto', '::backdrop', '.verification-review-footer', 'flex: none', '@media (max-width: 720px)', '@media (max-width: 479px)']) assert.ok(css.includes(value), value);
    assert.ok(!css.includes('inset: 0 0 0 auto') && !css.includes('clamp(354px'));
    console.log('Verification checks passed: four count/status cards without duplicate tabs; five-column row-only table with one chevron per record; click/Enter/Space for both roles/all statuses, repeat/nested/duplicate guards and retained search/month/year after close/decision; unchanged centered review, private image/PDF/zoom/rotate/Blob cleanup, confirmations/reasons/duplicate-submit guards, refresh/errors/stale-version recovery and deep links.');
  } finally { globalThis.fetch = originalFetch; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { middlewareMode: true } });
  try { await checkVerifications(server); } finally { await server.close(); }
}
