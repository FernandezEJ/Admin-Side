import { adminRequest } from './adminAuthApi';
import { monthOptions } from '../data/monthOptions';

export const reportMonths = monthOptions.map(({ value, label }) => [value, label]);

export function currentReportPeriod(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).formatToParts(date);
  return { year: parts.find(({ type }) => type === 'year').value, month: parts.find(({ type }) => type === 'month').value };
}

export function reportPeriodLabel(period) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period ?? '')) return '';
  return `${reportMonths[Number(period.slice(5)) - 1][1]} ${period.slice(0, 4)}`;
}

export const systemReportsApi = {
  load: (token, { year, month }) => adminRequest(`/system-reports?${new URLSearchParams({ year, month })}`, { token }),
};

export function createSystemReports(requestAdmin, api = systemReportsApi, initial = currentReportPeriod(), print = () => window.print()) {
  let state = { ...initial, snapshot: null, loading: true, error: '' };
  let version = 0;
  const listeners = new Set();
  const update = (patch) => { state = { ...state, ...patch }; listeners.forEach((notify) => notify()); };
  const canPrint = () => !!state.snapshot && !state.loading && !state.error && state.snapshot.period === `${state.year}-${state.month}`;
  const model = {
    getSnapshot: () => state,
    subscribe(notify) { listeners.add(notify); return () => listeners.delete(notify); },
    canPrint,
    async load(filters = { year: state.year, month: state.month }) {
      const current = ++version;
      update({ ...filters, loading: true, error: '' });
      try {
        const snapshot = await requestAdmin((token) => api.load(token, filters));
        if (current !== version) return false;
        if (snapshot.period !== `${filters.year}-${filters.month}`) throw new Error('The report period did not match your selection. Please retry.');
        update({ snapshot, loading: false });
        return true;
      } catch (error) {
        if (current === version) update({ loading: false, error: error.message || 'Unable to load this report. Please retry.' });
        return false;
      }
    },
    setFilters(filters) {
      const next = { year: state.year, month: state.month, ...filters };
      if (next.year === state.year && next.month === state.month) return Promise.resolve(false);
      return model.load(next);
    },
    print() {
      if (!canPrint()) return false;
      print();
      return true;
    },
    dispose() { version++; },
  };
  return model;
}
