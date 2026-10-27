import { adminRequest } from './adminAuthApi';

export const educationalArticlesApi = {
  list: (token, filters) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value !== '' && value !== 'all') query.set(key, value);
    return adminRequest(`/educational-articles?${query}`, { token });
  },
  detail: (token, id) => adminRequest(`/educational-articles/${id}`, { token }),
  categories: (token) => adminRequest('/educational-articles/categories', { token }),
  save: (token, id, draft, image, status) => {
    const body = new FormData();
    for (const key of ['title', 'category', 'short_description', 'description']) body.append(key, draft[key] ?? '');
    body.append('description_document', JSON.stringify(draft.description_document));body.append('status', status);
    if (image) body.append('image', image);
    if (id !== 'create') body.append('_method', 'PUT');
    return adminRequest(`/educational-articles${id === 'create' ? '' : `/${id}`}`, { token, method: 'POST', body });
  },
  action: (token, id, action) => adminRequest(`/educational-articles/${id}${action === 'delete' ? '' : `/${action}`}`, { token, method: action === 'delete' ? 'DELETE' : 'POST' }),
};

export function createEducationalArticles(requestAdmin, id, initialStatus = 'published', api = educationalArticlesApi) {
  let state = { hasLoaded: false, readFailed: false, item: null, items: [], meta: null, counts: {}, categories: {}, loading: true, busy: false, errorStatus: undefined, error: '', fieldErrors: {},
    filters: { status: initialStatus, search: '', category: 'all', page: 1 } };
  let version = 0, loadingVersion = null;
  const listeners = new Set(), update = patch => { state = { ...state, ...patch };listeners.forEach(notify => notify()); };
  const model = {
    getSnapshot: () => state,
    subscribe: notify => { listeners.add(notify);return () => listeners.delete(notify); },
    async load(filters = state.filters) {
      const changed = JSON.stringify(filters) !== JSON.stringify(state.filters);
      if (loadingVersion === version && !changed) return;
      const current = ++version;loadingVersion = current;
      update({ loading: true, readFailed: false, errorStatus: undefined, error: '', filters });
      try {
        const result = await requestAdmin(token => id === 'create' ? api.categories(token) : id ? api.detail(token, id) : api.list(token, filters));
        if (current === version) update({ ...(id ? { item: result.article ?? null } : { items: result.data, meta: result.meta, counts: result.counts }), categories: result.categories, loading: false, hasLoaded: true });
      } catch (error) { if (current === version) update({ readFailed: true, errorStatus: error.status, error: error.message, loading: false }); }
      finally { if (loadingVersion === current) loadingVersion = null; }
    },
    async mutate(operation) {
      if (state.busy) return false;
      const current = version;update({ busy: true, errorStatus: undefined, error: '', fieldErrors: {} });
      try {
        const result = await requestAdmin(operation);
        if (current !== version) return false;
        update({ item: result.article, categories: result.categories });return true;
      } catch (error) { if (current === version) update({ errorStatus: error.status, error: error.message, fieldErrors: error.errors ?? {} });return false; }
      finally { if (current === version) update({ busy: false }); }
    },
    save: (draft, image, status) => model.mutate(token => api.save(token, id, draft, image, status)),
    action: action => model.mutate(token => api.action(token, id, action)),
    dispose() { version++; },
  };
  return model;
}
