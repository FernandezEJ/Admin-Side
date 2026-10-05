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
  for (const name of ['sessionStorage', 'localStorage']) {
    try {
      window[name].removeItem(LEGACY_KEY);
      const token = window[name].getItem(TOKEN_KEY);
      if (token) return token;
    } catch { /* Start without a persisted session when storage is unavailable. */ }
  }
  return null;
}

export function saveToken(token, remember = true) {
  clearToken();
  try {
    window[remember ? 'localStorage' : 'sessionStorage'].setItem(TOKEN_KEY, token);
  } catch { /* Login remains usable in memory. */ }
}
