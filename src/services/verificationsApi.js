import { adminRequest } from './adminAuthApi';

export const VERIFICATION_STATUS_LABELS = Object.freeze({
  for_verification: 'For Verification',
  needs_revision: 'Need Revision',
  completed: 'Completed',
  rejected: 'Rejected',
});

const calendar = (value) => value ? new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) : '';
export const verificationRow = (item) => ({ ...item, donor: item.donor.name, email: item.donor.email ?? '',
  bloodType: item.donor.blood_type ?? 'Unknown', event: item.opportunity.title ?? 'Donation activity',
  submittedDate: calendar(item.proof_uploaded_at ?? item.joined_at) });
export const filterVerifications = (rows, status, search, month, year) => rows.filter((row) => row.status === status &&
  `${row.donor} ${row.email} ${row.event} ${row.bloodType}`.toLowerCase().includes(search.trim().toLowerCase()) &&
  (month === 'all' || row.submittedDate.slice(5, 7) === month) && (year === 'all' || row.submittedDate.slice(0, 4) === year));
export const verificationsApi = {
  list: async (token) => (await adminRequest('/verifications', { token })).data.map(verificationRow),
  detail: async (token, id) => (await adminRequest(`/verifications/${id}`, { token })).verification,
  proof: (token, id) => adminRequest(`/verifications/${id}/proof`, { token, responseType: 'blob' }),
  review: async (token, id, action, proof_version, reason) => (await adminRequest(`/verifications/${id}/${action}`,
    { token, method: 'POST', body: { proof_version, ...(action === 'approve' ? {} : { reason }) } })).verification,
};

export function createVerifications(requestAdmin, id, api = verificationsApi, urls = URL) {
  let state = { items: [], item: null, loading: true, busy: false, error: '', proofUrl: '', proofType: '', proofLoading: false, proofError: '' };
  const listeners = new Set();
  let version = 0;
  const update = (patch) => { state = { ...state, ...patch }; listeners.forEach((notify) => notify()); };
  const clearProof = () => { if (state.proofUrl) urls.revokeObjectURL(state.proofUrl); update({ proofUrl: '', proofType: '', proofError: '', proofLoading: false }); };
  const model = {
    getSnapshot: () => state,
    subscribe(notify) { listeners.add(notify); return () => listeners.delete(notify); },
    async load() {
      const current = ++version;
      clearProof(); update({ loading: true, error: '' });
      try {
        const value = await requestAdmin((token) => id ? api.detail(token, id) : api.list(token));
        if (current === version) update({ ...(id ? { item: value } : { items: value }), loading: false });
      } catch (error) { if (current === version) update({ loading: false, error: error.message }); }
    },
    async openProof() {
      if (!state.item?.proof || state.proofLoading) return;
      const current = version;
      clearProof(); update({ proofLoading: true });
      try {
        const blob = await requestAdmin((token) => api.proof(token, id));
        if (current === version) update({ proofUrl: urls.createObjectURL(blob), proofType: blob.type, proofLoading: false });
      } catch (error) { if (current === version) update({ proofLoading: false, proofError: error.message }); }
    },
    async review(action, reason = '') {
      if (state.busy || state.item?.status !== 'for_verification') return false;
      if (action !== 'approve' && !reason.trim()) { update({ error: 'Enter a reason.' }); return false; }
      const current = version;
      update({ busy: true, error: '' });
      try {
        const item = await requestAdmin((token) => api.review(token, id, action, state.item.proof?.version, reason.trim()));
        if (current !== version) return false;
        update({ item });
        return true;
      } catch (error) {
        if (current === version) {
          if (error.status === 409) await model.load();
          update({ error: Object.values(error.errors ?? {}).flat().join(' ') || error.message });
        }
        return false;
      } finally { update({ busy: false }); }
    },
    dispose() { version++; clearProof(); },
  };
  return model;
}
