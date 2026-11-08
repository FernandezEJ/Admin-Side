import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkAssessmentCompatibility(server) {
  const { assessmentStates, donorAssessment, currentAssessmentCounts } = await server.ssrLoadModule('/src/services/assessmentPresentation.js');
  const { DonorsView } = await server.ssrLoadModule('/src/pages/Donors.jsx');
  const { DashboardView } = await server.ssrLoadModule('/src/pages/Dashboard.jsx');
  const { SystemReportsView } = await server.ssrLoadModule('/src/pages/SystemReports.jsx');
  const { createDonors } = await server.ssrLoadModule('/src/services/donorsApi.js');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const counts = { basic_requirements_met: 2, needs_further_review: 1, eligible: 1, not_eligible: 1,
    temporarily_ineligible: 1, needs_further_screening: 1, unassessed: 1, indeterminate: 3 };
  const cases = Object.keys(counts).map((code, index) => ({ id: index + 1, name: `Synthetic Donor ${index}`,
    eligibility: code, assessment: { result: code === 'unassessed' ? null : code,
      version: ['basic_requirements_met', 'needs_further_review'].includes(code) ? 'v5' : null },
    totalDonations: 0, achievement: 'New Donor', joinedDate: null }));
  for (const donor of cases) assert.equal(donorAssessment(donor).label,
    assessmentStates[donor.eligibility]?.label ?? 'No Current Self-Assessment');
  assert.ok(assessmentStates.basic_requirements_met.classes.includes('success'));
  assert.ok(assessmentStates.needs_further_review.classes.includes('warning'));
  for (const [result, version] of [['future_result', 'v5'], ['basic_requirements_met', null], ['needs_further_review', 'v6'], ['eligible', 'v5'],
    ['not_eligible', 'v5'], ['temporarily_ineligible', 'v6'], [null, 'v5'], ['future_result', null]]) {
    assert.equal(donorAssessment({ assessment: { result, version } }).label, 'Unknown Result');
  }
  assert.equal(donorAssessment({ eligibility: 'basic_requirements_met' }).label, 'Unknown Result', 'Old metadata cannot establish a preliminary result');
  for (const code of ['eligible', 'not_eligible', 'temporarily_ineligible', 'needs_further_screening', 'unassessed']) {
    assert.equal(donorAssessment({ eligibility: code }).label, 'No Current Self-Assessment');
  }
  assert.deepEqual(currentAssessmentCounts(counts, 11), { basic: 2, review: 1, remainder: 8 }, 'Remainder includes all donors without a recognized V5 result, including unknowns');
  assert.deepEqual(currentAssessmentCounts(undefined, 11), { basic: null, review: null, remainder: null });
  assert.deepEqual(currentAssessmentCounts({ basic_requirements_met: 0, needs_further_review: 0 }, 0), { basic: 0, review: 0, remainder: 0 });
  for (const invalid of [-1, 1.5, '2', NaN, undefined]) {
    assert.deepEqual(currentAssessmentCounts({ basic_requirements_met: invalid, needs_further_review: 1 }, 11), { basic: null, review: 1, remainder: null });
  }
  assert.equal(currentAssessmentCounts(counts, 2).remainder, null, 'Inconsistent totals cannot produce a negative remainder');
  const donorData = { summary: { totalDonors: 11, eligible: 1, temporarilyIneligible: 2 }, assessment_counts: counts,
    donors: cases, topDonors: [], bloodTypes: [], pagination: { currentPage: 1, lastPage: 1, total: 11 } };
  const dashboard = { stats: { donors: 11, eligible: 1, not_eligible: 2 }, assessment_counts: counts, timezone: 'Asia/Manila',
    donation_activity: [], blood_types: [], recent_verifications: [] };
  const report = { period: '2026-11', generated_at: '2026-11-07T04:00:00Z', data: {
    donor_summary: { total: 11, eligible: 1, not_eligible: 2 }, assessment_counts: counts,
    donation_summary: { total: 0, completed: 0, for_verification: 0, needs_revision: 0, rejected: 0 },
    rewards_summary: { total_redemptions: 0, points_redeemed: 0, points_issued: 0 },
    weekly_donations: [], blood_types: [], completed_donations: [], reward_redemptions: [],
    notes: 'Donor Summary uses all current active registered donor accounts and their latest saved assessments, regardless of the selected period. '
      + 'Preliminary self-assessment results are separate from historical questionnaire results; final screening is performed by qualified personnel. '
      + 'Blood Distribution counts completed donation events during the selected month. Synthetic report',
  } };
  const model = { canPrint: () => true };
  const render = (View, remote, role) => renderToString(React.createElement(MemoryRouter, null,
    React.createElement(AdminSessionContext.Provider, { value: { role, isSuperAdmin: role === 'super_admin', currentAdmin: { name: 'Reviewer' } } },
      React.createElement(View, { remote })))).replace(/<!--.*?-->/g, '');
  const donorRemote = { data: donorData, activeTab: 'all', searchTerm: '', selectedBloodType: 'all', selectedEligibility: 'all', model };
  const reportRemote = { snapshot: report, month: '11', year: '2026', model };
  const screens = [
    [DonorsView, donorRemote, 'admin'], [DonorsView, donorRemote, 'super_admin'],
    [DashboardView, { data: dashboard, months: 6, model }, 'admin'],
    [DashboardView, { data: dashboard, months: 12, model }, 'super_admin'],
    [SystemReportsView, reportRemote, 'super_admin'],
  ];
  const note = 'Self-assessment results are preliminary. Final eligibility is determined by qualified blood donation personnel.';
  for (const [View, remote, role] of screens) {
    const html = render(View, remote, role);
    const breakdown = html.match(/<dl\b[\s\S]*?<\/dl>/)?.[0];
    assert.equal(breakdown, undefined, `${View.name} has no extra colored assessment breakdown`);
    assert.ok(!/Eligible|Not Assessed|\(historical\)|Latest donor assessment breakdown/.test(html), `${View.name} has no obsolete assessment labels`);
    if (View === SystemReportsView) {
      const summary = html.match(/<section class="report-summary[\s\S]*?<\/section>/)[0];
      assert.equal((summary.match(/<article>/g) ?? []).length, 3, 'Original three-column report is preserved');
      const donorSummary = summary.match(/<article>[\s\S]*?<\/article>/)[0];
      assert.equal((donorSummary.match(/<strong>/g) ?? []).length, 3);
      for (const [label, value] of [['Basic Requirements Met', 2], ['Needs Further Review', 1], ['No Current Self-Assessment', 8]]) {
        assert.ok(donorSummary.includes(`${label}</span><strong>${value}</strong>`), `Actual global count: ${label}`);
      }
      assert.ok(donorSummary.includes('Total Donors') && donorSummary.includes('>11</span>'));
      assert.equal(html.split(note).length - 1, 1, 'Only one concise assessment note');
      assert.ok(!html.includes('latest saved assessments') && !html.includes('historical questionnaire results'));
      assert.ok(html.includes('Blood Distribution counts completed donation events during the selected month. Synthetic report'), 'Other report notes remain intact');
    } else {
      const cards = html.match(/<section class="grid gap-[45] [\s\S]*?<\/section>/)[0];
      const values = [...cards.matchAll(/<h[23] class="mt-(?:2|6) text-(?:2|3)xl font-bold text-gray-900">(\d+)<\/h[23]>/g)].map(match => Number(match[1]));
      assert.deepEqual(values, [11, 2, 1], `${View.name} uses V5 counts, never old eligibility totals`);
      assert.ok(!html.includes(note), 'No additional assessment section is added');
    }
    assert.ok(!/follow_ups|medications|transfusion|assessment_version|future_result|\bV5\b/.test(html), 'Only minimal presentation appears in screens and printable report');
  }
  const donorHtml = render(DonorsView, donorRemote, 'admin');
  const table = donorHtml.match(/<table\b[\s\S]*?<\/table>/)[0];
  for (const state of Object.values(assessmentStates)) assert.ok(table.includes(state.label));
  for (const code of ['basic_requirements_met', 'needs_further_review', 'unknown']) {
    assert.ok(donorHtml.includes(`<option value="${code}">`));
  }
  for (const code of ['eligible', 'not_eligible', 'temporarily_ineligible', 'needs_further_screening', 'unassessed']) {
    assert.ok(!donorHtml.includes(`<option value="${code}">`), 'Historical categories and misleading partial no-current filters are absent');
  }
  const printable = render(SystemReportsView, reportRemote, 'super_admin');
  assert.ok(printable.indexOf(note) > printable.indexOf('id="monthly-report"'), 'Browser Print / Save includes the simplified donor summary and note');
  const oldReport = { ...report, data: { ...report.data, assessment_counts: undefined } };
  const oldHtml = render(SystemReportsView, { ...reportRemote, snapshot: oldReport }, 'super_admin');
  assert.equal((oldHtml.match(/<strong>—<\/strong>/g) ?? []).length, 3, 'Missing V5 fields display unavailable values, never legacy totals or invented zeros');
  assert.ok(!oldHtml.includes('Eligible') && oldHtml.includes(note));
  for (const [View, remote] of [[DonorsView, { ...donorRemote, data: { ...donorData, assessment_counts: undefined } }],
    [DashboardView, { data: { ...dashboard, assessment_counts: undefined }, months: 6, model }]]) {
    const html = render(View, remote, 'admin');
    assert.equal((html.match(/<h[23] class="mt-(?:2|6) text-(?:2|3)xl font-bold text-gray-900">—<\/h[23]>/g) ?? []).length, 2);
  }
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.push(new URL(url));
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer assessment-token');
    return Response.json(donorData);
  };
  try {
    const donors = createDonors(operation => operation('assessment-token'));
    for (const code of ['basic_requirements_met', 'needs_further_review', 'unknown']) {
      await donors.setSelectedEligibility(code);
      assert.equal(calls.at(-1).searchParams.get('eligibility'), code);
      assert.equal(calls.at(-1).searchParams.get('page'), '1');
      assert.deepEqual(donors.getSnapshot().data.assessment_counts, counts, 'Client trusts global server counts instead of recomputing from a filtered page');
    }
    await donors.clearFilters();
    assert.equal(calls.at(-1).searchParams.has('eligibility'), false);
    donors.dispose();
  } finally { globalThis.fetch = originalFetch; }
  console.log('Assessment display checks passed: V5 counts for both roles, historical/no-assessment grouping, unknown/version guards, simplified authenticated filters, three-column printable summary, safe missing-field fallback and retained report notes.');
}
