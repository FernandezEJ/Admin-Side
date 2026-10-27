import { createReadGate } from './readFeedback';
import { adminRequest } from './adminAuthApi';

export const rewardRow = (item) => ({ ...item, voucherValue: item.voucher_value == null ? null : Number(item.voucher_value), pointsRequired: item.points_cost, stock: item.stock_quantity });
export const REWARD_CATEGORIES = [
  { value: 'merchandise', label: 'Merchandise' },
  { value: 'apparel', label: 'Apparel' },
  { value: 'vouchers', label: 'Vouchers' },
];
export const APPAREL_SIZES = ['S', 'M', 'L', 'XL', '2XL'];
export const LEGACY_CATEGORIES = [
  { value: 'grocery', label: 'Grocery' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'other', label: 'Other' },
];
export const FILTER_CATEGORIES = [...REWARD_CATEGORIES, ...LEGACY_CATEGORIES];
export const rewardsApi = {
  list: async (token) => (await adminRequest('/rewards', { token })).data.map(rewardRow),
  detail: async (token, id) => rewardRow((await adminRequest(`/rewards/${id}`, { token })).reward),
  redemptions: async (token) => (await adminRequest('/rewards/redemptions', { token })).data,
  analytics: (token, year) => adminRequest(`/rewards/analytics?${new URLSearchParams({ year })}`, { token }),
  save: async (token, data, id) => {
    const body = new FormData();
    for (const [key, value] of Object.entries(data)) {
      if (key === 'variants') value.forEach((variant, index) => Object.entries(variant).forEach(([field, entry]) => body.append(`variants[${index}][${field}]`, entry)));
      else if (value !== null && value !== undefined) body.append(key, value);
    }
    if (id) body.append('_method', 'PUT');
    return rewardRow((await adminRequest(id ? `/rewards/${id}` : '/rewards', { token, method: 'POST', body })).reward);
  },
  transition: (token, id, action) => adminRequest(`/rewards/${id}${action === 'restore' ? '/restore' : ''}`, { token, method: action === 'restore' ? 'POST' : 'DELETE' }),
};

export function validateReward(data) {
  if (!data.name.trim()) return 'Enter a reward name.';
  if (!FILTER_CATEGORIES.some(({ value }) => value === data.category)) return 'Choose a reward category.';
  const amount = Number(data.voucher_value);
  if (data.category === 'vouchers' && (!(amount > 0 && amount <= 100000) || !/^\d+(\.\d{1,2})?$/.test(String(data.voucher_value)))) return 'Enter a voucher value from 0.01 to 100,000 with up to two decimal places.';
  if (!Number.isInteger(Number(data.points_cost)) || Number(data.points_cost) < 1 || Number(data.points_cost) > 2147483647) return 'Points cost must be a positive whole number.';
  if (data.stock_quantity === '' || !Number.isInteger(Number(data.stock_quantity)) || Number(data.stock_quantity) < 0 || Number(data.stock_quantity) > 2147483647) return 'Stock must be a non-negative whole number.';
  if (data.category === 'apparel' && (!data.variants?.length || data.variants.length > 5 || new Set(data.variants.map(row => row.size)).size !== data.variants.length || data.variants.some(row => !APPAREL_SIZES.includes(row.size) || row.stock_quantity === '' || !Number.isInteger(Number(row.stock_quantity)) || Number(row.stock_quantity) < 0 || Number(row.stock_quantity) > 429496729))) return 'Offer at least one size and enter a non-negative whole quantity for each enabled size.';
  if (data.image && (!['image/jpeg', 'image/png'].includes(data.image.type) || data.image.size > 5 * 1024 * 1024)) return 'Choose a JPG or PNG up to 5 MB.';
  return '';
}

