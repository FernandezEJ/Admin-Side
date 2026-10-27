import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import AdminDialog from '../components/ui/AdminDialog';
import { ErrorState, PageSkeleton, LoadingNotice } from '../components/ui/PageState';
import EducationalArticlePreview from '../components/announcements/EducationalArticlePreview';
import { useEducationalArticles } from '../services/useEducationalArticles';

const labels = { delete: 'Delete Article', publish: 'Publish Article', restore: 'Restore to Draft' };

export default function EducationalArticleDetail() {
  const { id } = useParams();
  return <EducationalArticleDetailView remote={useEducationalArticles(id)} />;
}

export function EducationalArticleDetailView({ remote, popup = false, onClose, onEdit, onChanged, closeRequestRef, onTitleChange }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { item, categories, loading, busy, error, model } = remote;
  const libraryStatus = state?.articleStatus ?? item?.status ?? 'published';
  const [confirm, setConfirm] = useState(null), [feedback, setFeedback] = useState('');
  const confirmationRef = useRef(null), previousFocus = useRef(null);
  const requestAction = action => { previousFocus.current = globalThis.document?.activeElement;setConfirm(action); };
  const action = async () => { if (busy) return;if (await model.action(confirm)) { setFeedback(confirm === 'restore' ? 'Article restored to Draft. Review it before publishing.' : confirm === 'publish' ? 'Article published.' : 'Article moved to Deleted.');setConfirm(null);onChanged?.(); } };
  useEffect(() => {
    if (!popup) return;
    closeRequestRef.current = () => { if (!busy) { if (confirm) setConfirm(null);else onClose(); } };
    onTitleChange(confirm ? labels[confirm] : 'Article Details');
    return () => { closeRequestRef.current = null; };
  }, [popup, confirm, busy, onClose, closeRequestRef, onTitleChange]);
  useEffect(() => {
    if (!popup) return;
    if (confirm) confirmationRef.current?.focus();
    else if (previousFocus.current?.isConnected) { previousFocus.current.focus();previousFocus.current = null; }
  }, [popup, confirm]);
  const confirmationContent = <>
        <p className="text-sm leading-6 text-gray-600">{confirm === 'delete' ? 'This article will be hidden from donors and retained in Deleted for recovery.' : confirm === 'publish' ? 'Publish this educational article to the donor app?' : 'Restore this article as a Draft? It will remain hidden until explicitly published.'}</p>
        {error ? <p role="alert" className="mt-3 text-sm text-danger-foreground">{error}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-3"><button ref={confirmationRef} disabled={busy} onClick={() => setConfirm(null)} className="min-h-11 rounded-xl border border-gray-200 px-4">Cancel</button><button disabled={busy} onClick={() => void action()} className={`min-h-11 rounded-xl px-4 font-semibold text-white disabled:opacity-60 ${confirm === 'delete' ? 'bg-danger hover:bg-danger-hover' : 'bg-primary hover:bg-primary-hover'}`}>{busy ? 'Saving…' : labels[confirm]}</button></div>
  </>;
  const details = <>
      <LoadingNotice loading={loading || busy} hasData={!!item} />{loading && !item && !remote.hasLoaded ? <PageSkeleton variant="detail" /> : null}{error ? <ErrorState description={error} compact={!!item} status={remote.errorStatus} busy={loading} onRetry={!item || remote.readFailed ? () => model.load() : undefined} /> : null}
      {feedback ? <p role="status" className="text-sm text-success-foreground">{feedback}</p> : null}
      {item ? <section hidden={popup && !!confirm} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="rounded-lg bg-selected px-3 py-2 text-sm font-semibold capitalize text-primary">{item.status === 'draft' ? 'Draft' : item.status}</p>
          <div className="flex flex-wrap gap-3">{item.status !== 'deleted' ? <><button disabled={busy} onClick={() => popup ? onEdit() : navigate(`/educational-content/${item.id}/edit`, { state: { articleStatus: libraryStatus } })} className="min-h-11 rounded-xl border border-gray-200 px-4 font-semibold">Edit</button><button disabled={busy} onClick={() => requestAction('delete')} className="min-h-11 rounded-xl border border-danger-border px-4 font-semibold text-danger-foreground">Delete</button>{item.status === 'draft' ? <button disabled={busy} onClick={() => requestAction('publish')} className="min-h-11 rounded-xl bg-primary px-4 font-semibold text-white">Publish</button> : null}</> : <button disabled={busy} onClick={() => requestAction('restore')} className="min-h-11 rounded-xl bg-primary px-4 font-semibold text-white">Restore to Draft</button>}</div>
        </div>
        <EducationalArticlePreview article={item} categories={categories} />
      </section> : null}
      {confirm ? popup ? <div className="education-confirmation" role="group" aria-label={labels[confirm]}>{confirmationContent}</div> : <AdminDialog title={labels[confirm]} onClose={() => setConfirm(null)} closeDisabled={busy}>{confirmationContent}</AdminDialog> : null}
  </>;
  if (popup) return <div className="education-details-body">{details}</div>;
  return <div className="flex min-h-screen bg-page"><Sidebar /><main className="min-w-0 flex-1"><Header title="Article Details" description="Review educational content and its publication status." />
    <div className="mx-auto max-w-5xl space-y-5 p-4 lg:p-8">
      <button type="button" onClick={() => navigate('/educational-content', { state: { articleStatus: libraryStatus } })} className="min-h-11 font-semibold text-primary">Back to Educational Content</button>
      {details}
    </div></main></div>;
}
