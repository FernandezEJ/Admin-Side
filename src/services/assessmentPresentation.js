export const assessmentStates = {
  basic_requirements_met: { label: 'Basic Requirements Met', classes: 'bg-success-surface text-success-foreground' },
  needs_further_review: { label: 'Needs Further Review', classes: 'bg-warning-surface text-warning-foreground' },
  unassessed: { label: 'No Current Self-Assessment', classes: 'bg-neutral-surface text-neutral-foreground' },
  indeterminate: { label: 'Unknown Result', classes: 'bg-neutral-surface text-neutral-foreground' },
};

export function donorAssessment(donor) {
  // Older API responses lack raw result/version metadata. Never infer a new outcome.
  if (!donor.assessment) {
    return ['eligible', 'not_eligible', 'temporarily_ineligible', 'needs_further_screening', 'unassessed'].includes(donor.eligibility)
      ? assessmentStates.unassessed : assessmentStates.indeterminate;
  }
  const { result, version } = donor.assessment;
  if (result == null && version == null) return assessmentStates.unassessed;
  if (version === 'v5' && ['basic_requirements_met', 'needs_further_review'].includes(result)) return assessmentStates[result];
  if (version == null && ['eligible', 'not_eligible', 'temporarily_ineligible', 'needs_further_screening'].includes(result)) return assessmentStates.unassessed;
  return assessmentStates.indeterminate;
}

export function currentAssessmentCounts(counts, total) {
  const count = (key) => Number.isSafeInteger(counts?.[key]) && counts[key] >= 0 ? counts[key] : null;
  const basic = count('basic_requirements_met');
  const review = count('needs_further_review');
  // Missing V5 fields must never fall back to old eligibility totals or invented zeros.
  const remainder = Number.isSafeInteger(total) && total >= 0 && basic !== null && review !== null
    && basic + review <= total ? total - basic - review : null;
  return { basic, review, remainder };
}
