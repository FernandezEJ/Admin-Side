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

function Dashboard() {
  const { isSuperAdmin } = useAdminSession();
  // ============================================================
  // Temporary Dashboard Data
  // Laravel will provide these values later.
  // ============================================================

  const dashboardStats = [
    {
      title: 'Total Donors',
      value: '1,248',
      description: 'Registered donors',
      icon: Users,
    },
    {
      title: 'Eligible',
      value: '936',
      description: 'Currently eligible',
      icon: CircleCheck,
    },
    {
      title: 'Temporarily Ineligible',
      value: '312',
      description: 'Based on latest evaluation',
      icon: Clock3,
    },
  ];

  // Monthly completed donations.
  const donationActivity = [
    { month: 'Apr', donations: 38 },
    { month: 'May', donations: 55 },
    { month: 'Jun', donations: 48 },
    { month: 'Jul', donations: 67 },
    { month: 'Aug', donations: 74 },
    { month: 'Sep', donations: 83 },
  ];

  // Registered donor blood type distribution.
  const bloodTypeData = [
    { bloodType: 'O+', count: 342 },
    { bloodType: 'A+', count: 276 },
    { bloodType: 'B+', count: 218 },
    { bloodType: 'AB+', count: 126 },
    { bloodType: 'O−', count: 103 },
    { bloodType: 'A−', count: 81 },
    { bloodType: 'B−', count: 64 },
    { bloodType: 'AB−', count: 38 },
  ];

  // Recharts needs colors for individual pie segments.
  const bloodTypeColors = [
    '#b7192e',
    '#d9465f',
    '#ef6a7d',
    '#f38f9d',
    '#7f1d2d',
    '#9f2940',
    '#c04a5e',
    '#e07a88',
  ];

  // Temporary verification requests.
  const recentVerificationRequests = [
    {
      id: 1,
      donor: 'Juan Dela Cruz',
      bloodType: 'O+',
      event: 'Community Blood Drive',
      submitted: 'Sep 16, 2026',
    },
    {
      id: 2,
      donor: 'Maria Santos',
      bloodType: 'A+',
      event: 'LifeFlow Donation Event',
      submitted: 'Sep 16, 2026',
    },
    {
      id: 3,
      donor: 'Carlo Reyes',
      bloodType: 'B+',
      event: 'Red Cross Donation',
      submitted: 'Sep 15, 2026',
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      {/* Sticky sidebar */}
      <Sidebar />

      {/* Main admin area */}
      <main className="min-w-0 flex-1">
        {/* Sticky top header */}
        <Header />

        <div className="space-y-6 p-4 lg:p-8">
          {/* ==================================================
              Summary Cards
              ================================================== */}
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {dashboardStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <article
                  key={stat.title}
                  className="rounded-2xl border border-gray-200 bg-white p-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#b7192e]">
                      <Icon size={22} strokeWidth={1.8} />
                    </div>

                    <span className="text-sm font-semibold text-gray-500">
                      {stat.title}
                    </span>
                  </div>

                  <h2 className="mt-6 text-3xl font-bold text-gray-900">
                    {stat.value}
                  </h2>

                  <p className="mt-1 text-xs text-gray-400">
                    {stat.description}
                  </p>
                </article>
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

                <select className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-600 outline-none focus:border-[#b7192e]">
                  <option>Last 6 months</option>
                  <option>Last 12 months</option>
                </select>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={donationActivity}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#eeeeee"
                    />

                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: '#9ca3af',
                        fontSize: 12,
                      }}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tick={{
                        fill: '#9ca3af',
                        fontSize: 12,
                      }}
                    />

                    <Tooltip
                      cursor={{
                        fill: '#fff5f6',
                      }}
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid #eeeeee',
                        fontSize: '12px',
                      }}
                    />

                    <Bar
                      dataKey="donations"
                      fill="#b7192e"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                    />
                  </BarChart>
                </ResponsiveContainer>
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
                <ResponsiveContainer width="100%" height="100%">
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
                      {bloodTypeData.map((entry, index) => (
                        <Cell
                          key={entry.bloodType}
                          fill={
                            bloodTypeColors[
                              index % bloodTypeColors.length
                            ]
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid #eeeeee',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Blood type values */}
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                {bloodTypeData.map((item, index) => (
                  <div
                    key={item.bloodType}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            bloodTypeColors[
                              index % bloodTypeColors.length
                            ],
                        }}
                      />

                      <span className="font-semibold text-gray-600">
                        {item.bloodType}
                      </span>
                    </div>

                    <span className="text-gray-400">
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
                  Latest donor proof submissions awaiting review
                </p>
              </div>

              <button
                type="button"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#b7192e] transition hover:bg-red-50"
              >
                View all
                <ArrowRight size={16} />
              </button>
            </div>

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
                        {request.donor}
                      </td>

                      <td className="px-3 py-4 text-sm text-gray-500">
                        {request.bloodType}
                      </td>

                      <td className="px-3 py-4 text-sm text-gray-500">
                        {request.event}
                      </td>

                      <td className="px-3 py-4 text-sm text-gray-500">
                        {request.submitted}
                      </td>

                      <td className="px-3 py-4">
                        <span className="inline-flex rounded-full px-3 py-1.5 text-xs font-semibold text-[#b7192e]">
                          For Verification
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <button
                          type="button"
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#b7192e] transition hover:bg-red-50"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {isSuperAdmin && <SuperAdminOverview />}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
