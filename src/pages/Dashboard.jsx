import {
  Users,
  CircleCheck,
  Clock3,
  ArrowRight,
} from 'lucide-react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { useAdminSession } from '../auth/useAdminSession';
import SuperAdminOverview from '../components/SuperAdminOverview';
import { formatDonorName } from '../services/staffNames';

import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, PageSkeleton } from '../components/ui/PageState';
import { useDashboard } from '../services/useDashboard';
import { BLOOD_TYPE_COLORS } from '../data/bloodTypeColors';

export function DashboardView({ remote }) {
  const { isSuperAdmin } = useAdminSession();
  const { data, loading, error, chartLoading, chartError, months, model } = remote;
  const dashboardStats = data ? [
    { title: 'Donors', value: data.stats.donors, description: 'Active registered donors', icon: Users, to: '/donors' },
    { title: 'Total Eligible', value: data.stats.eligible, description: 'Based on latest saved assessment', icon: CircleCheck },
    { title: 'Total Not Eligible', value: data.stats.not_eligible, description: 'Based on latest saved assessment', icon: Clock3 },
  ] : [];
  const donationActivity = data?.donation_activity ?? [];
  const bloodTypeData = data?.blood_types ?? [];
  const recentVerificationRequests = data?.recent_verifications ?? [];
  const submitted = (request) => {
    const value = request.proof_uploaded_at ?? request.updated_at;
    return value ? new Date(value).toLocaleDateString('en-US', { timeZone: data.timezone, month: 'short', day: 'numeric', year: 'numeric' }) : 'Unavailable';
  };

  return (
    <div className="flex min-h-screen bg-page">
      {/* Sticky sidebar */}
      <Sidebar />

      {/* Main admin area */}
      <main className="min-w-0 flex-1">
        {/* Sticky top header */}
        <Header />

        <div className="space-y-6 p-4 lg:p-8">
          {loading && !data && <PageSkeleton />}
          {error && !data && <ErrorState title="Unable to load Dashboard" description={error} onRetry={() => model.load()} />}
          {data && <>
          {/* ==================================================
              Summary Cards
              ================================================== */}
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {dashboardStats.map((stat) => {
              const Icon = stat.icon;
              const Card = stat.to ? Link : 'article';

              return (
                <Card
                  key={stat.title}
                  {...(stat.to ? { to: stat.to } : {})}
                  className={`rounded-2xl border border-gray-200 bg-white p-6${stat.to ? ' cursor-pointer transition hover:border-primary-border hover:bg-selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-selected text-primary">
                      <Icon size={22} strokeWidth={1.8} />
                    </div>

                    <span className="text-sm font-semibold text-gray-500">
                      {stat.title}
                    </span>
                    {stat.to && <ArrowRight size={16} aria-hidden="true" className="ml-auto shrink-0 text-gray-400" />}
                  </div>

                  <h2 className="mt-6 text-3xl font-bold text-gray-900">
                    {stat.value}
                  </h2>

                  <p className="mt-1 text-xs text-gray-400">
                    {stat.description}
                  </p>
                </Card>
              );
            })}
          </section>

          {/* ==================================================
              Analytics
              ================================================== */}
          <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            {/* Donation Activity */}
            <article className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold text-gray-800">
                    Donation Activity
                  </h2>

                  <p className="mt-1 text-xs text-gray-400">
                    Monthly completed donations
                  </p>
                </div>

                <select aria-label="Donation Activity period" value={months} onChange={(event) => model.load(Number(event.target.value))} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-600 outline-none focus:border-primary">
                  <option value={6}>Last 6 months</option>
                  <option value={12}>Last 12 months</option>
                </select>
              </div>

              <div className="relative h-72 w-full" aria-busy={!!chartLoading}>
                {chartLoading ? <div role="status" aria-label="Loading Donation Activity" className="flex h-full items-center justify-center">
                  <span aria-hidden="true" className="h-6 w-6 rounded-full border-2 border-primary-border border-t-primary motion-safe:animate-spin" />
                </div> : chartError ? <ErrorState title="Unable to load Donation Activity" description={chartError} onRetry={() => model.load()} /> : <>
                {!donationActivity.some((item) => item.donations > 0) && <p role="status" className="absolute left-0 top-0 text-sm text-gray-500">No completed donations in this period.</p>}
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={donationActivity}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--color-line)"
                    />

                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: 'var(--color-neutral)',
                        fontSize: 12,
                      }}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tick={{
                        fill: 'var(--color-neutral)',
                        fontSize: 12,
                      }}
                    />

                    <Tooltip
                      cursor={{
                        fill: 'var(--color-selected)',
                      }}
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid var(--color-line)',
                        fontSize: '12px',
                      }}
                    />

                    <Bar
                      dataKey="donations"
                      fill="var(--color-primary)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                    />
                  </BarChart>
                </ResponsiveContainer>
                </>}
              </div>
            </article>

            {/* Blood Type Distribution */}
            <article className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="mb-3">
                <h2 className="font-bold text-gray-800">
                  Blood Types
                </h2>

                <p className="mt-1 text-xs text-gray-400">
                  Registered donor distribution
                </p>
              </div>

              {/* Donut chart */}
              <div className="h-56 w-full">
                {!bloodTypeData.some((item) => item.count > 0) ? <EmptyState title="No blood type data" description="Donor blood types will appear here when available." /> : <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bloodTypeData}
                      dataKey="count"
                      nameKey="bloodType"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={82}
                      paddingAngle={2}
                    >
                      {bloodTypeData.map((entry) => (
                        <Cell
                          key={entry.bloodType}
                          fill={BLOOD_TYPE_COLORS[entry.bloodType] ?? 'var(--color-neutral)'}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      itemStyle={{ color: 'var(--color-neutral-foreground)' }}
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid var(--color-line)',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>}
              </div>

              {/* Blood type values */}
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                {bloodTypeData.map((item) => (
                  <div
                    key={item.bloodType}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: BLOOD_TYPE_COLORS[item.bloodType] ?? 'var(--color-neutral)',
                        }}
                      />

                      <span className="font-semibold text-gray-600">
                        {item.bloodType}
                      </span>
                    </div>

                    <span className="text-gray-600">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          {/* ==================================================
              Recent Verification Requests
              ================================================== */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-gray-800">
                  Recent Verification Requests
                </h2>

                <p className="mt-1 text-xs text-gray-400">
                  Latest submissions awaiting review or revision
                </p>
              </div>

              <Link
                to="/verification"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary transition hover:bg-selected"
              >
                View all
                <ArrowRight size={16} />
              </Link>
            </div>

            {!recentVerificationRequests.length && <EmptyState title="No verification requests" description="Submitted proofs will appear here when available." />}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Donor
                    </th>

                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Blood Type
                    </th>

                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Donation Event
                    </th>

                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Submitted
                    </th>

                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Status
                    </th>

                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>

                <tbody>
                  {recentVerificationRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-3 py-4 text-sm font-semibold text-gray-800">
                        {formatDonorName(request.donor)}
                      </td>

                      <td className="px-3 py-4 text-sm text-gray-500">
                        {request.bloodType ?? 'Unknown'}
                      </td>

                      <td className="px-3 py-4 text-sm text-gray-500">
                        {request.event ?? 'Donation activity'}
                      </td>

                      <td className="px-3 py-4 text-sm text-gray-500">
                        {submitted(request)}
                      </td>

                      <td className="px-3 py-4">
                        <span className="inline-flex rounded-full px-3 py-1.5 text-xs font-semibold text-primary">
                          {request.status === 'needs_revision' ? 'Need Revision' : 'For Verification'}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <Link
                          to={`/verification/${request.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-selected"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {isSuperAdmin && data.overview && <SuperAdminOverview overview={data.overview} />}
          </>}
        </div>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return <DashboardView remote={useDashboard()} />;
}
