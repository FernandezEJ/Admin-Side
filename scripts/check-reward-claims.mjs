import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkRewardClaims(server) {
  const { createRewardClaims, canConfirmClaim } = await server.ssrLoadModule('/src/services/rewardClaims.js');
  const { createRewards } = await server.ssrLoadModule('/src/services/rewardsApi.js');
  const { ClaimVerificationView } = await server.ssrLoadModule('/src/components/rewards/ClaimVerification.jsx');
  const { RewardsView } = await server.ssrLoadModule('/src/pages/Rewards.jsx');
  const { default: AdminDialog } = await server.ssrLoadModule('/src/components/ui/AdminDialog.jsx');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const { createAdminSession } = await server.ssrLoadModule('/src/auth/adminSession.js');
  const { AuthApiError } = await server.ssrLoadModule('/src/services/adminAuthApi.js');
  const pending = () => ({ voucher_id: 14, donor_name: '<b>Verified donor</b>', reward: { name: 'Saved jacket', description: 'Size Medium' },
    claim_status: 'pending_claim', status_label: 'Pending Claim', can_claim: true, claimed_at: null });
  const claimed = () => ({ ...pending(), claim_status: 'claimed', status_label: 'Already Claimed', can_claim: false, claimed_at: '2026-10-15T06:30:00Z' });
  const run = (operation) => operation('claim-session');
  const render = (model) => renderToString(React.createElement(ClaimVerificationView, { state: model.getSnapshot(), model })).replace(/<!-- -->/g, '');
  const nodes = (element) => React.isValidElement(element) ? [element, ...React.Children.toArray(element.props.children).flatMap(nodes)] : [];
  const tree = (model) => ClaimVerificationView({ state: model.getSnapshot(), model });
  const button = (model, label) => nodes(tree(model)).find((node) => node.type === 'button' && node.props.children === label);
  let backendClaim = pending(), status = 200, body, network = false, calls = [], releaseVerify, releaseConfirm, deferVerify = false, deferConfirm = false;
  let updates = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const endpoint = new URL(url);
    assert.ok(['/api/admin/rewards/claims/verify', '/api/admin/rewards/claims/confirm'].includes(endpoint.pathname));
    assert.equal(endpoint.search, ''); assert.equal(endpoint.hash, '');
    assert.equal(options.method, 'POST'); assert.equal(options.headers.Authorization, 'Bearer claim-session');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), { claim_code: 'LFW-7B9X2Q' });
    calls.push(endpoint.pathname.endsWith('/confirm') ? 'confirm' : 'verify');
    if (network) throw new Error('Private transport text must not appear');
    if (deferVerify && calls.at(-1) === 'verify') await new Promise((resolve) => { releaseVerify = resolve; });
    if (deferConfirm && calls.at(-1) === 'confirm') await new Promise((resolve) => { releaseConfirm = resolve; });
    return Response.json(body === undefined ? { claim: backendClaim } : body, { status });
  };
  try {
    const model = createRewardClaims(run, () => { updates++; });
    assert.ok(render(model).includes('One-Time Claim Code'));
    assert.equal(await model.verify(), false); assert.equal(calls.length, 0); assert.match(model.getSnapshot().error, /Enter/);
    model.setCode('bad'); assert.equal(await model.verify(), false); assert.equal(calls.length, 0);
    const form = nodes(tree(model)).find((node) => node.type === 'form');
    model.setCode(' lfw-7b9x2q ');
    assert.equal(calls.length, 0, 'Typing does not submit');
    deferVerify = true;
    form.props.onSubmit({ preventDefault() {} }); const duplicateVerify = model.verify();
    assert.equal(await duplicateVerify, false); assert.deepEqual(calls, ['verify']);
    assert.ok(button(model, 'Verifying...').props.disabled);
    model.setCode('LFW-ABC123'); assert.equal(model.getSnapshot().code, 'LFW-7B9X2Q');
    releaseVerify(); await new Promise((resolve) => setImmediate(resolve)); deferVerify = false;
    assert.equal(model.getSnapshot().claim.donor_name, pending().donor_name);
    let html = render(model);
    for (const label of ['Verification Result', 'Pending Claim', 'Saved jacket', 'Size Medium', 'LFW-7B9X2Q', 'Mark as Claimed', '&lt;b&gt;Verified donor&lt;/b&gt;']) assert.ok(html.includes(label), label);
    assert.ok(!html.includes('<b>Verified donor</b>'));
    assert.deepEqual(calls, ['verify'], 'Verification and opening the popup never confirm');
    assert.equal(await model.confirm(), false, 'Cannot skip the final confirmation step');
    button(model, 'Mark as Claimed').props.onClick();
    assert.equal(model.getSnapshot().step, 'confirm');
    html = render(model); assert.ok(html.includes('Confirm that this reward has been handed over to the donor?'));
    assert.ok(html.includes('Saved jacket') && html.includes('Size Medium'), 'Verified details remain during confirmation');
    button(model, 'Cancel').props.onClick(); assert.equal(model.getSnapshot().step, 'result'); assert.deepEqual(calls, ['verify']);
    button(model, 'Mark as Claimed').props.onClick();
    backendClaim = claimed(); deferConfirm = true;
    const confirmation = button(model, 'Confirm Claim').props.onClick();
    assert.equal(await model.confirm(), false); assert.deepEqual(calls, ['verify', 'confirm']);
    const busySnapshot = model.getSnapshot(); model.close(); model.cancelConfirmation();
    assert.equal(model.getSnapshot(), busySnapshot, 'No dismissal during an uncertain handover request');
    assert.ok(button(model, 'Confirming...').props.disabled);
    releaseConfirm(); await confirmation; await new Promise((resolve) => setImmediate(resolve)); deferConfirm = false;
    assert.equal(model.getSnapshot().claim, null); assert.equal(model.getSnapshot().code, ''); assert.equal(model.getSnapshot().verifiedCode, '');
    assert.equal(updates, 1); assert.match(model.getSnapshot().notice, /marked as claimed/);
    assert.ok(!render(model).includes('LFW-7B9X2Q'));

    // Already claimed is a successful read, never a confirmable result or usable code.
    model.setCode('LFW-7B9X2Q'); await model.verify(); html = render(model);
    assert.ok(html.includes('Already Claimed') && html.includes('October 15, 2026'));
    assert.equal(button(model, 'Mark as Claimed'), undefined);
    assert.ok(!nodes(tree(model)).find((node) => node.type === 'dd' && node.props.children === 'LFW-7B9X2Q'));
    model.beginConfirmation(); assert.equal(await model.confirm(), false); model.close();
    for (const value of [{ ...pending(), claim_status: 'legacy', can_claim: false }, { ...pending(), claim_status: 'available', can_claim: false },
      { ...pending(), claim_status: 'unexpected', can_claim: true }, { ...pending(), claimed_at: claimed().claimed_at }, { ...claimed(), can_claim: true }]) {
      backendClaim = value; await model.verify(); assert.equal(canConfirmClaim(model.getSnapshot().claim), false);
      assert.equal(button(model, 'Mark as Claimed'), undefined); model.close();
    }
    // Missing or malformed required fields cannot fabricate an actionable result.
    for (const value of [{}, { claim: null }, { claim: {} }, { claim: { ...pending(), donor_name: null } },
      { claim: { ...pending(), reward: null } }, { claim: { ...pending(), can_claim: undefined } }, { claim: { ...pending(), claimed_at: 'invalid' } }]) {
      body = value; assert.equal(await model.verify(), false); assert.equal(model.getSnapshot().claim, null); assert.match(model.getSnapshot().error, /incomplete/);
    }
    body = undefined;
    for (const [code, message] of [[401, /session has expired/], [403, /cannot access/], [404, /not found/], [409, /already been claimed/], [422, /valid one-time/], [429, /wait a minute/], [503, /unavailable/]]) {
      status = code; body = { message: 'Do not expose arbitrary private error content', errors: { claim_code: ['Private field error'] } };
      assert.equal(await model.verify(), false); assert.match(model.getSnapshot().error, message); assert.equal(model.getSnapshot().claim, null);
      assert.ok(!render(model).includes('Private')); body = undefined;
    }
    status = 200; network = true; assert.equal(await model.verify(), false); assert.match(model.getSnapshot().error, /Unable to reach/); network = false;

    // Every confirmation failure retains context and blocks an unsafe POST retry.
    for (const failure of [401, 403, 404, 422, 429, 503, 'network', 'partial']) {
      backendClaim = pending(); await model.verify(); model.beginConfirmation();
      status = typeof failure === 'number' ? failure : 200; network = failure === 'network'; body = failure === 'partial' ? {} : undefined;
      const before = calls.length; assert.equal(await model.confirm(), false); assert.equal(calls.length, before + 1);
      assert.ok(model.getSnapshot().claim && model.getSnapshot().modalError); assert.equal(model.getSnapshot().blocked, true);
      assert.equal(button(model, 'Mark as Claimed'), undefined); assert.ok(render(model).includes('Saved jacket'));
      assert.equal(await model.confirm(), false); assert.equal(calls.length, before + 1, 'No automatic confirmation or verification retry');
      status = 200; network = false; body = undefined;
      assert.equal(await model.recheck(), true); model.beginConfirmation(); backendClaim = claimed(); assert.equal(await model.confirm(), true);
      model.setCode('LFW-7B9X2Q');
    }
    // Concurrent staff confirmation: one failed POST followed by one safe status read.
    backendClaim = pending(); await model.verify(); model.beginConfirmation();
    const conflictApi = {
      verify: async () => ({ claim: claimed() }),
      confirm: async () => { throw new AuthApiError('Already claimed', 409); },
    };
    const conflict = createRewardClaims(run, () => assert.fail('A 409 is not confirmation success'), conflictApi);
    conflict.setCode('LFW-7B9X2Q'); await conflict.verify(); // Use a pending result first.
    conflict.close(); conflictApi.verify = async () => ({ claim: pending() }); await conflict.verify(); conflict.beginConfirmation();
    conflictApi.verify = async () => ({ claim: claimed() });
    assert.equal(await conflict.confirm(), false); assert.equal(conflict.getSnapshot().claim.claim_status, 'claimed');
    assert.equal(conflict.getSnapshot().blocked, true); assert.match(conflict.getSnapshot().modalError, /already been claimed/);
    assert.equal(button(conflict, 'Mark as Claimed'), undefined); conflict.dispose(); model.close();

    // Disposed screen/session results cannot reopen a donor-data popup or refresh reports.
    backendClaim = pending(); deferVerify = true; model.setCode('LFW-7B9X2Q'); const staleVerify = model.verify();
    model.dispose(); const cleared = model.getSnapshot(); releaseVerify(); await staleVerify; deferVerify = false;
    assert.equal(model.getSnapshot(), cleared); assert.equal(model.getSnapshot().verifiedCode, '');
    model.setCode('LFW-7B9X2Q'); await model.verify(); model.beginConfirmation();
    deferConfirm = true; const beforeDisposed = updates; const staleConfirm = model.confirm(); model.dispose(); const disposed = model.getSnapshot();
    backendClaim = claimed(); releaseConfirm(); await staleConfirm; deferConfirm = false;
    assert.equal(model.getSnapshot(), disposed); assert.equal(updates, beforeDisposed);

    // Native centered dialog: cancellation/backdrop opt-in, inert during submission.
    let closes = 0;
    function InspectDialog(props = {}) {
      const dialog = AdminDialog({ title: 'Verification Result', onClose: () => { closes++; }, ...props });
      assert.equal(dialog.type, 'dialog'); assert.equal(dialog.props['aria-modal'], 'true');
      assert.ok(dialog.props['aria-labelledby'] && dialog.props.className.includes('fixed inset-0 m-auto') && dialog.props.className.includes('overflow-y-auto'));
      const event = { preventDefault() {} }; dialog.props.onCancel(event);
      if (props.dismissOnBackdrop) {
        const target = { getBoundingClientRect: () => ({ left: 100, right: 500, top: 100, bottom: 600 }) };
        const before = closes;
        dialog.props.onClick({ target, currentTarget: target, clientX: 120, clientY: 120 }); assert.equal(closes, before, 'Padding is not backdrop');
        dialog.props.onClick({ target: {}, currentTarget: target, clientX: 0, clientY: 0 }); assert.equal(closes, before, 'Child clicks do not dismiss');
        dialog.props.onClick({ target, currentTarget: target, clientX: 0, clientY: 0 }); assert.equal(closes, before + (props.closeDisabled ? 0 : 1));
      }
      return dialog;
    }
    renderToString(React.createElement(InspectDialog, { dismissOnBackdrop: true })); assert.equal(closes, 2);
    renderToString(React.createElement(InspectDialog, { dismissOnBackdrop: true, closeDisabled: true })); assert.equal(closes, 2);
    const dialogSource = readFileSync('src/components/ui/AdminDialog.jsx', 'utf8');
    assert.ok(dialogSource.includes('dialog.showModal()') && dialogSource.includes('previousFocus?.focus()'));

    // Both established roles see the tab; password-initialization sessions do not.
    const remote = { items: [], redemptions: [], analytics: null, year: '2026', model: { load() {} } };
    for (const [role, mustChangePassword, allowed] of [['admin', false, true], ['super_admin', false, true], ['donor', false, false], ['admin', true, false]]) {
      const page = renderToString(React.createElement(MemoryRouter, null, React.createElement(AdminSessionContext.Provider,
        { value: { role, mustChangePassword, currentAdmin: { id: 1, name: 'Staff' }, requestAdmin: run } }, React.createElement(RewardsView, { remote }))));
      assert.equal(page.includes('aria-controls="reward-claim-verification"'), allowed);
      if (allowed) for (const tab of ['Reward Management', 'Redemptions', 'Analytics']) assert.ok(page.includes(tab));
      const section = renderToString(React.createElement(MemoryRouter, null, React.createElement(AdminSessionContext.Provider,
        { value: { role, mustChangePassword, currentAdmin: { id: 1, name: 'Staff' }, requestAdmin: run } }, React.createElement(RewardsView, { remote, initialTab: 'claims' }))));
      assert.equal(section.includes('id="reward-claim-code"'), allowed, 'The existing Rewards tab mounts the claim form only for staff');
    }
    // Confirmation only refreshes existing redemption/annual analytics reads.
    const refreshes = [], api = { list: async () => { refreshes.push('items'); return []; },
      redemptions: async () => { refreshes.push('history'); return [{ id: 14, claim_status: 'claimed' }]; },
      analytics: async (_token, year) => { refreshes.push(year); return { year }; } };
    const rewards = createRewards(run, undefined, api); await rewards.load(); refreshes.length = 0;
    const items = rewards.getSnapshot().items; await rewards.loadAnalytics('2025'); refreshes.length = 0;
    assert.equal(await rewards.refreshClaims(), true); assert.deepEqual(refreshes, ['history', '2025']);
    assert.equal(rewards.getSnapshot().items, items); assert.equal(rewards.getSnapshot().loading, false);
    assert.equal(rewards.getSnapshot().redemptions[0].claim_status, 'claimed'); assert.equal(rewards.getSnapshot().year, '2025'); rewards.dispose();
    // Existing session handling remains authoritative for both protected failures.
    for (const failure of [401, 403]) {
      const storage = { readToken: () => 'session-token', saveToken() {}, clearToken() {} };
      const user = { id: 1, name: 'Staff', email: 'staff@example.test', role: 'admin', must_change_password: false };
      let passwordChanged = false;
      const session = createAdminSession({ me: async () => ({ user: { ...user, must_change_password: passwordChanged } }) }, storage);
      await session.refreshSession(); passwordChanged = true;
      await assert.rejects(session.requestAdmin(async () => { throw new AuthApiError('Denied', failure); }));
      if (failure === 401) assert.equal(session.getSnapshot().isAuthenticated, false);
      else assert.equal(session.getSnapshot().mustChangePassword, true);
    }
    console.log('Reward claim checks passed: staff roles, exact private API contract, normalized form/Enter and duplicate locks, centered accessible dialog, pending/snapshot data, explicit handover and cancellation, server success/reset/refresh, legacy/claimed/partial responses, 401/403/404/409/422/429/network recovery and stale-session disposal.');
  } finally { globalThis.fetch = originalFetch; }
}
