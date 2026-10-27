import { createReadGate } from './readFeedback';
import { adminRequest } from './adminAuthApi';

export const auditLogsApi = {
  list(token, filters) {
    const query = new URLSearchParams({ page: String(filters.page) });
    for (const key of ['search', 'module', 'month']) {
      if (filters[key]) query.set(key, filters[key]);
    }
    return adminRequest(`/audit-logs?${query}`, { token });
  },
};

const readable = (value) => value ? value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()) : 'Unknown';
export const auditActionLabel = readable;
const moduleLabels = { admin_accounts: 'Admin Management', verification: 'Verification',
  announcements: 'Announcements', rewards: 'Rewards', system: 'System' };
export const auditModuleLabel = (value) => Object.hasOwn(moduleLabels, value) ? moduleLabels[value] : readable(value);
export function formatAuditDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit' }).format(date);
}

export function createAuditLogs(requestAdmin, api = auditLogsApi) {
  const readGate = createReadGate();
  let state = { hasLoaded: false, data: [], modules: [], search: '', module: '', month: '', page: 1, loading: true, errorStatus: undefined, error: '',
    pagination: { currentPage: 1, lastPage: 1, perPage: 20, total: 0 } };
  let version = 0;
  const listeners = new Set();
  const update = (patch) => { state = { ...state, ...patch }; listeners.forEach((notify) => notify()); };
  const model = {
    getSnapshot: () => state,
    subscribe(notify) { listeners.add(notify); return () => listeners.delete(notify); },
    async load(patch = {}) {
      const ticket = readGate.start(JSON.stringify({ search: state.search, module: state.module, month: state.month, page: state.page, ...patch }));
      if (!ticket) return;
      const current = ++version;
      const filters = { search: state.search, module: state.module, month: state.month, page: state.page, ...patch };
      update({ ...filters, loading: true, errorStatus: undefined, error: '' });
      try {
        const result = await requestAdmin((token) => api.list(token, filters));
        if (current === version) update({ data: result.data, modules: result.modules,
          pagination: result.pagination, page: result.pagination.currentPage, loading: false, hasLoaded: true });
      } catch (error) {
        if (current === version) update({ loading: false, errorStatus: error.status, error: error.message });
      }
      finally { readGate.finish(ticket); }
    },
    setFilters: (filters) => model.load({ ...filters, page: 1 }),
    setPage(page) {
      if (state.loading || page < 1 || page > state.pagination.lastPage) return;
      return model.load({ page });
    },
    dispose() { readGate.clear(); version++; },
  };
  return model;
}
