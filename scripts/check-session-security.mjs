import assert from 'node:assert/strict';
import process from 'node:process';
import { createServer, build } from 'vite';

const invalidUrls = [undefined, '', 'invalid', '/api', 'http://api.example.test/api', 'https://localhost/api',
  'https://LOCALHOST./api', 'https://app.localhost/api', 'https://service.local/api', 'https://127.0.0.1/api',
  'https://2130706433/api', 'https://0x7f000001/api', 'https://192.168.1.2/api', 'https://10.1.2.3/api',
  'https://172.16.0.1/api', 'https://172.31.255.254/api', 'https://10.0.2.2/api', 'https://[::1]/api',
  'https://[::ffff:127.0.0.1]/api', 'https://[fc00::1]/api', 'https://[fe80::1]/api', 'https://169.254.1.1/api',
  'https://api.example.test', 'https://api.example.test/api/api', 'https://api.example.test/api?fixture=1',
  'https://api.example.test/api#fragment', 'https://user:fixture@api.example.test/api', 'https://api..example.test/api',
  'https://api.example.test\\api'];

export async function checkSessionSecurity(server) {
  await checkNgrokTransport();
  const { resolveApiBaseUrl } = await server.ssrLoadModule('/src/services/apiUrl.js');
  for (const value of invalidUrls) assert.throws(() => resolveApiBaseUrl(value, false), /VITE_API_BASE_URL/);
  for (const value of ['https://api.example.test/api', 'https://staging.example.test:8443/api/', 'https://[2001:4860:4860::8888]/api']) {
    assert.equal(resolveApiBaseUrl(value, false), value.replace(/\/+$/, ''));
  }
  assert.equal(resolveApiBaseUrl(undefined, true), 'http://127.0.0.1:8000/api');
  assert.equal(resolveApiBaseUrl('http://192.168.1.2:8000/api/', true), 'http://192.168.1.2:8000/api');

  const originalFetch = globalThis.fetch;
  let sends = 0;
  globalThis.fetch = async (url, options) => {
    sends++;
    assert.equal(url, 'https://api.example.test/api/admin/me');
    assert.equal(options.headers.Authorization, 'Bearer synthetic-token');
    return new Response(JSON.stringify({ user: null }), { headers: { 'Content-Type': 'application/json' } });
  };
  try {
    for (const value of [undefined, '', 'http://api.example.test/api', 'https://127.0.0.1/api', 'https://api.example.test/api']) {
      const release = await createServer({ configFile: false, envFile: false, logLevel: 'silent',
        server: { middlewareMode: true }, define: {
          'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true',
          'import.meta.env.VITE_API_BASE_URL': value === undefined ? 'undefined' : JSON.stringify(value),
        } });
      try {
        if (value === 'https://api.example.test/api') {
          const api = await release.ssrLoadModule('/src/services/adminAuthApi.js');
          await api.adminRequest('/me', { token: 'synthetic-token' });
        } else {
          await assert.rejects(release.ssrLoadModule('/src/services/adminAuthApi.js'), /VITE_API_BASE_URL/);
          assert.equal(sends, 0, 'Release guard fails before any credential-bearing fetch');
        }
      } finally { await release.close(); }
    }
    assert.equal(sends, 1);
  } finally { globalThis.fetch = originalFetch; }

  const storage = await server.ssrLoadModule('/src/services/adminAuthStorage.js');
  const { createAdminSession } = await server.ssrLoadModule('/src/auth/adminSession.js');
  const { rememberEmail, REMEMBERED_EMAIL_KEY } = await server.ssrLoadModule('/src/services/rememberedEmail.js');
  const staff = id => ({ id, name: 'Synthetic Staff', email: 'staff@example.test', role: 'admin', must_change_password: false });
  const api = { me: async () => ({ user: staff(1) }), logout: async () => ({}),
    login: async () => ({ token: 'synthetic-token', user: staff(1) }) };
  storage.clearToken();
  rememberEmail('staff@example.test', true, localStorage);
  for (const remember of [undefined, false, true]) {
    const session = createAdminSession(api);
    await session.login({ email: 'staff@example.test', password: 'synthetic', remember });
    assert.equal(sessionStorage.getItem(storage.TOKEN_KEY), 'synthetic-token');
    assert.equal(localStorage.getItem(storage.TOKEN_KEY), null);
    await session.logout();
    assert.equal(localStorage.getItem(REMEMBERED_EMAIL_KEY), 'staff@example.test');
  }
  localStorage.setItem(storage.TOKEN_KEY, 'legacy-token');
  const legacy = createAdminSession(api);
  assert.equal(legacy.getSnapshot().isAuthenticated, false, 'Migrated token is untrusted until /me succeeds');
  assert.equal(localStorage.getItem(storage.TOKEN_KEY), null);
  assert.equal(sessionStorage.getItem(storage.TOKEN_KEY), 'legacy-token');
  await legacy.refreshSession();
  assert.equal(legacy.getSnapshot().isAuthenticated, true);
  api.me = async () => { throw Object.assign(new Error('Expired'), { status: 401 }); };
  await legacy.refreshSession();
  assert.equal(legacy.getSnapshot().isAuthenticated, false);
  assert.equal(storage.readToken(), null);
  assert.equal(localStorage.getItem(REMEMBERED_EMAIL_KEY), 'staff@example.test');

  let finish;
  api.me = async () => ({ user: staff(1) });
  const session = createAdminSession(api);
  await session.login({});
  const stale = session.requestAdmin(() => new Promise(resolve => { finish = resolve; }));
  const rejected = assert.rejects(stale, error => error.status === 401);
  await session.logout();
  api.login = async () => ({ token: 'new-token', user: staff(2) });
  await session.login({});
  finish({ privateOldData: true });
  await rejected;
  assert.equal(session.getSnapshot().user.id, 2);
  assert.equal(storage.readToken(), 'new-token');
  api.me = async () => ({ user: staff(2) });
  await assert.rejects(session.requestAdmin(async () => { throw Object.assign(new Error('Forbidden operation'), { status: 403 }); }));
  assert.equal(session.getSnapshot().isAuthenticated, true, 'A business 403 with valid /me does not expire the session');
  await session.logout();
  rememberEmail('', false, localStorage);
  console.log('Session/HTTPS security checks passed: release fail-closed transport, dev LAN, exact API path, tab storage, legacy migration, remembered email independence, expiry cleanup and stale-response isolation.');
}

