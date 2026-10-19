import { filterAnnouncements } from '../services/announcementsApi';
import { useAnnouncements } from '../services/useAnnouncements';
import { EmptyState, ErrorState, PageSkeleton } from '../components/ui/PageState';
import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnnouncementPopup } from './ViewAnnouncement';

import {
  Plus,
  Search,
  Megaphone,
  CalendarClock,

  Trash2,
  MapPin,
  FileText,
  ArrowRight,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function Announcements() {
  const remote = useAnnouncements();
  return <AnnouncementsView remote={remote} />;
}

export function AnnouncementsView({ remote }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const savedFilters = state?.announcementFilters;
  const [selectedId, setSelectedId] = useState(null);
  const tableRef = useRef(null);
  const openAnnouncement = (id, row) => {
    row.focus({ preventScroll: true });
    setSelectedId(id);
  };

  // ============================================================
  // Filters
  // ============================================================

  const [activeTab, setActiveTab] = useState(savedFilters?.status ?? 'active');
  const [searchTerm, setSearchTerm] = useState(savedFilters?.search ?? '');
  const [selectedMonth, setSelectedMonth] = useState(savedFilters?.month ?? 'all');
  const [selectedYear, setSelectedYear] = useState(savedFilters?.year ?? 'all');
  const formNavigation = (path) => navigate(path, { state: { announcementFilters: {
    status: activeTab, search: searchTerm, month: selectedMonth, year: selectedYear,
  } } });

  const { items: announcements, loading, error, model } = remote;
  // The existing unpaginated list contains every status and donation year.
  const years = [...new Set([...announcements.map((item) => item.donationDate?.slice(0, 4)), selectedYear].filter((year) => /^\d{4}$/.test(year)))].sort().reverse();

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
              onClick={() => formNavigation('/announcements/create')}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-[#b7192e] px-5 text-sm font-semibold text-white transition hover:bg-[#9f1427]"
            >
              <Plus size={18} />
              Create Announcement
            </button>
          </section>

          {/* Summary cards */}
          <section aria-label="Announcement status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4">
              <div className="relative min-w-0 w-full flex-1 sm:min-w-40">
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
                aria-label="Announcement month"
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

              <select aria-label="Announcement year" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600">
                <option value="all">All Years</option>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>

              <button
                type="button"
                onClick={clearFilters}
                className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-500 hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>

            {loading && <PageSkeleton />}
            {error && <ErrorState description={error} onRetry={model.load} />}
            {/* Table */}
            <div ref={tableRef} tabIndex={-1} aria-label="Announcements table" className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-[#b7192e]">
              <table className="w-full min-w-[720px] text-left">
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

                  </tr>
                </thead>

                <tbody>
                  {!loading && filteredAnnouncements.map((announcement) => (
                    <tr
                      key={announcement.id}
                      tabIndex={0}
                      aria-label={`View announcement: ${announcement.title}`}
                      aria-haspopup="dialog"
                      onClick={(event) => {
                        if (event.target.closest('button, a, input, select, textarea, [contenteditable="true"]')) return;
                        openAnnouncement(announcement.id, event.currentTarget);
                      }}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget || event.repeat) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openAnnouncement(announcement.id, event.currentTarget);
                        }
                      }}
                      className="cursor-pointer border-b border-gray-100 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#b7192e] last:border-0"
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
      {selectedId !== null && <AnnouncementPopup key={selectedId} id={selectedId} onClose={() => setSelectedId(null)}
        onEdit={() => formNavigation(`/announcements/${selectedId}/edit`)}
        onChanged={() => {
          void model.load();
          requestAnimationFrame(() => tableRef.current?.focus({ preventScroll: true }));
        }} />}
    </div>
  );
}

export default Announcements;
