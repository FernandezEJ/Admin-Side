import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Search,
  Clock3,
  CircleCheck,
  CircleX,
  Eye,
  FileText,
  RotateCcw,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function Verification() {
  const navigate = useNavigate();

  // ============================================================
  // Filters
  // ============================================================

  const [activeTab, setActiveTab] = useState('for_verification');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');

  // ============================================================
  // Temporary Verification Data
  //
  // Laravel will replace this later.
  //
  // Statuses:
  // - for_verification
  // - needs_revision
  // - completed
  // - rejected
  // ============================================================

  const verificationRequests = [
    {
      id: 1,
      donor: 'Juan Dela Cruz',
      bloodType: 'O+',
      event: 'Community Blood Donation Drive',
      submittedDate: '2026-09-16',
      proofType: 'PDF',
      status: 'for_verification',
    },
    {
      id: 2,
      donor: 'Maria Santos',
      bloodType: 'A+',
      event: 'LifeFlow University Blood Drive',
      submittedDate: '2026-09-16',
      proofType: 'JPG',
      status: 'for_verification',
    },
    {
      id: 3,
      donor: 'Carlo Reyes',
      bloodType: 'B+',
      event: 'Community Blood Donation Drive',
      submittedDate: '2026-09-15',
      proofType: 'PNG',
      status: 'needs_revision',
    },
    {
      id: 4,
      donor: 'Angela Cruz',
      bloodType: 'AB+',
      event: 'Barangay Donation Campaign',
      submittedDate: '2026-08-22',
      proofType: 'PDF',
      status: 'completed',
    },
    {
      id: 5,
      donor: 'Mark Villanueva',
      bloodType: 'O−',
      event: 'Barangay Donation Campaign',
      submittedDate: '2026-08-21',
      proofType: 'JPG',
      status: 'completed',
    },
    {
      id: 6,
      donor: 'Paolo Garcia',
      bloodType: 'A−',
      event: 'Emergency Blood Donation Event',
      submittedDate: '2026-07-12',
      proofType: 'PDF',
      status: 'rejected',
    },
  ];

  // ============================================================
  // Date Helpers
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
    const years = verificationRequests.map((request) =>
      request.submittedDate.substring(0, 4)
    );

    return [...new Set(years)].sort((a, b) => Number(b) - Number(a));
  }, []);

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
    verificationRequests.filter(
      (request) => request.status === status
    ).length;

  // ============================================================
  // Search + Month/Year Filtering
  // ============================================================

  const filteredRequests = verificationRequests.filter((request) => {
    const matchesStatus = request.status === activeTab;

    const searchValue = searchTerm.toLowerCase();

    const matchesSearch =
      request.donor.toLowerCase().includes(searchValue) ||
      request.event.toLowerCase().includes(searchValue) ||
      request.bloodType.toLowerCase().includes(searchValue);

    const requestMonth = request.submittedDate.substring(5, 7);
    const requestYear = request.submittedDate.substring(0, 4);

    const matchesMonth =
      selectedMonth === 'all' ||
      requestMonth === selectedMonth;

    const matchesYear =
      selectedYear === 'all' ||
      requestYear === selectedYear;

    return (
      matchesStatus &&
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
  // Status Appearance
  // ============================================================

  const renderStatus = (status) => {
    if (status === 'for_verification') {
      return (
        <span className="inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
          For Verification
        </span>
      );
    }

    if (status === 'needs_revision') {
      return (
        <span className="inline-flex rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
          Needs Revision
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
      <span className="inline-flex rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
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

        <div className="space-y-6 p-8">
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
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* For Verification */}
            <article className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    For Verification
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-gray-900">
                    {getCount('for_verification')}
                  </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Clock3 size={21} />
                </div>
              </div>
            </article>

            {/* Needs Revision */}
            <article className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Needs Revision
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-gray-900">
                    {getCount('needs_revision')}
                  </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <RotateCcw size={21} />
                </div>
              </div>
            </article>

            {/* Completed */}
            <article className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Completed
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-gray-900">
                    {getCount('completed')}
                  </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <CircleCheck size={21} />
                </div>
              </div>
            </article>

            {/* Rejected */}
            <article className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Rejected
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-gray-900">
                    {getCount('rejected')}
                  </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <CircleX size={21} />
                </div>
              </div>
            </article>
          </section>

          {/* ==================================================
              Verification Records
              ================================================== */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            {/* Status Tabs */}
            <div className="border-b border-gray-200 px-6 pt-5">
              <div className="flex flex-wrap gap-6">
                {[
                  ['for_verification', 'For Verification'],
                  ['needs_revision', 'Needs Revision'],
                  ['completed', 'Completed'],
                  ['rejected', 'Rejected'],
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

            {/* ==================================================
                Search + Filters
                ================================================== */}
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

              <select
                value={selectedYear}
                onChange={(event) =>
                  setSelectedYear(event.target.value)
                }
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-[#b7192e]"
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
                className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-500 transition hover:bg-gray-50"
              >
                Clear
              </button>
            </div>

            {/* ==================================================
                Verification Table
                ================================================== */}
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed text-left">
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
                  {filteredRequests.map((request) => (
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
                        <span className="inline-flex min-w-10 justify-center rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-[#b7192e]">
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
              {filteredRequests.length === 0 && (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <FileText
                    size={36}
                    className="text-gray-300"
                  />

                  <h3 className="mt-4 font-semibold text-gray-700">
                    No verification records found
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

export default Verification;