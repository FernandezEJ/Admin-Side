import { useMemo, useState } from 'react';

import {
  Search,
  MessageSquareText,
  Star,
  Eye,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function Feedback() {
  // ============================================================
  // Page State
  // ============================================================

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');

  const [selectedFeedback, setSelectedFeedback] = useState(null);

  // ============================================================
  // Temporary Feedback Data
  // Laravel will provide these later.
  // ============================================================

  const feedbackList = [
    {
      id: 1,
      donor: 'Juan Dela Cruz',
      rating: 5,
      message:
        'The app is easy to use and I like the rewards feature. The donation process is also clear.',
      submittedDate: '2026-09-16',
    },
    {
      id: 2,
      donor: 'Maria Santos',
      rating: 4,
      message:
        'The interface is clean and easy to understand. I hope there will be more grocery vouchers soon.',
      submittedDate: '2026-09-14',
    },
    {
      id: 3,
      donor: 'Carlo Reyes',
      rating: 5,
      message:
        'I like how the app keeps track of my donations and points.',
      submittedDate: '2026-08-28',
    },
  ];

  // ============================================================
  // Helpers
  // ============================================================

  const formatDate = (dateString) => {
    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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

  const years = [
    ...new Set(
      feedbackList.map((feedback) =>
        feedback.submittedDate.slice(0, 4)
      )
    ),
  ];

  // ============================================================
  // Filtering
  // ============================================================

  const filteredFeedback = useMemo(() => {
    return feedbackList.filter((feedback) => {
      const matchesSearch = feedback.donor
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const feedbackMonth =
        feedback.submittedDate.slice(5, 7);

      const feedbackYear =
        feedback.submittedDate.slice(0, 4);

      const matchesMonth =
        selectedMonth === 'all' ||
        feedbackMonth === selectedMonth;

      const matchesYear =
        selectedYear === 'all' ||
        feedbackYear === selectedYear;

      return (
        matchesSearch &&
        matchesMonth &&
        matchesYear
      );
    });
  }, [
    feedbackList,
    searchTerm,
    selectedMonth,
    selectedYear,
  ]);

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
          title="Feedback"
          description="View feedback submitted by LifeFlow donors."
        />

        <div className="space-y-6 p-8">
          {/* ==================================================
              Page Heading
              ================================================== */}
          <section>
            <h2 className="text-lg font-bold text-gray-800">
              Donor Feedback
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Read feedback and experiences shared by donors.
            </p>
          </section>

          {/* ==================================================
              Summary Card
              ================================================== */}
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Feedback
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-gray-900">
                    {feedbackList.length}
                  </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#b7192e]">
                  <MessageSquareText size={21} />
                </div>
              </div>
            </article>
          </section>

          {/* ==================================================
              Feedback List
              ================================================== */}
          <section className="rounded-2xl border border-gray-200 bg-white">
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
                  placeholder="Search donor..."
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition focus:border-[#b7192e] focus:bg-white"
                />
              </div>

              <select
                value={selectedMonth}
                onChange={(event) =>
                  setSelectedMonth(event.target.value)
                }
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-[#b7192e]"
              >
                <option value="all">
                  All Months
                </option>

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
                <option value="all">
                  All Years
                </option>

                {years.map((year) => (
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

            {/* Table */}
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="w-[22%] px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Donor
                    </th>

                    <th className="w-[14%] px-3 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Rating
                    </th>

                    <th className="w-[38%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Feedback
                    </th>

                    <th className="w-[18%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Submitted
                    </th>

                    <th className="w-[8%] px-3 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredFeedback.length > 0 ? (
                    filteredFeedback.map((feedback) => (
                      <tr
                        key={feedback.id}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="break-words px-5 py-5 font-semibold text-gray-800">
                          {feedback.donor}
                        </td>

                        <td className="px-3 py-5">
                          <div className="flex items-center justify-center gap-1">
                            <Star
                              size={16}
                              fill="currentColor"
                              className="text-yellow-500"
                            />

                            <span className="text-sm font-semibold text-gray-700">
                              {feedback.rating}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-5">
                          <p className="line-clamp-2 break-words text-sm leading-6 text-gray-500">
                            {feedback.message}
                          </p>
                        </td>

                        <td className="px-3 py-5 text-sm text-gray-500">
                          {formatDate(
                            feedback.submittedDate
                          )}
                        </td>

                        <td className="px-3 py-5 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedFeedback(feedback)
                            }
                            title="View feedback"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-[#b7192e]"
                          >
                            <Eye size={17} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-5 py-12 text-center"
                      >
                        <MessageSquareText
                          size={32}
                          className="mx-auto text-gray-300"
                        />

                        <p className="mt-3 text-sm font-semibold text-gray-500">
                          No feedback found.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* ========================================================
          Read-Only Feedback Modal
          ======================================================== */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-5">
              <h3 className="text-lg font-bold text-gray-800">
                Feedback Details
              </h3>

              <p className="mt-1 text-sm text-gray-400">
                Submitted donor feedback.
              </p>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Donor
                  </p>

                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedFeedback.donor}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Submitted
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-700">
                    {formatDate(
                      selectedFeedback.submittedDate
                    )}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Rating
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <Star
                    size={18}
                    fill="currentColor"
                    className="text-yellow-500"
                  />

                  <span className="font-semibold text-gray-800">
                    {selectedFeedback.rating} / 5
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Feedback Message
                </p>

                <div className="mt-2 rounded-xl bg-gray-50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">
                    {selectedFeedback.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() =>
                  setSelectedFeedback(null)
                }
                className="min-h-10 rounded-xl bg-[#b7192e] px-5 text-sm font-semibold text-white transition hover:bg-[#9f1427]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Feedback;