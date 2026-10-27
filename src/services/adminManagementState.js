import { createReadGate } from './readFeedback';
import { adminManagementApi } from './adminManagementApi';
import { formatStaffName } from './staffNames';

export function visibleAdmins(state) {
  const search = state.search.trim().toLowerCase();
  return state.admins.filter((admin) => (state.statusTab === 'all' || admin.status === state.statusTab) &&
    (`${admin.name} ${admin.email}`.toLowerCase().includes(search) ||
      `${formatStaffName(admin.name)} ${admin.email}`.toLowerCase().includes(search)));
}

export function formatAdminDate(value) {
  return value ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

export function createAdminManagement(requestAdmin, api = adminManagementApi) {
  const readGate = createReadGate();
  let state = { hasLoaded: false, admins: [], summary: { total: 0, active: 0, deactivated: 0 }, search: '', statusTab: 'active',
    loading: true, errorStatus: undefined, error: '', busy: false, modal: null, draft: { name: '', email: '' }, formError: '', notice: '', copyNotice: '' };
  const listeners = new Set();
  let generation = 0;
  const update = (patch) => { state = { ...state, ...patch }; listeners.forEach((listener) => listener()); };
  const run = (method, ...args) => requestAdmin((token) => api[method](token, ...args));
  const message = (error) => Object.values(error.errors ?? {}).flat().join(' ') || error.message;
  const listState = (result) => {
    if (!Array.isArray(result.admins) || !result.summary) throw new Error('Admin information is unavailable. Please refresh.');
    return { admins: result.admins, summary: result.summary };
  };
  const details = (admin) => ({ type: 'details', admin, loading: false });
  const returnFromModal = () => {
    const admin = state.modal?.admin;
    update({ modal: state.modal?.fromDetails && admin ? details(admin) : null, draft: { name: '', email: '' }, formErrorStatus: undefined, formError: '', copyNotice: '' });
  };
  const model = {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async load() {
      const ticket = readGate.start('');
      if (!ticket) return;
      const current = ++generation;
      update({ loading: true, errorStatus: undefined, error: '' });
      try {
        const result = await run('list');
        if (current === generation) {
          const data = listState(result);
          const id = state.modal?.type === 'details' ? state.modal.admin?.id : null;
          const admin = id ? data.admins.find(row => row.id === id) : null;
          update({ ...data, loading: false, hasLoaded: true, ...(id ? { modal: details(admin), formError: admin ? '' : 'This Admin account is no longer available.' } : {}) });
        }
      } catch (error) {
        if (current === generation) update({ loading: false, errorStatus: error.status, error: error.message });
      }
      finally { readGate.finish(ticket); }
    },
    setSearch: (search) => update({ search }),
    setTab: (statusTab) => { if (['active', 'deactivated', 'all'].includes(statusTab)) update({ statusTab }); },
    setDraft: (draft) => update({ draft }),
    async openDetails(admin) {
      if (state.busy || state.modal?.loading || !admin) return;
      const current = ++generation;
      update({ modal: { ...details(admin), loading: true }, formErrorStatus: undefined, formError: '', copyNotice: '' });
      try {
        const result = listState(await run('list'));
        if (current !== generation) return;
        const selected = result.admins.find(row => row.id === admin.id);
        update({ ...result, loading: false, errorStatus: undefined, error: '', modal: details(selected), formError: selected ? '' : 'This Admin account is no longer available.' });
      } catch (error) {
        if (current === generation) update({ loading: false, modal: { ...details(admin), unavailable: true }, formErrorStatus: error.status, formError: message(error) });
      }
    },
    openEditor(admin = null) {
      if (state.busy || state.modal?.loading) return;
      update({ modal: { type: 'edit', admin, fromDetails: state.modal?.type === 'details' }, draft: { name: admin?.name ?? '', email: admin?.email ?? '' }, formErrorStatus: undefined, formError: '', copyNotice: '' });
    },
    openAction(type, admin) {
      if (state.busy || state.modal?.loading || !admin || !['deactivate', 'reactivate'].includes(type)) return;
      update({ modal: { type, admin, fromDetails: state.modal?.type === 'details' }, formErrorStatus: undefined, formError: '', copyNotice: '' });
    },
    closeModal() {
      if (state.busy) return;
      if (state.modal?.discard) { update({ modal: { ...state.modal, discard: false } }); return; }
      if (state.modal?.type === 'edit' && (state.draft.name !== (state.modal.admin?.name ?? '') || state.draft.email !== (state.modal.admin?.email ?? ''))) {
        update({ modal: { ...state.modal, discard: true } });
        return;
      }
      generation++;
      returnFromModal();
    },
    keepEditing() { if (!state.busy) update({ modal: { ...state.modal, discard: false } }); },
    discardEdit() { if (!state.busy) { generation++; returnFromModal(); } },
    async save() {
      if (state.busy || state.modal?.type !== 'edit' || state.modal.discard) return;
      const admin = state.modal.admin;
      const fromDetails = state.modal.fromDetails;
      const current = generation;
      update({ busy: true, formError: '' });
      try {
        const result = admin ? await run('update', admin.id, state.draft) : await run('create', state.draft);
        if (current !== generation) return;
        update({ modal: admin ? (fromDetails ? details(result.admin) : null) : { type: 'created', email: result.admin.email, temporaryPassword: result.temporary_password },
          draft: { name: '', email: '' }, notice: admin ? 'Admin updated.' : 'Admin account created.',
          ...(admin ? {} : { statusTab: 'active', search: '' }) });
        await model.load();
      } catch (error) {
        if (current === generation) update({ formError: Object.values(error.errors ?? {}).flat().join(' ') || error.message });
      } finally { update({ busy: false }); }
    },
    async confirm() {
      if (state.busy || !state.modal?.admin || !['deactivate', 'reactivate'].includes(state.modal.type)) return;
      const { type, admin } = state.modal;
      const current = generation;
      update({ busy: true, formError: '' });
      try {
        const result = await run(type, admin.id);
        if (current !== generation) return;
        update({ modal: state.modal.fromDetails ? details(result.admin) : null, notice: type === 'deactivate' ? 'Admin deactivated.' : 'Admin reactivated.' });
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
    dispose() { readGate.clear(); generation++; update({ modal: null, draft: { name: '', email: '' } }); },
  };
  return model;
}
