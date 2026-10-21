import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkDonorNames(server) {
  const { formatDonorName } = await server.ssrLoadModule('/src/services/staffNames.js');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const { DonorsView } = await server.ssrLoadModule('/src/pages/Donors.jsx');
  const { VerificationView } = await server.ssrLoadModule('/src/pages/Verification.jsx');
  const { VerificationDetailView } = await server.ssrLoadModule('/src/pages/VerificationDetail.jsx');
  const { VerificationReviewPanel } = await server.ssrLoadModule('/src/components/verification/VerificationReviewDrawer.jsx');
  const { AnnouncementParticipants, JoinedParticipants } = await server.ssrLoadModule('/src/pages/ViewAnnouncement.jsx');
  const { RewardsView } = await server.ssrLoadModule('/src/pages/Rewards.jsx');
  const { ClaimVerificationView } = await server.ssrLoadModule('/src/components/rewards/ClaimVerification.jsx');
  const { DashboardView } = await server.ssrLoadModule('/src/pages/Dashboard.jsx');
  const { SystemReportsView } = await server.ssrLoadModule('/src/pages/SystemReports.jsx');
  const render = (Component, props, role) => renderToString(React.createElement(MemoryRouter, null,
    React.createElement(AdminSessionContext.Provider, { value: { role, isSuperAdmin: role === 'super_admin', currentAdmin: { name: 'Reviewer' } } },
      React.createElement(Component, props)))).replace(/<!--.*?-->/g, '');
  const cases = [
    ['Suffer F Cruz', 'Suffer F. Cruz'], ['Mark D Javines', 'Mark D. Javines'],
    ['Suffer F. Cruz', 'Suffer F. Cruz'], ['Suffer F.. Cruz', 'Suffer F. Cruz'],
    ['Maria Santos', 'Maria Santos'], ['Suffer Francisco Cruz', 'Suffer Francisco Cruz'],
  ];
  for (const [raw, expected] of [...cases, [null, ''], [undefined, ''], ['', '']]) {
    assert.equal(formatDonorName(raw), expected);
    assert.equal(formatDonorName(formatDonorName(raw)), expected);
  }
  for (const role of ['admin', 'super_admin']) {
    for (const [raw, expected] of cases) {
      const donor = Object.freeze({ id: 1, name: raw, email: 'donor@example.test', bloodType: 'O+',
        blood_type: 'O+', eligibility: 'unassessed', achievement: 'New Donor', totalDonations: 0, joinedDate: '2026-10-01' });
      const item = { id: 1, donor, status: 'for_verification', opportunity: { title: 'Drive', location: 'Chapter' }, proof: null };
      const row = { id: 1, donor: raw, status: 'for_verification', email: donor.email,
        event: 'Drive', bloodType: 'O+', submittedDate: '2026-10-01' };
      const remote = { loading: false, error: '', busy: false, model: {}, item, proofType: '', proofUrl: '', items: [row] };
      const data = { donors: [donor], topDonors: [donor], bloodTypes: ['O+'],
        summary: { totalDonors: 1, eligible: 0, temporarilyIneligible: 0 }, pagination: { currentPage: 1, lastPage: 1, total: 1 } };
      for (const activeTab of ['all', 'top']) {
        assert.ok(render(DonorsView, { remote: { ...remote, data, activeTab, searchTerm: '', selectedBloodType: 'all', selectedEligibility: 'all' } }, role).includes(expected));
      }
      for (const Component of [VerificationView, VerificationDetailView, VerificationReviewPanel]) {
        assert.ok(render(Component, { remote }, role).includes(expected), Component.name);
      }
      const preview = render(JoinedParticipants, { announcement: { participants_count: 1, participants_preview: [donor] } }, role);
      assert.ok(preview.includes(`title="${expected}"`) && preview.includes(`aria-label="${expected}"`));
      assert.ok(render(AnnouncementParticipants, { remote: { ...remote, participants: [{ id: 1, donor, status: 'pending' }], participantsMeta: { total: 1 } } }, role).includes(expected));
      assert.ok(render(RewardsView, { initialTab: 'redemptions', remote: { ...remote, items: [], analytics: null, redemptions: [
        { id: 1, donor: raw, reward: 'Shirt', pointsUsed: 100, redeemedDate: '2026-10-01', status: 'available' },
      ] } }, role).includes(expected));
      assert.ok(render(ClaimVerificationView, { model: {}, state: { code: '', step: 'result', claim: {
        voucher_id: 1, donor_name: raw, reward: { name: 'Saved shirt' }, claim_status: 'pending_claim', can_claim: true, claimed_at: null,
      } } }, role).includes(expected));
      assert.ok(render(DashboardView, { remote: { ...remote, months: 6, data: {
        timezone: 'Asia/Manila', stats: { donors: 1, eligible: 0, not_eligible: 0 }, donation_activity: [], blood_types: [], recent_verifications: [row],
        overview: { total_admins: 0, active_admins: 0, rewards_summary: { total_redemptions: 0 }, recent_admin_activity: [] },
      } } }, role).includes(expected));
      assert.ok(render(SystemReportsView, { remote: { ...remote, month: '10', year: '2026', model: { canPrint: () => true }, snapshot: {
        period: '2026-10', generated_at: '2026-10-19T00:00:00Z', data: {
          donor_summary: { total: 1, eligible: 0, not_eligible: 0 }, donation_summary: { completed: 1, for_verification: 0, rejected: 0 },
          rewards_summary: { total_redemptions: 1, points_redeemed: 100, points_issued: 300 }, weekly_donations: [], blood_types: [],
          completed_donations: [{ id: 1, donor: raw, event: 'Drive', date: '2026-10-01' }],
          reward_redemptions: [{ id: 1, donor: raw, voucher: 'Shirt', pointsUsed: 100, date: '2026-10-01' }],
        },
      } } }, role).includes(expected));
      assert.equal(donor.name, raw, 'Rendering never changes API data');
      assert.equal(row.donor, raw);
    }
  }
  console.log('Donor name checks passed: requested examples, single-period/idempotent formatting, full middle names/nulls, both roles, All/Top Donors, verification list/detail/popup, participant names/avatar labels, redemptions, claims, Dashboard and printable reports; raw API data preserved.');
}
