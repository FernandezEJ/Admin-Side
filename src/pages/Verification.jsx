import { EmptyState, ErrorState, PageSkeleton } from '../components/ui/PageState';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Search,
  Clock3,
  CircleCheck,
  CircleX,
  Eye,

  RotateCcw,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

import { useVerifications } from '../services/useVerifications';
import { filterVerifications, VERIFICATION_STATUS_LABELS } from '../services/verificationsApi';

const statusAppearance = {
  for_verification: { icon: Clock3, className: 'bg-amber-50 text-amber-600' },
  needs_revision: { icon: RotateCcw, className: 'bg-orange-50 text-orange-600' },
  completed: { icon: CircleCheck, className: 'bg-green-50 text-green-600' },
  rejected: { icon: CircleX, className: 'bg-red-50 text-red-600' },
};

function Verification() {
  const remote = useVerifications();
  return <VerificationView remote={remote} />;
}

export function VerificationView({ remote }) {
  const { items: verificationRequests, loading, error, model } = remote;
  const navigate = useNavigate();

  // ============================================================
  // Filters
  // ============================================================

  const [activeTab, setActiveTab] = useState('for_verification');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const currentYear = Number(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila', year: 'numeric' }));
  const visibleRequests = useMemo(() => verificationRequests.filter((request) =>
    Object.hasOwn(VERIFICATION_STATUS_LABELS, request.status)), [verificationRequests]);

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
    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ============================================================
  // Counts
  // ============================================================

  const getCount = (status) =>
    visibleRequests.filter(
      (request) => request.status === status
    ).length;

  // ============================================================
  // Search + Month/Year Filtering
  // ============================================================

  const filteredRequests = filterVerifications(visibleRequests, activeTab, searchTerm, selectedMonth, selectedYear);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedMonth('all');
    setSelectedYear('all');
  };

  // ============================================================
  // Status Appearance
  // ============================================================

  const renderStatus = (status) => {
    if (status === 'for_verification') {
      return (
        <span className="inline-flex rounded-full px-3 py-1.5 text-xs font-semibold text-[#b7192e]">
          For Verification
        </span>
      );
    }

    if (status === 'needs_revision') {
      return (
        <span className="inline-flex rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
          Need Revision
        </span>
      );
    }

    if (status === 'completed') {
      return (
        <span className="inline-flex rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
          Completed
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full px-3 py-1.5 text-xs font-semibold text-red-700">
        Rejected
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <Header
          title="Verification"
          description="Review donor proof submissions and verification history."
        />

        <div className="space-y-6 p-4 lg:p-8">
          {/* ==================================================
              Page Heading
              ================================================== */}
          <section>
            <h2 className="text-lg font-bold text-gray-800">
              Donation Verification
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Review submitted donation proofs before completing a
              donor&apos;s donation record.
            </p>
          </section>

          {/* ==================================================
              Summary Cards
              ================================================== */}
          <section aria-label="Verification status" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(VERIFICATION_STATUS_LABELS).map(([status, label]) => {
              const { icon: Icon, className } = statusAppearance[status];
              return <button
                key={status}
                type="button"
                onClick={() => setActiveTab(status)}
                aria-label={`Show ${label} records`}
                aria-pressed={activeTab === status}
                className={`min-w-0 cursor-pointer rounded-2xl border p-5 text-left transition hover:border-red-200 hover:bg-red-50/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b7192e] ${
                  activeTab === status ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-500">{label}</span>
                    <span className="mt-2 block text-2xl font-bold text-gray-900">{getCount(status)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${className}`}>
                      <Icon size={21} aria-hidden="true" />
                    </span>
                    <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-gray-400" />
                  </span>
                </span>
              </button>;
            })}
          </section>

          {/* ==================================================
              Verification Records
              ================================================== */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            {/* Status Tabs */}
            <div className="border-b border-gray-200 px-6 pt-5">
              <div className="flex flex-wrap gap-6">
                {Object.entries(VERIFICATION_STATUS_LABELS).map(([id, label]) => (
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

            {/* ==================================================
                Search + Filters
                ================================================== */}
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
                  placeholder="Search donor, blood type, or event..."
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-[#b7192e] focus:bg-white"
                />
              </div>

              <select
                value={selectedMonth}
                onChange={(event) =>
                  setSelectedMonth(event.target.value)
                }
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-[#b7192e]"
              >
                <option value="all">All Months</option>

                {months.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <div role="group" aria-label="Verification year" className="flex h-11 shrink-0 items-center rounded-xl border border-gray-200 bg-white">
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
                className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-500 transition hover:bg-gray-50"
              >
                Clear
              </button>
            </div>

            {/* ==================================================
                Verification Table
                ================================================== */}
            {loading && <PageSkeleton />}
            {error && <ErrorState description={error} onRetry={model.load} />}
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[640px] table-fixed text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="w-[22%] px-4 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Donor
                    </th>

                    <th className="w-[12%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Blood Type
                    </th>

                    <th className="w-[28%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Donation Event
                    </th>

                    <th className="w-[16%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Submitted
                    </th>

                    <th className="w-[14%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Status
                    </th>

                    <th className="w-[8%] px-4 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {!loading && !error && filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="break-words px-4 py-5">
                        <p className="font-semibold text-gray-800">
                          {request.donor}
                        </p>
                      </td>

                      <td className="px-4 py-5">
                        <span className="inline-flex min-w-10 justify-center rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#b7192e]">
                          {request.bloodType}
                        </span>
                      </td>

                      <td className="break-words px-3 py-5 text-sm text-gray-500">
                        {request.event}
                      </td>

                      <td className="px-4 py-5 text-sm text-gray-500">
                        {formatDate(request.submittedDate)}
                      </td>

                      <td className="px-4 py-5">
                        {renderStatus(request.status)}
                      </td>

                      <td className="px-4 py-5">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/verification/${request.id}`
                              )
                            }
                            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-red-100 hover:bg-red-50 hover:text-[#b7192e]"
                          >
                            <Eye size={15} />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Empty State */}
              {!loading && !error && filteredRequests.length === 0 && (
                <EmptyState title="No verification records found" />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Verification;
