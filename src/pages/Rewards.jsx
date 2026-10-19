import MonthFilter from '../components/ui/MonthFilter';
import { useRewards } from '../services/useRewards';
import { REWARD_CATEGORIES } from '../services/rewardsApi';
import { filterRedemptions } from '../data/rewardRedemptions';
import { EmptyState, ErrorState, PageSkeleton } from '../components/ui/PageState';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Plus,
  Search,
  Gift,
  Package,
  CircleCheck,
  CircleOff,
  Trash2,
  Pencil,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import RewardsAnalytics from '../components/rewards/RewardsAnalytics';
import ClaimVerification from '../components/rewards/ClaimVerification';
import { useAdminSession } from '../auth/useAdminSession';
import { hasRole } from '../auth/roles';

export function RewardsView({ remote, initialTab = 'rewards' }) {
  const { items: rewards, loading, error, busy, model } = remote;
  const navigate = useNavigate();
  const { role, mustChangePassword, currentAdmin } = useAdminSession();
  const canVerifyClaims = hasRole(role) && !mustChangePassword;

  // ============================================================
  // Page State
  // ============================================================

  const [activeTab, setActiveTab] = useState(initialTab);
  const [rewardStatusTab, setRewardStatusTab] = useState('active');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [redemptionSearch, setRedemptionSearch] = useState('');
  const [redemptionCategory, setRedemptionCategory] = useState('all');
  const [redemptionStatus, setRedemptionStatus] = useState('');
  const [redemptionMonth, setRedemptionMonth] = useState('');
  const redemptions = filterRedemptions(remote.redemptions, redemptionStatus, redemptionMonth).filter((row) => (redemptionCategory === 'all' || row.category === redemptionCategory) && `${row.donor} ${row.reward}`.toLowerCase().includes(redemptionSearch.toLowerCase()));

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

  const getCount = (status) =>
    rewards.filter((reward) => reward.status === status).length;

  const availableStock = rewards
    .filter((reward) => reward.status === 'active')
    .reduce((total, reward) => total + reward.stock, 0);

  // ============================================================
  // Rewards Filtering
  // ============================================================

  const filteredRewards = useMemo(() => {
    return rewards.filter((reward) => {
      const matchesStatus = reward.status === rewardStatusTab;

      const matchesSearch = reward.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' ||
        reward.category === selectedCategory;

      return (
        matchesStatus &&
        matchesSearch &&
        matchesCategory
      );
    });
  }, [
    rewards,
    rewardStatusTab,
    searchTerm,
    selectedCategory,
  ]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
  };

  const handleDelete = async (id) => {
    if (!busy && window.confirm('Move this voucher to Deleted? It can be recovered for 30 days.')) await model.transition(id, 'delete');
  };
  const handleRestore = async (id) => {
    if (!busy && window.confirm('Restore this reward to Inactive?')) {
      if (await model.transition(id, 'restore')) setRewardStatusTab('inactive');
    }
  };

  // ============================================================
  // Reward Status Badge
  // ============================================================

  const renderRewardStatus = (status) => {
    if (status === 'active') {
      return (
        <span className="inline-flex rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
          Active
        </span>
      );
    }

    if (status === 'inactive') {
      return (
        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
          Inactive
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full px-3 py-1.5 text-xs font-semibold text-red-700">
        Deleted
      </span>
    );
  };

  // ============================================================
  // Redemption Status Badge
  // ============================================================

  const renderRedemptionStatus = (status) => <span className="inline-flex rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">{({ available: 'Available', active: 'Active', redeemed: 'Redeemed', expired: 'Expired' })[status] ?? status}</span>;

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <Header
          title="Rewards"
          description="Manage LifeFlow vouchers and donor redemptions."
        />

        <div className="space-y-6 p-4 lg:p-8">
          {loading && <PageSkeleton />}
          {error && <ErrorState title="Unable to complete Rewards request" description={error} onRetry={() => model.load()} />}
          {!loading && <>
          {/* ==================================================
              Page Heading
              ================================================== */}
          <section hidden={activeTab === 'analytics'} className={activeTab === 'analytics' ? 'hidden' : 'flex flex-wrap items-center justify-between gap-4'}>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Voucher Management
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Manage voucher values, points, stock,
                and redemption history.
              </p>
            </div>

            {activeTab === 'rewards' && (
              <button
                type="button"
                onClick={() => navigate('/rewards/create')}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-[#b7192e] px-5 text-sm font-semibold text-white transition hover:bg-[#9f1427]"
              >
                <Plus size={18} />
              Add Voucher
              </button>
            )}
          </section>

          {/* ==================================================
              Summary Cards
              ================================================== */}
          <section className={activeTab === 'analytics' ? 'hidden' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4'}>
            {[
              { status: 'active', label: 'Active', icon: CircleCheck, iconClasses: 'bg-green-50 text-green-600' },
              { status: 'inactive', label: 'Inactive', icon: CircleOff, iconClasses: 'bg-gray-100 text-gray-500' },
              { status: 'deleted', label: 'Deleted', icon: Trash2, iconClasses: 'bg-red-50 text-red-600' },
            ].map(({ status, label, icon: Icon, iconClasses }) => (
              <button key={status} type="button"
                onClick={() => { setActiveTab('rewards'); setRewardStatusTab(status); }}
                aria-label={`Show ${label} vouchers`}
                aria-pressed={activeTab === 'rewards' && rewardStatusTab === status}
                className={`min-w-0 cursor-pointer rounded-2xl border p-5 text-left transition hover:border-red-200 hover:bg-red-50/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b7192e] ${
                  activeTab === 'rewards' && rewardStatusTab === status ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'
                }`}>
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-500">{label}</span>
                    <span className="mt-2 block text-2xl font-bold text-gray-900">{getCount(status)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClasses}`}><Icon size={21} aria-hidden="true" /></span>
                    <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-gray-400" />
                  </span>
                </span>
              </button>
            ))}

            <article className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Available Stock
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-gray-900">
                    {availableStock}
                  </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#b7192e]">
                  <Package size={21} />
                </div>
              </div>
            </article>
          </section>

          {/* ==================================================
              Main Rewards / Redemptions Panel
              ================================================== */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            {/* ==================================================
                Main Navigation + Status Filters
                ================================================== */}
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 px-6 pt-5">
              {/* Main tabs */}
              <div className="flex flex-wrap gap-7" aria-label="Rewards sections">
                <button
                  type="button"
                  onClick={() => setActiveTab('rewards')}
                  aria-pressed={activeTab === 'rewards'}
                  className={`border-b-2 pb-4 text-sm font-semibold transition ${
                    activeTab === 'rewards'
                      ? 'border-[#b7192e] text-[#b7192e]'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Reward Management
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('redemptions')}
                  aria-pressed={activeTab === 'redemptions'}
                  className={`border-b-2 pb-4 text-sm font-semibold transition ${
                    activeTab === 'redemptions'
                      ? 'border-[#b7192e] text-[#b7192e]'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Redemptions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('analytics')}
                  aria-pressed={activeTab === 'analytics'}
                  aria-controls="rewards-analytics"
                  className={`border-b-2 pb-4 text-sm font-semibold transition ${
                    activeTab === 'analytics'
                      ? 'border-[#b7192e] text-[#b7192e]'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Analytics
                </button>
                {canVerifyClaims && <button
                  type="button"
                  onClick={() => setActiveTab('claims')}
                  aria-pressed={activeTab === 'claims'}
                  aria-controls="reward-claim-verification"
                  className={`border-b-2 pb-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b7192e] ${activeTab === 'claims' ? 'border-[#b7192e] text-[#b7192e]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                >Claim Verification</button>}
              </div>

              {/* Reward status filters */}
              {activeTab === 'rewards' && (
                <div className="flex gap-5">
                  {[
                    ['active', 'Active'],
                    ['inactive', 'Inactive'],
                    ['deleted', 'Deleted'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRewardStatusTab(id)}
                      className={`border-b-2 pb-4 text-sm font-semibold transition ${
                        rewardStatusTab === id
                          ? 'border-[#b7192e] text-[#b7192e]'
                          : 'border-transparent text-gray-400 hover:text-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div id="rewards-analytics" hidden={activeTab !== 'analytics'}>
              <RewardsAnalytics remote={remote} />
            </div>
            {activeTab === 'claims' && canVerifyClaims && <ClaimVerification key={currentAdmin?.id ?? role} onClaimed={model.refreshClaims} />}

            {/* ==================================================
                Rewards Tab
                ================================================== */}
            {activeTab === 'rewards' && (
              <>
                {/* Search and Filters */}
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
                      placeholder="Search vouchers..."
                      className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition focus:border-[#b7192e] focus:bg-white"
                    />
                  </div>

                  <select
                    aria-label="Category"
                    value={selectedCategory}
                    onChange={(event) =>
                      setSelectedCategory(event.target.value)
                    }
                    className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-[#b7192e]"
                  >
                    <option value="all">
                      All Categories
                    </option>

                    {REWARD_CATEGORIES.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
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

                {/* Reward Cards */}
                <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">
                  {filteredRewards.length > 0 ? (
                    filteredRewards.map((reward) => (
                      <article
                        key={reward.id}
                        className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
                      >
                        {/* Temporary image placeholder */}
                        <div className="flex h-44 items-center justify-center bg-gray-100">
                          {reward.image_url ? <img src={reward.image_url} alt={reward.name} className="h-full w-full object-cover" /> : <>
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#b7192e] shadow-sm">
                            <Gift size={27} />
                          </div></>}
                        </div>

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                LIFEFLOW VOUCHER
                              </p>

                              <h3 className="mt-1 font-bold text-gray-800">
                                {reward.name}
                              </h3>
                            </div>

                            {renderRewardStatus(reward.status)}
                            {reward.status === 'deleted' && <p className="mt-2 text-xs text-gray-500">Recoverable for 30 days. Deletion scheduled: {reward.scheduled_for_deletion_at?.slice(0, 10)}. Definitions with voucher history are retained.</p>}
                          </div>

                          {/* Points and Stock */}
                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-xs text-gray-400">
                                Points Required
                              </p>

                              <p className="mt-1 font-bold text-[#b7192e]">
                                {reward.pointsRequired}
                              </p>
                            </div>

                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-xs text-gray-400">
                                Stock
                              </p>

                              <p className="mt-1 font-bold text-gray-800">
                                {reward.stock}
                              </p>
                            </div>
                          </div>

                          {/* Reward Actions */}
                          <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
                            {reward.status !== 'deleted' && (
                              <>
                                <button
                                  type="button"
                                  title="Edit reward"
                                  disabled={busy}
                                  onClick={() => navigate(`/rewards/${reward.id}/edit`)}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-[#b7192e]"
                                >
                                  <Pencil size={17} />
                                </button>

                                <button
                                  type="button"
                                  title="Delete reward" disabled={busy}
                                  onClick={() =>
                                    handleDelete(reward.id)
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 size={17} />
                                </button>
                              </>
                            )}

                            {reward.status === 'deleted' && (
                              <button
                                type="button"
                                disabled={busy || !reward.recoverable} title={reward.recoverable ? 'Restore' : 'Recovery period ended; awaiting backend purge'}
                                onClick={() =>
                                  handleRestore(reward.id)
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-green-50 hover:text-green-600"
                              >
                                <RotateCcw size={17} />
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="col-span-full"><EmptyState title="No vouchers found" /></div>
                  )}
                </div>
              </>
            )}

            {/* ==================================================
                Redemptions Tab
                ================================================== */}
            {activeTab === 'redemptions' && (<>
              <div className="flex flex-wrap items-end gap-4 border-b border-gray-200 p-4">
                <label className="text-sm text-gray-600">Status<select aria-label="Redemption status" value={redemptionStatus} onChange={(event) => setRedemptionStatus(event.target.value)} className="mt-2 block h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-[#b7192e]"><option value="">All statuses</option><option value="available">Available</option><option value="redeemed">Redeemed</option><option value="expired">Expired</option></select></label>
                <label className="text-sm text-gray-600">Search<input aria-label="Search redemptions" value={redemptionSearch} onChange={(event) => setRedemptionSearch(event.target.value)} className="mt-2 block h-11 rounded-xl border border-gray-200 px-4" /></label>
                <label className="text-sm text-gray-600">Category<select aria-label="Redemption category" value={redemptionCategory} onChange={(event) => setRedemptionCategory(event.target.value)} className="mt-2 block h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-[#b7192e]"><option value="all">All Categories</option>{REWARD_CATEGORIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
                <MonthFilter value={redemptionMonth} onChange={setRedemptionMonth} />
                <button type="button" onClick={() => { setRedemptionSearch(''); setRedemptionCategory('all'); setRedemptionStatus(''); setRedemptionMonth(''); }} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b7192e]">Clear</button>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[640px] table-fixed text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="w-[22%] px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Donor
                      </th>

                      <th className="w-[30%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Voucher
                      </th>

                      <th className="w-[14%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Points
                      </th>

                      <th className="w-[18%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Redeemed
                      </th>

                      <th className="w-[16%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {redemptions.map((redemption) => (
                      <tr
                        key={redemption.id}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="break-words px-5 py-5 font-semibold text-gray-800">
                          {redemption.donor}
                        </td>

                        <td className="break-words px-3 py-5 text-sm text-gray-500">
                          {redemption.reward}
                        </td>

                        <td className="px-3 py-5 text-sm font-semibold text-gray-700">
                          {redemption.pointsUsed}
                        </td>

                        <td className="px-3 py-5 text-sm text-gray-500">
                          {formatDate(redemption.redeemedDate)}
                        </td>

                        <td className="px-3 py-5">
                          {renderRedemptionStatus(
                            redemption.status
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!redemptions.length && <EmptyState title="No redemptions found" />}
              </>)}
          </section>
          </>}
        </div>
      </main>
    </div>
  );
}

export default function Rewards() { return <RewardsView remote={useRewards()} />; }