export function createRewards(requestAdmin, id, api = rewardsApi) {
  const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila', year: 'numeric' });
  const readGate = createReadGate(), analyticsGate = createReadGate();
  let state = { hasLoaded: false, items: [], redemptions: [], analytics: null, item: null, year, loading: id !== 'new', analyticsLoading: false, analyticsError: '', busy: false, errorStatus: undefined, error: '' };
  let version = 0;
  let analyticsVersion = 0;
  const listeners = new Set();
  const update = (patch) => { state = { ...state, ...patch }; listeners.forEach((notify) => notify()); };
  const message = (error) => Object.values(error.errors ?? {}).flat().join(' ') || error.message;
  const model = {
    getSnapshot: () => state,
    subscribe(notify) { listeners.add(notify); return () => listeners.delete(notify); },
    async load(year = state.year, { background = false } = {}) {
      if (id === 'new') return;
      const ticket = readGate.start(String(year));
      if (!ticket) return;
      const current = ++version;
      analyticsGate.clear();
      const currentAnalytics = ++analyticsVersion;
      update({ readFailed: false, refreshing: background, year, loading: !background || !state.hasLoaded, errorStatus: undefined, error: '', analyticsLoading: false, analyticsError: '' });
      try {
        const result = id ? { item: await requestAdmin((token) => api.detail(token, id)) }
          : await requestAdmin(async (token) => {
            const [items, redemptions, analytics] = await Promise.all([api.list(token), api.redemptions(token), api.analytics(token, year)]);
            return { items, redemptions, analytics };
          });
        if (current === version) {
          if (currentAnalytics !== analyticsVersion) delete result.analytics;
          update({ ...result, refreshing: false, loading: false, hasLoaded: true });
        }
      } catch (error) { if (current === version) update({ readFailed: true, refreshing: false, loading: false, errorStatus: error.status, error: message(error) }); }
      finally { readGate.finish(ticket); }
    },
    async loadAnalytics(year = state.year) {
      if (id) return false;
      const ticket = analyticsGate.start(String(year));
      if (!ticket) return false;
      const current = ++analyticsVersion;
      update({ year, analyticsLoading: true, analyticsError: '' });
      try {
        const analytics = await requestAdmin((token) => api.analytics(token, year));
        if (current !== analyticsVersion) return false;
        update({ analytics, analyticsLoading: false });
        return true;
      } catch (error) {
        if (current === analyticsVersion) update({ analyticsLoading: false, analyticsErrorStatus: error.status, analyticsError: message(error) });
        return false;
      } finally { analyticsGate.finish(ticket); }
    },
    async refreshClaims() {
      if (id) return false;
      const current = version;
      analyticsGate.clear();
      const currentAnalytics = ++analyticsVersion;
      try {
        const result = await requestAdmin(async (token) => {
          const [redemptions, analytics] = await Promise.all([api.redemptions(token), api.analytics(token, state.year)]);
          return { redemptions, analytics };
        });
        if (current !== version) return false;
        if (currentAnalytics !== analyticsVersion) delete result.analytics;
        update({ ...result, errorStatus: undefined, error: '', ...(currentAnalytics === analyticsVersion ? { analyticsLoading: false, analyticsError: '' } : {}) });
        return true;
      } catch (error) {
        if (current === version) update({ error: `Claim saved, but Rewards data could not be refreshed. ${message(error)}`, ...(currentAnalytics === analyticsVersion ? { analyticsLoading: false } : {}) });
        return false;
      }
    },
    async save(data) {
      if (state.busy) return false;
      const error = validateReward(data);
      if (error) { update({ errorStatus: undefined, error }); return false; }
      const current = version;
      update({ busy: true, errorStatus: undefined, error: '' });
      try {
        const item = await requestAdmin((token) => api.save(token, data, id === 'new' ? undefined : id));
        if (current !== version) return false;
        update({ item });
        return true;
      } catch (error) { if (current === version) update({ errorStatus: error.status, error: message(error) }); return false; }
      finally { if (current === version) update({ busy: false }); }
    },
    async transition(itemId, action) {
      if (state.busy) return false;
      const current = version;
      update({ busy: true, errorStatus: undefined, error: '' });
      try {
        await requestAdmin((token) => api.transition(token, itemId, action));
        if (current !== version) return false;
        await model.load();
        return true;
      } catch (error) { if (current === version) update({ errorStatus: error.status, error: message(error) }); return false; }
      finally { update({ busy: false }); }
    },
    dispose() { readGate.clear(); analyticsGate.clear(); version++; analyticsVersion++; },
  };
  return model;
}
