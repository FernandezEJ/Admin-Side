import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Plus,
  Search,
  Megaphone,
  CalendarClock,
  Archive,
  Trash2,
  Eye,
  Pencil,
  MapPin,
  RotateCcw,
  FileText,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function Announcements() {
  const navigate = useNavigate();

  // ============================================================
  // Filters
  // ============================================================

  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');

  // ============================================================
  // Temporary Announcement Data
  // Laravel will provide this later.
  // ============================================================

  const [announcements, setAnnouncements] = useState([
    {
      id: 1,
      title: 'Community Blood Donation Drive',
      location: 'City Health Office',
      description:
        'Join the upcoming community blood donation activity.',
      donationDate: '2026-09-28',
      publishedDate: '2026-09-16',
      expiresDate: '2026-09-28',
      status: 'active',
    },
    {
      id: 2,
      title: 'LifeFlow University Blood Drive',
      location: 'University Activity Center',
      description:
        'A university-wide blood donation event for eligible donors.',
      donationDate: '2026-10-05',
      publishedDate: '2026-09-15',
      expiresDate: '2026-10-05',
      status: 'active',
    },
    {
      id: 3,
      title: 'Upcoming Donation Draft',
      location: 'Municipal Gymnasium',
      description:
        'This announcement is still being prepared.',
      donationDate: '2026-10-18',
      publishedDate: null,
      expiresDate: '2026-10-18',
      status: 'draft',
    },
    {
      id: 4,
      title: 'Barangay Donation Campaign',
      location: 'Barangay Covered Court',
      description:
        'Previous barangay blood donation campaign.',
      donationDate: '2026-08-22',
      publishedDate: '2026-08-10',
      expiresDate: '2026-08-22',
      status: 'expired',
    },
    {
      id: 5,
      title: 'Sample Removed Announcement',
      location: 'Community Center',
      description:
        'This announcement was soft deleted.',
      donationDate: '2026-06-18',
      publishedDate: '2026-06-01',
      expiresDate: '2026-06-18',
      status: 'deleted',
    },
  ]);

  // ============================================================
  // Helpers
  // ============================================================

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

  const availableYears = useMemo(() => {
    const years = announcements.map((announcement) =>
      announcement.donationDate.substring(0, 4)
    );

    return [...new Set(years)].sort((a, b) => b - a);
  }, [announcements]);

  const formatDate = (dateString) => {
    if (!dateString) {
      return 'Not published';
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

  const filteredAnnouncements = announcements.filter((announcement) => {
    const matchesTab = announcement.status === activeTab;

    const matchesSearch =
      announcement.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      announcement.location
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const month = announcement.donationDate.substring(5, 7);
    const year = announcement.donationDate.substring(0, 4);

    const matchesMonth =
      selectedMonth === 'all' || month === selectedMonth;

    const matchesYear =
      selectedYear === 'all' || year === selectedYear;

    return (
      matchesTab &&
      matchesSearch &&
      matchesMonth &&
      matchesYear
    );
  });

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
    const confirmed = window.confirm(
      'Move this announcement to Deleted? You can restore it later.'
    );

    if (!confirmed) return;

    setAnnouncements((current) =>
      current.map((announcement) =>
        announcement.id === id
          ? {
              ...announcement,
              status: 'deleted',
            }
          : announcement
      )
    );
  };

  // ============================================================
  // Restore
  // Restored announcements ALWAYS return to Drafts.
  // ============================================================

  const handleRestore = (id) => {
    const confirmed = window.confirm(
      'Restore this announcement to Drafts?'
    );

    if (!confirmed) return;

    setAnnouncements((current) =>
      current.map((announcement) =>
        announcement.id === id
          ? {
              ...announcement,
              status: 'draft',
              publishedDate: null,
            }
          : announcement
      )
    );

    setActiveTab('draft');
  };

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <Header
          title="Announcements"
          description="Create and manage LifeFlow donation announcements."
        />

        <div className="space-y-6 p-8">
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
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                <article
                  key={item.status}
                  className="rounded-2xl border border-gray-200 bg-white p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        {item.label}
                      </p>

                      <h3 className="mt-2 text-2xl font-bold text-gray-900">
                        {getCount(item.status)}
                      </h3>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#b7192e]">
                      <Icon size={21} />
                    </div>
                  </div>
                </article>
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
              <div className="relative min-w-64 flex-1">
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

              <select
                value={selectedYear}
                onChange={(event) =>
                  setSelectedYear(event.target.value)
                }
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600"
              >
                <option value="all">All Years</option>

                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={clearFilters}
                className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-500 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>

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
                  {filteredAnnouncements.map((announcement) => (
                    <tr
                      key={announcement.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-6 py-5">
                        <p className="font-semibold text-gray-800">
                          {announcement.title}
                        </p>

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
                              : 'bg-red-50 text-red-700'
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
                              title="Restore to Drafts"
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

              {filteredAnnouncements.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Archive size={34} className="text-gray-300" />

                  <h3 className="mt-4 font-semibold text-gray-700">
                    No announcements found
                  </h3>

                  <p className="mt-1 text-sm text-gray-400">
                    Try changing your search or filters.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Announcements;