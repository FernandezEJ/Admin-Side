import { useState } from 'react';
import {
  Printer,
  FileText,
  Users,
  BadgeCheck,
  Clock3,
  CircleX,
  Gift,
  Coins,
} from 'lucide-react';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

function Reports() {
  // ============================================================
  // Report Filters
  // ============================================================

  const [selectedMonth, setSelectedMonth] = useState('09');
  const [selectedYear, setSelectedYear] = useState('2026');

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

  const years = ['2026', '2025', '2024'];

  // ============================================================
  // Temporary Monthly Report Data
  // Laravel will provide this later.
  // ============================================================

  const reportData = {
    totalDonors: 245,
    eligibleDonors: 183,
    temporarilyIneligible: 62,

    completedDonations: 48,
    forVerification: 12,
    rejected: 4,

    vouchersRedeemed: 23,
    pointsUsed: 6750,
  };

  const donationActivity = [
    { week: 'Week 1', donations: 9 },
    { week: 'Week 2', donations: 13 },
    { week: 'Week 3', donations: 11 },
    { week: 'Week 4', donations: 15 },
  ];

  const bloodTypeDistribution = [
    { name: 'A+', value: 34 },
    { name: 'A-', value: 9 },
    { name: 'B+', value: 27 },
    { name: 'B-', value: 7 },
    { name: 'AB+', value: 18 },
    { name: 'AB-', value: 5 },
    { name: 'O+', value: 39 },
    { name: 'O-', value: 12 },
  ];

  const bloodTypeColors = [
  '#b7192e',
  '#d95b6a',
  '#ef8b96',
  '#f5b7be',
  '#7f1d1d',
  '#991b1b',
  '#c2410c',
  '#ea580c',
];

  const completedDonations = [
    {
      id: 1,
      donor: 'Juan Dela Cruz',
      bloodType: 'O+',
      event: 'LifeFlow Blood Donation Drive',
      date: '2026-09-04',
    },
    {
      id: 2,
      donor: 'Maria Santos',
      bloodType: 'A+',
      event: 'Community Blood Donation',
      date: '2026-09-10',
    },
    {
      id: 3,
      donor: 'Carlo Reyes',
      bloodType: 'B+',
      event: 'LifeFlow Blood Donation Drive',
      date: '2026-09-14',
    },
  ];

  const rewardRedemptions = [
    {
      id: 1,
      donor: 'Juan Dela Cruz',
      voucher: '₱500 Grocery Voucher',
      pointsUsed: 350,
      date: '2026-09-15',
    },
    {
      id: 2,
      donor: 'Maria Santos',
      voucher: '₱300 Grocery Voucher',
      pointsUsed: 250,
      date: '2026-09-12',
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

  const selectedMonthName =
    months.find(([value]) => value === selectedMonth)?.[1] ||
    'September';

  // ============================================================
  // Generate Report
  // Later this can trigger a Laravel API request.
  // ============================================================

  const handleGenerateReport = () => {
    console.log({
      month: selectedMonth,
      year: selectedYear,
    });
  };

  // ============================================================
  // Print
  // Browser print dialog can also Save as PDF.
  // ============================================================

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      {/* Hidden when printing */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      <main className="min-w-0 flex-1">
        {/* Hidden when printing */}
        <div className="print:hidden">
          <Header
            title="Reports"
            description="Generate and print monthly LifeFlow administrative reports."
          />
        </div>

        <div className="p-8 print:p-0">
          {/* ==================================================
              Page Controls
              ================================================== */}
          <section className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Monthly Report
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Select a month and year to prepare the report.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={selectedMonth}
                onChange={(event) =>
                  setSelectedMonth(event.target.value)
                }
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-[#b7192e]"
              >
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
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleGenerateReport}
                className="h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Generate Report
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex h-11 items-center gap-2 rounded-xl bg-[#b7192e] px-5 text-sm font-semibold text-white transition hover:bg-[#9f1427]"
              >
                <Printer size={17} />
                Print Report
              </button>
            </div>
          </section>

          {/* ==================================================
              Printable Report
              ================================================== */}
          <section
            id="monthly-report"
            className="mx-auto max-w-7xl space-y-6 rounded-2xl border border-gray-200 bg-white p-8 print:max-w-none print:rounded-none print:border-0 print:p-0"
          >
            {/* Report Header */}
            <header className="border-b border-gray-200 pb-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-[#b7192e] print:hidden">
                <FileText size={23} />
              </div>

              <h1 className="mt-3 text-2xl font-bold text-gray-900">
                LifeFlow
              </h1>

              <h2 className="mt-1 text-lg font-semibold text-gray-700">
                Monthly Administrative Report
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                {selectedMonthName} {selectedYear}
              </p>
            </header>

            {/* ==================================================
                Minimalist Report Summary
                ================================================== */}
            <section className="grid gap-6 lg:grid-cols-3">
            {/* Donor Summary */}
            <article>
                <h3 className="mb-3 border-b border-gray-200 pb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
                Donor Summary
                </h3>

                <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                    Total Donors
                    </span>

                    <span className="font-bold text-gray-800">
                    {reportData.totalDonors}
                    </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                    Eligible
                    </span>

                    <span className="font-bold text-gray-800">
                    {reportData.eligibleDonors}
                    </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-gray-500">
                    Temporarily Ineligible
                    </span>

                    <span className="font-bold text-gray-800">
                    {reportData.temporarilyIneligible}
                    </span>
                </div>
                </div>
            </article>

            {/* Donation Summary */}
            <article>
                <h3 className="mb-3 border-b border-gray-200 pb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
                Donation Summary
                </h3>

                <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                    Completed Donations
                    </span>

                    <span className="font-bold text-gray-800">
                    {reportData.completedDonations}
                    </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                    For Verification
                    </span>

                    <span className="font-bold text-gray-800">
                    {reportData.forVerification}
                    </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                    Rejected
                    </span>

                    <span className="font-bold text-gray-800">
                    {reportData.rejected}
                    </span>
                </div>
                </div>
            </article>

            {/* Rewards Summary */}
            <article>
                <h3 className="mb-3 border-b border-gray-200 pb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
                Rewards Summary
                </h3>

                <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                    Vouchers Redeemed
                    </span>

                    <span className="font-bold text-gray-800">
                    {reportData.vouchersRedeemed}
                    </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                    Points Used
                    </span>

                    <span className="font-bold text-gray-800">
                    {reportData.pointsUsed.toLocaleString()}
                    </span>
                </div>
                </div>
            </article>
            </section>

            {/* ==================================================
                Charts
                ================================================== */}
            <section className="grid gap-6 xl:grid-cols-2">
              {/* Donation Activity */}
              <article className="rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-800">
                  Donation Activity
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  Completed donations by week.
                </p>

                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={donationActivity}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 12 }}
                      />

                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12 }}
                      />

                      <Tooltip />

                      <Bar
                        dataKey="donations"
                        fill="#b7192e"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              {/* Blood Type Distribution */}
<article className="rounded-xl border border-gray-200 p-5">
  <h3 className="font-bold text-gray-800">
    Blood Type Distribution
  </h3>

  <p className="mt-1 text-sm text-gray-400">
    Donor distribution by blood type.
  </p>

  <div className="mt-5 flex flex-col items-center gap-5 lg:flex-row">
    {/* Pie Chart */}
    <div className="h-64 w-full lg:w-[60%]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={bloodTypeDistribution}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
          >
            {bloodTypeDistribution.map((entry, index) => (
              <Cell
                key={`${entry.name}-${index}`}
                fill={
                  bloodTypeColors[
                    index % bloodTypeColors.length
                  ]
                }
              />
            ))}
          </Pie>

          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>

                    {/* Blood Type Legend */}
                    <div className="grid w-full grid-cols-2 gap-3 lg:w-[40%]">
                    {bloodTypeDistribution.map((bloodType, index) => (
                        <div
                        key={bloodType.name}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                        >
                        <div className="flex items-center gap-2">
                            <span
                            className="h-3 w-3 rounded-full"
                            style={{
                                backgroundColor:
                                bloodTypeColors[
                                    index % bloodTypeColors.length
                                ],
                            }}
                            />

                            <span className="text-sm font-semibold text-gray-700">
                            {bloodType.name}
                            </span>
                        </div>

                        <span className="text-sm font-bold text-gray-800">
                            {bloodType.value}
                        </span>
                        </div>
                    ))}
                    </div>
                </div>
                </article>
            </section>

            {/* ==================================================
                Completed Donations Table
                ================================================== */}
            <section>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
                Completed Donations
              </h3>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full table-fixed text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-[28%] px-4 py-3 text-xs font-semibold uppercase text-gray-400">
                        Donor
                      </th>

                      <th className="w-[14%] px-4 py-3 text-xs font-semibold uppercase text-gray-400">
                        Blood Type
                      </th>

                      <th className="w-[38%] px-4 py-3 text-xs font-semibold uppercase text-gray-400">
                        Event
                      </th>

                      <th className="w-[20%] px-4 py-3 text-xs font-semibold uppercase text-gray-400">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {completedDonations.map((donation) => (
                      <tr
                        key={donation.id}
                        className="border-t border-gray-100"
                      >
                        <td className="break-words px-4 py-4 font-semibold text-gray-800">
                          {donation.donor}
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-600">
                          {donation.bloodType}
                        </td>

                        <td className="break-words px-4 py-4 text-sm text-gray-500">
                          {donation.event}
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-500">
                          {formatDate(donation.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ==================================================
                Reward Redemptions Table
                ================================================== */}
            <section>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
                Reward Redemptions
              </h3>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full table-fixed text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-[28%] px-4 py-3 text-xs font-semibold uppercase text-gray-400">
                        Donor
                      </th>

                      <th className="w-[32%] px-4 py-3 text-xs font-semibold uppercase text-gray-400">
                        Voucher
                      </th>

                      <th className="w-[18%] px-4 py-3 text-xs font-semibold uppercase text-gray-400">
                        Points
                      </th>

                      <th className="w-[22%] px-4 py-3 text-xs font-semibold uppercase text-gray-400">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rewardRedemptions.map((redemption) => (
                      <tr
                        key={redemption.id}
                        className="border-t border-gray-100"
                      >
                        <td className="break-words px-4 py-4 font-semibold text-gray-800">
                          {redemption.donor}
                        </td>

                        <td className="break-words px-4 py-4 text-sm text-gray-500">
                          {redemption.voucher}
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-gray-700">
                          {redemption.pointsUsed}
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-500">
                          {formatDate(redemption.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ==================================================
                Report Footer
                ================================================== */}
            <footer className="border-t border-gray-200 pt-5 text-center">
              <p className="text-xs text-gray-400">
                LifeFlow Monthly Administrative Report
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Report Period: {selectedMonthName} {selectedYear}
              </p>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Reports;