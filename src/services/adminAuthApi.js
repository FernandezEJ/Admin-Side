export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

export class AuthApiError extends Error {
  constructor(message, status = 0, errors = {}) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.errors = errors;
  }
}

export async function adminRequest(path, { token, body, method = 'GET', responseType = 'json' } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const multipart = body instanceof FormData;
  try {
    const response = await fetch(`${API_BASE_URL}/admin${path}`, {
      method, credentials: 'omit',
      headers: { Accept: 'application/json',
        ...(body && !multipart ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}), signal: controller.signal,
    });
    if (response.ok && responseType === 'blob') {
      if (!['image/jpeg', 'image/png', 'application/pdf'].includes(response.headers.get('Content-Type')?.split(';')[0])) {
        throw new AuthApiError('This proof format cannot be previewed.');
      }
      return await response.blob();
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const errors = response.status === 422 && data?.errors ? data.errors : {};
      const message = response.status >= 500 ? 'The server is unavailable. Please try again.'
        : response.status === 429 ? 'Too many attempts. Please wait a minute and try again.'
          : typeof data?.message === 'string' ? data.message : 'Unable to complete this request.';
      throw new AuthApiError(message, response.status, errors);
    }
    if (!data) throw new AuthApiError('The server returned an invalid response. Please try again.');
    return data;
  } catch (error) {
    if (error instanceof AuthApiError) throw error;
    throw new AuthApiError('Unable to reach the server. Please try again.');
  } finally { clearTimeout(timeout); }
}

export const adminAuthApi = {
  login: ({ email, password }) => adminRequest('/login', { method: 'POST', body: { email, password } }),
  me: (token) => adminRequest('/me', { token }),
  logout: (token) => adminRequest('/logout', { method: 'POST', token }),
  changeInitialPassword: (token, { current_password, password, password_confirmation }) => adminRequest('/change-initial-password', {
    method: 'POST', token, body: { current_password, password, password_confirmation },
  }),
};
