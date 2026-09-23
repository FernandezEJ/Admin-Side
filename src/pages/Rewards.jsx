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
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function Rewards() {
  const navigate = useNavigate();

  // ============================================================
  // Page State
  // ============================================================

  const [activeTab, setActiveTab] = useState('rewards');
  const [rewardStatusTab, setRewardStatusTab] = useState('active');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoucherValue, setSelectedVoucherValue] = useState('all');

  // ============================================================
  // Temporary Rewards Data
  // Laravel will replace this later.
  // ============================================================

  const [rewards, setRewards] = useState([
    {
      id: 1,
      voucherValue: 500,
      name: '₱500 Grocery Voucher',
      pointsRequired: 350,
      stock: 20,
      status: 'active',
    },
    {
      id: 2,
      voucherValue: 300,
      name: '₱300 Grocery Voucher',
      pointsRequired: 250,
      stock: 12,
      status: 'active',
    },
    {
      id: 3,
      voucherValue: 200,
      name: '₱200 Grocery Voucher',
      pointsRequired: 150,
      stock: 0,
      status: 'inactive',
    },
    {
      id: 4,
      voucherValue: 100,
      name: '₱100 Grocery Voucher',
      pointsRequired: 100,
      stock: 10,
      status: 'deleted',
    },
  ]);

  // ============================================================
  // Temporary Redemption Data
  // ============================================================

  const redemptions = [
    {
      id: 1,
      donor: 'Juan Dela Cruz',
      reward: '₱500 Grocery Voucher',
      pointsUsed: 350,
      redeemedDate: '2026-09-16',
      status: 'available',
    },
    {
      id: 2,
      donor: 'Maria Santos',
      reward: '₱300 Grocery Voucher',
      pointsUsed: 250,
      redeemedDate: '2026-09-15',
      status: 'active',
    },
    {
      id: 3,
      donor: 'Carlo Reyes',
      reward: '₱200 Grocery Voucher',
      pointsUsed: 150,
      redeemedDate: '2026-09-12',
      status: 'expired',
    },
  ];

  // ============================================================
  // Fixed Grocery Voucher Values
  // ============================================================

  const voucherValues = [
    100,
    200,
    300,
    400,
    500,
    600,
    700,
    800,
    900,
    1000,
  ];

  // ============================================================
  // Helpers
  // ============================================================

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(value);

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

  const totalStock = rewards
    .filter((reward) => reward.status !== 'deleted')
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

      const matchesVoucherValue =
        selectedVoucherValue === 'all' ||
        reward.voucherValue === Number(selectedVoucherValue);

      return (
        matchesStatus &&
        matchesSearch &&
        matchesVoucherValue
      );
    });
  }, [
    rewards,
    rewardStatusTab,
    searchTerm,
    selectedVoucherValue,
  ]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedVoucherValue('all');
  };

  // ============================================================
  // Soft Delete
  // Later: Laravel will use SoftDeletes.
  // ============================================================

  const handleDelete = (id) => {
    const confirmed = window.confirm(
      'Move this grocery voucher to Deleted?'
    );

    if (!confirmed) return;

    setRewards((current) =>
      current.map((reward) =>
        reward.id === id
          ? {
              ...reward,
              status: 'deleted',
            }
          : reward
      )
    );
  };

  // ============================================================
  // Restore
  // Restored rewards ALWAYS go to Inactive.
  // ============================================================

  const handleRestore = (id) => {
    const confirmed = window.confirm(
      'Restore this reward to Inactive?'
    );

    if (!confirmed) return;

    setRewards((current) =>
      current.map((reward) =>
        reward.id === id
          ? {
              ...reward,
              status: 'inactive',
            }
          : reward
      )
    );

    setRewardStatusTab('inactive');
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
      <span className="inline-flex rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
        Deleted
      </span>
    );
  };

  // ============================================================
  // Redemption Status Badge
  // ============================================================

  const renderRedemptionStatus = (status) => {
    if (status === 'available') {
      return (
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
          Available
        </span>
      );
    }

    if (status === 'active') {
      return (
        <span className="inline-flex rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
          Active
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
        Expired
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <Header
          title="Rewards"
          description="Manage grocery vouchers and donor redemptions."
        />

        <div className="space-y-6 p-8">
          {/* ==================================================
              Page Heading
              ================================================== */}
          <section className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Grocery Voucher Management
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Manage grocery voucher values, points, stock,
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
                Add Grocery Voucher
              </button>
            )}
          </section>

          {/* ==================================================
              Summary Cards
              ================================================== */}
          <section className="grid gap-4 md:grid-cols-4">
            <article className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Active
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-gray-900">
                    {getCount('active')}
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
                    Inactive
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-gray-900">
                    {getCount('inactive')}
                  </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                  <CircleOff size={21} />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Deleted
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-gray-900">
                    {getCount('deleted')}
                  </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Trash2 size={21} />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Stock
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-gray-900">
                    {totalStock}
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
              <div className="flex gap-7">
                <button
                  type="button"
                  onClick={() => setActiveTab('rewards')}
                  className={`border-b-2 pb-4 text-sm font-semibold transition ${
                    activeTab === 'rewards'
                      ? 'border-[#b7192e] text-[#b7192e]'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Rewards
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('redemptions')}
                  className={`border-b-2 pb-4 text-sm font-semibold transition ${
                    activeTab === 'redemptions'
                      ? 'border-[#b7192e] text-[#b7192e]'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Redemptions
                </button>
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

            {/* ==================================================
                Rewards Tab
                ================================================== */}
            {activeTab === 'rewards' && (
              <>
                {/* Search and Filters */}
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
                      placeholder="Search grocery vouchers..."
                      className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition focus:border-[#b7192e] focus:bg-white"
                    />
                  </div>

                  <select
                    value={selectedVoucherValue}
                    onChange={(event) =>
                      setSelectedVoucherValue(event.target.value)
                    }
                    className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-[#b7192e]"
                  >
                    <option value="all">
                      All Voucher Values
                    </option>

                    {voucherValues.map((value) => (
                      <option key={value} value={value}>
                        {formatCurrency(value)}
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
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#b7192e] shadow-sm">
                            <Gift size={27} />
                          </div>
                        </div>

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Grocery Voucher
                              </p>

                              <h3 className="mt-1 font-bold text-gray-800">
                                {reward.name}
                              </h3>
                            </div>

                            {renderRewardStatus(reward.status)}
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
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-[#b7192e]"
                                >
                                  <Pencil size={17} />
                                </button>

                                <button
                                  type="button"
                                  title="Delete reward"
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
                                title="Restore to Inactive"
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
                    <div className="col-span-full py-12 text-center">
                      <Gift
                        size={32}
                        className="mx-auto text-gray-300"
                      />

                      <p className="mt-3 text-sm font-semibold text-gray-500">
                        No grocery vouchers found.
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        Try changing the selected filters.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ==================================================
                Redemptions Tab
                ================================================== */}
            {activeTab === 'redemptions' && (
              <div className="w-full overflow-hidden">
                <table className="w-full table-fixed text-left">
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
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default Rewards;