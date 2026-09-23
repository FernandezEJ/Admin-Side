import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Search,
  Users,
  CircleCheck,
  Clock3,
  Trophy,
  Eye,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function Donors() {
  const navigate = useNavigate();

  // ============================================================
  // Page State
  // ============================================================

  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBloodType, setSelectedBloodType] = useState('all');
  const [selectedEligibility, setSelectedEligibility] = useState('all');
  const getAchievementClasses = (achievement) => {
  switch (achievement) {
    case 'Bronze Donor':
      return 'bg-amber-100 text-amber-800';

    case 'Silver Donor':
      return 'bg-gray-200 text-gray-700';

    case 'Gold Donor':
      return 'bg-yellow-100 text-yellow-700';

    case 'Platinum Donor':
      return 'bg-slate-200 text-slate-700';

    default:
      return 'bg-gray-100 text-gray-600';
  }
};

  // ============================================================
  // Temporary Donor Data
  // Laravel will provide these records later.
  // ============================================================

  const donors = [
    {
      id: 1,
      name: 'Juan Dela Cruz',
      bloodType: 'O+',
      eligibility: 'eligible',
      totalDonations: 12,
      achievement: 'Silver Donor',
      joinedDate: '2026-01-12',
    },
    {
      id: 2,
      name: 'Maria Santos',
      bloodType: 'A+',
      eligibility: 'eligible',
      totalDonations: 10,
      achievement: 'Silver Donor',
      joinedDate: '2026-02-04',
    },
    {
      id: 3,
      name: 'Carlo Reyes',
      bloodType: 'B+',
      eligibility: 'temporarily_ineligible',
      totalDonations: 8,
      achievement: 'Silver Donor',
      joinedDate: '2026-03-18',
    },
    {
      id: 4,
      name: 'Angela Cruz',
      bloodType: 'AB+',
      eligibility: 'eligible',
      totalDonations: 7,
      achievement: 'Silver Donor',
      joinedDate: '2026-04-09',
    },
    {
      id: 5,
      name: 'Mark Villanueva',
      bloodType: 'O−',
      eligibility: 'temporarily_ineligible',
      totalDonations: 5,
      achievement: 'Silver Donor',
      joinedDate: '2026-05-22',
    },
    {
      id: 6,
      name: 'Paolo Garcia',
      bloodType: 'A−',
      eligibility: 'eligible',
      totalDonations: 3,
      achievement: 'Silver Donor',
      joinedDate: '2026-06-14',
    },
    {
      id: 7,
      name: 'Sarah Mendoza',
      bloodType: 'B−',
      eligibility: 'eligible',
      totalDonations: 2,
      achievement: 'Silver Donor',
      joinedDate: '2026-07-03',
    },
    {
      id: 8,
      name: 'Nicole Ramos',
      bloodType: 'AB−',
      eligibility: 'eligible',
      totalDonations: 1,
      achievement: 'Silver Donor',
      joinedDate: '2026-08-11',
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

  const totalDonors = donors.length;

  const eligibleDonors = donors.filter(
    (donor) => donor.eligibility === 'eligible'
  ).length;

  const temporarilyIneligibleDonors = donors.filter(
    (donor) =>
      donor.eligibility === 'temporarily_ineligible'
  ).length;

  const bloodTypes = useMemo(
    () => [
      ...new Set(
        donors.map((donor) => donor.bloodType)
      ),
    ],
    []
  );

  // ============================================================
  // All Donors Filtering
  // ============================================================

  const filteredDonors = donors.filter((donor) => {
    const searchValue = searchTerm.toLowerCase();

    const matchesSearch =
      donor.name.toLowerCase().includes(searchValue) ||
      donor.bloodType.toLowerCase().includes(searchValue);

    const matchesBloodType =
      selectedBloodType === 'all' ||
      donor.bloodType === selectedBloodType;

    const matchesEligibility =
      selectedEligibility === 'all' ||
      donor.eligibility === selectedEligibility;

    return (
      matchesSearch &&
      matchesBloodType &&
      matchesEligibility
    );
  });

  // ============================================================
  // Leaderboard
  // Highest completed donations first.
  // ============================================================

  const topDonors = [...donors].sort(
    (a, b) => b.totalDonations - a.totalDonations
  );

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedBloodType('all');
    setSelectedEligibility('all');
  };

  // ============================================================
  // Eligibility Badge
  // ============================================================

  const renderEligibility = (eligibility) => {
    if (eligibility === 'eligible') {
      return (
        <span className="inline-flex rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
          Eligible
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
        Temporarily Ineligible
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <Header
          title="Donors"
          description="Search donors, review profiles, and view top contributors."
        />

        <div className="space-y-6 p-8">
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
                    {totalDonors}
                  </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#b7192e]">
                  <Users size={21} />
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
                    {eligibleDonors}
                  </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <CircleCheck size={21} />
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
                    {temporarilyIneligibleDonors}
                  </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Clock3 size={21} />
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
                      ? 'border-[#b7192e] text-[#b7192e]'
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
                      ? 'border-[#b7192e] text-[#b7192e]'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  <Trophy size={15} />
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
                      placeholder="Search donor or blood type..."
                      className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-[#b7192e] focus:bg-white"
                    />
                  </div>

                  <select
                    value={selectedBloodType}
                    onChange={(event) =>
                      setSelectedBloodType(event.target.value)
                    }
                    className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-[#b7192e]"
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
                    className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-[#b7192e]"
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
                  </select>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-500 transition hover:bg-gray-50"
                  >
                    Clear
                  </button>
                </div>

                {/* No horizontal scrolling */}
                <div className="w-full overflow-hidden">
                  <table className="w-full table-fixed text-left">
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

                        <th className="w-[14%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredDonors.map((donor) => (
                        <tr
                          key={donor.id}
                          className="border-b border-gray-100 last:border-0"
                        >
                          <td className="break-words px-5 py-5">
                            <p className="font-semibold text-gray-800">
                              {donor.name}
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              Joined {formatDate(donor.joinedDate)}
                            </p>
                          </td>

                          <td className="px-3 py-5">
                            <span className="inline-flex min-w-10 justify-center rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-[#b7192e]">
                              {donor.bloodType}
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

                          <td className="px-3 py-5">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/donors/${donor.id}`
                                )
                              }
                              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-red-100 hover:bg-red-50 hover:text-[#b7192e]"
                            >
                              <Eye size={15} />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredDonors.length === 0 && (
                    <div className="py-16 text-center">
                      <Users
                        size={36}
                        className="mx-auto text-gray-300"
                      />

                      <h3 className="mt-4 font-semibold text-gray-700">
                        No donors found
                      </h3>

                      <p className="mt-1 text-sm text-gray-400">
                        Try changing your search or filters.
                      </p>
                    </div>
                  )}
                </div>
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

                <div className="space-y-3">
                  {topDonors.map((donor, index) => (
                    <div
                      key={donor.id}
                      className="grid grid-cols-[60px_1fr_auto_auto] items-center gap-4 rounded-xl border border-gray-200 px-5 py-4"
                    >
                      {/* Rank */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-700">
                        #{index + 1}
                      </div>

                      {/* Donor */}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-800">
                            {donor.name}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-gray-400">
                            Blood Type {donor.bloodType}
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
                        <p className="text-lg font-bold text-[#b7192e]">
                          {donor.totalDonations}
                        </p>

                        <p className="text-xs text-gray-400">
                          donations
                        </p>
                      </div>

                      {/* View */}
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/donors/${donor.id}`)
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-[#b7192e]"
                        title="View donor"
                      >
                        <Eye size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default Donors;