import { filterAnnouncements } from '../services/announcementsApi';
import { useAnnouncements } from '../services/useAnnouncements';
import { isRecoverable } from '../data/recoveryPolicy';
import { EmptyState, ErrorState, PageSkeleton } from '../components/ui/PageState';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Plus,
  Search,
  Megaphone,
  CalendarClock,

  Trash2,
  Eye,
  Pencil,
  MapPin,
  RotateCcw,
  FileText,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function Announcements() {
  const remote = useAnnouncements();
  return <AnnouncementsView remote={remote} />;
}

export function AnnouncementsView({ remote }) {
  const navigate = useNavigate();

  // ============================================================
  // Filters
  // ============================================================

  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const currentYear = Number(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila', year: 'numeric' }));

  const { items: announcements, loading, error, busy, model } = remote;

  const months = [
    ['01', 'January'],
    ['02', 'February'],
    ['03', 'March'],
    ['04', 'April'],
    ['05', 'May'],
    ['06', 'June'],
    ['07', 'July'],
    ['08', 'August'],
    ['09', 'September'],
    ['10', 'October'],
    ['11', 'November'],
    ['12', 'December'],
  ];

  const formatDate = (dateString) => {
    if (!dateString) {
      return '-';
    }

    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCount = (status) =>
    announcements.filter(
      (announcement) => announcement.status === status
    ).length;

  // ============================================================
  // Search + Filter
  // ============================================================

  const filteredAnnouncements = filterAnnouncements(announcements, activeTab, searchTerm, selectedMonth, selectedYear);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedMonth('all');
    setSelectedYear('all');
  };

  // ============================================================
  // Soft Delete
  // Later this becomes a Laravel DELETE request.
  // ============================================================

  const handleDelete = (id) => {
    if (!busy && window.confirm('Move this announcement to Deleted? Recovery is available for 30 days.')) model.action(id, 'delete');
  };
  const handleRestore = (id) => {
    if (!busy && isRecoverable(announcements.find((item) => item.id === id) ?? {}) && window.confirm('Restore this announcement to Drafts?')) model.action(id, 'restore');
  };

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <Header
          title="Announcements"
          description="Create and manage LifeFlow donation announcements."
        />

        <div className="space-y-6 p-4 lg:p-8">
          {/* Page heading */}
          <section className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Announcement Management
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Manage published, draft, expired, and deleted announcements.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/announcements/create')}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-[#b7192e] px-5 text-sm font-semibold text-white transition hover:bg-[#9f1427]"
            >
              <Plus size={18} />
              Create Announcement
            </button>
          </section>

          {/* Summary cards */}
          <section aria-label="Announcement status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Active',
                status: 'active',
                icon: Megaphone,
              },
              {
                label: 'Drafts',
                status: 'draft',
                icon: FileText,
              },
              {
                label: 'Expired',
                status: 'expired',
                icon: CalendarClock,
              },
              {
                label: 'Deleted',
                status: 'deleted',
                icon: Trash2,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.status}
                  type="button"
                  onClick={() => setActiveTab(item.status)}
                  aria-label={`Show ${item.label} announcements`}
                  aria-pressed={activeTab === item.status}
                  className={`min-w-0 cursor-pointer rounded-2xl border p-5 text-left transition hover:border-red-200 hover:bg-red-50/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b7192e] ${
                    activeTab === item.status
                      ? 'border-red-200 bg-red-50/30'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-500">
                        {item.label}
                      </span>

                      <span className="mt-2 block text-2xl font-bold text-gray-900">
                        {loading ? '-'  : getCount(item.status)}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-2">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#b7192e]">
                        <Icon size={21} aria-hidden="true" />
                      </span>
                      <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-gray-400" />
                    </span>
                  </span>
                </button>
              );
            })}
          </section>

          {/* Announcement list */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            {/* Tabs */}
            <div className="border-b border-gray-200 px-6 pt-5">
              <div className="flex flex-wrap gap-6">
                {[
                  ['active', 'Active'],
                  ['draft', 'Drafts'],
                  ['expired', 'Expired'],
                  ['deleted', 'Deleted'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`border-b-2 pb-4 text-sm font-semibold transition ${
                      activeTab === id
                        ? 'border-[#b7192e] text-[#b7192e]'
                        : 'border-transparent text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4">
              <div className="relative min-w-0 w-full sm:min-w-64 flex-1">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="Search title or location..."
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none focus:border-[#b7192e] focus:bg-white"
                />
              </div>

              <select
                value={selectedMonth}
                onChange={(event) =>
                  setSelectedMonth(event.target.value)
                }
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600"
              >
                <option value="all">All Months</option>

                {months.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <div role="group" aria-label="Announcement year" className="flex h-11 shrink-0 items-center rounded-xl border border-gray-200 bg-white">
                <button type="button" aria-label="Previous year" onClick={() => setSelectedYear((year) => String((year === 'all' ? currentYear : Number(year)) - 1))}
                  className="flex h-full w-11 items-center justify-center rounded-l-xl text-gray-600 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b7192e]">
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
                <button type="button" aria-label="All years" aria-pressed={selectedYear === 'all'} title="All Years" onClick={() => setSelectedYear('all')}
                  className="h-full w-24 text-center text-sm font-semibold tabular-nums text-gray-700 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b7192e]">
                  {selectedYear === 'all' ? 'All Years' : selectedYear}
                </button>
                <button type="button" aria-label="Next year" onClick={() => setSelectedYear((year) => String((year === 'all' ? currentYear : Number(year)) + 1))}
                  className="flex h-full w-11 items-center justify-center rounded-r-xl text-gray-600 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b7192e]">
                  <ChevronUp size={18} aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-500 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>

            {loading && <PageSkeleton />}
            {error && <ErrorState description={error} onRetry={model.load} />}
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-400">
                      Announcement
                    </th>

                    <th className="px-4 py-4 text-xs font-semibold uppercase text-gray-400">
                      Donation Date
                    </th>

                    <th className="px-4 py-4 text-xs font-semibold uppercase text-gray-400">
                      Published
                    </th>

                    <th className="px-4 py-4 text-xs font-semibold uppercase text-gray-400">
                      Expires
                    </th>

                    <th className="px-4 py-4 text-xs font-semibold uppercase text-gray-400">
                      Status
                    </th>

                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {!loading && filteredAnnouncements.map((announcement) => (
                    <tr
                      key={announcement.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-6 py-5">
                        <div className="font-semibold text-gray-800">
                          {announcement.title}
                            {announcement.status === 'deleted' && <p className="mt-2 text-xs text-gray-500">Recoverable for 30 days. Deletion scheduled: {announcement.scheduled_for_deletion_at?.slice(0, 10)}. Announcements with participation history are retained.</p>}
                        </div>

                        <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                          <MapPin size={13} />
                          {announcement.location}
                        </div>
                      </td>

                      <td className="px-4 py-5 text-sm text-gray-500">
                        {formatDate(announcement.donationDate)}
                      </td>

                      <td className="px-4 py-5 text-sm text-gray-500">
                        {formatDate(announcement.publishedDate)}
                      </td>

                      <td className="px-4 py-5 text-sm text-gray-500">
                        {formatDate(announcement.expiresDate)}
                      </td>

                      <td className="px-4 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                            announcement.status === 'active'
                              ? 'bg-green-50 text-green-700'
                              : announcement.status === 'draft'
                              ? 'bg-blue-50 text-blue-700'
                              : announcement.status === 'expired'
                              ? 'bg-gray-100 text-gray-600'
                              : 'text-red-700'
                          }`}
                        >
                          {announcement.status === 'active'
                            ? 'Active'
                            : announcement.status === 'draft'
                            ? 'Draft'
                            : announcement.status === 'expired'
                            ? 'Expired'
                            : 'Deleted'}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            title="View announcement"
                            onClick={() =>
                              navigate(
                                `/announcements/${announcement.id}`
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          >
                            <Eye size={17} />
                          </button>

                          {announcement.status !== 'deleted' && (
                            <>
                              <button
                                type="button"
                                title="Edit announcement"
                                onClick={() =>
                                  navigate(
                                    `/announcements/${announcement.id}/edit`
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-[#b7192e]"
                              >
                                <Pencil size={17} />
                              </button>

                              <button
                                type="button"
                                disabled={busy}
                                title="Delete announcement"
                                onClick={() =>
                                  handleDelete(announcement.id)
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={17} />
                              </button>
                            </>
                          )}

                          {announcement.status === 'deleted' && (
                            <button
                              type="button"
                              disabled={busy || !isRecoverable(announcement)} title={isRecoverable(announcement) ? 'Restore' : 'Recovery period ended; awaiting backend purge'}
                              onClick={() =>
                                handleRestore(announcement.id)
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600"
                            >
                              <RotateCcw size={17} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && !error && filteredAnnouncements.length === 0 && (
                <EmptyState title="No announcements found" />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Announcements;
