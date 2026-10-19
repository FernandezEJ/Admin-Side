import { adminRequest, AuthApiError } from './adminAuthApi';
import { normalizeEmail, validEmail } from './rememberedEmail';

export const passwordResetApi = {
  request: (email) => adminRequest('/forgot-password/request', { method: 'POST', body: { email } }),
  verify: (email, code) => adminRequest('/forgot-password/verify', { method: 'POST', body: { email, code } }),
  reset: (email, reset_token, password, password_confirmation) => adminRequest('/forgot-password/reset', { method: 'POST', body: { email, reset_token, password, password_confirmation } }),
};
export const RESET_NOTICE = 'If an account is registered with this email, password reset instructions will be sent shortly.';
const initial = (email = '') => ({ step: 'email', email, busy: false, error: '', errors: {}, notice: '', resendAt: 0, retryAt: 0 });
const message = (failure) => {
  if (failure?.status === 429) return 'Too many attempts. Please wait a minute before trying again.';
  if (failure?.status === 422) return Object.values(failure.errors ?? {}).flat().filter((value) => typeof value === 'string').join(' ') || 'Check your details and try again.';
  return failure instanceof AuthApiError ? failure.message : 'Unable to complete password recovery. Please try again.';
};

export function createPasswordReset(email = '', api = passwordResetApi, now = Date.now) {
  let state = initial(email), version = 0, token = '', expiresAt = 0;
  const listeners = new Set();
  const update = (patch) => { state = { ...state, ...patch }; listeners.forEach((notify) => notify()); };
  const fail = (failure) => update({ error: message(failure), errors: failure?.errors ?? {}, ...(failure?.status === 429 ? { retryAt: now() + 60000 } : {}) });
  const model = {
    getSnapshot: () => state,
    subscribe(notify) { listeners.add(notify); return () => listeners.delete(notify); },
    async request(value, resend = false) {
      if (state.busy || now() < state.retryAt || (resend && (state.step !== 'code' || now() < state.resendAt))) return false;
      const email = normalizeEmail(value);
      if (!validEmail(email)) { update({ error: 'Enter a valid email address.' }); return false; }
      const current = ++version;
      update({ busy: true, error: '', errors: {}, notice: '' });
      try {
        const response = await api.request(email);
        if (current !== version) return false;
        if (!response || typeof response.message !== 'string' || !Number.isFinite(response.resend_after)) throw new AuthApiError('The server returned an invalid response. Please try again.');
        token = ''; expiresAt = 0;
        update({ step: 'code', email, notice: RESET_NOTICE, resendAt: now() + Math.max(60, response.resend_after) * 1000 });
        return true;
      } catch (failure) { if (current === version) fail(failure); return false; }
      finally { if (current === version) update({ busy: false }); }
    },
    async verify(code) {
      if (state.busy || state.step !== 'code' || now() < state.retryAt) return false;
      if (!/^\d{6}$/.test(code)) { update({ error: 'Enter the six-digit code from your email.' }); return false; }
      const current = version;
      update({ busy: true, error: '', errors: {}, notice: '' });
      try {
        const response = await api.verify(state.email, code);
        if (current !== version) return false;
        if (!/^[a-f0-9]{64}$/.test(response?.reset_token) || !Number.isFinite(response.expires_in) || response.expires_in <= 0) throw new AuthApiError('The server returned an invalid response. Request a new code.');
        token = response.reset_token; expiresAt = now() + response.expires_in * 1000;
        update({ step: 'password' });
        return true;
      } catch (failure) { if (current === version) fail(failure); return false; }
      finally { if (current === version) update({ busy: false }); }
    },
    async reset(password, confirmation) {
      if (state.busy || state.step !== 'password' || now() < state.retryAt) return false;
      if (!token || now() >= expiresAt) { token = ''; update({ step: 'code', error: 'Reset authorization expired. Request a new code.' }); return false; }
      if (typeof password !== 'string' || password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^a-zA-Z0-9]/.test(password) || password.includes('\0') || new TextEncoder().encode(password).length > 72) {
        update({ error: 'Use at least 10 characters with uppercase, lowercase, a number, and a symbol (maximum 72 bytes).' }); return false;
      }
      if (password !== confirmation) { update({ error: 'Passwords must match.' }); return false; }
      const current = version;
      update({ busy: true, error: '', errors: {} });
      try {
        const response = await api.reset(state.email, token, password, confirmation);
        if (current !== version) return false;
        if (!response || typeof response.message !== 'string') throw new AuthApiError('The server returned an invalid response. Please try signing in or request a new code.');
        token = ''; expiresAt = 0;
        update({ ...initial(state.email), step: 'done', notice: 'Your password has been updated. Sign in with your new password.' });
        return true;
      } catch (failure) {
        if (current === version) {
          fail(failure);
          if (failure?.errors?.reset_token) { token = ''; expiresAt = 0; update({ step: 'code' }); }
        }
        return false;
      } finally { if (current === version) update({ busy: false }); }
    },
    changeEmail() { if (!state.busy) { version++; token = ''; expiresAt = 0; update(initial(state.email)); } },
    dispose() { version++; token = ''; expiresAt = 0; state = initial(); },
  };
  return model;
}
