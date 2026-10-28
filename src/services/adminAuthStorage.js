export const TOKEN_KEY = 'lifeflow.admin.token';
const LEGACY_KEY = 'lifeflow.admin.mockSession';

export function clearToken() {
  for (const name of ['localStorage', 'sessionStorage']) {
    try {
      window[name].removeItem(TOKEN_KEY);
      window[name].removeItem(LEGACY_KEY);
    } catch { /* The in-memory session still clears if storage is unavailable. */ }
  }
}

export function readToken() {
  let legacy;
  try {
    legacy = window.localStorage.getItem(TOKEN_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
  } catch { legacy = null; }
  try {
    window.sessionStorage.removeItem(LEGACY_KEY);
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (token) return token;
    if (legacy) {
      window.sessionStorage.setItem(TOKEN_KEY, legacy);
      return legacy;
    }
  } catch { /* An unvalidated legacy token is never restored from persistent storage. */ }
  return null;
}

export function saveToken(token) {
  clearToken();
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } catch { /* Login remains usable in memory when browser storage is unavailable. */ }
}
