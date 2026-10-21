import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, CheckCircle2, MapPin, RotateCcw, UserRound, X, XCircle, ZoomIn } from 'lucide-react';
import AdminDialog from '../ui/AdminDialog';
import { formatDonorName } from '../../services/staffNames';
import { useVerifications } from '../../services/useVerifications';
import { VERIFICATION_STATUS_LABELS } from '../../services/verificationsApi';
import '../../styles/verification-review.css';

const date = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('en-US', {
  timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
}) : 'Not available';

function ReviewPopupShell({ children, onClose, locked, fallbackFocusRef }) {
  const ref = useRef(null);
  const titleId = useId();
  const captionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const fallbackFocus = fallbackFocusRef?.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
      else fallbackFocus?.focus();
    };
  }, [fallbackFocusRef]);
  return <dialog ref={ref} className="verification-review-modal" aria-modal="true" aria-labelledby={titleId} aria-describedby={captionId}
    onCancel={(event) => { if (event.target !== event.currentTarget) return; event.preventDefault(); if (!locked) onClose(); }}
    onClick={(event) => {
      if (locked || event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    <header className="verification-review-header">
      <div><h2 id={titleId}>Verification Review</h2><p id={captionId}>Review the donor’s submitted proof before making a decision.</p></div>
      <button type="button" disabled={locked} onClick={onClose} aria-label="Close verification review"><X size={17} aria-hidden="true" /></button>
    </header>
    {children}
  </dialog>;
}

export function VerificationProofViewer({ url, type, name, reload }) {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const [failed, setFailed] = useState(false);
  const turned = rotation % 180 !== 0;
  if (type === 'application/pdf') return <div className="verification-proof-pdf">
    {name && <p className="verification-proof-pdf-name">{name}</p>}
    <iframe src={url} title="Submitted donation proof PDF" referrerPolicy="no-referrer" />
    <a href={url} target="_blank" rel="noopener noreferrer">Open PDF</a>
  </div>;
  return <div className="verification-proof-viewer">
    <div className="verification-proof-toolbar">
      {name && <span className="verification-proof-filename" title={name}>{name}</span>}
      <div>
        <button type="button" onClick={() => setRotation((value) => (value + 90) % 360)} aria-label="Rotate proof" title="Rotate proof"><RotateCcw size={14} aria-hidden="true" /></button>
        <button type="button" onClick={() => setZoom((value) => value >= 2 ? 1 : value + 0.5)} aria-label={zoom >= 2 ? 'Reset proof zoom' : 'Zoom proof'} title={`Zoom: ${Math.round(zoom * 100)}%`}><ZoomIn size={14} aria-hidden="true" /></button>
      </div>
    </div>
    {failed ? <div role="alert" className="verification-review-message">The image could not be displayed. <button type="button" onClick={reload}>Retry proof</button></div>
      : <div className="verification-proof-viewport" tabIndex={0} aria-label="Submitted proof image, scroll to inspect">
        <div className="verification-proof-stage" style={{ width: `${zoom * 100}%`, aspectRatio: turned ? `${dimensions.height} / ${dimensions.width}` : `${dimensions.width} / ${dimensions.height}` }}>
          <img src={url} alt="Submitted donation proof" draggable={false} onError={() => setFailed(true)}
            onLoad={(event) => setDimensions({ width: event.currentTarget.naturalWidth || 1, height: event.currentTarget.naturalHeight || 1 })}
            style={{ width: turned ? `${100 * dimensions.width / dimensions.height}%` : '100%', transform: `translate(-50%, -50%) rotate(${rotation}deg)` }} />
        </div>
      </div>}
  </div>;
}

export default function VerificationReviewDrawer(props) {
  const remote = useVerifications(props.id);
  return <VerificationReviewPanel {...props} remote={remote} />;
}

export function VerificationReviewPanel({ remote, onClose, onDecision, fallbackFocusRef }) {
  const { item, loading, error, busy, model, proofLoading, proofError, proofUrl, proofType } = remote;
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const submission = useRef(false);
  const reasonId = useId();
  const visible = !!item && Object.hasOwn(VERIFICATION_STATUS_LABELS, item.status);
  const canReview = visible && !loading && item.status === 'for_verification' && item.proof?.version?.length === 64;
  const hasProof = !!item?.proof;
  useEffect(() => {
    if (!loading && visible && hasProof) void model.openProof();
  }, [loading, visible, hasProof, item?.id, item?.proof?.version, model]);
  const closeConfirmation = () => { if (!busy && !submission.current) { setAction(null); setReason(''); } };
  const submit = async (event) => {
    event.preventDefault();
    if (submission.current || busy || !canReview || !action || (action !== 'approve' && !reason.trim())) return;
    submission.current = true;
    try {
      if (await model.review(action, reason)) {
        setAction(null); setReason('');
        onDecision();
      } else {
        const latest = model.getSnapshot();
        if (latest.item?.proof?.version !== item.proof?.version || latest.item?.status !== 'for_verification') {
          setAction(null);
        }
      }
    } finally { submission.current = false; }
  };
  return <ReviewPopupShell onClose={onClose} locked={busy || !!action} fallbackFocusRef={fallbackFocusRef}>
    <div className="verification-review-content" aria-busy={loading}>
      {loading && <p role="status" className="verification-review-message">Loading verification...</p>}
      {error && <div role="alert" className="verification-review-error">{error}<button type="button" disabled={busy} onClick={model.load}>Refresh record</button></div>}
      {!loading && !visible && !error && <p className="verification-review-message">No verification record to review.</p>}
      {!loading && visible && <div className="verification-review-grid">
        <section className="verification-review-card verification-submitted-proof">
          <h3>Submitted Proof</h3>
          {proofLoading && <p role="status" className="verification-review-message">Loading private proof...</p>}
          {proofError && <div role="alert" className="verification-review-error">{proofError}<button type="button" disabled={proofLoading} onClick={model.openProof}>Retry proof</button></div>}
          {!item.proof && <p className="verification-review-message">No proof has been submitted.</p>}
          {proofUrl && <VerificationProofViewer key={proofUrl} url={proofUrl} type={proofType} name={item.proof?.name} reload={model.openProof} />}
          {item.status !== 'for_verification' && <div className="verification-review-outcome">
            <p>{VERIFICATION_STATUS_LABELS[item.status]}</p>
            {(item.revision_reason || item.rejection_reason) && <p>{item.revision_reason || item.rejection_reason}</p>}
            {item.completion && <p>Verified {date(item.completion.verified_at)}. {item.completion.points_awarded} points awarded.</p>}
          </div>}
        </section>
        <div className="verification-review-information">
        <section className="verification-review-card">
          <h3><UserRound size={14} aria-hidden="true" />Donor Information</h3>
          <dl>
            <div className="verification-donor-name"><dt>Donor Name</dt><dd>{formatDonorName(item.donor?.name) || 'Unavailable donor'}</dd>
              {item.donor?.email && <dd className="verification-donor-email">{item.donor.email}</dd>}</div>
            <div className="verification-donor-meta">
              <div><dt>Blood Type</dt><dd className="verification-donor-blood">{item.donor?.blood_type || 'Unknown'}</dd></div>
              <div><dt>Proof Submitted</dt><dd>{date(item.proof_uploaded_at)}</dd></div>
            </div>
          </dl>
        </section>
        <section className="verification-review-card verification-donation-card">
          <h3>Donation Information</h3>
          <p className="verification-donation-title">{item.opportunity?.title || 'Donation activity'}</p>
          {item.opportunity?.location && <p className="verification-donation-line"><MapPin size={13} aria-hidden="true" /><span>{item.opportunity.location}</span></p>}
          {item.opportunity?.donation_date && <p className="verification-donation-line"><CalendarDays size={13} aria-hidden="true" /><span>{new Date(`${item.opportunity.donation_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></p>}
        </section>
        </div>
      </div>}
    </div>
    <footer className="verification-review-footer">
      {canReview ? <>
        <button type="button" className="verification-decision-revision" disabled={busy || !!action} onClick={() => setAction('needs-revision')}><RotateCcw size={13} aria-hidden="true" /><span>Needs Revision</span></button>
        <button type="button" className="verification-decision-reject" disabled={busy || !!action} onClick={() => setAction('reject')}><XCircle size={13} aria-hidden="true" /><span>Reject Permanently</span></button>
        <button type="button" className="verification-decision-approve" disabled={busy || !!action} onClick={() => setAction('approve')}><CheckCircle2 size={13} aria-hidden="true" /><span>Approve</span></button>
      </> : <div className="verification-review-readonly"><p>{loading ? 'Loading record...' : item?.status === 'needs_revision' ? 'Waiting for replacement proof before another review.' : 'This record is read-only.'}</p><button type="button" disabled={busy} onClick={onClose}>Close</button></div>}
    </footer>
    {action && <AdminDialog title={action === 'approve' ? 'Approve Verification' : action === 'needs-revision' ? 'Request Proof Revision' : 'Reject Verification'} onClose={closeConfirmation} closeDisabled={busy}>
      <form onSubmit={submit}>
        <p className="text-sm leading-6 text-gray-600">{action === 'approve' ? 'Confirm this donation proof is valid. The donation will be completed and points awarded.' : action === 'needs-revision' ? 'Explain what the donor needs to correct. They can upload replacement proof.' : 'This is a final rejection. The donor cannot resubmit proof for this activity.'}</p>
        {action !== 'approve' && <label htmlFor={reasonId} className="mt-4 block text-sm font-semibold">Reason<textarea id={reasonId} required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-gray-300 p-3" /></label>}
        {error && <p role="alert" className="mt-3 text-sm text-danger-foreground">{error}</p>}
        {!canReview && <p role="alert" className="mt-3 text-sm text-warning-foreground">The record changed. Cancel and review its current details before continuing.</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={busy} onClick={closeConfirmation} className="min-h-11 rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={busy || !canReview || (action !== 'approve' && !reason.trim())} className={`min-h-11 rounded-xl px-5 text-sm font-semibold text-white transition disabled:opacity-50 ${action === 'approve' ? 'bg-success hover:bg-success-hover' : action === 'needs-revision' ? 'bg-warning hover:bg-warning-hover' : 'bg-danger hover:bg-danger-hover'}`}>{busy ? 'Saving...' : 'Confirm'}</button>
        </div>
      </form>
    </AdminDialog>}
  </ReviewPopupShell>;
}
