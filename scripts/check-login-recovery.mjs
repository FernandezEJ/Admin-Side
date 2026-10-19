import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkLoginRecovery(server) {
  const { REMEMBERED_EMAIL_KEY, readRememberedEmail, rememberEmail } = await server.ssrLoadModule('/src/services/rememberedEmail.js');
  const { createPasswordReset, RESET_NOTICE } = await server.ssrLoadModule('/src/services/adminPasswordReset.js');
  const { API_BASE_URL } = await server.ssrLoadModule('/src/services/adminAuthApi.js');
  const { default: Login } = await server.ssrLoadModule('/src/pages/Login.jsx');
  const { default: ForgotPassword, PasswordResetView } = await server.ssrLoadModule('/src/pages/ForgotPassword.jsx');
  const { AppRoutes } = await server.ssrLoadModule('/src/AppRoutes.jsx');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const render = (Component, props = {}, entry = '/') => renderToString(React.createElement(MemoryRouter, { initialEntries: [entry] },
    React.createElement(AdminSessionContext.Provider, { value: { isAuthenticated: false, isLoading: false, role: null } }, React.createElement(Component, props))));
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  const blocked = { getItem() { throw Error('Disabled storage'); }, setItem() { throw Error('Disabled storage'); }, removeItem() { throw Error('Disabled storage'); } };
  assert.equal(readRememberedEmail(storage), '');
  rememberEmail('  STAFF@Example.test ', true, storage);
  assert.equal(readRememberedEmail(storage), 'staff@example.test');
  assert.deepEqual([...values], [[REMEMBERED_EMAIL_KEY, 'staff@example.test']], 'Only email is persisted');
  rememberEmail('staff@example.test', false, storage); assert.equal(readRememberedEmail(storage), '');
  for (const value of ['null', 'undefined', '{}', 'not-email', '<script>@example.test', 'x@', 'a'.repeat(260) + '@example.test']) {
    values.set(REMEMBERED_EMAIL_KEY, value); assert.equal(readRememberedEmail(storage), ''); assert.equal(values.has(REMEMBERED_EMAIL_KEY), false);
  }
  assert.equal(readRememberedEmail(blocked), '');
  assert.doesNotThrow(() => rememberEmail('staff@example.test', true, blocked));
  assert.doesNotThrow(() => rememberEmail('', false, blocked));
  rememberEmail('Saved@Example.test', true, localStorage);
  let html = render(Login);
  assert.ok(html.includes('value="saved@example.test"') && html.includes('name="remember_email" checked=""') && html.includes('Remember Email'));
  assert.ok(!html.includes('Remember me') && !html.includes('Password recovery is not available'));
  assert.ok(html.includes('href="/forgot-password"'));
  const password = html.match(/<input[^>]*name="password"[^>]*>/)[0];
  assert.ok(!password.includes('value='), 'Remember Email never prefills a password');
  assert.ok(html.indexOf('<form') < html.indexOf('alt="LifeFlow mascot"'), 'Form precedes branding in DOM');
  assert.ok(html.includes('lg:order-2') && html.includes('lg:order-1') && html.includes('lg:grid-cols-[0.8fr_1.2fr]'));
  rememberEmail('', false, localStorage); html = render(Login);
  assert.ok(html.includes('name="email"') && html.includes('value=""') && !html.includes('checked=""'));
  assert.ok(render(AppRoutes, {}, '/forgot-password').includes('Send Reset Code'), 'Recovery is reachable without a staff session');
  assert.ok(render(ForgotPassword).includes('Admin or Super Admin'));

  const originalFetch = globalThis.fetch;
  const calls = [];
  let status = 200, response, offline = false, deferred = false, finish;
  const token = 'a'.repeat(64);
  globalThis.fetch = async (url, options) => {
    const path = new URL(url);
    assert.ok(url.startsWith(`${API_BASE_URL}/admin/forgot-password/`));
    assert.equal(path.search, ''); assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, undefined); assert.equal(options.credentials, 'omit');
    assert.equal(options.headers['Content-Type'], 'application/json');
    calls.push({ path: path.pathname, body: JSON.parse(options.body) });
    if (offline) throw Error('Private network detail');
    if (deferred) await new Promise((resolve) => { finish = resolve; });
    const body = response ?? (path.pathname.endsWith('/request') ? { message: RESET_NOTICE, resend_after: 60 }
      : path.pathname.endsWith('/verify') ? { reset_token: token, expires_in: 600 } : { message: 'Password updated.' });
    return Response.json(body, { status });
  };
  let clock = 100000;
  const make = () => createPasswordReset('', undefined, () => clock);
  try {
    const model = make();
    assert.equal(await model.request('bad'), false); assert.equal(calls.length, 0);
    deferred = true; const sending = model.request(' STAFF@Example.test ');
    assert.equal(await model.request('staff@example.test'), false); assert.equal(calls.length, 1);
    finish(); await sending; deferred = false;
    assert.deepEqual(calls[0].body, { email: 'staff@example.test' });
    assert.equal(model.getSnapshot().step, 'code'); assert.equal(model.getSnapshot().notice, RESET_NOTICE);
    assert.equal(await model.request('staff@example.test', true), false); assert.equal(calls.length, 1);
    html = render(PasswordResetView, { state: model.getSnapshot(), model, clock });
    assert.ok(html.includes('Resend code in 60s') && html.includes('Verification code'));
    assert.equal(await model.verify('12345'), false); assert.equal(calls.length, 1);
    await model.verify('001234'); assert.deepEqual(calls.at(-1).body, { email: 'staff@example.test', code: '001234' });
    assert.equal(model.getSnapshot().step, 'password'); assert.ok(!JSON.stringify(model.getSnapshot()).includes(token));
    const beforeWeak = calls.length;
    assert.equal(await model.reset('weak', 'weak'), false);
    assert.equal(await model.reset('NewStaffPass123!', 'Mismatch123!'), false); assert.equal(calls.length, beforeWeak);
    deferred = true; const resetting = model.reset('NewStaffPass123!', 'NewStaffPass123!');
    assert.equal(await model.reset('NewStaffPass123!', 'NewStaffPass123!'), false); assert.equal(calls.length, beforeWeak + 1);
    assert.deepEqual(calls.at(-1).body, { email: 'staff@example.test', reset_token: token, password: 'NewStaffPass123!', password_confirmation: 'NewStaffPass123!' });
    finish(); await resetting; deferred = false;
    assert.equal(model.getSnapshot().step, 'done'); assert.ok(!JSON.stringify(model.getSnapshot()).includes(token));
    assert.ok(!JSON.stringify(model.getSnapshot()).includes('NewStaffPass123!'));
    html = render(PasswordResetView, { state: model.getSnapshot(), model, clock }); assert.ok(html.includes('Back to Sign In'));
    const beforeDone = calls.length; assert.equal(await model.reset('NewStaffPass123!', 'NewStaffPass123!'), false); assert.equal(calls.length, beforeDone);

    for (const email of ['known@example.test', 'unknown@example.test']) {
      const generic = make(); await generic.request(email); assert.equal(generic.getSnapshot().notice, RESET_NOTICE); generic.dispose();
    }
    const expiry = make(); await expiry.request('staff@example.test'); await expiry.verify('001234'); clock += 600000;
    const beforeExpiry = calls.length; assert.equal(await expiry.reset('NewStaffPass123!', 'NewStaffPass123!'), false);
    assert.equal(calls.length, beforeExpiry); assert.equal(expiry.getSnapshot().step, 'code'); assert.match(expiry.getSnapshot().error, /expired/);
    await expiry.request('staff@example.test', true); assert.equal(expiry.getSnapshot().step, 'code');
    response = { message: 'Validation', errors: { code: ['The code is invalid or expired.'] } }; status = 422;
    assert.equal(await expiry.verify('999999'), false); assert.match(expiry.getSnapshot().error, /invalid or expired/);
    assert.equal(expiry.getSnapshot().step, 'code'); status = 200; response = undefined;
    await expiry.verify('001234');
    response = { message: 'Validation', errors: { reset_token: ['Reset authorization is invalid or expired.'] } }; status = 422;
    assert.equal(await expiry.reset('NewStaffPass123!', 'NewStaffPass123!'), false); assert.equal(expiry.getSnapshot().step, 'code');
    status = 200; response = undefined;
    const throttled = make(); status = 429; response = { message: 'Wait' };
    assert.equal(await throttled.request('staff@example.test'), false); assert.match(throttled.getSnapshot().error, /wait a minute/);
    const beforeThrottle = calls.length; assert.equal(await throttled.request('staff@example.test'), false); assert.equal(calls.length, beforeThrottle);
    clock += 60000; status = 200; response = undefined; assert.equal(await throttled.request('staff@example.test'), true);
    offline = true; assert.equal(await throttled.verify('001234'), false); assert.match(throttled.getSnapshot().error, /Unable to reach/); offline = false;
    for (const value of [{}, { reset_token: 'invalid', expires_in: 600 }]) {
      response = value; assert.equal(await throttled.verify('001234'), false); assert.equal(throttled.getSnapshot().step, 'code');
    }
    response = undefined;
    const stale = make(); deferred = true; const old = stale.request('staff@example.test'); stale.dispose(); const cleared = stale.getSnapshot();
    finish(); await old; deferred = false; assert.equal(stale.getSnapshot(), cleared);
    await stale.request('staff@example.test'); deferred = true; const verifying = stale.verify('001234'); stale.dispose(); const clearedToken = stale.getSnapshot();
    finish(); await verifying; deferred = false; assert.equal(stale.getSnapshot(), clearedToken); assert.equal(stale.getSnapshot().step, 'email');
    model.dispose(); expiry.dispose(); throttled.dispose(); stale.dispose();
    console.log('Login/recovery checks passed: email-only preference normalization/prefill/clear/blocked storage, form-first layout and public recovery route, exact unauthenticated staff reset payloads, neutral requests, four steps, cooldown/rate limits, strong passwords, duplicate guards, expired/invalid credentials and memory-only authorization with stale-response cleanup.');
  } finally { globalThis.fetch = originalFetch; rememberEmail('', false, localStorage); }
}
