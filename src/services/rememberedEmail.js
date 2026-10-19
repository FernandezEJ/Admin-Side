export const REMEMBERED_EMAIL_KEY = 'lifeflow.admin.rememberedEmail';
export const normalizeEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';
export const validEmail = (email) => email.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email);

export function readRememberedEmail(storage) {
  try {
    const store = storage ?? window.localStorage;
    const value = store.getItem(REMEMBERED_EMAIL_KEY);
    const email = normalizeEmail(value);
    if (validEmail(email)) return email;
    if (value !== null) store.removeItem(REMEMBERED_EMAIL_KEY);
  } catch { /* Storage availability must never prevent staff sign-in. */ }
  return '';
}

export function rememberEmail(email, enabled, storage) {
  try {
    const store = storage ?? window.localStorage;
    const normalized = normalizeEmail(email);
    if (enabled && validEmail(normalized)) store.setItem(REMEMBERED_EMAIL_KEY, normalized);
    else store.removeItem(REMEMBERED_EMAIL_KEY);
  } catch { /* This preference never changes authentication/session storage. */ }
}
