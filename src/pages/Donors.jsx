import { formatDonorName } from '../services/staffNames';
import { EmptyState, ErrorState, PageSkeleton, LoadingNotice, SkeletonValue } from '../components/ui/PageState';


import {
  Search,
  Users,
  CircleCheck,
  Clock3,
  Trophy,

} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

import { useDonors } from '../services/useDonors';

export function DonorsView({ remote }) {
  const { data, loading, error, activeTab, searchTerm, selectedBloodType, selectedEligibility, model } = remote;
  const { setActiveTab, setSearchTerm, setSelectedBloodType, setSelectedEligibility, clearFilters } = model;
  const donors = data?.donors ?? [];
  const getAchievementClasses = (achievement) => {
  switch (achievement) {
    case 'Bronze Donor':
      return 'bg-warning-surface text-warning-foreground';

    case 'Silver Donor':
      return 'bg-gray-200 text-gray-700';

    case 'Gold Donor':
      return 'bg-warning-surface text-warning-foreground';

    case 'First-Time Donor':
      return 'bg-selected text-primary';

    default:
      return 'bg-neutral-surface text-neutral-foreground';
  }
};

  // ============================================================
  // Helpers
  // ============================================================

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 'Unknown';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const totalDonors = data?.summary.totalDonors;
  const eligibleDonors = data?.summary.eligible;
  const temporarilyIneligibleDonors = data?.summary.temporarilyIneligible;
  const bloodTypes = data?.bloodTypes ?? [];
  const pagination = data?.pagination ?? { currentPage: 1, lastPage: 1 };

  // ============================================================
  // Leaderboard
  // Highest completed donations first.
  // ============================================================

  const topDonors = data?.topDonors ?? [];

  // ============================================================
  // Eligibility Badge
  // ============================================================

  const renderEligibility = (eligibility) => {
    if (eligibility === 'eligible') {
      return (
        <span className="inline-flex rounded-full bg-success-surface px-3 py-1.5 text-xs font-semibold text-success-foreground">
          Eligible
        </span>
      );
    }

    if (eligibility === 'unassessed') {
      return <span className="inline-flex rounded-full bg-neutral-surface px-3 py-1.5 text-xs font-semibold text-neutral-foreground">Not Assessed</span>;
    }
    if (eligibility !== 'temporarily_ineligible') {
      return <span className="inline-flex rounded-full bg-warning-surface px-3 py-1.5 text-xs font-semibold text-warning-foreground">Needs Screening</span>;
    }

    return (
      <span className="inline-flex rounded-full bg-warning-surface px-3 py-1.5 text-xs font-semibold text-warning-foreground">
        Temporarily Ineligible
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <Header
          title="Donors"
          description="Search donors, review profiles, and view top contributors."
        />

        <div className="space-y-6 p-4 lg:p-8">
          {/* ==================================================
              Page Heading
              ================================================== */}
          <section>
            <h2 className="text-lg font-bold text-gray-800">
              Donor Management
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              View registered donors and donation activity.
            </p>
          </section>

          <LoadingNotice requestKey={JSON.stringify([remote.page, searchTerm, selectedBloodType, selectedEligibility])} loading={loading} hasData={!!data} />
          {!loading && error && <ErrorState title="Unable to load Donors" description={error} compact={!!data} status={remote.errorStatus} busy={loading} onRetry={() => model.load()} />}
          {<>
          {/* ==================================================
              Summary Cards
              ================================================== */}
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Donors
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-gray-900">
                    {!data && loading ? <SkeletonValue /> : totalDonors ?? '—'}
                  </h3>
                </div>

                <div className="lf-icon-badge lf-icon-brand">
                  <Users size={22} aria-hidden="true" />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Eligible
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-gray-900">
                    {!data && loading ? <SkeletonValue /> : eligibleDonors ?? '—'}
                  </h3>
                </div>

                <div className="lf-icon-badge bg-success-surface text-success-foreground">
                  <CircleCheck size={22} aria-hidden="true" />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Temporarily Ineligible
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-gray-900">
                    {!data && loading ? <SkeletonValue /> : temporarilyIneligibleDonors ?? '—'}
                  </h3>
                </div>

                <div className="lf-icon-badge bg-warning-surface text-warning-foreground">
                  <Clock3 size={22} aria-hidden="true" />
                </div>
              </div>
            </article>
          </section>

          {/* ==================================================
              Donor Records
              ================================================== */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            {/* Tabs */}
            <div className="border-b border-gray-200 px-6 pt-5">
              <div className="flex gap-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`border-b-2 pb-4 text-sm font-semibold transition ${
                    activeTab === 'all'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  All Donors
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('top')}
                  className={`flex items-center gap-2 border-b-2 pb-4 text-sm font-semibold transition ${
                    activeTab === 'top'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  <Trophy size={17} aria-hidden="true" />
                  Top Donors
                </button>
              </div>
            </div>

            {/* ==================================================
                All Donors
                ================================================== */}
            {activeTab === 'all' && (
              <>
                {/* Search + Filters */}
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
                      placeholder="Search donor or blood type..."
                      className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-primary focus:bg-white"
                    />
                  </div>

                  <select
                    value={selectedBloodType}
                    onChange={(event) =>
                      setSelectedBloodType(event.target.value)
                    }
                    className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-primary"
                  >
                    <option value="all">
                      All Blood Types
                    </option>

                    {bloodTypes.map((bloodType) => (
                      <option
                        key={bloodType}
                        value={bloodType}
                      >
                        {bloodType}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedEligibility}
                    onChange={(event) =>
                      setSelectedEligibility(event.target.value)
                    }
                    className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-primary"
                  >
                    <option value="all">
                      All Eligibility
                    </option>

                    <option value="eligible">
                      Eligible
                    </option>

                    <option value="temporarily_ineligible">
                      Temporarily Ineligible
                    </option>
                    <option value="unassessed">Not Assessed</option>
                    <option value="indeterminate">Needs Screening</option>
                  </select>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-500 transition hover:bg-gray-50"
                  >
                    Clear
                  </button>
                </div>

                {/* Keep wide tables inside their scrolling container. */}

                {<>
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[640px] table-fixed text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="w-[25%] px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Donor
                        </th>

                        <th className="w-[12%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Blood Type
                        </th>

                        <th className="w-[22%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Eligibility
                        </th>

                        <th className="w-[15%] px-3 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Donations
                        </th>

                        <th className="w-[18%] px-3 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Achievement
                        </th>


                      </tr>
                    </thead>

                    <tbody>{loading && !data && <tr><td colSpan={5}><PageSkeleton variant="table" header={false} /></td></tr>}
                      {donors.map((donor) => (
                        <tr
                          key={donor.id}
                          className="border-b border-gray-100 last:border-0"
                        >
                          <td className="break-words px-5 py-5">
                            <p className="font-semibold text-gray-800">
                              {formatDonorName(donor.name)}
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              Joined {formatDate(donor.joinedDate)}
                            </p>
                          </td>

                          <td className="px-3 py-5">
                            <span className="inline-flex min-w-10 justify-center rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary">
                              {donor.bloodType ?? 'Unknown'}
                            </span>
                          </td>

                          <td className="px-3 py-5">
                            {renderEligibility(
                              donor.eligibility
                            )}
                          </td>

                            <td className="px-3 py-5 text-center text-sm font-semibold text-gray-700">
                            {donor.totalDonations}
                            </td>

                            <td className="px-3 py-5 text-center">
                            <span
                                className={`inline-flex min-w-[120px] justify-center rounded-full px-3 py-1.5 text-xs font-semibold ${getAchievementClasses(
                                donor.achievement
                                )}`}
                            >
                                {donor.achievement}
                            </span>
                            </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!loading && !error && donors.length === 0 && (
                    <EmptyState title={totalDonors === 0 ? 'No donors registered' : 'No donors found'}
                      description={totalDonors === 0 ? 'Active donor accounts will appear here.' : 'Try changing your search or filters.'} />
                  )}
                </div>
                <nav aria-label="Donor pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-4 sm:px-6">
                  <p className="text-sm text-gray-500">Page {pagination.currentPage} of {pagination.lastPage}</p>
                  <div className="flex gap-2">
                    <button type="button" disabled={loading || pagination.currentPage <= 1} onClick={() => model.setPage(pagination.currentPage - 1)}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
                    <button type="button" disabled={loading || pagination.currentPage >= pagination.lastPage} onClick={() => model.setPage(pagination.currentPage + 1)}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
                  </div>
                </nav>
                </>}
              </>
            )}

            {/* ==================================================
                Top Donors Leaderboard
                ================================================== */}
            {activeTab === 'top' && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="font-bold text-gray-800">
                    Top Donors Leaderboard
                  </h3>

                  <p className="mt-1 text-sm text-gray-400">
                    Ranked by total verified and completed donations.
                  </p>
                </div>

                <div className="space-y-3">{loading && !data && <PageSkeleton variant="table" columns={3} />}
                  {topDonors.map((donor, index) => (
                    <div
                      key={donor.id}
                      className="grid grid-cols-[40px_minmax(0,1fr)] sm:grid-cols-[60px_1fr_auto] items-center gap-4 rounded-xl border border-gray-200 px-5 py-4"
                    >
                      {/* Rank */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-700">
                        #{index + 1}
                      </div>

                      {/* Donor */}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-800">
                            {formatDonorName(donor.name)}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-gray-400">
                            Blood Type {donor.bloodType ?? 'Unknown'}
                            </span>

                            <span className="text-gray-300">•</span>

                            <span
                            className={`inline-flex min-w-[110px] justify-center rounded-full px-3 py-1.5 text-xs font-semibold ${getAchievementClasses(
                                donor.achievement
                            )}`}
                            >
                            {donor.achievement}
                            </span>
                        </div>
                        </div>

                      {/* Donation count */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          {donor.totalDonations}
                        </p>

                        <p className="text-xs text-gray-400">
                          donations
                        </p>
                      </div>


                    </div>
                  ))}
                  {!loading && !error && topDonors.length === 0 && <EmptyState title="No donors registered" description="Active donor accounts will appear here." />}
                </div>
              </div>
            )}
          </section>
          </>}
        </div>
      </main>
    </div>
  );
}

export default function Donors() {
  const remote = useDonors();
  return <DonorsView remote={remote} />;
}
