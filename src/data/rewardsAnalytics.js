export const analyticsPeriods = [
  { value: 'all', label: 'July–September 2026' },
  { value: '2026-09', label: 'September 2026' },
  { value: '2026-08', label: 'August 2026' },
  { value: '2026-07', label: 'July 2026' },
];

// Historical snapshots remain independent of editable inventory and current prices.
export const mockRewardRedemptions = [
  ['2026-07', 1, 500, 350, 8], ['2026-07', 2, 300, 250, 6], ['2026-07', 3, 200, 150, 2],
  ['2026-08', 1, 500, 350, 10], ['2026-08', 2, 300, 250, 6], ['2026-08', 3, 200, 150, 3],
  ['2026-09', 1, 500, 350, 12], ['2026-09', 2, 300, 250, 9], ['2026-09', 3, 200, 150, 2],
].map(([period, reward_id, voucher_value, points_per_redemption, redemptions]) => ({
  period, reward_id, voucher_value, reward_name: `PHP ${voucher_value} Grocery Voucher`,
  points_per_redemption, redemptions,
}));

// Future GET /api/admin/rewards/analytics?month=YYYY-MM response boundary.
export function getRewardsAnalytics(inventory, period = 'all', records = mockRewardRedemptions) {
  const selected = records.filter((row) => period === 'all' || row.period === period);
  const monthly = new Map();
  const rewards = new Map();
  for (const row of selected) {
    monthly.set(row.period, (monthly.get(row.period) ?? 0) + row.redemptions);
    const reward = rewards.get(row.reward_id) ?? {
      reward_id: row.reward_id, reward_name: row.reward_name, voucher_value: row.voucher_value,
      redemptions: 0, points_spent: 0,
    };
    reward.redemptions += row.redemptions;
    reward.points_spent += row.redemptions * row.points_per_redemption;
    rewards.set(row.reward_id, reward);
  }
  const top_rewards = [...rewards.values()].sort((a, b) => b.redemptions - a.redemptions || a.reward_id - b.reward_id);
  const amounts = new Map();
  for (const reward of top_rewards) {
    amounts.set(reward.voucher_value, (amounts.get(reward.voucher_value) ?? 0) + reward.redemptions);
  }
  return {
    summary: {
      total_redemptions: top_rewards.reduce((sum, row) => sum + row.redemptions, 0),
      total_points_spent: top_rewards.reduce((sum, row) => sum + row.points_spent, 0),
      most_redeemed_reward: top_rewards[0]?.reward_name ?? null,
      active_inventory: inventory.filter((reward) => reward.status === 'active').reduce((sum, reward) => sum + reward.stock, 0),
    },
    monthly_redemptions: [...monthly].sort(([a], [b]) => a.localeCompare(b)).map(([period, redemptions]) => ({ period, redemptions })),
    reward_breakdown: [...amounts].sort(([a], [b]) => a - b).map(([voucher_value, redemptions]) => ({ voucher_value, label: `PHP ${voucher_value}`, redemptions })),
    top_rewards,
  };
}

export const analyticsYears = [...new Set(mockRewardRedemptions.map((row) => row.period.slice(0, 4)))].sort().reverse();

export function getRewardsAnalyticsForPeriod(inventory, year, month = '') {
  const records = mockRewardRedemptions.filter((row) => row.period.slice(0, 4) === year && (!month || row.period.slice(5, 7) === month));
  return getRewardsAnalytics(inventory, 'all', records);
}
