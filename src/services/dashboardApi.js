import { createReadGate } from './readFeedback';
import { adminRequest } from './adminAuthApi';

export const dashboardApi = { load: (token, months) => adminRequest(`/dashboard?months=${months}`, { token }) };

export function createDashboard(requestAdmin, api = dashboardApi) {
  const readGate = createReadGate();
  let state = { hasLoaded: false, data: null, months: 6, loading: true, errorStatus: undefined, error: '', chartLoading: false, chartError: '' };
  let version = 0;
  const listeners = new Set();
  const update = (patch) => { state = { ...state, ...patch }; listeners.forEach((notify) => notify()); };
  const model = {
    getSnapshot: () => state,
    subscribe(notify) { listeners.add(notify); return () => listeners.delete(notify); },
    async load(months = state.months) {
      const ticket = readGate.start(String(months));
      if (!ticket) return;
      const current = ++version;
      const chartOnly = state.data !== null;
      update({ months, loading: !chartOnly, chartLoading: chartOnly, errorStatus: undefined, error: '', chartError: '' });
      try {
        const data = await requestAdmin((token) => api.load(token, months));
        if (current === version) update({ data: chartOnly
          ? { ...state.data, months: data.months, donation_activity: data.donation_activity }
          : data, loading: false, hasLoaded: true, chartLoading: false });
      } catch (error) {
        if (current === version) update({ loading: false, chartLoading: false,
          ...(chartOnly ? { chartErrorStatus: error.status, chartError: error.message } : { errorStatus: error.status, error: error.message }) });
      }
      finally { readGate.finish(ticket); }
    },
    dispose() { readGate.clear(); version++; },
  };
  return model;
}
