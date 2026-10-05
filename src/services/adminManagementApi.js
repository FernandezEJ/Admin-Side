import { adminRequest } from './adminAuthApi';

export const adminManagementApi = {
  list: (token, filters = { status: 'all' }) => adminRequest(`/admins?${new URLSearchParams(filters)}`, { token }),
  create: (token, { name, email }) => adminRequest('/admins', { token, method: 'POST', body: { name, email } }),
  update: (token, id, { name, email }) => adminRequest(`/admins/${id}`, { token, method: 'PUT', body: { name, email } }),
  deactivate: (token, id) => adminRequest(`/admins/${id}/deactivate`, { token, method: 'POST' }),
  reactivate: (token, id) => adminRequest(`/admins/${id}/reactivate`, { token, method: 'POST' }),
  reset: (token, id) => adminRequest(`/admins/${id}/send-password-reset`, { token, method: 'POST' }),
};
