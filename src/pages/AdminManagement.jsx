import { EmptyState, ErrorState, PageSkeleton } from '../components/ui/PageState';
import { isRecoverable } from '../data/recoveryPolicy';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Search, Plus, UserRoundCog, UserCheck, UserX } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import AdminDialog from '../components/ui/AdminDialog';
import { useAdminSession } from '../auth/useAdminSession';
import { createAdminManagement, visibleAdmins, formatAdminDate as formatDate } from '../services/adminManagementState';

const primaryButton = 'rounded-xl border border-[#9f1528] bg-[#b7192e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#9f1528]';
const secondaryButton = 'rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50';
const inputClass = 'mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#b7192e]';

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
  function handleSave(event) { event.preventDefault(); model.save(); }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Header title="Admin Management" description="Manage LifeFlow administrator accounts and access." />
        <div className="p-4 lg:p-8">
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {[
              { label: 'Total Admins', count: summary.total, icon: UserRoundCog },
              { label: 'Active Admins', count: summary.active, icon: UserCheck },
              { label: 'Deactivated Admins', count: summary.deactivated, icon: UserX },
            ].map(({ label, count, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5">
                <Icon size={20} className="mb-3 text-[#b7192e]" />
                <p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900">{loading ? '—' : count}</p>
              </div>
            ))}
          </div>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="w-full text-sm font-semibold text-gray-600 sm:max-w-md">
              Search Admins
              <div className="relative mt-2">
                <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 font-normal outline-none focus:border-[#b7192e]" />
              </div>
            </label>
            <button type="button" onClick={() => openEditor()} className={`${primaryButton} flex items-center justify-center gap-2`}><Plus size={18} />Create Admin</button>
          </div>
          <div aria-label="Admin account status" className="mb-4 flex flex-wrap gap-3">{[['active', 'Active Admins'], ['deactivated', 'Deactivated Admins']].map(([value, label]) => <button type="button" key={value} aria-pressed={statusTab === value} onClick={() => setStatusTab(value)} className={statusTab === value ? primaryButton : secondaryButton}>{label}</button>)}</div>
          <p className="mb-4 text-sm text-gray-500">Deactivated accounts are recoverable for 30 days. Automatic cleanup runs on the server; accounts with historical records are retained for review.</p>
          <p role="status" className="mb-4 text-sm text-gray-600">{notice}</p>
          {loading ? <PageSkeleton /> : state.error ? <ErrorState description={state.error} onRetry={model.load} /> : <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">Admin accounts</caption>
                <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>
                  {['Name', 'Email', 'Last Login', 'Date Created', 'Status', 'Actions'].map((label) => <th key={label} scope="col" className="px-4 py-4">{label}</th>)}
                </tr></thead>
                <tbody>
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="border-t border-gray-100">
                      <td className="max-w-48 break-words px-4 py-5 font-semibold text-gray-800">{admin.name}</td>
                      <td className="max-w-56 break-words px-4 py-5 text-gray-600">{admin.email}</td>
                      <td className="px-4 py-5 text-gray-500">{formatDate(admin.last_login_at)}</td>
                      <td className="px-4 py-5 text-gray-500">{formatDate(admin.created_at)}</td>
                      <td className="px-4 py-5"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${admin.status === 'active' ? 'text-green-700' : 'text-gray-600'}`}>{admin.status === 'active' ? 'Active' : 'Deactivated'}</span>{admin.scheduled_for_deletion_at && <p className="mt-2 text-xs text-gray-500">Recovery deadline: {formatDate(admin.scheduled_for_deletion_at)} (30 days)</p>}</td>
                      <td className="px-4 py-5"><div className="flex flex-wrap gap-2">
                        {admin.status === 'active' && <button type="button" onClick={() => openEditor(admin)} className="rounded-lg border border-gray-200 px-2 py-2 text-[#b7192e] hover:bg-red-50" aria-label={`Edit ${admin.name}`}>Edit</button>}
                        <button type="button" disabled={admin.status === 'deactivated' && !isRecoverable(admin)} title={admin.status === 'deactivated' && !isRecoverable(admin) ? 'Recovery period ended; awaiting cleanup or review' : undefined} onClick={() => model.openAction(admin.status === 'active' ? 'deactivate' : 'reactivate', admin)} className="rounded-lg border border-gray-200 px-2 py-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50">{admin.status === 'active' ? 'Deactivate' : 'Reactivate'}</button>
                        {admin.status === 'active' && <button type="button" onClick={() => model.openAction('reset', admin)} className="rounded-lg border border-gray-200 px-2 py-2 text-gray-600 hover:bg-gray-100">Reset Password</button>}
                      </div></td>
                    </tr>
                  ))}
                  {!filteredAdmins.length && <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500"><EmptyState title={statusTab === 'active' ? 'No active Admins found' : 'No deactivated Admins found'} description={search ? 'Try another name or email.' : 'Accounts will appear here when available.'} /></td></tr>}
                </tbody>
              </table>
            </div>
          </div>}
        </div>
      </main>
      {modal && <AdminDialog title={modal.type === 'created' ? 'Admin account created' : modal.type === 'edit' ? (modal.admin ? 'Edit Admin' : 'Create Admin') : modal.type === 'reset' ? 'Reset Password' : modal.type === 'deactivate' ? 'Deactivate Admin' : 'Reactivate Admin'} onClose={closeModal}>
        {modal.type === 'created' ? <>
          <p className="text-sm text-gray-600">Email:</p><p className="mb-4 break-words font-semibold">{modal.email}</p>
          <p className="text-sm text-gray-600">Temporary Password:</p><p className="my-3 select-all break-all rounded-lg bg-gray-50 p-3 font-mono">{modal.temporaryPassword}</p>
          <button type="button" onClick={() => model.copyPassword()} className={secondaryButton}>Copy Password</button>
          <p role="status" className="mt-2 text-sm text-gray-600">{copyNotice}</p>
          <p className="mt-4 text-sm text-gray-500">This password will only be shown once. The Admin must change it after first login.</p>
          <button type="button" disabled={busy} onClick={closeModal} className={`${primaryButton} mt-5`}>Done</button>
        </> : modal.type === 'edit' ? (
          <form onSubmit={handleSave}>
            <label className="mb-4 block text-sm font-semibold">Name<input name="name" required maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></label>
            <label className="mb-4 block text-sm font-semibold">Email<input name="email" type="email" required maxLength={254} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className={inputClass} /></label>
            <p className="mb-2 text-sm font-semibold">Role: Admin</p>
            {!modal.admin && <p className="text-sm text-gray-500">A temporary password will be generated and shown once after creation.</p>}
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={closeModal} className={secondaryButton}>Cancel</button><button type="submit" disabled={busy} className={primaryButton}>{busy ? 'Saving…' : 'Save'}</button></div>
          </form>
        ) : (
          <>
            <p className="break-words text-sm leading-6 text-gray-600">{modal.type === 'reset' ? `Send password reset instructions to ${modal.admin.email}?` : `${modal.type === 'deactivate' ? 'Deactivate' : 'Reactivate'} ${modal.admin.name} (${modal.admin.email})? ${modal.type === 'deactivate' ? 'Access will be revoked immediately. Recovery is available for 30 days.' : 'The Admin must sign in again.'}`}</p>
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={closeModal} className={secondaryButton}>Cancel</button><button type="button" disabled={busy} onClick={model.confirm} className={primaryButton}>{busy ? 'Please wait…' : modal.type === 'reset' ? 'Send Reset Instructions' : modal.type === 'deactivate' ? 'Deactivate' : 'Reactivate'}</button></div>
          </>
        )}
      </AdminDialog>}
    </div>
  );
}
