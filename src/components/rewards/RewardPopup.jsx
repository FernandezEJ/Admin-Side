import { useCallback, useEffect, useRef, useState } from 'react';
import { useRewards } from '../../services/useRewards';
import { REWARD_CATEGORIES, LEGACY_CATEGORIES } from '../../services/rewardsApi';
import { useAdminSession } from '../../auth/useAdminSession';
import { hasRole } from '../../auth/roles';
import { protectEducationalPopup as protectPopupHistory } from '../../services/educationalPopupHistory';
import { RewardForm } from '../../pages/AddReward';
import AdminDialog from '../ui/AdminDialog';
import { ErrorState, PageSkeleton, LoadingNotice } from '../ui/PageState';
import RewardCover from './RewardCover';
import '../../styles/reward-popup.css';

export default function RewardPopup({ id, onDismiss, onChanged }) {
  return <RewardPopupView remote={useRewards(id)} onDismiss={onDismiss} onChanged={onChanged} />;
}

export function RewardPopupView({ remote, onDismiss, onChanged }) {
  const { item, loading, busy, error, model } = remote;
  const { role, mustChangePassword } = useAdminSession();
  const allowed = hasRole(role) && !mustChangePassword;
  const [editing, setEditing] = useState(false), [confirm, setConfirm] = useState(null), [title, setTitle] = useState('Reward Details');
  const historyRef = useRef(null), closeRequestRef = useRef(null), dirtyRef = useRef(false), submissionRef = useRef(false);
  const cancelRef = useRef(null), previousFocus = useRef(null);
  const close = useCallback(() => historyRef.current?.close(), []);
  const protect = useCallback(value => { dirtyRef.current = value; }, []);
  const requestClose = useCallback(() => {
    if (model.getSnapshot().busy || submissionRef.current) return;
    if (editing) closeRequestRef.current?.();
    else if (confirm) setConfirm(null);
    else close();
  }, [model, editing, confirm, close]);
  const requestCloseRef = useRef(requestClose);
  useEffect(() => { requestCloseRef.current = requestClose; }, [requestClose]);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    historyRef.current = protectPopupHistory(window, {
      getProtection: () => ({ dirty: dirtyRef.current, busy: model.getSnapshot().busy || submissionRef.current }),
      requestClose: () => requestCloseRef.current(), dismiss: onDismiss,
    });
    return () => { historyRef.current.dispose();document.body.style.overflow = overflow; };
  }, [model, onDismiss]);
  useEffect(() => {
    if (confirm) cancelRef.current?.focus();
    else if (previousFocus.current?.isConnected) { previousFocus.current.focus();previousFocus.current = null; }
  }, [confirm]);
  const finish = () => { void onChanged();close(); };
  const transition = async () => {
    if (!allowed || busy || submissionRef.current || !item || !['delete', 'restore'].includes(confirm)) return;
    if (confirm === 'restore' ? item.status !== 'deleted' || !item.recoverable : !['active', 'inactive'].includes(item.status)) return;
    submissionRef.current = true;
    try { if (await model.transition(item.id, confirm)) finish(); } finally { submissionRef.current = false; }
  };
  const ask = action => { previousFocus.current = globalThis.document?.activeElement;setConfirm(action); };
  return <div className="reward-popup"><AdminDialog title={confirm ? confirm === 'delete' ? 'Delete Reward' : 'Restore Reward' : title}
    onClose={requestClose} dismissOnBackdrop closeDisabled={busy}>
    {editing ? <RewardForm remote={remote} popup onClose={close} onSaved={finish} closeRequestRef={closeRequestRef} onDirtyChange={protect} onTitleChange={setTitle} /> :
      <div className="reward-popup-body">
        <LoadingNotice loading={loading || remote.refreshing || busy} hasData={!!item} />{loading && !item ? <PageSkeleton variant="detail" /> : !item ? <ErrorState description={error || 'Reward not found.'} status={remote.errorStatus ?? (!error ? 404 : undefined)} busy={loading} onRetry={() => model.load()} /> : <>
          {error && <ErrorState description={error} compact={!!item} status={remote.errorStatus} busy={loading} onRetry={remote.readFailed ? () => model.load() : undefined} />}
          <div hidden={!!confirm}>
            <RewardDetails item={item} />
            {allowed && <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5">
              {['active', 'inactive'].includes(item.status) ? <>
                <button type="button" disabled={busy} onClick={() => { setTitle('Edit Reward');setEditing(true); }} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">Edit Reward</button>
                <button type="button" disabled={busy} onClick={() => ask('delete')} className="min-h-11 rounded-xl border border-danger-border px-5 text-sm font-semibold text-danger-foreground hover:bg-danger-surface">Delete</button>
              </> : item.status === 'deleted' ? <button type="button" disabled={busy || !item.recoverable} onClick={() => ask('restore')} title={item.recoverable ? 'Restore to Inactive' : 'Recovery period ended; awaiting backend purge'} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-60">Restore to Inactive</button> : null}
            </div>}
          </div>
          {confirm && <div role="group" aria-label={confirm === 'delete' ? 'Delete Reward' : 'Restore Reward'}>
            <p className="text-sm leading-6 text-gray-600">{confirm === 'delete' ? 'Move this reward to Deleted? It can be recovered for 30 days.' : 'Restore this reward to Inactive?'}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-3"><button ref={cancelRef} type="button" disabled={busy} onClick={() => setConfirm(null)} className="min-h-11 rounded-xl border border-gray-200 px-5 text-sm font-semibold">Cancel</button>
              <button type="button" disabled={busy} onClick={() => void transition()} className={`min-h-11 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60 ${confirm === 'delete' ? 'bg-danger hover:bg-danger-hover' : 'bg-primary hover:bg-primary-hover'}`}>Confirm</button>
            </div>
          </div>}
        </>}
      </div>}
  </AdminDialog></div>;
}

