import { adminRequest } from './adminAuthApi';

const calendarDate = (value) => value ? new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) : '';
export const filterAnnouncements = (items, status, search, month, year) => items.filter((item) =>
  item.status === status && `${item.title} ${item.location}`.toLowerCase().includes(search.trim().toLowerCase()) &&
  (month === 'all' || item.donationDate.slice(5, 7) === month) && (year === 'all' || item.donationDate.slice(0, 4) === year));
export const announcementView = (item) => ({ ...item, donationDate: item.donation_date,
  expiresDate: calendarDate(item.expires_at), publishedDate: calendarDate(item.published_at), notifyDonors: true });

export const announcementsApi = {
  list: async (token) => (await adminRequest('/announcements', { token })).data.map(announcementView),
  detail: async (token, id) => announcementView((await adminRequest(`/announcements/${id}`, { token })).announcement),
  save: async (token, id, draft, image, status) => {
    const body = new FormData();
    for (const [key, value] of Object.entries({ title: draft.title, description: draft.description,
      location: draft.location, donation_date: draft.donationDate, expires_at: draft.expiresDate,
      notify_donors: draft.notifyDonors ? '1' : '0', status })) body.append(key, value);
    if (image) body.append('image', image);
    // PHP parses multipart POST; Laravel resolves the validated PUT method override.
    if (id) body.append('_method', 'PUT');
    return announcementView((await adminRequest(`/announcements${id ? `/${id}` : ''}`, { token, method: 'POST', body })).announcement);
  },
  action: async (token, id, action) => announcementView((await adminRequest(`/announcements/${id}${action === 'delete' ? '' : `/${action}`}`,
    { token, method: action === 'delete' ? 'DELETE' : 'POST' })).announcement),
};

export function createAnnouncements(requestAdmin, id, api = announcementsApi) {
  let state = { items: [], item: null, loading: id !== 'create', busy: false, error: '' };
  let version = 0;
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
    async action(target, action) {
      if (state.busy) return;
      const current = version;
      update({ busy: true, error: '' });
      try {
        const item = await requestAdmin((token) => api.action(token, target, action));
        if (current === version) update({ items: state.items.map((row) => row.id === item.id ? item : row) });
      } catch (error) { if (current === version) update({ error: error.message }); }
      finally { update({ busy: false }); }
    },
    dispose() { version++; },
  };
  return model;
}
