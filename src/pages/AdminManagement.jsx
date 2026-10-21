import { EmptyState, ErrorState, PageSkeleton } from '../components/ui/PageState';
import { isRecoverable } from '../data/recoveryPolicy';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Search, Plus, UserRoundCog, UserCheck, UserX } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import AdminDialog from '../components/ui/AdminDialog';
import { useAdminSession } from '../auth/useAdminSession';
import { createAdminManagement, visibleAdmins, formatAdminDate as formatDate } from '../services/adminManagementState';
import { formatStaffName } from '../services/staffNames';

const buttonBase = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 rounded-xl border px-4 py-2.5 text-sm font-semibold text-white';
const primaryButton = `${buttonBase} border-primary-hover bg-primary hover:bg-primary-hover`;
const warningButton = `${buttonBase} border-warning bg-warning hover:bg-warning-hover`;
const successButton = `${buttonBase} border-success bg-success hover:bg-success-hover`;
const dangerButton = `${buttonBase} border-danger bg-danger hover:bg-danger-hover`;
const secondaryButton = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50';
const inputClass = 'mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-primary';

export default function AdminManagement() {
  const { requestAdmin } = useAdminSession();
  const [model] = useState(() => createAdminManagement(requestAdmin));
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  useEffect(() => { model.load(); return () => model.dispose(); }, [model]);
  return <AdminManagementView state={state} model={model} />;
}

