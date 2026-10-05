import { adminRequest } from './adminAuthApi';

export const dashboardApi = { load: (token, months) => adminRequest(`/dashboard?months=${months}`, { token }) };

export function createDashboard(requestAdmin, api = dashboardApi) {
  let state = { data: null, months: 6, loading: true, error: '', chartLoading: false, chartError: '' };
  let version = 0;
  const listeners = new Set();
  const update = (patch) => { state = { ...state, ...patch }; listeners.forEach((notify) => notify()); };
  const model = {
    getSnapshot: () => state,
    subscribe(notify) { listeners.add(notify); return () => listeners.delete(notify); },
    async load(months = state.months) {
      const current = ++version;
      const chartOnly = state.data !== null;
      update({ months, loading: !chartOnly, chartLoading: chartOnly, error: '', chartError: '' });
      try {
        const data = await requestAdmin((token) => api.load(token, months));
        if (current === version) update({ data: chartOnly
          ? { ...state.data, months: data.months, donation_activity: data.donation_activity }
          : data, loading: false, chartLoading: false });
      } catch (error) {
        if (current === version) update({ loading: false, chartLoading: false,
          ...(chartOnly ? { chartError: error.message } : { error: error.message }) });
      }
    },
    dispose() { version++; },
  };
  return model;
}
