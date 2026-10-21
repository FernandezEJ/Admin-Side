import { adminRequest } from './adminAuthApi';

export const rewardClaimsApi = {
  verify: (token, code) => adminRequest('/rewards/claims/verify', { token, method: 'POST', body: { claim_code: code } }),
  confirm: (token, code) => adminRequest('/rewards/claims/confirm', { token, method: 'POST', body: { claim_code: code } }),
};

const initialState = () => ({ code: '', claim: null, verifiedCode: '', step: 'result', verifying: false, confirming: false, refreshing: false, blocked: false, error: '', modalError: '', notice: '' });
const invalidResponse = () => Object.assign(new Error('Incomplete claim response'), { code: 'INVALID_CLAIM_RESPONSE' });

// Keep only the server's staff-facing fields. An incomplete response never grants
// confirmation access; neither raw redemption status nor catalog stock is authority.
function readClaim(response) {
  const claim = response?.claim;
  if (!claim || !Number.isSafeInteger(claim.voucher_id) || claim.voucher_id <= 0 ||
      typeof claim.donor_name !== 'string' || !claim.donor_name.trim() ||
      typeof claim.reward?.name !== 'string' || !claim.reward.name.trim() ||
      typeof claim.claim_status !== 'string' || typeof claim.can_claim !== 'boolean' ||
      !(claim.claimed_at === null || (typeof claim.claimed_at === 'string' && Number.isFinite(Date.parse(claim.claimed_at))))) throw invalidResponse();
  return { voucher_id: claim.voucher_id, donor_name: claim.donor_name,
    reward: { name: claim.reward.name, size: typeof claim.reward.size === 'string' ? claim.reward.size : null, description: typeof claim.reward.description === 'string' ? claim.reward.description : '' },
    claim_status: claim.claim_status, can_claim: claim.can_claim, claimed_at: claim.claimed_at };
}

export const canConfirmClaim = (claim) => claim?.claim_status === 'pending_claim' && claim.can_claim === true && claim.claimed_at === null;
export const claimStatusLabel = (claim) => claim?.claim_status === 'claimed' ? 'Already Claimed' : claim?.claim_status === 'pending_claim' ? 'Pending Claim' : 'Unavailable';

function failureMessage(error) {
  if (error?.code === 'INVALID_CLAIM_RESPONSE') return 'The server returned incomplete claim information. Verify the code again.';
  // Do not display arbitrary transport/exception text that could contain a code.
  return ({
    401: 'Your session has expired. Please sign in again.',
    403: 'You cannot access reward claims. Refresh your session or complete the required password change.',
    404: 'Claim code not found. Check the code with the donor. Unactivated and legacy vouchers cannot be verified here.',
    409: 'This reward has already been claimed or is no longer available. Check its current status before continuing.',
    422: 'Enter a valid one-time claim code in the format LFW-XXXXXX.',
    429: 'Too many claim requests. Please wait a minute before trying again.',
  })[error?.status] || (error?.status >= 500 ? 'The claim service is unavailable. Please try again shortly.' : 'Unable to reach the server. Check your connection and try again.');
}

// Codes live only in this screen's memory. The model follows the existing service
// store pattern, with synchronous submission locks and stale-response protection.
export function createRewardClaims(requestAdmin, onClaimed = () => {}, api = rewardClaimsApi) {
  let state = initialState();
  let version = 0;
  const listeners = new Set();
  const update = (patch) => { state = { ...state, ...patch }; listeners.forEach((notify) => notify()); };
  const busy = () => state.verifying || state.confirming || state.refreshing;
  async function refreshResult(current, code, voucherId, allowConfirm) {
    update({ refreshing: true });
    try {
      const claim = readClaim(await requestAdmin((token) => api.verify(token, code)));
      if (claim.voucher_id !== voucherId) throw invalidResponse();
      if (current !== version) return false;
      update({ claim, blocked: !allowConfirm });
      return true;
    } catch (error) {
      if (current === version) update({ modalError: `${state.modalError ? state.modalError + ' ' : ''}${failureMessage(error)}`, blocked: true });
      return false;
    } finally { if (current === version) update({ refreshing: false }); }
  }
  const model = {
    getSnapshot: () => state,
    subscribe(notify) { listeners.add(notify); return () => listeners.delete(notify); },
    setCode(code) { if (!busy() && !state.claim) update({ code, error: '', notice: '' }); },
    async verify() {
      if (busy() || state.claim) return false;
      const code = state.code.trim().toUpperCase();
      if (!/^LFW-[A-Z0-9]{6}$/.test(code)) {
        update({ error: code ? 'Use LFW- followed by six letters or numbers.' : 'Enter the one-time claim code.' });
        return false;
      }
      const current = ++version;
      update({ code, verifying: true, claim: null, verifiedCode: '', error: '', modalError: '', notice: '', blocked: false, step: 'result' });
      try {
        const claim = readClaim(await requestAdmin((token) => api.verify(token, code)));
        if (current !== version) return false;
        update({ claim, verifiedCode: code });
        return true;
      } catch (error) { if (current === version) update({ error: failureMessage(error) }); return false; }
      finally { if (current === version) update({ verifying: false }); }
    },
    beginConfirmation() {
      if (busy() || state.blocked || !canConfirmClaim(state.claim)) return;
      update({ step: 'confirm', modalError: '' });
    },
    cancelConfirmation() { if (!busy()) update({ step: 'result' }); },
    close() {
      if (busy()) return;
      version++;
      update({ claim: null, verifiedCode: '', step: 'result', blocked: false, modalError: '' });
    },
    async recheck() {
      if (busy() || !state.claim || !state.verifiedCode) return false;
      const current = ++version;
      update({ step: 'result', modalError: '' });
      return refreshResult(current, state.verifiedCode, state.claim.voucher_id, true);
    },
    async confirm() {
      if (busy() || state.step !== 'confirm' || state.blocked || !canConfirmClaim(state.claim)) return false;
      const current = version, code = state.verifiedCode, voucherId = state.claim.voucher_id;
      update({ confirming: true, modalError: '' });
      try {
        const claim = readClaim(await requestAdmin((token) => api.confirm(token, code)));
        if (current !== version) return false;
        if (claim.voucher_id !== voucherId || claim.claim_status !== 'claimed' || claim.can_claim !== false || !claim.claimed_at) throw invalidResponse();
        update({ ...initialState(), notice: 'Reward marked as claimed. You can verify the next code.' });
        // Refresh existing reports without remounting the input or treating a
        // separate reporting failure as an unsuccessful physical handover.
        try {
          const refreshed = await onClaimed();
          if (current === version && refreshed === false) update({ notice: 'Reward marked as claimed. Refresh Rewards data to see the latest totals.' });
        } catch { if (current === version) update({ notice: 'Reward marked as claimed. Refresh Rewards data to see the latest totals.' }); }
        return true;
      } catch (error) {
        if (current !== version) return false;
        update({ step: 'result', blocked: true, modalError: failureMessage(error) });
        if (error?.status === 409) await refreshResult(current, code, voucherId, false);
        return false;
      } finally { if (current === version) update({ confirming: false }); }
    },
    dispose() { version++; state = initialState(); },
  };
  return model;
}
