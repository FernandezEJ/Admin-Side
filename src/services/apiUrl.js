export function resolveApiBaseUrl(value, development) {
  const message = 'VITE_API_BASE_URL must be an absolute public HTTPS URL ending in /api for release builds.';
  if (typeof value !== 'string' || !value.trim()) {
    if (development) return 'http://127.0.0.1:8000/api';
    throw new Error(message);
  }
  const raw = value.trim();
  let url;
  try { url = new URL(raw); } catch { throw new Error(message); }
  if (/[\s\\]/u.test(raw) || raw.includes('@') || raw.includes('?') || raw.includes('#') ||
      !['https:', ...(development ? ['http:'] : [])].includes(url.protocol) ||
      url.pathname.replace(/\/+$/, '') !== '/api') throw new Error(message);
  if (!development) {
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
    const ipv4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/u.exec(host);
    const localName = host === 'localhost' || /\.(localhost|local|internal|lan)$/u.test(host) ||
      (!host.includes('.') && !host.includes(':'));
    const invalidDns = !ipv4 && !host.includes(':') && (host.length > 253 ||
      host.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label)));
    const privateV4 = ipv4 && (() => {
      const [a, b] = ipv4.slice(1).map(Number);
      return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
        (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19));
    })();
    // Only global-unicast IPv6 literals; reject mapped/loopback/link-local/ULA forms.
    const privateV6 = host.includes(':') && !/^[23][0-9a-f]{3}:/u.test(host);
    if (url.protocol !== 'https:' || localName || invalidDns || privateV4 || privateV6) throw new Error(message);
  }
  return url.origin + '/api';
}
