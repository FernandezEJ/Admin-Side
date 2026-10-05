import { adminRequest } from './adminAuthApi';

export const donorsApi = {
  load(token, filters) {
    const query = new URLSearchParams({ page: String(filters.page), per_page: '20' });
    if (filters.searchTerm.trim()) query.set('search', filters.searchTerm.trim());
    if (filters.selectedBloodType !== 'all') query.set('blood_type', filters.selectedBloodType);
    if (filters.selectedEligibility !== 'all') query.set('eligibility', filters.selectedEligibility);
    return adminRequest(`/donors?${query}`, { token });
  },
};

export function createDonors(requestAdmin, api = donorsApi) {
  const filters = { searchTerm: '', selectedBloodType: 'all', selectedEligibility: 'all' };
  let state = { data: null, loading: true, error: '', activeTab: 'all', page: 1, ...filters };
  let version = 0;
  const listeners = new Set();
  const update = (patch) => { state = { ...state, ...patch }; listeners.forEach((notify) => notify()); };
  const model = {
    getSnapshot: () => state,
    subscribe(notify) { listeners.add(notify); return () => listeners.delete(notify); },
    setActiveTab: (activeTab) => update({ activeTab }),
    setSearchTerm: (searchTerm) => model.load({ searchTerm, page: 1 }),
    setSelectedBloodType: (selectedBloodType) => model.load({ selectedBloodType, page: 1 }),
    setSelectedEligibility: (selectedEligibility) => model.load({ selectedEligibility, page: 1 }),
    clearFilters: () => model.load({ ...filters, page: 1 }),
    setPage(page) {
      if (state.loading || !Number.isInteger(page) || page < 1 || page > (state.data?.pagination.lastPage ?? 1) || page === state.page) return;
      return model.load({ page });
    },
    async load(patch = {}) {
      const current = ++version;
      const request = { ...state, ...patch };
      update({ ...patch, loading: true, error: '' });
      try {
        const data = await requestAdmin((token) => api.load(token, request));
        if (current === version) update({ data, page: data.pagination.currentPage, loading: false });
      } catch (error) {
        if (current === version) update({ loading: false, error: error.message });
      }
    },
    dispose() { version++; },
  };
  return model;
}
