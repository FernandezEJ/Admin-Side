import { useState } from 'react';
import {
  Search,
  Plus,
  UserRoundCog,
  ShieldCheck,
  UserCheck,
  UserX,
  Pencil,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function AdminManagement() {
  // Temporary frontend-only admin data.
  // This will later come from the Laravel backend.
  const [admins] = useState([
    {
      id: 1,
      name: 'LifeFlow Super Admin',
      email: 'superadmin@lifeflow.com',
      role: 'super_admin',
      status: 'Active',
      lastLogin: 'September 21, 2026 - 5:30 PM',
    },
    {
      id: 2,
      name: 'Maria Santos',
      email: 'maria@lifeflow.com',
      role: 'admin',
      status: 'Active',
      lastLogin: 'September 21, 2026 - 3:12 PM',
    },
    {
      id: 3,
      name: 'Juan Dela Cruz',
      email: 'juan@lifeflow.com',
      role: 'admin',
      status: 'Inactive',
      lastLogin: 'September 19, 2026 - 10:45 AM',
    },
  ]);

  const [search, setSearch] = useState('');

  const filteredAdmins = admins.filter((admin) => {
    const value = search.toLowerCase();

    return (
      admin.name.toLowerCase().includes(value) ||
      admin.email.toLowerCase().includes(value)
    );
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="super_admin" />

      <main className="min-w-0 flex-1">
        <Header
          title="Admin Management"
          description="Manage LifeFlow administrator accounts and access."
          role="super_admin"
        />

        <div className="p-8">
          {/* Page actions */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Search administrator..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#b7192e]"
              />
            </div>

            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#b7192e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#9f1528]"
            >
              <Plus size={18} />
              Add Administrator
            </button>
          </div>

          {/* Summary cards */}
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#b7192e]">
                <UserRoundCog size={20} />
              </div>

              <p className="text-sm text-gray-400">Total Administrators</p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {admins.length}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <UserCheck size={20} />
              </div>

              <p className="text-sm text-gray-400">Active</p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {admins.filter((admin) => admin.status === 'Active').length}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                <UserX size={20} />
              </div>

              <p className="text-sm text-gray-400">Inactive</p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {admins.filter((admin) => admin.status === 'Inactive').length}
              </p>
            </div>
          </div>

          {/* Administrator table */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <th className="px-6 py-4">Administrator</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Login</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAdmins.map((admin) => (
                    <tr
                      key={admin.id}
                      className="border-b border-gray-100 last:border-b-0"
                    >
                      <td className="px-6 py-5">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {admin.name}
                          </p>

                          <p className="mt-1 text-sm text-gray-400">
                            {admin.email}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                            admin.role === 'super_admin'
                              ? 'bg-red-50 text-[#b7192e]'
                              : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          <ShieldCheck size={14} />

                          {admin.role === 'super_admin'
                            ? 'Super Admin'
                            : 'Admin'}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            admin.status === 'Active'
                              ? 'bg-green-50 text-green-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {admin.status}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-sm text-gray-500">
                        {admin.lastLogin}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-[#b7192e] hover:text-[#b7192e]"
                            title="Edit administrator"
                          >
                            <Pencil size={16} />
                          </button>

                          {admin.role !== 'super_admin' && (
                            <button
                              type="button"
                              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                admin.status === 'Active'
                                  ? 'bg-red-50 text-[#b7192e] hover:bg-red-100'
                                  : 'bg-green-50 text-green-600 hover:bg-green-100'
                              }`}
                            >
                              {admin.status === 'Active'
                                ? 'Deactivate'
                                : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredAdmins.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-12 text-center text-sm text-gray-400"
                      >
                        No administrators found.
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

export default AdminManagement;