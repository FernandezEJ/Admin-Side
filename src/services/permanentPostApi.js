import { adminRequest } from './adminAuthApi';

export const permanentPostApi = {
  read: async (token) => (await adminRequest('/permanent-post', { token })).post,
  save: async (token, draft, image) => {
    const body = new FormData();
    for (const key of ['title', 'summary', 'description']) body.append(key, draft[key]);
    if (draft.description_document) body.append('description_document', JSON.stringify(draft.description_document));
    if (image) body.append('image', image);
    body.append('_method', 'PUT');
    return (await adminRequest('/permanent-post', { token, method: 'POST', body })).post;
  },
};

export function createPermanentPost(requestAdmin, api = permanentPostApi) {
  let state = { item: null, loading: true, busy: false, errorStatus: undefined, error: '', saved: false }, version = 0, loadingVersion = null;
  const listeners = new Set();
  const update = (patch) => { state = { ...state, ...patch }; listeners.forEach((notify) => notify()); };
  return {
    getSnapshot: () => state,
    subscribe: (notify) => { listeners.add(notify); return () => listeners.delete(notify); },
    async load() {
      if (loadingVersion === version) return;
      const current = ++version;
      loadingVersion = current;
      update({ loading: true, errorStatus: undefined, error: '' });
      try {
        const item = await requestAdmin((token) => api.read(token));
        if (current === version) update({ item, loading: false });
      } catch (error) { if (current === version) update({ loading: false, errorStatus: error.status, error: error.message }); }
      finally { if (loadingVersion === current) loadingVersion = null; }
    },
    async save(draft, image) {
      if (state.busy) return false;
      const current = version;
      update({ busy: true, errorStatus: undefined, error: '', saved: false });
      try {
        const item = await requestAdmin((token) => api.save(token, draft, image));
        if (current !== version) return false;
        update({ item, saved: true });
        return true;
      } catch (error) {
        if (current === version) update({ error: Object.values(error.errors ?? {}).flat().join(' ') || error.message });
        return false;
      } finally { if (current === version) update({ busy: false }); }
    },
    dispose() { version++; },
  };
}
