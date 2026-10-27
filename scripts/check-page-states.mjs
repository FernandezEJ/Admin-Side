import assert from 'node:assert/strict';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkPageStates(server) {
  const { PageSkeleton, LoadingNotice, ErrorState } = await server.ssrLoadModule('/src/components/ui/PageState.jsx');
  const { watchSlowRequest, readErrorFeedback } = await server.ssrLoadModule('/src/services/readFeedback.js');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const render = (component, props, role = 'admin') => renderToString(React.createElement(MemoryRouter, null,
    React.createElement(AdminSessionContext.Provider, { value: { role, isSuperAdmin: role === 'super_admin', currentAdmin: { name: 'Reviewer' } } }, React.createElement(component, props))));
  const deferred = () => { let resolve, reject;const promise = new Promise((a, b) => { resolve = a;reject = b; });return { promise, resolve, reject }; };
  const run = operation => operation('test-only');
  const nodes = element => !React.isValidElement(element) ? [] : [element, ...React.Children.toArray(element.props.children).flatMap(nodes)];
  for (const variant of ['table', 'gallery', 'dashboard', 'report', 'detail', 'form', 'permanent', 'chart']) {
    const html = render(PageSkeleton, { variant });
    assert.ok(html.includes(`data-skeleton="${variant}"`) && html.includes('aria-busy="true"') && html.includes('aria-hidden="true"'));
    assert.ok(html.includes('motion-safe:animate-pulse') && !html.includes('animate-spin'), 'Static placeholders when reduced motion is requested; no competing spinner');
  }
  assert.equal(render(LoadingNotice, { loading: false, hasData: true }), '');
  assert.ok(!render(LoadingNotice, { loading: true }).includes('taking longer'));
  // Exercise the exact timer used by the effect, including fast resolution and unmount cleanup.
  let now = 0, sequence = 0;const timers = new Map(), notices = [];
  const clock = { setTimeout(callback, delay) { const id = ++sequence;timers.set(id, { callback, at: now + delay });return id; }, clearTimeout(id) { timers.delete(id); } };
  const tick = ms => { now += ms;for (const [id, task] of timers) if (task.at <= now) { timers.delete(id);task.callback(); } };
  let cleanup = watchSlowRequest(true, value => notices.push(value), clock);
  tick(2999);assert.deepEqual(notices, [false]);tick(1);assert.deepEqual(notices, [false, true]);cleanup();
  cleanup = watchSlowRequest(false, value => notices.push(value), clock);assert.equal(notices.at(-1), false);assert.equal(timers.size, 0);cleanup();
  cleanup = watchSlowRequest(true, value => notices.push(value), clock);tick(100);cleanup();const before = notices.length;tick(4000);assert.equal(notices.length, before);
  for (const status of [401, 403, 404]) {
    const html = render(ErrorState, { status, description: 'Private server detail', onRetry() {} });
    assert.ok(!html.includes('Try again') && !html.includes('Private server detail'));
    assert.equal(readErrorFeedback(status, '').retry, false);
  }
  assert.ok(render(ErrorState, { status: 0, description: 'Unable to reach the server.', onRetry() {} }).includes('Connection Problem'));
  assert.ok(render(ErrorState, { status: 503, description: 'Private stack trace', onRetry() {} }).includes('Something went wrong on our side'));
  assert.ok(!render(ErrorState, { status: 503, description: 'Private stack trace' }).includes('Private stack trace'));
  for (const status of [409, 422]) assert.ok(render(ErrorState, { status, description: 'Please review this field.' }).includes('Please review this field.'));
  let retries = 0, retryPromise, attempted = false;const retryRequest = deferred();
  function RetryProbe() {
    const tree = ErrorState({ status: 503, description: 'Unavailable', onRetry: () => { retries++;return retryRequest.promise; } });
    const button = nodes(tree).find(node => node.type === 'button');
    if (!attempted) { attempted = true;retryPromise = button.props.onClick();void button.props.onClick(); }
    else assert.equal(button.props.disabled, true);
    return tree;
  }
  assert.ok(renderToString(React.createElement(RetryProbe)).includes('Retrying'));
  assert.equal(retries, 1);retryRequest.resolve();await retryPromise;

  const { createDonors } = await server.ssrLoadModule('/src/services/donorsApi.js');
  const { DonorsView } = await server.ssrLoadModule('/src/pages/Donors.jsx');
  const donorReply = page => ({ summary: { totalDonors: 21, eligible: 1, temporarilyIneligible: 0 }, bloodTypes: ['O+'], topDonors: [],
    donors: [{ id: page, name: `Donor page ${page}`, bloodType: 'O+', eligibility: 'eligible', joinedDate: null, achievement: 'New Donor', totalDonations: 0 }],
    pagination: { currentPage: page, lastPage: 2, perPage: 20, total: 21 } });
  let request = deferred();const requests = [];
  const donors = createDonors(run, { load: (_token, filters) => { requests.push({ page: filters.page, search: filters.searchTerm });return request.promise; } });
  const donorRemote = () => ({ remote: { ...donors.getSnapshot(), model: donors } });
  for (const role of ['admin', 'super_admin']) {
    const initial = render(DonorsView, donorRemote(), role);
    assert.ok(initial.includes('data-skeleton="table"') && !initial.includes('No donors registered') && !initial.includes('animate-spin'));
  }
  let pending = donors.load();void donors.load();assert.equal(requests.length, 1);request.resolve(donorReply(1));await pending;
  assert.ok(!render(DonorsView, donorRemote()).includes('data-skeleton') && render(DonorsView, donorRemote()).includes('Donor page 1'));
  request = deferred();pending = donors.setPage(2);assert.ok(render(DonorsView, donorRemote()).includes('Donor page 1'));
  request.reject(Object.assign(new Error('Unavailable'), { status: 503 }));await pending;
  let html = render(DonorsView, donorRemote());assert.ok(html.includes('Donor page 1') && html.includes('Something went wrong on our side') && !html.includes('No donors found'));
  assert.equal(donors.getSnapshot().page, 2, 'Requested page remains available to Retry');
  request = deferred();pending = donors.load();void donors.load();assert.deepEqual(requests.at(-1), { page: 2, search: '' });assert.equal(requests.length, 3);
  request.resolve(donorReply(2));await pending;assert.ok(render(DonorsView, donorRemote()).includes('Donor page 2'));
  const previous = deferred();request = previous;const stale = donors.setSearchTerm('old');request = deferred();pending = donors.setSearchTerm('current');
  request.resolve({ ...donorReply(1), donors: [] });await pending;previous.resolve(donorReply(2));await stale;
  assert.equal(donors.getSnapshot().searchTerm, 'current');assert.equal(donors.getSnapshot().data.donors.length, 0);
  assert.ok(render(DonorsView, donorRemote()).includes('No donors found'));
  request = deferred();pending = donors.load();donors.dispose();const disposed = donors.getSnapshot();request.resolve(donorReply(2));await pending;assert.equal(donors.getSnapshot(), disposed);

  const { createEducationalArticles } = await server.ssrLoadModule('/src/services/educationalArticlesApi.js');
  const { EducationalContentView } = await server.ssrLoadModule('/src/pages/EducationalContent.jsx');
  const article = { id: 1, title: 'Saved article', status: 'published', category: 'blood_basics', short_description: 'Helpful learning' };
  const articleReply = { data: [article], meta: { current_page: 1, last_page: 2, total: 21 }, counts: { published: 21 }, categories: {} };
  request = deferred();const educationReads = [];
  const education = createEducationalArticles(run, undefined, 'published', { list: (_token, filters) => { educationReads.push(filters);return request.promise; } });
  pending = education.load();request.resolve(articleReply);await pending;
  request = deferred();pending = education.load({ ...education.getSnapshot().filters, page: 2 });
  assert.equal(education.getSnapshot().meta, articleReply.meta);request.reject(Object.assign(new Error('Cannot connect'), { status: 0 }));await pending;
  html = render(EducationalContentView, { remote: { ...education.getSnapshot(), model: education } });assert.ok(html.includes('Saved article') && html.includes('Connection Problem') && !html.includes('data-skeleton'));
  request = deferred();pending = education.load();assert.equal(educationReads.at(-1).page, 2);request.resolve({ ...articleReply, data: [], meta: { ...articleReply.meta, total: 0 } });await pending;
  html = render(EducationalContentView, { remote: { ...education.getSnapshot(), model: education } });assert.ok(html.includes('No published articles yet'));
  request = deferred();pending = education.load({ ...education.getSnapshot().filters, search: 'unmatched' });request.resolve({ ...articleReply, data: [], meta: { ...articleReply.meta, total: 0 } });await pending;
  assert.ok(render(EducationalContentView, { remote: { ...education.getSnapshot(), model: education } }).includes('No articles match your filters'));education.dispose();

  // The same guarded safe-read contract across the remaining real API models.
  const factories = [
    ['announcementsApi', 'createAnnouncements', { list: [] }, 'items'],
    ['verificationsApi', 'createVerifications', { list: [] }, 'items'],
    ['auditLogsApi', 'createAuditLogs', { list: { data: [], modules: [], pagination: { currentPage: 1, lastPage: 1, total: 0 } } }, 'data'],
    ['adminManagementState', 'createAdminManagement', { list: { admins: [], summary: { total: 0, active: 0, deactivated: 0 } } }, 'admins'],
    ['dashboardApi', 'createDashboard', { load: { months: 6, donation_activity: [], stats: {} } }, 'data'],
    ['systemReportsApi', 'createSystemReports', { load: { period: '2026-10' } }, 'snapshot'],
    ['permanentPostApi', 'createPermanentPost', { read: { title: 'Permanent post' } }, 'item'],
  ];
  for (const [file, factory, replies, field] of factories) {
    const module = await server.ssrLoadModule(`/src/services/${file}.js`);let reads = 0;request = deferred();
    const api = Object.fromEntries(Object.keys(replies).map(key => [key, () => { reads++;return request.promise; }]));
    const model = ['createAnnouncements', 'createVerifications'].includes(factory) ? module[factory](run, undefined, api)
      : factory === 'createSystemReports' ? module[factory](run, api, { year: '2026', month: '10' }) : module[factory](run, api);
    pending = model.load();void model.load();assert.equal(reads, 1, `${factory} guards rapid read retries`);
    request.resolve(Object.values(replies)[0]);await pending;const cached = model.getSnapshot()[field];
    request = deferred();pending = model.load();request.reject(Object.assign(new Error('Unavailable'), { status: 503 }));await pending;
    assert.equal(model.getSnapshot()[field], cached, `${factory} preserves cached data`);
    assert.equal(model.getSnapshot().loading, false);
    assert.equal(model.getSnapshot()[factory === 'createDashboard' ? 'chartErrorStatus' : 'errorStatus'], 503);
    request = deferred();pending = model.load();model.dispose();const snapshot = model.getSnapshot();request.resolve(Object.values(replies)[0]);await pending;assert.equal(model.getSnapshot(), snapshot);
  }
  // Routine proof refresh keeps the displayed proof; a 409 still invalidates it in the existing verification suite.
  const { createVerifications } = await server.ssrLoadModule('/src/services/verificationsApi.js');
  const proof = { id: 3, status: 'for_verification', proof: { version: 'a'.repeat(64) } };let revoked = 0;
  request = deferred();const verification = createVerifications(run, 3, { detail: () => request.promise, proof: async () => ({ type: 'image/png' }) }, { createObjectURL: () => 'blob:test', revokeObjectURL: () => revoked++ });
  pending = verification.load();request.resolve(proof);await pending;await verification.openProof();
  request = deferred();pending = verification.load();assert.equal(verification.getSnapshot().item, proof);assert.equal(verification.getSnapshot().proofUrl, 'blob:test');
  request.reject(Object.assign(new Error('Unavailable'), { status: 503 }));await pending;
  assert.equal(verification.getSnapshot().proofUrl, 'blob:test');assert.equal(await verification.review('approve'), false, 'Failed refresh requires a successful safe read before any decision');verification.dispose();assert.equal(revoked, 1);
  const downloading = deferred();let proofRequest = downloading.promise;
  const overlapping = createVerifications(run, 3, { detail: async () => proof, proof: () => proofRequest }, { createObjectURL: () => 'blob:current', revokeObjectURL() {} });
  await overlapping.load();const oldProof = overlapping.openProof();assert.equal(overlapping.getSnapshot().proofLoading, true);
  await overlapping.load();assert.equal(overlapping.getSnapshot().proofLoading, false, 'A record refresh must not leave a cancelled proof read stuck loading');
  downloading.resolve({ type: 'image/png' });await oldProof;assert.equal(overlapping.getSnapshot().proofUrl, '', 'The superseded proof response is ignored');
  proofRequest = Promise.resolve({ type: 'image/png' });await overlapping.openProof();assert.equal(overlapping.getSnapshot().proofUrl, 'blob:current');overlapping.dispose();
  console.log('Page-state checks passed: layout skeletons, reduced motion/accessibility, initial/success/empty/filter/error distinctions, timed slow feedback/cleanup, guarded Retry, status-specific errors, retained refresh/page data, exact failed-page retries, stale/disposed reads and private-proof safety.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { middlewareMode: true, hmr: false } });
  try { await checkPageStates(server); } finally { await server.close(); }
}