export async function checkNgrokTransport() {
  const originalFetch = globalThis.fetch;
  try {
    for (const [base, expected, development = false] of [
      ['https://creative-fernlike-envy.ngrok-free.dev/api', true],
      ['https://SYNTHETIC-123.ngrok-free.dev/api/', true],
      ['https://api.example.test/api', false],
      ['https://ngrok-free.dev/api', false],
      ['https://api.ngrok-free.dev.attacker.test/api', false],
      ['https://not-ngrok-free.dev/api', false],
      ['https://api-ngrok-free.dev/api', false],
      ['http://localhost:8000/api', false, true],
      ['http://127.0.0.1:8000/api', false, true],
      ['http://synthetic.ngrok-free.dev/api', false, true],
    ]) {
      const transport = await createServer({ configFile: false, envFile: false, logLevel: 'silent',
        server: { middlewareMode: true }, define: {
          'import.meta.env.DEV': String(development), 'import.meta.env.PROD': String(!development),
          'import.meta.env.VITE_API_BASE_URL': JSON.stringify(base),
        } });
      const calls = [];
      let reply = () => new Response(JSON.stringify({ user: null }), { headers: { 'Content-Type': 'application/json' } });
      globalThis.fetch = async (url, options) => {
        const parsed = new URL(url);
        assert.equal(parsed.origin, new URL(base).origin);
        assert.equal(options.credentials, 'omit');
        assert.equal(options.headers.Accept, 'application/json');
        assert.equal(options.headers['ngrok-skip-browser-warning'], expected ? '1' : undefined);
        assert.ok(options.signal instanceof AbortSignal);
        calls.push({ url, options });
        return reply();
      };
      try {
        const { adminAuthApi, adminRequest, AuthApiError } = await transport.ssrLoadModule('/src/services/adminAuthApi.js');
        const { dashboardApi } = await transport.ssrLoadModule('/src/services/dashboardApi.js');
        const { permanentPostApi } = await transport.ssrLoadModule('/src/services/permanentPostApi.js');
        const { verificationsApi } = await transport.ssrLoadModule('/src/services/verificationsApi.js');
        const credentials = { email: 'synthetic@example.test', password: 'synthetic-only' };
        await adminAuthApi.login(credentials);
        assert.equal(new URL(calls.at(-1).url).pathname, '/api/admin/login');
        assert.equal(calls.at(-1).options.method, 'POST');
        assert.equal(calls.at(-1).options.headers.Authorization, undefined);
        assert.equal(calls.at(-1).options.headers['Content-Type'], 'application/json');
        assert.deepEqual(JSON.parse(calls.at(-1).options.body), credentials);
        await adminAuthApi.me('synthetic-token');
        assert.equal(new URL(calls.at(-1).url).pathname, '/api/admin/me');
        assert.equal(calls.at(-1).options.headers.Authorization, 'Bearer synthetic-token');
        assert.equal(calls.at(-1).options.headers['Content-Type'], undefined);
        await dashboardApi.load('synthetic-token', 6);
        assert.equal(new URL(calls.at(-1).url).pathname, '/api/admin/dashboard');
        assert.equal(new URL(calls.at(-1).url).searchParams.get('months'), '6');
        assert.equal(calls.at(-1).options.headers.Authorization, 'Bearer synthetic-token');
        reply = () => new Response(JSON.stringify({ post: { id: 1 } }), { headers: { 'Content-Type': 'application/json' } });
        assert.deepEqual(await permanentPostApi.save('synthetic-token', { title: 'Synthetic', summary: 'Summary', description: 'Description' },
          new Blob(['fixture'], { type: 'image/png' })), { id: 1 });
        const multipart = calls.at(-1).options;
        assert.equal(multipart.method, 'POST');
        assert.equal(multipart.headers.Authorization, 'Bearer synthetic-token');
        assert.equal(multipart.headers['Content-Type'], undefined, 'Fetch must supply the multipart boundary');
        assert.ok(multipart.body instanceof FormData);
        assert.equal(multipart.body.get('_method'), 'PUT');
        assert.equal(multipart.body.get('image').size, 7);
        reply = () => new Response(new Blob(['proof'], { type: 'image/png' }), { headers: { 'Content-Type': 'image/png' } });
        assert.equal(await (await verificationsApi.proof('synthetic-token', 1)).text(), 'proof');
        assert.equal(calls.at(-1).options.headers.Authorization, 'Bearer synthetic-token');
        reply = () => new Response(JSON.stringify({ message: 'Validation failed.', errors: { title: ['Required.'] } }),
          { status: 422, headers: { 'Content-Type': 'application/json' } });
        await assert.rejects(adminRequest('/announcements', { token: 'synthetic-token', method: 'POST', body: {} }), error => {
          assert.ok(error instanceof AuthApiError); assert.equal(error.status, 422);
          assert.deepEqual(error.errors, { title: ['Required.'] }); return true;
        });
        reply = () => new Response(JSON.stringify({ message: 'PRIVATE-SERVER-CANARY' }), { status: 500 });
        await assert.rejects(adminAuthApi.me('synthetic-token'), /The server is unavailable/);
        reply = () => new Response('synthetic warning', { headers: { 'Content-Type': 'text/plain' } });
        await assert.rejects(adminAuthApi.me('synthetic-token'), /The server returned an invalid response/);
        reply = () => { throw new TypeError('PRIVATE-NETWORK-CANARY'); };
        await assert.rejects(adminAuthApi.me('synthetic-token'), /Unable to reach the server/);
      } finally { await transport.close(); }
    }
    console.log('Ngrok transport checks passed: 10 API bases, login, me, dashboard, multipart, proof Blob, safe errors and exact host matching; all fetches mocked.');
  } finally { globalThis.fetch = originalFetch; }
}

export async function checkReleaseBuildSecurity() {
  const before = process.env.VITE_API_BASE_URL;
  try {
    for (const value of ['', 'http://127.0.0.1:8000/api', 'https://192.168.1.2/api']) {
      process.env.VITE_API_BASE_URL = value;
      await assert.rejects(build({ logLevel: 'silent', build: { write: false, emptyOutDir: false } }), /VITE_API_BASE_URL/);
    }
    process.env.VITE_API_BASE_URL = 'https://api.example.test/api';
    await build({ build: { write: false, emptyOutDir: false } });
    console.log('PASS: production build rejects missing/insecure/private API config; synthetic HTTPS build passes in memory.');
  } finally {
    if (before === undefined) delete process.env.VITE_API_BASE_URL;
    else process.env.VITE_API_BASE_URL = before;
  }
}