export function AdminManagementView({ state, model }) {
  const { search, statusTab, modal, draft, formError: error, notice, loading, summary, busy, copyNotice } = state;
  const filteredAdmins = visibleAdmins(state);
  const { openEditor, setSearch, setTab: setStatusTab, setDraft, closeModal } = model;
  const contentRef = useRef(null);
  const returnId = useRef(null);
  const hadModal = useRef(false);
  useEffect(() => {
    if (modal) {
      hadModal.current = true;
      returnId.current = modal.admin?.id ?? null;
    } else if (hadModal.current && !loading) {
      hadModal.current = false;
      const target = returnId.current ? document.getElementById(`admin-row-${returnId.current}`) : null;
      (target ?? document.getElementById('create-admin'))?.focus({ preventScroll: true });
    }
  }, [modal, loading]);
  useEffect(() => {
    if (!busy) contentRef.current?.querySelector('[data-dialog-initial-focus]')?.focus();
  }, [modal?.type, modal?.discard, modal?.loading, busy]);
  function handleDialogKeys(event) {
    const dialog = event.target.closest('dialog');
    if (!dialog) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex]'))
      .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
    const first = controls[0];
    const last = controls.at(-1);
    if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  }
  function handleSave(event) { event.preventDefault(); model.save(); }
  function openDetails(admin, row) {
    row.focus({ preventScroll: true });
    void model.openDetails(admin);
  }

  return (
    <div onKeyDown={handleDialogKeys} className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Header title="Admin Management" description="Manage LifeFlow administrator accounts and access." />
        <div className="p-4 lg:p-8">
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {[
              { status: 'active', label: 'Active Admins', count: summary.active, icon: UserCheck },
              { status: 'deactivated', label: 'Deactivated Admins', count: summary.deactivated, icon: UserX },
              { status: 'all', label: 'Total Admins', count: summary.total, icon: UserRoundCog },
            ].map(({ status, label, count, icon: Icon }) => (
              <button key={status} type="button" aria-label={`Show ${label}`} aria-pressed={statusTab === status} onClick={() => setStatusTab(status)} className={`min-w-0 cursor-pointer rounded-2xl border p-5 text-left transition hover:border-primary-border hover:bg-selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${statusTab === status ? 'border-primary-border bg-selected' : 'border-gray-200 bg-white'}`}>
                <Icon size={20} className="mb-3 text-primary" />
                <p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900">{loading ? '—' : count}</p>
              </button>
            ))}
          </div>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="w-full text-sm font-semibold text-gray-600 sm:max-w-md">
              Search Admins
              <div className="relative mt-2">
                <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 font-normal outline-none focus:border-primary" />
              </div>
            </label>
            <button id="create-admin" type="button" onClick={() => openEditor()} className={`${primaryButton} flex items-center justify-center gap-2`}><Plus size={18} />Create Admin</button>
          </div>
          <p className="mb-4 text-sm text-gray-500">Deactivated accounts are recoverable for 30 days. Automatic cleanup runs on the server; accounts with historical records are retained for review.</p>
          <p role="status" className="mb-4 text-sm text-gray-600">{notice}</p>
          {loading ? <PageSkeleton /> : state.error ? <ErrorState description={state.error} onRetry={model.load} /> : <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">Admin accounts</caption>
                <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>
                  {['Name', 'Email', 'Last Login', 'Date Created', 'Status'].map((label) => <th key={label} scope="col" className="px-4 py-4">{label}</th>)}
                </tr></thead>
                <tbody>
                  {filteredAdmins.map((admin) => (
                    <tr id={`admin-row-${admin.id}`} key={admin.id} tabIndex={0} aria-label={`View Admin: ${formatStaffName(admin.name)}`} aria-haspopup="dialog"
                      onClick={(event) => {
                        if (event.target.closest('button, a, input, select, textarea, [role="button"], [contenteditable="true"]')) return;
                        openDetails(admin, event.currentTarget);
                      }}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget || event.repeat) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openDetails(admin, event.currentTarget);
                        }
                      }}
                      className="cursor-pointer border-t border-gray-100 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
                      <td className="max-w-48 break-words px-4 py-5 font-semibold text-gray-800">{formatStaffName(admin.name)}</td>
                      <td className="max-w-56 break-words px-4 py-5 text-gray-600">{admin.email}</td>
                      <td className="px-4 py-5 text-gray-500">{formatDate(admin.last_login_at)}</td>
                      <td className="px-4 py-5 text-gray-500">{formatDate(admin.created_at)}</td>
                      <td className="px-4 py-5"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${admin.status === 'active' ? 'bg-success-surface text-success-foreground' : 'bg-neutral-surface text-neutral-foreground'}`}>{admin.status === 'active' ? 'Active' : 'Deactivated'}</span>{admin.scheduled_for_deletion_at && <p className="mt-2 text-xs text-gray-500">Recovery deadline: {formatDate(admin.scheduled_for_deletion_at)} (30 days)</p>}</td>
                    </tr>
                  ))}
                  {!filteredAdmins.length && <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500"><EmptyState title={statusTab === 'all' ? 'No Admins found' : statusTab === 'active' ? 'No active Admins found' : 'No deactivated Admins found'} description={search ? 'Try another name or email.' : 'Accounts will appear here when available.'} /></td></tr>}
                </tbody>
              </table>
            </div>
          </div>}
        </div>
      </main>
      {modal && <AdminDialog title={modal.discard ? 'Discard changes?' : modal.type === 'details' ? 'Admin Details' : modal.type === 'created' ? 'Admin account created' : modal.type === 'edit' ? (modal.admin ? 'Edit Admin' : 'Create Admin') : modal.type === 'deactivate' ? 'Deactivate Admin' : 'Reactivate Admin'} onClose={closeModal} dismissOnBackdrop closeDisabled={busy}>
        <div ref={contentRef}>
        {modal.discard ? <>
          <p className="text-sm leading-6 text-gray-600">Your unsaved changes will be discarded.</p>
          <div className="mt-6 flex flex-wrap justify-end gap-3"><button data-dialog-initial-focus type="button" onClick={model.keepEditing} className={secondaryButton}>Keep Editing</button><button type="button" onClick={model.discardEdit} className={dangerButton}>Discard Changes</button></div>
        </> : modal.type === 'details' ? <>
          {modal.loading ? <p role="status" className="py-6 text-sm text-gray-500">Loading Admin details...</p> : modal.unavailable || !modal.admin ? <>
            <p role="alert" className="text-sm text-danger-foreground">{error || 'This Admin account is no longer available.'}</p>
            {modal.admin && <button data-dialog-initial-focus type="button" onClick={() => model.openDetails(modal.admin)} className={`${secondaryButton} mt-4`}>Retry Details</button>}
          </> : <>
            <dl className="grid min-w-0 gap-4 text-sm sm:grid-cols-2">
              {[
                ['Full Name', formatStaffName(modal.admin.name)], ['Email', modal.admin.email], ['Role', 'Admin'],
                ['Account Status', modal.admin.status === 'active' ? 'Active' : 'Deactivated'],
                ['Date Created', formatDate(modal.admin.created_at)], ['Last Login', formatDate(modal.admin.last_login_at)],
                ...(modal.admin.status === 'deactivated' && modal.admin.scheduled_for_deletion_at ? [['Recovery Deadline', formatDate(modal.admin.scheduled_for_deletion_at)]] : []),
              ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-gray-500">{label}</dt><dd className="mt-1 break-words font-semibold text-gray-800">{value}</dd></div>)}
            </dl>
            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
              <button data-dialog-initial-focus type="button" disabled={busy} onClick={() => openEditor(modal.admin)} className={secondaryButton}>Edit Admin</button>
              <button type="button" disabled={busy || (modal.admin.status === 'deactivated' && !isRecoverable(modal.admin))} onClick={() => model.openAction(modal.admin.status === 'active' ? 'deactivate' : 'reactivate', modal.admin)} className={modal.admin.status === 'active' ? warningButton : successButton}>{modal.admin.status === 'active' ? 'Deactivate' : 'Reactivate'}</button>
            </div>
            {modal.admin.status === 'deactivated' && !isRecoverable(modal.admin) && <p className="mt-3 text-sm text-gray-500">The 30-day recovery period has ended. This account awaits cleanup or review.</p>}
          </>}
        </> : modal.type === 'created' ? <>
          <p className="text-sm text-gray-600">Email:</p><p className="mb-4 break-words font-semibold">{modal.email}</p>
          <p className="text-sm text-gray-600">Temporary Password:</p><p className="my-3 select-all break-all rounded-lg bg-gray-50 p-3 font-mono">{modal.temporaryPassword}</p>
          <button type="button" onClick={() => model.copyPassword()} className={secondaryButton}>Copy Password</button>
          <p role="status" className="mt-2 text-sm text-gray-600">{copyNotice}</p>
          <p className="mt-4 text-sm text-gray-500">This password will only be shown once. The Admin must change it after first login.</p>
          <button type="button" disabled={busy} onClick={closeModal} className={`${primaryButton} mt-5`}>Done</button>
        </> : modal.type === 'edit' ? (
          <form onSubmit={handleSave}><fieldset disabled={busy}>
            <label className="mb-4 block text-sm font-semibold">Name<input data-dialog-initial-focus name="name" required maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></label>
            <label className="mb-4 block text-sm font-semibold">Email<input name="email" type="email" required maxLength={254} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className={inputClass} /></label>
            <p className="mb-2 text-sm font-semibold">Role: Admin</p>
            {!modal.admin && <p className="text-sm text-gray-500">A temporary password will be generated and shown once after creation.</p>}
            {error && <p role="alert" className="mt-3 text-sm text-danger-foreground">{error}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} onClick={closeModal} className={secondaryButton}>Cancel</button><button type="submit" disabled={busy} className={primaryButton}>{busy ? 'Saving…' : 'Save'}</button></div>
          </fieldset></form>
        ) : (
          <>
            <p className="break-words text-sm leading-6 text-gray-600">{`${modal.type === 'deactivate' ? 'Deactivate' : 'Reactivate'} ${formatStaffName(modal.admin.name)} (${modal.admin.email})? ${modal.type === 'deactivate' ? 'Access will be revoked immediately and active sessions will end. Recovery is available for 30 days.' : 'The Admin must sign in again. Their password and initial-password-change requirements will stay unchanged.'}`}</p>
            {error && <p role="alert" className="mt-3 text-sm text-danger-foreground">{error}</p>}
            {error && <button type="button" disabled={busy} onClick={() => model.openDetails(modal.admin)} className={`${secondaryButton} mt-3`}>Refresh Admin Details</button>}
            <div className="mt-6 flex flex-wrap justify-end gap-3"><button data-dialog-initial-focus type="button" disabled={busy} onClick={closeModal} className={secondaryButton}>Cancel</button><button type="button" disabled={busy} onClick={model.confirm} className={modal.type === 'deactivate' ? warningButton : successButton}>{busy ? 'Please wait…' : modal.type === 'deactivate' ? 'Deactivate' : 'Reactivate'}</button></div>
          </>
        )}
        </div>
      </AdminDialog>}
    </div>
  );
}
