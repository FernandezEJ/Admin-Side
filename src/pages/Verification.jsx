import { formatDonorName } from '../services/staffNames';
import { EmptyState, ErrorState, PageSkeleton, LoadingNotice, SkeletonValue } from '../components/ui/PageState';
import { useMemo, useRef, useState } from 'react';

import {
  Search,
  Clock3,
  CircleCheck,
  CircleX,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

import { useVerifications } from '../services/useVerifications';
import { filterVerifications, VERIFICATION_STATUS_LABELS } from '../services/verificationsApi';
import VerificationReviewDrawer from '../components/verification/VerificationReviewDrawer';

const statusAppearance = {
  for_verification: { icon: Clock3, className: 'bg-warning-surface text-warning-foreground' },
  needs_revision: { icon: RotateCcw, className: 'bg-warning-surface text-warning-foreground' },
  completed: { icon: CircleCheck, className: 'bg-success-surface text-success-foreground' },
  rejected: { icon: CircleX, className: 'bg-danger-surface text-danger-foreground' },
};

function Verification() {
  const remote = useVerifications();
  return <VerificationView remote={remote} />;
}

export function VerificationView({ remote }) {
  const { items: verificationRequests, loading, error, model } = remote;
  const [selectedId, setSelectedId] = useState(null);
  const tableFocusRef = useRef(null);
  const reviewOpenRef = useRef(false);
  const openReview = (id, target) => {
    if (reviewOpenRef.current) return;
    reviewOpenRef.current = true;
    target.focus({ preventScroll: true });
    setSelectedId(id);
  };
  const closeReview = () => { reviewOpenRef.current = false;setSelectedId(null); };

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
        <span className="inline-flex rounded-full bg-warning-surface px-3 py-1.5 text-xs font-semibold text-warning-foreground">
          For Verification
        </span>
      );
    }

    if (status === 'needs_revision') {
      return (
        <span className="inline-flex rounded-full bg-warning-surface px-3 py-1.5 text-xs font-semibold text-warning-foreground">
          Need Revision
        </span>
      );
    }

    if (status === 'completed') {
      return (
        <span className="inline-flex rounded-full bg-success-surface px-3 py-1.5 text-xs font-semibold text-success-foreground">
          Completed
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full bg-danger-surface px-3 py-1.5 text-xs font-semibold text-danger-foreground">
        Rejected
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-page">
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
                className={`min-w-0 cursor-pointer rounded-2xl border p-5 text-left transition hover:border-primary-border hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  activeTab === status ? 'border-primary bg-selected' : 'border-gray-200 bg-white hover:bg-primary-soft'
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-medium text-gray-500">{label}</span>
                    <span className="mt-2 block break-words text-2xl font-bold text-gray-900">{loading && !remote.hasLoaded && !verificationRequests.length ? <SkeletonValue /> : getCount(status)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`lf-icon-badge ${className}`}>
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-primary" />
                  </span>
                </span>
              </button>;
            })}
          </section>

          {/* ==================================================
              Verification Records
              ================================================== */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            {/* ==================================================
                Search + Filters
                ================================================== */}
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4">
              <div className="relative min-w-0 w-full sm:min-w-64 flex-1">
                <Search size={18} aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none"
                />

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="Search donor, blood type, or event..."
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-primary focus:bg-white"
                />
              </div>

              <select
                value={selectedMonth}
                onChange={(event) =>
                  setSelectedMonth(event.target.value)
                }
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-primary"
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
                  className="flex h-full w-11 items-center justify-center rounded-l-xl text-gray-600 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
                <button type="button" aria-label="All years" aria-pressed={selectedYear === 'all'} title="All Years" onClick={() => setSelectedYear('all')}
                  className="h-full w-24 text-center text-sm font-semibold tabular-nums text-gray-700 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  {selectedYear === 'all' ? 'All Years' : selectedYear}
                </button>
                <button type="button" aria-label="Next year" onClick={() => setSelectedYear((year) => String((year === 'all' ? currentYear : Number(year)) + 1))}
                  className="flex h-full w-11 items-center justify-center rounded-r-xl text-gray-600 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
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
            <LoadingNotice loading={loading} hasData={remote.hasLoaded || remote.items.length > 0} />
            {error && <ErrorState description={error} compact={remote.hasLoaded || verificationRequests.length > 0} status={remote.errorStatus} busy={loading} onRetry={model.load} />}
            <div ref={tableFocusRef} tabIndex={-1} aria-label="Verification records" className="w-full overflow-x-auto">
              <table className="w-full min-w-[640px] table-fixed text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="w-[22%] px-4 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Donor
                    </th>

                    <th className="w-[12%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Blood Type
                    </th>

                    <th className="w-[24%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Donation Event
                    </th>

                    <th className="w-[16%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Submitted
                    </th>

                    <th className="w-[26%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>{loading && !remote.hasLoaded && !remote.items.length && <tr><td colSpan={5}><PageSkeleton variant="table" header={false} /></td></tr>}
                  {filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      tabIndex={0}
                      aria-label={`Review verification for ${formatDonorName(request.donor)}, ${VERIFICATION_STATUS_LABELS[request.status]}`}
                      aria-haspopup="dialog"
                      onClick={(event) => {
                        if (event.target.closest('button, a, input, select, textarea, [contenteditable="true"]')) return;
                        openReview(request.id, event.currentTarget);
                      }}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget || event.repeat) return;
                        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openReview(request.id, event.currentTarget); }
                      }}
                      className="cursor-pointer border-b border-gray-100 transition hover:bg-primary-soft focus-visible:bg-primary-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary last:border-0"
                    >
                      <td className="break-words px-4 py-5">
                        <p className="font-semibold text-gray-800">
                          {formatDonorName(request.donor)}
                        </p>
                      </td>

                      <td className="px-3 py-5">
                        <span className="inline-flex min-w-10 justify-center rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary">
                          {request.bloodType}
                        </span>
                      </td>

                      <td className="break-words px-3 py-5 text-sm text-gray-500">
                        {request.event}
                      </td>

                      <td className="px-4 py-5 text-sm text-gray-500">
                        {formatDate(request.submittedDate)}
                      </td>

                      <td className="px-3 py-5">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          {renderStatus(request.status)}
                          <ChevronRight size={17} aria-hidden="true" className="shrink-0 text-primary" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Empty State */}
              {!loading && !error && filteredRequests.length === 0 && (
                <EmptyState title={searchTerm.trim() || selectedMonth !== 'all' || selectedYear !== 'all' ? "No matching requests found" : "No requests in this status"} description="Submitted donation proofs will appear in the appropriate status." />
              )}
            </div>
          </section>
        </div>
      </main>
      {selectedId !== null && <VerificationReviewDrawer key={selectedId} id={selectedId} fallbackFocusRef={tableFocusRef}
        onClose={closeReview} onDecision={() => { closeReview(); void model.load(); }} />}
    </div>
  );
}

export default Verification;
