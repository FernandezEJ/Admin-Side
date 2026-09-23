import { useState } from 'react';
import { Search, History } from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function AuditLogs() {
  // Temporary frontend-only audit records.
  const [logs] = useState([
    {
      id: 1,
      admin: 'Maria Santos',
      action: 'Approved donation verification',
      module: 'Verification',
      date: 'September 21, 2026 - 5:35 PM',
    },
    {
      id: 2,
      admin: 'LifeFlow Super Admin',
      action: 'Created administrator account',
      module: 'Admin Management',
      date: 'September 21, 2026 - 4:20 PM',
    },
    {
      id: 3,
      admin: 'Maria Santos',
      action: 'Published announcement',
      module: 'Announcements',
      date: 'September 21, 2026 - 2:10 PM',
    },
    {
      id: 4,
      admin: 'LifeFlow Super Admin',
      action: 'Created grocery reward',
      module: 'Rewards',
      date: 'September 20, 2026 - 11:45 AM',
    },
  ]);

  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter((log) => {
    const value = search.toLowerCase();

    return (
      log.admin.toLowerCase().includes(value) ||
      log.action.toLowerCase().includes(value) ||
      log.module.toLowerCase().includes(value)
    );
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="super_admin" />

      <main className="min-w-0 flex-1">
        <Header
          title="Audit Logs"
          description="Review administrator activity across the LifeFlow system."
          role="super_admin"
        />

        <div className="p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Search activity..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#b7192e]"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#b7192e]">
                  <History size={20} />
                </div>

                <div>
                  <h2 className="font-semibold text-gray-900">
                    Administrator Activity
                  </h2>

                  <p className="text-sm text-gray-400">
                    Frontend preview of system activity records.
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <th className="px-6 py-4">Administrator</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Module</th>
                    <th className="px-6 py-4">Date & Time</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-t border-gray-100"
                    >
                      <td className="px-6 py-5 font-semibold text-gray-800">
                        {log.admin}
                      </td>

                      <td className="px-6 py-5 text-sm text-gray-600">
                        {log.action}
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                          {log.module}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-sm text-gray-400">
                        {log.date}
                      </td>
                    </tr>
                  ))}

                  {filteredLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-6 py-12 text-center text-sm text-gray-400"
                      >
                        No audit logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AuditLogs;