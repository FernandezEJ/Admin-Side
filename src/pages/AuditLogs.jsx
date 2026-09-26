import MonthFilter from '../components/ui/MonthFilter';
import { EmptyState } from '../components/ui/PageState';
import { useState } from 'react';
import { Search, History } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { ADMIN_ROLES } from '../auth/roles';
import { mockAuditLogs, filterAuditLogs, formatDate } from '../data/adminManagement';

const modules = [...new Set(mockAuditLogs.map((log) => log.module))];

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [month, setMonth] = useState('');
  const filteredLogs = filterAuditLogs(mockAuditLogs, search, module, month);

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
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Admin, action, or details" className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 font-normal outline-none focus:border-[#b7192e]" />
              </div>
            </label>
            <label className="text-sm font-semibold text-gray-600">Module
              <select value={module} onChange={(event) => setModule(event.target.value)} className="mt-2 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-normal outline-none focus:border-[#b7192e]">
                <option value="">All modules</option>
                {modules.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <MonthFilter value={month} onChange={setMonth} />
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5">
              <History size={20} className="shrink-0 text-[#b7192e]" />
              <div><h2 className="font-semibold text-gray-900">Administrator Activity</h2>
                <p className="mt-1 text-sm text-gray-500">Read-only sample records. Times shown in Philippine time (UTC+8).</p>
                <p role="status" className="mt-1 text-xs text-gray-500">{filteredLogs.length} of {mockAuditLogs.length} records</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <caption className="sr-only">Read-only audit logs, newest first</caption>
                <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>
                  {['Date & Time', 'Admin', 'Action', 'Module', 'Target / Details'].map((label) => <th scope="col" key={label} className="px-4 py-4">{label}</th>)}
                </tr></thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-t border-gray-100">
                      <td className="px-4 py-5 text-gray-500"><time dateTime={log.created_at}>{formatDate(log.created_at, true)}</time></td>
                      <td className="px-4 py-5"><p className="font-semibold text-gray-800">{log.actor_name}</p><p className="mt-1 text-xs text-gray-500">{log.actor_role === ADMIN_ROLES.SUPER_ADMIN ? 'Super Admin' : 'Admin'}</p></td>
                      <td className="px-4 py-5 text-gray-600">{log.action_label}</td>
                      <td className="px-4 py-5"><span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{log.module}</span></td>
                      <td className="max-w-sm px-4 py-5 text-gray-600"><p>{log.details}</p><p className="mt-1 text-xs text-gray-400">{log.target_type} #{log.target_id}</p></td>
                    </tr>
                  ))}
                  {!filteredLogs.length && <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500"><EmptyState title="No audit logs found" description="Try another search or module." /></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
