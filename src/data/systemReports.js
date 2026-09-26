export const reportMonths = [
  ['01', 'January'], ['02', 'February'], ['03', 'March'], ['04', 'April'],
  ['05', 'May'], ['06', 'June'], ['07', 'July'], ['08', 'August'],
  ['09', 'September'], ['10', 'October'], ['11', 'November'], ['12', 'December'],
];
export const reportYears = ['2026', '2025', '2024'];
export const defaultReportPeriod = '2026-09';

function monthReport(period, counts, eligible, weeks, pending, rejected, revision, issued, redemptions, spent, reward) {
  const total = counts.reduce((sum, value) => sum + value, 0);
  const completed = weeks.reduce((sum, value) => sum + value, 0);
  return {
    period,
    donor_summary: { total, eligible, not_eligible: total - eligible },
    donation_summary: { total: completed + pending + rejected + revision, completed, pending, rejected, needs_revision: revision },
    blood_types: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((name, index) => ({ name, value: counts[index] })),
    weekly_donations: weeks.map((donations, index) => ({ week: `Week ${index + 1}`, donations })),
    rewards_summary: { points_issued: issued, total_redemptions: redemptions, points_redeemed: spent, most_redeemed_reward: reward },
    completed_donations: [
      { id: 1, donor: 'Juan Dela Cruz', bloodType: 'O+', event: 'LifeFlow Blood Donation Drive', date: `${period}-04` },
      { id: 2, donor: 'Maria Santos', bloodType: 'A+', event: 'Community Blood Donation', date: `${period}-10` },
      { id: 3, donor: 'Carlo Reyes', bloodType: 'B+', event: 'LifeFlow Blood Donation Drive', date: `${period}-14` },
    ],
    reward_redemptions: [
      { id: 1, donor: 'Juan Dela Cruz', voucher: reward, pointsUsed: 350, date: `${period}-15` },
      { id: 2, donor: 'Maria Santos', voucher: 'PHP 300 Grocery Voucher', pointsUsed: 250, date: `${period}-12` },
    ],
    notes: 'Mock monthly snapshot. Donor and blood type counts describe registered donors at the reporting cutoff; donations and rewards describe activity within the selected month. Detail tables show selected sample records, not the full totals.',
  };
}

// Future response: GET /api/admin/system-reports?month=YYYY-MM. No requests yet.
export const monthlyReports = {
  '2026-09': monthReport('2026-09', [54, 14, 42, 11, 28, 8, 68, 20], 183, [9, 13, 11, 15, 0], 12, 4, 3, 9600, 23, 6750, 'PHP 500 Grocery Voucher'),
  '2026-08': monthReport('2026-08', [50, 12, 40, 10, 25, 8, 65, 20], 170, [8, 10, 14, 10, 2], 8, 2, 2, 8800, 19, 5450, 'PHP 300 Grocery Voucher'),
  '2025-09': monthReport('2025-09', [40, 10, 30, 8, 20, 6, 51, 15], 135, [6, 8, 9, 7, 1], 6, 3, 1, 6200, 14, 3900, 'Meal Voucher'),
};

export function generateMockReport(period, generatedAt = new Date().toISOString()) {
  return { period, generated_at: generatedAt, data: monthlyReports[period] ?? null };
}

export function reportPeriodLabel(period) {
  const [year, month] = period.split('-');
  return `${reportMonths.find(([value]) => value === month)?.[1] ?? month} ${year}`;
}