export function RewardDetails({ item }) {
  const category = [...REWARD_CATEGORIES, ...LEGACY_CATEGORIES].find(row => row.value === item.category)?.label ?? item.category;
  return <div className="space-y-5">
    <RewardCover src={item.image_url} name={item.name} full />
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="min-w-0 break-words text-xl font-bold">{item.name}</h3>
      <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${item.status === 'active' ? 'bg-success-surface text-success-foreground' : item.status === 'deleted' ? 'bg-danger-surface text-danger-foreground' : 'bg-neutral-surface text-neutral-foreground'}`}>{({active:'Active',inactive:'Inactive',deleted:'Deleted'})[item.status] ?? 'Unavailable'}</span></div>
    {item.description && <p className="whitespace-pre-line break-words text-sm leading-6 text-gray-600">{item.description}</p>}
    <dl className="grid gap-4 text-sm sm:grid-cols-3">
      {[['Category',category],['Points Required',item.pointsRequired],['Available Stock',item.stock],...(item.category === 'vouchers' ? [['Voucher Value',item.voucherValue]] : [])].map(([label,value]) => <div key={label}><dt className="text-gray-500">{label}</dt><dd className="mt-1 break-words font-semibold">{value ?? 'Unavailable'}</dd></div>)}
    </dl>
    {item.category === 'apparel' && item.variants?.some(row => row.enabled) ? <section aria-label="Size inventory"><h4 className="text-sm font-semibold">Size &amp; Inventory</h4><ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">{item.variants.filter(row => row.enabled).map(row => <li key={row.size} className="rounded-xl border border-gray-200 p-3 text-sm">Size {row.size}<span className="mt-1 block font-semibold">{row.stock_quantity} available</span></li>)}</ul></section> : null}
    {item.status === 'deleted' && <p className="text-xs leading-5 text-gray-600">Recoverable for 30 days. Deletion scheduled: {item.scheduled_for_deletion_at?.slice(0,10) || 'Unavailable'}. Definitions with voucher history are retained.</p>}
  </div>;
}
