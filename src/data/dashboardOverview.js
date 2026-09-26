import { mockAdmins, mockAuditLogs } from './adminManagement';
import { analyticsPeriods, getRewardsAnalytics } from './rewardsAnalytics';

// Mock extension for a future GET /api/admin/dashboard response.
// Use the latest available analytics month, not the computer's current month.
export function getDashboardOverview() {
  const period = analyticsPeriods.filter((item) => item.value !== 'all')
    .sort((a, b) => b.value.localeCompare(a.value))[0];
  const rewards = getRewardsAnalytics([], period.value).summary;
  return {
    total_admins: mockAdmins.length,
    active_admins: mockAdmins.filter((admin) => admin.status === 'active').length,
    recent_admin_activity: [...mockAuditLogs]
      .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3),
    rewards_summary: {
      period: period.value,
      period_label: period.label,
      total_redemptions: rewards.total_redemptions,
      most_redeemed_reward: rewards.most_redeemed_reward,
    },
  };
}
