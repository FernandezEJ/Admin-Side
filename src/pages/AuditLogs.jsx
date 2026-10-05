import MonthFilter from '../components/ui/MonthFilter';
import { EmptyState, ErrorState, PageSkeleton } from '../components/ui/PageState';
import { Search, History } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { ADMIN_ROLES } from '../auth/roles';
import { auditActionLabel, auditModuleLabel, formatAuditDate } from '../services/auditLogsApi';
import { useAuditLogs } from '../services/useAuditLogs';

export function AuditLogsView({ remote }) {
  const { data, modules, search, module, month, pagination, loading, error, model } = remote;
  const filtered = Boolean(search.trim() || module || month);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Header title="Audit Logs" description="Review administrator activity across the LifeFlow system." />
        <div className="p-4 lg:p-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end">
            <label className="w-full text-sm font-semibold text-gray-600 md:max-w-md">
              Search activity
              <div className="relative mt-2">
                <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
                <input type="search" value={search} onChange={(event) => model.setFilters({ search: event.target.value })} maxLength={255} placeholder="Admin, action, or details" className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 font-normal outline-none focus:border-[#b7192e]" />
              </div>
            </label>
            <label className="text-sm font-semibold text-gray-600">Module
              <select value={module} onChange={(event) => model.setFilters({ module: event.target.value })} className="mt-2 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-normal outline-none focus:border-[#b7192e]">
                <option value="">All modules</option>
                {modules.map((name) => <option key={name} value={name}>{auditModuleLabel(name)}</option>)}
              </select>
            </label>
            <MonthFilter value={month} onChange={(month) => model.setFilters({ month })} />
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5">
              <History size={20} className="shrink-0 text-[#b7192e]" />
              <div><h2 className="font-semibold text-gray-900">Administrator Activity</h2>
                <p className="mt-1 text-sm text-gray-500">Read-only records. Times shown in Philippine time (UTC+8).</p>
                {!loading && !error && <p role="status" className="mt-1 text-xs text-gray-500">{data.length} of {pagination.total} records</p>}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <caption className="sr-only">Read-only audit logs, newest first</caption>
                <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>
                  {['Date & Time', 'Admin', 'Action', 'Module', 'Target / Details'].map((label) => <th scope="col" key={label} className="px-4 py-4">{label}</th>)}
                </tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={5}><PageSkeleton /></td></tr>}
                  {!loading && error && <tr><td colSpan={5} className="p-4"><ErrorState title="Unable to load Audit Logs" description={error} onRetry={() => model.load()} /></td></tr>}
                  {!loading && !error && data.map((log) => (
                    <tr key={log.id} className="border-t border-gray-100">
                      <td className="px-4 py-5 text-gray-500"><time dateTime={log.createdAt ?? undefined}>{formatAuditDate(log.createdAt)}</time></td>
                      <td className="px-4 py-5"><p className="break-words font-semibold text-gray-800">{log.actorName}</p><p className="mt-1 text-xs text-gray-500">{log.actorRole === ADMIN_ROLES.SUPER_ADMIN ? 'Super Admin' : log.actorRole === ADMIN_ROLES.ADMIN ? 'Admin' : log.actorRole === 'donor' ? 'Donor' : 'Unknown role'}</p></td>
                      <td className="break-words px-4 py-5 text-gray-600">{auditActionLabel(log.action)}</td>
                      <td className="px-4 py-5"><span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{auditModuleLabel(log.module)}</span></td>
                      <td className="max-w-sm px-4 py-5 text-gray-600"><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{log.details ?? '—'}</p><p className="mt-1 break-words text-xs text-gray-400">{log.target ?? '—'}</p></td>
                    </tr>
                  ))}
                  {!loading && !error && !data.length && <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500"><EmptyState title={filtered ? 'No audit logs match the selected filters' : 'No audit logs found'} description={filtered ? 'Try another search, module, or month.' : 'Administrator activity will appear here.'} /></td></tr>}
                </tbody>
              </table>
            </div>
            {!loading && !error && pagination.total > 0 && <nav aria-label="Audit log pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-4 sm:px-6">
              <p className="text-sm text-gray-500">Page {pagination.currentPage} of {pagination.lastPage}</p>
              <div className="flex gap-2">
                <button type="button" disabled={pagination.currentPage <= 1} onClick={() => model.setPage(pagination.currentPage - 1)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
                <button type="button" disabled={pagination.currentPage >= pagination.lastPage} onClick={() => model.setPage(pagination.currentPage + 1)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
              </div>
            </nav>}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AuditLogs() {
  const remote = useAuditLogs();
  return <AuditLogsView remote={remote} />;
}
