import ReportChart from '../components/ReportChart';
import { EmptyState } from '../components/ui/PageState';
import { useState } from 'react';
import {
  Printer,
  FileText,
} from 'lucide-react';

import {

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
import { defaultReportPeriod, generateMockReport, reportMonths, reportYears, reportPeriodLabel } from '../data/systemReports';
import '../styles/system-reports.css';

function SystemReports() {
  const [selectedMonth, setSelectedMonth] = useState(defaultReportPeriod.slice(5));
  const [selectedYear, setSelectedYear] = useState(defaultReportPeriod.slice(0, 4));
  const [snapshot, setSnapshot] = useState(() => generateMockReport(defaultReportPeriod));
  const months = reportMonths;
  const years = reportYears;
  const report = snapshot.data;
  const reportData = report ? {
    totalDonors: report.donor_summary.total,
    eligibleDonors: report.donor_summary.eligible,
    temporarilyIneligible: report.donor_summary.not_eligible,
    completedDonations: report.donation_summary.completed,
    forVerification: report.donation_summary.pending,
    rejected: report.donation_summary.rejected,
    vouchersRedeemed: report.rewards_summary.total_redemptions,
    pointsUsed: report.rewards_summary.points_redeemed,
  } : null;
  const donationActivity = report?.weekly_donations ?? [];
  const bloodTypeDistribution = report?.blood_types ?? [];
  const completedDonations = report?.completed_donations ?? [];
  const rewardRedemptions = report?.reward_redemptions ?? [];
  const bloodTypeColors = ['#b7192e', '#d95b6a', '#ef8b96', '#f5b7be', '#7f1d1d', '#991b1b', '#c2410c', '#ea580c'];
  const periodLabel = reportPeriodLabel(snapshot.period);
  const unapplied = selectedYear + '-' + selectedMonth !== snapshot.period;
  const generatedLabel = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(snapshot.generated_at));

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

  const handleGenerateReport = () => {
    setSnapshot(generateMockReport(selectedYear + '-' + selectedMonth));
  };

  // ============================================================
  // Print
  // Browser print dialog can also Save as PDF.
  // ============================================================

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="system-reports-page flex min-h-screen bg-[#f7f8fa]">
      {/* Hidden when printing */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      <main className="min-w-0 flex-1">
        {/* Hidden when printing */}
        <div className="print:hidden">
          <Header
            title="System Reports"
            description="Generate and print monthly LifeFlow administrative reports."
          />
        </div>

        <div className="p-4 lg:p-8 print:p-0">
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
                aria-label="Report month"
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
                aria-label="Report year"
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
                Apply / Generate Report
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={!report || unapplied}
                className="flex h-11 items-center gap-2 rounded-xl bg-[#b7192e] px-5 text-sm font-semibold text-white transition hover:bg-[#9f1427] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer size={17} />
                Print / Save as PDF
              </button>
            </div>
          </section>

          <p role="status" className="mb-4 text-sm text-gray-500 print:hidden">
            {unapplied ? 'Filters changed. Apply to update the preview.' : 'Showing ' + periodLabel + '.'}
            {' '}Mock data: September 2026, August 2026, and September 2025.
            {' '}Choose Save as PDF in the browser print dialog to export.
          </p>
          {!report ? (
            <section className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <h2 className="text-xl font-bold">System Reports: {periodLabel}</h2>
              <EmptyState title="No mock report data for this month" description="Select an available period and apply." />
            </section>
          ) : <>
          {/* ==================================================
              Printable Report
              ================================================== */}
          <section
            id="monthly-report"
            className="mx-auto max-w-7xl space-y-6 rounded-2xl border border-gray-200 bg-white p-4 lg:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0"
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
                System Reports
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                {periodLabel}
              </p>
            </header>

            {/* ==================================================
                Minimalist Report Summary
                ================================================== */}
            <section className="report-summary grid gap-6 lg:grid-cols-3">
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
                    Not Eligible
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
                <div className="flex justify-between gap-4 text-sm"><span className="text-gray-500">Total Participations</span><strong>{report.donation_summary.total}</strong></div>
                <div className="flex justify-between gap-4 text-sm"><span className="text-gray-500">Needs Revision</span><strong>{report.donation_summary.needs_revision}</strong></div>
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
                <div className="flex justify-between gap-4 text-sm"><span className="text-gray-500">Points Issued</span><strong>{report.rewards_summary.points_issued.toLocaleString()}</strong></div>
                <div className="flex justify-between gap-4 text-sm"><span className="text-gray-500">Most Redeemed Reward</span><strong className="max-w-40 text-right">{report.rewards_summary.most_redeemed_reward}</strong></div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                    Total Redemptions
                    </span>

                    <span className="font-bold text-gray-800">
                    {reportData.vouchersRedeemed}
                    </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                    Points Redeemed
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
            <section className="report-charts grid gap-6 xl:grid-cols-2">
              {/* Donation Activity */}
              <article className="rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-800">
                  Donation Activity
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  Completed donations by week: days 1-7, 8-14, 15-21, 22-28, and 29-month end.
                </p>

                <div className="mt-5 h-72">
                  <ReportChart>
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
                        isAnimationActive={false}
                        dataKey="donations"
                        fill="#b7192e"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ReportChart>
                </div>
                <p className="mt-3 text-xs text-gray-600">{donationActivity.map((week) => week.week + ': ' + week.donations).join(' / ')}</p>
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
      <ReportChart>
        <PieChart>
          <Pie
            isAnimationActive={false}
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
      </ReportChart>
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
                Completed Donations (Sample Records)
              </h3>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[640px] table-fixed text-left">
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
                Reward Redemptions (Sample Records)
              </h3>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[640px] table-fixed text-left">
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
            <section className="text-sm text-gray-600">
              <h3 className="mb-2 font-bold">Monthly Notes</h3>
              <p>{report.notes}</p>
              <p className="mt-2">Generated on: {generatedLabel} (Philippine time, UTC+8)</p>
            </section>
            <footer className="border-t border-gray-200 pt-5 text-center">
              <p className="text-xs text-gray-400">
                LifeFlow System Reports
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Report Period: {periodLabel}
              </p>
            </footer>
          </section>
          </>}
        </div>
      </main>
    </div>
  );
}

export default SystemReports;
