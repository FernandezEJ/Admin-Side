import { assessmentStates, currentAssessmentCounts } from '../services/assessmentPresentation';

export default function AssessmentBreakdown({ counts, total }) {
  const assessment = currentAssessmentCounts(counts, total);
  return (
    <div className="space-y-2 text-sm">
      {[
        [assessmentStates.basic_requirements_met.label, assessment.basic],
        [assessmentStates.needs_further_review.label, assessment.review],
        [assessmentStates.unassessed.label, assessment.remainder],
      ].map(([label, value]) => <div key={label} className="flex justify-between gap-4 text-sm">
        <span className="text-gray-500">{label}</span><strong>{value ?? '—'}</strong>
      </div>)}
      <p className="text-xs text-gray-500">Self-assessment results are preliminary. Final eligibility is determined by qualified blood donation personnel.</p>
    </div>
  );
}
