import MonthFilter from '../components/ui/MonthFilter';
import { useRewards } from '../services/useRewards';
import { formatDonorName } from '../services/staffNames';
import { REWARD_CATEGORIES } from '../services/rewardsApi';
import { filterRedemptions } from '../data/rewardRedemptions';
import { EmptyState, ErrorState, PageSkeleton, LoadingNotice, SkeletonValue } from '../components/ui/PageState';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  Plus,
  Search,
  Gift,
  CircleCheck,
  CircleOff,
  Trash2,
  ChevronRight,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import RewardsAnalytics from '../components/rewards/RewardsAnalytics';
import ClaimVerification from '../components/rewards/ClaimVerification';
import RewardPopup from '../components/rewards/RewardPopup';
import RewardCover from '../components/rewards/RewardCover';
import { useAdminSession } from '../auth/useAdminSession';
import { hasRole } from '../auth/roles';

export function RewardsView({ remote, initialTab = 'rewards', enterPopupHistory }) {
  const { items: rewards, loading, error, model } = remote;
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedId, setSelectedId] = useState(location.state?.rewardPopup ?? null);
  const openingRef = useRef(!!location.state?.rewardPopup), openerRef = useRef(null), galleryRef = useRef(null);
  const openReward = (id, event) => {
    if (openingRef.current) return;
    openingRef.current = true;openerRef.current = event.currentTarget;
    openerRef.current.focus({ preventScroll: true });enterPopupHistory?.(id);setSelectedId(id);
  };
  const dismiss = useCallback(() => {
    openingRef.current = false;setSelectedId(null);
    requestAnimationFrame(() => { if (!openerRef.current?.isConnected) galleryRef.current?.focus({ preventScroll: true }); });
  }, []);
  const refresh = useCallback(async () => {
    await model.load(undefined, { background: true });
    if (!openingRef.current && !openerRef.current?.isConnected) galleryRef.current?.focus({ preventScroll: true });
  }, [model]);
  useEffect(() => {
    const forward = event => { const id = event.state?.usr?.rewardPopup;if (id) { openingRef.current = true;setSelectedId(id); } };
    window.addEventListener('popstate', forward);return () => window.removeEventListener('popstate', forward);
  }, []);
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
  const [redemptionStatus, setRedemptionStatus] = useState('');
  const [redemptionMonth, setRedemptionMonth] = useState('');
  const redemptions = filterRedemptions(remote.redemptions, redemptionStatus, redemptionMonth).filter((row) => `${row.donor} ${row.reward}`.toLowerCase().includes(redemptionSearch.toLowerCase()));

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

  const availableStock = remote.analytics?.summary.active_inventory ?? rewards
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

  // ============================================================
  // Reward Status Badge
  // ============================================================

  const renderRewardStatus = (status) => {
    if (status === 'active') {
      return (
        <span className="inline-flex rounded-full bg-success-surface px-3 py-1.5 text-xs font-semibold text-success-foreground">
          Active
        </span>
      );
    }

    if (status === 'inactive') {
      return (
        <span className="inline-flex rounded-full bg-neutral-surface px-3 py-1.5 text-xs font-semibold text-neutral-foreground">
          Inactive
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full bg-danger-surface px-3 py-1.5 text-xs font-semibold text-danger-foreground">
        Deleted
      </span>
    );
  };

  // ============================================================
  // Redemption Status Badge
  // ============================================================

  const renderRedemptionStatus = (status) => <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${status === 'redeemed' ? 'bg-success-surface text-success-foreground' : 'bg-neutral-surface text-neutral-foreground'}`}>{({ available: 'Available', active: 'Active', redeemed: 'Redeemed', expired: 'Expired' })[status] ?? status}</span>;

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <Header
          title="Rewards"
          description="Manage LifeFlow rewards and donor redemptions."
        />

        <div className="space-y-6 p-4 lg:p-8">
          <LoadingNotice requestKey={remote.year} loading={loading || remote.refreshing} hasData={remote.hasLoaded || rewards.length > 0} />
          {error && <ErrorState title="Unable to complete Rewards request" description={error} compact={remote.hasLoaded || rewards.length > 0} status={remote.errorStatus} busy={loading || remote.refreshing} onRetry={() => model.load()} />}
          {<>
          {/* ==================================================
              Page Heading
              ================================================== */}
          <section hidden={activeTab === 'analytics'} className={activeTab === 'analytics' ? 'hidden' : 'flex flex-wrap items-center justify-between gap-4'}>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Reward Management
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Manage rewards, points, stock,
                and redemption history.
              </p>
            </div>

            {activeTab === 'rewards' && (
              <button
                type="button"
                onClick={() => navigate('/rewards/create')}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                <Plus size={18} aria-hidden="true" />
              Add Reward
              </button>
            )}
          </section>

          {/* ==================================================
              Summary Cards
              ================================================== */}
          <section className={activeTab !== 'rewards' ? 'hidden' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4'}>
            {[
              { status: 'analytics', label: 'Analytics', icon: Gift, iconClasses: 'lf-icon-brand' },
              { status: 'active', label: 'Active', icon: CircleCheck, iconClasses: 'bg-success-surface text-success-foreground' },
              { status: 'inactive', label: 'Inactive', icon: CircleOff, iconClasses: 'bg-gray-100 text-gray-500' },
              { status: 'deleted', label: 'Deleted', icon: Trash2, iconClasses: 'bg-danger-surface text-danger-foreground' },
            ].map(({ status, label, icon: Icon, iconClasses }) => (
              <button key={status} type="button"
                onClick={() => { setActiveTab('rewards'); setRewardStatusTab(status); }}
                aria-label={`Show ${label} rewards`}
                aria-pressed={activeTab === 'rewards' && rewardStatusTab === status}
                className={`min-w-0 cursor-pointer rounded-2xl border p-5 text-left transition hover:border-primary-border hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  activeTab === 'rewards' && rewardStatusTab === status ? 'border-primary bg-selected' : 'border-gray-200 bg-white hover:bg-primary-soft'
                }`}>
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-medium text-gray-500">{label}</span>
                    {status === 'analytics' && <span className="block text-xs text-gray-400">Available Stock</span>}
                    <span className="mt-2 block break-words text-2xl font-bold text-gray-900">{loading && !remote.hasLoaded && !rewards.length ? <SkeletonValue /> : status === 'analytics' ? availableStock : getCount(status)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`lf-icon-badge ${iconClasses}`}><Icon size={22} aria-hidden="true" /></span>
                    <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-primary" />
                  </span>
                </span>
              </button>
            ))}

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
                      ? 'border-primary text-primary'
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
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Redemptions
                </button>
                {canVerifyClaims && <button
                  type="button"
                  onClick={() => setActiveTab('claims')}
                  aria-pressed={activeTab === 'claims'}
                  aria-controls="reward-claim-verification"
                  className={`border-b-2 pb-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activeTab === 'claims' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                >Claim Verification</button>}
              </div>

            </div>

            <div id="rewards-analytics" hidden={activeTab !== 'rewards' || rewardStatusTab !== 'analytics'}>
              {activeTab === 'rewards' && rewardStatusTab === 'analytics' && <RewardsAnalytics remote={remote} />}
            </div>
            {activeTab === 'claims' && canVerifyClaims && <ClaimVerification key={currentAdmin?.id ?? role} onClaimed={model.refreshClaims} />}

            {/* ==================================================
                Rewards Tab
                ================================================== */}
            {activeTab === 'rewards' && rewardStatusTab !== 'analytics' && (
              <>
                {/* Search and Filters */}
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
                      placeholder="Search rewards..."
                      className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:bg-white"
                    />
                  </div>

                  <select
                    aria-label="Category"
                    value={selectedCategory}
                    onChange={(event) =>
                      setSelectedCategory(event.target.value)
                    }
                    className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-primary"
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
                <div ref={galleryRef} tabIndex={-1} aria-label="Reward gallery" className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">
                  {loading && !remote.hasLoaded && !rewards.length ? <div className="col-span-full"><PageSkeleton variant="gallery" /></div> : filteredRewards.length > 0 ? (
                    filteredRewards.map((reward) => (
                      <button type="button" aria-label={`View reward: ${reward.name}`} aria-haspopup="dialog" onClick={event => openReward(reward.id, event)}
                        key={reward.id}
                        className="min-w-0 cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white text-left transition hover:border-primary-border hover:bg-primary-soft hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <RewardCover src={reward.image_url} name={reward.name} />

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                LIFEFLOW REWARDS
                              </p>

                              <h3 className="mt-1 break-words font-bold text-gray-800">
                                {reward.name}
                              </h3>
                            </div>

                            {renderRewardStatus(reward.status)}
                          </div>
                          {reward.status === 'deleted' && <p className="mt-2 text-xs text-gray-500">Recoverable for 30 days. Deletion scheduled: {reward.scheduled_for_deletion_at?.slice(0, 10)}. Definitions with voucher history are retained.</p>}

                          {/* Points and Stock */}
                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-gray-50 p-3">
                              <p className="text-xs text-gray-400">
                                Points Required
                              </p>

                              <p className="mt-1 font-bold text-primary">
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

                          <div className="mt-4 flex justify-end"><ChevronRight size={18} aria-hidden="true" className="shrink-0 text-primary" /></div>
                        </div>
                      </button>
                    ))
                  ) : (
                    !loading && !error ? <div className="col-span-full"><EmptyState title={searchTerm.trim() || selectedCategory !== 'all' ? "No rewards match your filters" : rewards.length ? "No rewards in this status" : "No rewards available yet"} description="Try another status or category, or add a reward." /></div> : null
                  )}
                </div>
              </>
            )}

            {/* ==================================================
                Redemptions Tab
                ================================================== */}
            {activeTab === 'redemptions' && (<>
              <div className="flex flex-wrap items-end gap-4 border-b border-gray-200 p-4">
                <label className="text-sm text-gray-600">Search<input aria-label="Search redemptions" value={redemptionSearch} onChange={(event) => setRedemptionSearch(event.target.value)} className="mt-2 block h-11 rounded-xl border border-gray-200 px-4" /></label>
                <label className="text-sm text-gray-600">Status<select aria-label="Redemption status" value={redemptionStatus} onChange={(event) => setRedemptionStatus(event.target.value)} className="mt-2 block h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-primary"><option value="">All statuses</option><option value="available">Available</option><option value="redeemed">Redeemed</option><option value="expired">Expired</option></select></label>
                <MonthFilter value={redemptionMonth} onChange={setRedemptionMonth} />
                <button type="button" onClick={() => { setRedemptionSearch(''); setRedemptionStatus(''); setRedemptionMonth(''); }} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Clear</button>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[640px] table-fixed text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="w-[22%] px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Donor
                      </th>

                      <th className="w-[30%] px-3 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Reward
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

                  <tbody>{loading && !remote.hasLoaded && !remote.redemptions.length && <tr><td colSpan={5}><PageSkeleton variant="table" header={false} /></td></tr>}
                    {redemptions.map((redemption) => (
                      <tr
                        key={redemption.id}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="break-words px-5 py-5 font-semibold text-gray-800">
                          {formatDonorName(redemption.donor)}
                        </td>

                        <td className="break-words px-3 py-5 text-sm text-gray-500">
                          {redemption.reward}{redemption.size ? ` — Size ${redemption.size}` : ''}
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
              {!loading && !error && !redemptions.length && <EmptyState title={redemptionSearch.trim() || redemptionStatus || redemptionMonth ? "No redemptions match your filters" : "No redemptions yet"} description="Donor reward purchases will appear here." />}
              </>)}
          </section>
          </>}
        </div>
      </main>
      {selectedId !== null && <RewardPopup key={selectedId} id={selectedId} onDismiss={dismiss} onChanged={refresh} />}
    </div>
  );
}

export default function Rewards() {
  const location = useLocation(), navigate = useNavigate();
  const enterPopupHistory = id => navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { state: { ...location.state, rewardPopup: id }, preventScrollReset: true });
  return <RewardsView remote={useRewards()} enterPopupHistory={enterPopupHistory} />;
}
