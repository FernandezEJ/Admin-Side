import { adminManagementApi } from './adminManagementApi';

export function visibleAdmins(state) {
  const search = state.search.trim().toLowerCase();
  return state.admins.filter((admin) => admin.status === state.statusTab &&
    `${admin.name} ${admin.email}`.toLowerCase().includes(search));
}

export function formatAdminDate(value) {
  return value ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

export function createAdminManagement(requestAdmin, api = adminManagementApi) {
  let state = { admins: [], summary: { total: 0, active: 0, deactivated: 0 }, search: '', statusTab: 'active',
    loading: true, error: '', busy: false, modal: null, draft: { name: '', email: '' }, formError: '', notice: '', copyNotice: '' };
  const listeners = new Set();
  let generation = 0;
  const update = (patch) => { state = { ...state, ...patch }; listeners.forEach((listener) => listener()); };
  const run = (method, ...args) => requestAdmin((token) => api[method](token, ...args));
  const model = {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async load() {
      const current = ++generation;
      update({ loading: true, error: '' });
      try {
        const result = await run('list');
        if (current === generation) update({ admins: result.admins, summary: result.summary, loading: false });
      } catch (error) {
        if (current === generation) update({ loading: false, error: error.message });
      }
    },
    setSearch: (search) => update({ search }),
    setTab: (statusTab) => update({ statusTab }),
    setDraft: (draft) => update({ draft }),
    openEditor(admin = null) {
      update({ modal: { type: 'edit', admin }, draft: { name: admin?.name ?? '', email: admin?.email ?? '' }, formError: '', copyNotice: '' });
    },
    openAction: (type, admin) => update({ modal: { type, admin }, formError: '', copyNotice: '' }),
    closeModal() { if (!state.busy) update({ modal: null, draft: { name: '', email: '' }, formError: '', copyNotice: '' }); },
    async save() {
      if (state.busy || state.modal?.type !== 'edit') return;
      const admin = state.modal.admin;
      const current = generation;
      update({ busy: true, formError: '' });
      try {
        const result = admin ? await run('update', admin.id, state.draft) : await run('create', state.draft);
        if (current !== generation) return;
        update({ modal: admin ? null : { type: 'created', email: result.admin.email, temporaryPassword: result.temporary_password },
          draft: { name: '', email: '' }, notice: admin ? 'Admin updated.' : 'Admin account created.',
          ...(admin ? {} : { statusTab: 'active', search: '' }) });
        await model.load();
      } catch (error) {
        if (current === generation) update({ formError: Object.values(error.errors ?? {}).flat().join(' ') || error.message });
      } finally { update({ busy: false }); }
    },
    async confirm() {
      if (state.busy || !state.modal?.admin) return;
      const { type, admin } = state.modal;
      const current = generation;
      update({ busy: true, formError: '' });
      try {
        await run(type, admin.id);
        if (current !== generation) return;
        update({ modal: null, notice: type === 'reset' ? 'Password reset instructions requested. Delivery may take a moment.'
          : type === 'deactivate' ? 'Admin deactivated.' : 'Admin reactivated.' });
        await model.load();
      } catch (error) {
        if (current === generation) update({ formError: error.message });
      } finally { update({ busy: false }); }
    },
    async copyPassword(clipboard = globalThis.navigator?.clipboard) {
      if (state.modal?.type !== 'created') return;
      try {
        if (!clipboard?.writeText) throw new Error('Clipboard unavailable');
        await clipboard.writeText(state.modal.temporaryPassword);
        if (state.modal?.type === 'created') update({ copyNotice: 'Password copied.' });
      } catch {
        if (state.modal?.type === 'created') update({ copyNotice: 'Unable to copy. Select and copy the password manually.' });
      }
    },
    dispose() { generation++; update({ modal: null, draft: { name: '', email: '' } }); },
  };
  return model;
}
