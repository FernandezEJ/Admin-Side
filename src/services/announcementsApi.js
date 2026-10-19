import { adminRequest, AuthApiError } from './adminAuthApi';

const calendarDate = (value) => value ? new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) : '';
export const filterAnnouncements = (items, status, search, month, year) => items.filter((item) =>
  item.status === status && `${item.title} ${item.location}`.toLowerCase().includes(search.trim().toLowerCase()) &&
  (month === 'all' || item.donationDate.slice(5, 7) === month) && (year === 'all' || item.donationDate.slice(0, 4) === year));
export const announcementView = (item) => ({ ...item, donationDate: item.donation_date,
  expiresDate: calendarDate(item.expires_at), publishedDate: calendarDate(item.published_at), notifyDonors: true });

export const announcementsApi = {
  list: async (token) => (await adminRequest('/announcements', { token })).data.map(announcementView),
  detail: async (token, id) => announcementView((await adminRequest(`/announcements/${id}`, { token })).announcement),
  participants: async (token, id, page) => {
    const result = await adminRequest(`/announcements/${id}/participants?page=${page}`, { token });
    if (!Array.isArray(result.data) || !Number.isInteger(result.meta?.total) || !Number.isInteger(result.meta?.current_page) || !Number.isInteger(result.meta?.last_page)) {
      throw new AuthApiError('Unable to read participation history. Please try again.');
    }
    return result;
  },
  save: async (token, id, draft, image, status) => {
    const body = new FormData();
    for (const [key, value] of Object.entries({ title: draft.title, description: draft.description,
      location: draft.location, donation_date: draft.donationDate, expires_at: draft.expiresDate,
      notify_donors: draft.notifyDonors ? '1' : '0', status })) body.append(key, value);
    if (image) body.append('image', image);
    if (draft.description_document) body.append('description_document', JSON.stringify(draft.description_document));
    // PHP parses multipart POST; Laravel resolves the validated PUT method override.
    if (id) body.append('_method', 'PUT');
    return announcementView((await adminRequest(`/announcements${id ? `/${id}` : ''}`, { token, method: 'POST', body })).announcement);
  },
  action: async (token, id, action) => announcementView((await adminRequest(`/announcements/${id}${action === 'delete' ? '' : `/${action}`}`,
    { token, method: action === 'delete' ? 'DELETE' : 'POST' })).announcement),
};

export function createAnnouncements(requestAdmin, id, api = announcementsApi) {
  let state = { items: [], item: null, loading: id !== 'create', busy: false, error: '',
    participants: [], participantsMeta: null, participantsPage: 1, participantsLoading: false, participantsError: '' };
  let version = 0, participantsVersion = 0;
  const listeners = new Set();
  const update = (patch) => { state = { ...state, ...patch }; listeners.forEach((notify) => notify()); };
  const model = {
    getSnapshot: () => state,
    subscribe: (notify) => { listeners.add(notify); return () => listeners.delete(notify); },
    async load() {
      if (id === 'create') return;
      const current = ++version;
      update({ loading: true, error: '' });
      try {
        const result = await requestAdmin((token) => id ? api.detail(token, id) : api.list(token));
        if (current === version) update({ ...(id ? { item: result } : { items: result }), loading: false });
      } catch (error) { if (current === version) update({ error: error.message, loading: false }); }
    },
    async save(draft, image, status) {
      if (state.busy) return false;
      const current = version;
      update({ busy: true, error: '' });
      try {
        const item = await requestAdmin((token) => api.save(token, id === 'create' ? null : id, draft, image, status));
        if (current !== version) return false;
        update({ item });
        return true;
      } catch (error) {
        if (current === version) update({ error: Object.values(error.errors ?? {}).flat().join(' ') || error.message });
        return false;
      } finally { update({ busy: false }); }
    },
    async loadParticipants(page = 1) {
      if (!id || id === 'create' || state.participantsLoading || !Number.isInteger(page) || page < 1) return false;
      const current = version, operation = ++participantsVersion;
      update({ participantsLoading: true, participantsError: '', participantsPage: page });
      try {
        const result = await requestAdmin((token) => api.participants(token, id, page));
        if (current !== version || operation !== participantsVersion) return false;
        update({ participants: result.data, participantsMeta: result.meta });
        return true;
      } catch (error) {
        if (current === version && operation === participantsVersion) update({ participantsError: error.message });
        return false;
      } finally {
        if (current === version && operation === participantsVersion) update({ participantsLoading: false });
      }
    },
    async action(target, action) {
      if (state.busy) return false;
      const current = version;
      update({ busy: true, error: '' });
      try {
        const item = await requestAdmin((token) => api.action(token, target, action));
        if (current !== version) return false;
        update({ ...(id ? { item } : {}), items: state.items.map((row) => row.id === item.id ? item : row) });
        return true;
      } catch (error) {
        if (current === version) update({ error: error.message });
        return false;
      }
      finally { if (current === version) update({ busy: false }); }
    },
    dispose() { version++; participantsVersion++; },
  };
  return model;
}
