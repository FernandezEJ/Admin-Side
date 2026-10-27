import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDonorName } from '../services/staffNames';
import { ArrowLeft, UserRound, MapPin, CalendarDays, FileText, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import AdminDialog from '../components/ui/AdminDialog';
import { EmptyState, ErrorState, PageSkeleton, LoadingNotice } from '../components/ui/PageState';
import { useVerifications } from '../services/useVerifications';
import { VERIFICATION_STATUS_LABELS } from '../services/verificationsApi';

const buttonBase = 'min-h-11 rounded-xl border border-gray-200 px-5 py-2 text-sm font-semibold disabled:opacity-50';
const button = `${buttonBase} text-gray-600 hover:bg-gray-50`;
const successButton = `${buttonBase} bg-success text-white transition hover:bg-success-hover`;
const warningButton = `${buttonBase} bg-warning text-white transition hover:bg-warning-hover`;
const dangerButton = `${buttonBase} bg-danger text-white transition hover:bg-danger-hover`;
const date = (value) => value ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) : 'Not available';

export default function VerificationDetail() {
  const { id } = useParams();
  const remote = useVerifications(id);
  return <VerificationDetailView key={id} remote={remote} />;
}

export function VerificationDetailView({ remote }) {
  const navigate = useNavigate();
  const { item, loading, error, busy, model, proofLoading, proofError, proofUrl, proofType } = remote;
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const canReview = !loading && !remote.readFailed && item?.status === 'for_verification';
  const visibleRecord = item && Object.hasOwn(VERIFICATION_STATUS_LABELS, item.status);
  const close = () => { if (!busy) { setAction(null); setReason(''); } };
  const submit = async (event) => {
    event.preventDefault();
    if (await model.review(action, reason)) { setAction(null); setReason(''); }
  };
  return <div className="flex min-h-screen bg-page">
    <Sidebar />
    <main className="min-w-0 flex-1">
      <Header title="Verification Review" description="Review the donor's submitted proof before making a decision." />
      <div className="p-4 lg:p-8"><div className="mx-auto max-w-6xl">
        <button type="button" onClick={() => navigate('/verification')} className="mb-5 flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-primary"><ArrowLeft size={17} aria-hidden="true" />Back to Verification</button>
        <LoadingNotice loading={loading} hasData={!!item} />{loading && !item ? <PageSkeleton variant="detail" /> : <>
          {error && <ErrorState description={error} compact={!!item} status={remote.errorStatus} busy={loading} onRetry={model.load} />}
          {item && !visibleRecord && <EmptyState title="No verification record to review" description="Return to Verification to review submitted proofs and decision history." />}
          {visibleRecord && <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="mb-5 flex items-center gap-3 font-bold text-gray-800"><UserRound size={20} aria-hidden="true" className="shrink-0 text-primary" />Donor Information</h2>
                <p className="text-xs uppercase text-gray-400">Donor Name</p><p className="mt-1 break-words font-semibold text-gray-800">{formatDonorName(item.donor.name)}</p>
                <p className="mt-2 break-words text-sm text-gray-500">{item.donor.email}</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase text-gray-400">Blood Type</p><p className="mt-2 font-semibold text-primary">{item.donor.blood_type || 'Unknown'}</p></div>
                  <div><p className="text-xs uppercase text-gray-400">Proof Submitted</p><p className="mt-2 text-sm text-gray-700">{date(item.proof_uploaded_at)}</p></div></div>
              </section>
              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="font-bold text-gray-800">Donation Information</h2>
                <p className="mt-5 break-words font-semibold text-gray-800">{item.opportunity.title}</p>
                <p className="mt-4 flex gap-3 text-sm text-gray-600"><MapPin size={17} aria-hidden="true" className="shrink-0 text-primary" />{item.opportunity.location}</p>
                <p className="mt-4 flex gap-3 text-sm text-gray-600"><CalendarDays size={17} aria-hidden="true" className="shrink-0 text-primary" />{item.opportunity.donation_date || 'Confirm arrangements with the chapter.'}</p>
                <p className="mt-4 text-sm text-gray-500">Joined: {date(item.joined_at)}</p>
              </section>
              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <p className="text-xs uppercase text-gray-400">Current Status</p>
                <p className={`mt-3 font-semibold ${item.status === 'completed' ? 'text-success-foreground' : item.status === 'rejected' ? 'text-danger-foreground' : ['pending', 'for_verification', 'needs_revision'].includes(item.status) ? 'text-warning-foreground' : 'text-neutral-foreground'}`}>{VERIFICATION_STATUS_LABELS[item.status]}</p>
                {item.revision_reason && <div className="mt-5 rounded-xl border border-warning-border p-4 text-sm text-warning-foreground"><p className="font-semibold">Revision Reason</p><p className="mt-2 whitespace-pre-wrap break-words">{item.revision_reason}</p><p className="mt-3">Waiting for the donor to upload a corrected proof.</p></div>}
                {item.rejection_reason && <div className="mt-5 rounded-xl border border-gray-200 p-4 text-sm text-danger-foreground"><p className="font-semibold">Final Rejection Reason</p><p className="mt-2 whitespace-pre-wrap break-words">{item.rejection_reason}</p></div>}
                {item.completion && <p className="mt-5 text-sm text-success-foreground">Verified {date(item.completion.verified_at)}. {item.completion.points_awarded} points awarded.</p>}
              </section>
            </div>
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="font-bold text-gray-800">Submitted Proof</h2>
              <p className="mt-2 text-xs text-gray-400">Review the uploaded donation certificate or proof.</p>
              <div className="mt-5 flex min-h-[350px] flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
                {item.proof ? <>
                  <FileText size={28} aria-hidden="true" className="text-primary" /><p className="max-w-full break-words font-semibold text-gray-700">{item.proof.name}</p>
                  <p className="text-xs text-gray-500">{item.proof.mime_type} / {Math.ceil((item.proof.size || 0) / 1024)} KB</p>
                  {proofUrl && proofType.startsWith('image/') && <img src={proofUrl} alt="Submitted donation proof" className="max-h-[600px] max-w-full object-contain" />}
                  {proofUrl && <a href={proofUrl} target="_blank" rel="noopener noreferrer" className={button}>{proofType === 'application/pdf' ? 'Open PDF' : 'Open Image'}</a>}
                  <button type="button" disabled={proofLoading} onClick={model.openProof} className={button}>{proofLoading ? 'Loading proof...' : proofUrl ? 'Reload Proof' : 'Open Proof'}</button>
                  {proofError && <p role="alert" className="text-sm text-danger-foreground">{proofError}</p>}
                </> : <p className="text-sm text-gray-500">No proof has been submitted.</p>}
              </div>
              {canReview ? <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
                <button type="button" disabled={busy} onClick={() => setAction('needs-revision')} className={`${button} flex items-center gap-2 text-warning-foreground`}><RotateCcw size={17} />Needs Revision</button>
                <button type="button" disabled={busy} onClick={() => setAction('reject')} className={`${button} flex items-center gap-2 text-danger-foreground`}><XCircle size={17} />Reject Permanently</button>
                <button type="button" disabled={busy} onClick={() => setAction('approve')} className={`${successButton} flex items-center gap-2`}><CheckCircle2 size={17} />Approve</button>
              </div> : <p className="mt-6 border-t border-gray-100 pt-6 text-sm text-gray-500">{item.status === 'needs_revision' ? 'Waiting for replacement proof before another review.' : 'This record is read-only.'}</p>}
            </section>
          </div>}
        </>}
      </div></div>
    </main>
    {action && canReview && <AdminDialog title={action === 'approve' ? 'Approve Verification' : action === 'needs-revision' ? 'Request Proof Revision' : 'Reject Verification'} onClose={close}>
      <form onSubmit={submit}>
        <p className="text-sm leading-6 text-gray-600">{action === 'approve' ? 'Confirm this donation proof is valid. The donation will be completed and points awarded.' : action === 'needs-revision' ? 'Explain what the donor needs to correct. They can upload replacement proof.' : 'This is a final rejection. The donor cannot resubmit proof for this activity.'}</p>
        {action !== 'approve' && <label className="mt-4 block text-sm font-semibold">Reason<textarea required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-primary" /></label>}
        {error && <p role="alert" className="mt-3 text-sm text-danger-foreground">{error}</p>}
        <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={close} className={button}>Cancel</button><button type="submit" disabled={busy || (action !== 'approve' && !reason.trim())} className={action === 'approve' ? successButton : action === 'needs-revision' ? warningButton : dangerButton}>{busy ? 'Saving...' : 'Confirm'}</button></div>
      </form>
    </AdminDialog>}
  </div>;
}
