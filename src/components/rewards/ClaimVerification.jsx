import { LoadingNotice } from '../ui/PageState';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useAdminSession } from '../../auth/useAdminSession';
import { formatDonorName } from '../../services/staffNames';
import { canConfirmClaim, claimStatusLabel, createRewardClaims } from '../../services/rewardClaims';
import AdminDialog from '../ui/AdminDialog';
import { claimCodeSuffix } from '../../services/claimCodeInput';

const buttonBase = 'min-h-11 rounded-xl px-5 py-3 text-sm font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60';
const primaryButton = `${buttonBase} bg-primary hover:bg-primary-hover`;
const successButton = `${buttonBase} bg-success hover:bg-success-hover`;
const secondaryButton = 'min-h-11 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60';

export default function ClaimVerification({ onClaimed }) {
  const { requestAdmin } = useAdminSession();
  const model = useMemo(() => createRewardClaims(requestAdmin, onClaimed), [requestAdmin, onClaimed]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  const inputRef = useRef(null);
  const confirmRef = useRef(null);
  const markRef = useRef(null);
  useEffect(() => () => model.dispose(), [model]);
  useEffect(() => { if (state.notice) inputRef.current?.focus(); }, [state.notice]);
  useEffect(() => {
    if (state.step === 'confirm') confirmRef.current?.focus();
    else if (state.claim) markRef.current?.focus();
  }, [state.step, state.claim]);
  return <ClaimVerificationView state={state} model={model} inputRef={inputRef} confirmRef={confirmRef} markRef={markRef} />;
}

export function ClaimVerificationView({ state, model, inputRef, confirmRef, markRef }) {
  const busy = state.verifying || state.confirming || state.refreshing;
  const { claim } = state;
  const suffix = claimCodeSuffix(state.code);
  return <div id="reward-claim-verification" className="p-4 sm:p-6">
    <div className="max-w-xl">
      <h3 className="text-lg font-bold text-gray-800">Claim Verification</h3>
      <p className="mt-2 text-sm leading-6 text-gray-500">Verify the donor’s code, hand over the item, then confirm the claim.</p>
      <LoadingNotice loading={busy} label="Checking the claim..." /><form className="mt-5" onSubmit={(event) => { event.preventDefault(); void model.verify(); }} aria-busy={state.verifying}>
        <label htmlFor="reward-claim-code" className="block text-sm font-semibold text-gray-700">One-Time Claim Code</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <div role="group" aria-label="Claim code" className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border border-gray-200 focus-within:border-primary focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
            <span id="claim-code-prefix" className="flex select-none items-center border-r border-gray-200 bg-gray-50 px-3 font-mono font-semibold text-gray-700">LFW-</span>
            <input ref={inputRef} id="reward-claim-code" name="claim-code" value={suffix} maxLength={6} pattern="[A-Z0-9]{6}" onChange={(event) => model.setCode(`LFW-${claimCodeSuffix(event.target.value)}`)}
              onPaste={(event) => { event.preventDefault();if (!busy && !claim) model.setCode(`LFW-${claimCodeSuffix(event.clipboardData.getData('text'))}`); }}
              placeholder="XXXXXX" autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={busy || !!claim}
              aria-invalid={!!state.error} aria-describedby={`claim-code-prefix claim-code-help${state.error ? ' claim-code-error' : ''}`}
              className="min-h-11 w-full min-w-0 flex-1 border-0 px-3 py-3 font-mono text-base uppercase text-gray-800 disabled:bg-gray-50" />
          </div>
          <button type="submit" disabled={busy || !!claim || suffix.length !== 6} className={primaryButton}>{state.verifying ? 'Verifying...' : 'Verify Code'}</button>
        </div>
        <p id="claim-code-help" className="mt-2 text-xs leading-5 text-info">Enter six letters or numbers after LFW-. You can also paste the complete code.</p>
        {state.error && <p id="claim-code-error" role="alert" className="mt-3 text-sm text-danger-foreground">{state.error}</p>}
        {state.notice && <p role="status" className="mt-3 text-sm text-success-foreground">{state.notice}</p>}
      </form>
    </div>
    {claim && <AdminDialog title="Verification Result" onClose={model.close} dismissOnBackdrop closeDisabled={busy}>
      <div aria-busy={state.confirming || state.refreshing}>
        <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${claim.claim_status === 'pending_claim' ? 'bg-warning-surface text-warning-foreground' : claim.claim_status === 'claimed' ? 'bg-success-surface text-success-foreground' : 'bg-neutral-surface text-neutral-foreground'}`}>{claimStatusLabel(claim)}</span>
        <dl className="mt-5 space-y-4 text-sm">
          <div><dt className="font-medium text-gray-500">Donor Name</dt><dd className="mt-1 break-words font-semibold text-gray-800">{formatDonorName(claim.donor_name)}</dd></div>
          <div><dt className="font-medium text-gray-500">Item to Claim</dt><dd className="mt-1 break-words font-semibold text-gray-800">{claim.reward.name}{claim.reward.size ? ` — Size ${claim.reward.size}` : ''}</dd>
            {claim.reward.description && <dd className="mt-1 whitespace-pre-line break-words leading-6 text-gray-600">{claim.reward.description}</dd>}</div>
          {claim.claim_status === 'pending_claim' && <div><dt className="font-medium text-gray-500">Claim Code</dt><dd className="mt-1 break-all font-mono text-xl font-bold tracking-wider text-primary">{state.verifiedCode}</dd></div>}
          {claim.claim_status === 'claimed' && <div><dt className="font-medium text-gray-500">Claimed</dt><dd className="mt-1 text-gray-800">{claim.claimed_at ? new Date(claim.claimed_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'Claim date unavailable.'}</dd></div>}
        </dl>
        {state.modalError && <p role="alert" className="mt-5 text-sm leading-6 text-danger-foreground">{state.modalError}</p>}
        {state.refreshing && <p role="status" className="mt-4 text-sm text-gray-500">Checking current claim status...</p>}
        {state.step === 'confirm' ? <div className="mt-6 border-t border-gray-200 pt-5">
          <p className="text-sm font-semibold leading-6 text-gray-800">Confirm that this reward has been handed over to the donor?</p>
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <button type="button" disabled={busy} onClick={model.cancelConfirmation} className={secondaryButton}>Cancel</button>
            <button ref={confirmRef} type="button" disabled={busy} onClick={() => void model.confirm()} className={successButton}>{state.confirming ? 'Confirming...' : 'Confirm Claim'}</button>
          </div>
        </div> : <div className="mt-6">
          {canConfirmClaim(claim) && !state.blocked ? <button ref={markRef} type="button" disabled={busy} onClick={model.beginConfirmation} className={`${successButton} w-full`}>Mark as Claimed</button>
            : <p className="text-sm leading-6 text-gray-500">{claim.claim_status === 'claimed' ? 'This reward has already been claimed. No further confirmation is available.' : 'This claim cannot be confirmed. Check its current status before continuing.'}</p>}
          {state.blocked && claim.claim_status !== 'claimed' && <button type="button" disabled={busy} onClick={() => void model.recheck()} className={`${secondaryButton} mt-4 w-full`}>Check Current Status</button>}
        </div>}
      </div>
    </AdminDialog>}
  </div>;
}
