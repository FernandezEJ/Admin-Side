import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import AdminDialog from '../components/ui/AdminDialog';
import { ErrorState, PageSkeleton, LoadingNotice } from '../components/ui/PageState';
import AnnouncementEditor from '../components/announcements/AnnouncementEditor';
import { ArticleCover } from '../components/announcements/EducationalArticlePreview';
import { announcementDocument, announcementContentError, documentText, plainDocument } from '../services/announcementContent';
import { useEducationalArticles } from '../services/useEducationalArticles';

const blank = { title: '', category: '', short_description: '', description: '', description_document: plainDocument(''), status: 'draft' };
export default function EducationalArticleForm() {
  const { id } = useParams();
  return <EducationalArticleFormView key={id ?? 'create'} remote={useEducationalArticles(id ?? 'create')} />;
}

export function EducationalArticleFormView({ remote, popup = false, onClose, onSaved, closeRequestRef, onTitleChange, onDirtyChange }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { item, categories, loading, busy, error, fieldErrors, model } = remote;
  const [changes, setChanges] = useState(null), [image, setImage] = useState(null), [preview, setPreview] = useState('');
  const [imageError, setImageError] = useState(''), [submitted, setSubmitted] = useState(false), [confirmation, setConfirmation] = useState(null);
  const confirmationRef = useRef(null), previousFocus = useRef(null), editorRef = useRef(null), initiallyFocused = useRef(false);
  const original = item ?? blank;
  const draft = changes ?? { ...original, description_document: announcementDocument(original) };
  const dirty = changes !== null || image !== null;
  const field = (key, value) => setChanges({ ...draft, [key]: value });
  const libraryStatus = state?.articleStatus ?? item?.status ?? 'published';
  const returnTo = path => popup ? onClose() : navigate(path, path === '/educational-content' ? { state: { articleStatus: libraryStatus } } : undefined);
  const leave = path => { if (busy) return;if (dirty) { previousFocus.current = globalThis.document?.activeElement;setConfirmation({ kind: 'discard', path }); } else returnTo(path); };
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { onDirtyChange?.(dirty);return () => onDirtyChange?.(false); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (popup && !loading && !initiallyFocused.current) {
      const input = editorRef.current?.querySelector('input:not([type="file"])');
      if (input) { input.focus({ preventScroll: true });initiallyFocused.current = true; }
    }
  }, [popup, loading]);
  useEffect(() => {
    if (!popup) return;
    closeRequestRef.current = () => {
      if (busy) return;
      if (confirmation) setConfirmation(null);
      else if (dirty) { previousFocus.current = globalThis.document?.activeElement;setConfirmation({ kind: 'discard', path: '/educational-content' }); }
      else onClose();
    };
    return () => { closeRequestRef.current = null; };
  }, [popup, closeRequestRef, busy, dirty, confirmation, onClose]);
  useEffect(() => {
    if (!popup) return;
    onTitleChange(confirmation ? confirmation.kind === 'discard' ? 'Discard unsaved changes?' : confirmation.kind === 'live' ? 'Update live article?' : 'Publish Article?' : 'Edit Article');
    if (confirmation) confirmationRef.current?.focus();
    else if (previousFocus.current?.isConnected) { previousFocus.current.focus();previousFocus.current = null; }
  }, [popup, confirmation, onTitleChange]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const unload = event => { event.preventDefault();event.returnValue = ''; };
    const link = event => {
      const anchor = event.target.closest?.('a[href]');
      if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || anchor.target === '_blank') return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin !== window.location.origin) return;
      event.preventDefault();event.stopPropagation();
      if (!busy) { previousFocus.current = document.activeElement;setConfirmation({ kind: 'discard', path: target.pathname + target.search }); }
    };
    window.addEventListener('beforeunload', unload);document.addEventListener('click', link, true);
    return () => { window.removeEventListener('beforeunload', unload);document.removeEventListener('click', link, true); };
  }, [dirty, busy]);
  const validation = { ...Object.fromEntries(Object.entries(fieldErrors ?? {}).map(([key, value]) => [key, value.join(' ')])) };
  if (submitted) {
    for (const key of ['title', 'category', 'short_description']) if (!draft[key]?.trim()) validation[key] = 'Complete this field before publishing.';
    if (!image && !draft.image_url) validation.image = 'Upload a cover image before publishing.';
  }
  const contentError = announcementContentError(draft.description_document, submitted);
  if (contentError) validation.description_document = contentError;
  const save = async status => {
    if (busy || imageError) return;
    if (await model.save(draft, image, status)) {
      if (popup) onSaved();
      else navigate(`/educational-content/${model.getSnapshot().item.id}`, { replace: true, state: { articleStatus: libraryStatus } });
    }
  };
  const requestSave = status => {
    if (busy || imageError || announcementContentError(draft.description_document, status === 'published')) { setSubmitted(status === 'published');return; }
    if (status === 'published') {
      setSubmitted(true);
      if (['title', 'category', 'short_description'].some(key => !draft[key]?.trim()) || (!image && !draft.image_url)) return;
      previousFocus.current = globalThis.document?.activeElement;
      setConfirmation({ kind: original.status === 'published' ? 'live' : 'publish', status });
    } else { setSubmitted(false);void save(status); }
  };
  const input = 'mt-2 block min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm disabled:opacity-60';
  const problem = key => validation[key] ? <p role="alert" className="mt-1 text-sm text-danger-foreground">{validation[key]}</p> : null;
  const confirmationTitle = confirmation?.kind === 'discard' ? 'Discard unsaved changes?' : confirmation?.kind === 'live' ? 'Update live article?' : 'Publish Article?';
  const confirmationContent = <>
    <p className="text-sm leading-6 text-gray-600">{confirmation?.kind === 'discard' ? 'Your changes have not been saved.' : 'Donors will see this educational content after their next refresh.'}</p>{error ? <p role="alert" className="mt-3 text-sm text-danger-foreground">{error}</p> : null}
    <div className="mt-5 flex flex-wrap justify-end gap-3"><button ref={confirmationRef} disabled={busy} onClick={() => setConfirmation(null)} className="min-h-11 rounded-xl border border-gray-200 px-4">{confirmation?.kind === 'discard' ? 'Keep Editing' : 'Cancel'}</button><button disabled={busy} onClick={() => confirmation.kind === 'discard' ? returnTo(confirmation.path) : void save(confirmation.status)} className="min-h-11 rounded-xl bg-primary px-4 font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : confirmation?.kind === 'discard' ? 'Discard Changes' : 'Confirm'}</button></div>
  </>;
  const content = <>
      <LoadingNotice loading={loading || busy} hasData={!!item} />{loading && !item && !remote.hasLoaded ? <PageSkeleton variant="form" /> : error && !item && !Object.keys(categories).length ? <ErrorState description={error} status={remote.errorStatus} busy={loading} onRetry={() => model.load()} /> : item?.status === 'deleted' ? <ErrorState description="Restore this article to Draft before editing." /> : <form ref={editorRef} hidden={popup && !!confirmation} onSubmit={event => { event.preventDefault();requestSave(original.status); }} className="education-editor-form space-y-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
        <div className="border-b border-gray-100 pb-5"><h2 className="text-lg font-bold text-gray-800">Article Details</h2><p className="mt-1 text-sm leading-6 text-gray-500">Drafts can be incomplete. Publishing requires every field and a cover image.</p></div>
        {original.status === 'published' ? <p role="note" className="rounded-xl border border-warning-border bg-warning-surface p-3 text-sm text-warning-foreground">This article is live. Save Changes updates the content donors see.</p> : null}
        {error ? <p role="alert" className="text-sm text-danger-foreground">{error}</p> : null}
        <div className="grid gap-6 lg:grid-cols-2"><div className="space-y-5">
          <label className="block text-sm font-semibold text-gray-700">Article Title<input maxLength={255} disabled={busy} value={draft.title} onChange={event => field('title', event.target.value)} aria-invalid={!!validation.title} className={input} />{problem('title')}</label>
          <label className="block text-sm font-semibold text-gray-700">Category<select disabled={busy} value={draft.category ?? ''} onChange={event => field('category', event.target.value)} aria-invalid={!!validation.category} className={input}><option value="">Select Category</option>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{problem('category')}</label>
          <label className="block text-sm font-semibold text-gray-700">Short Description<textarea maxLength={160} disabled={busy} value={draft.short_description} onChange={event => field('short_description', event.target.value)} aria-invalid={!!validation.short_description} className={`${input} min-h-24 py-3`} /><span className="mt-1 block text-xs text-gray-500">{draft.short_description.length}/160 characters</span>{problem('short_description')}</label>
        </div><div className="space-y-3"><label className="block text-sm font-semibold text-gray-700">Cover Image<input type="file" accept="image/png,image/jpeg" disabled={busy} className="mt-2 block w-full text-sm" onChange={event => { const file = event.target.files?.[0];if (!file) return;if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) { setImageError('Choose a JPG or PNG image up to 5 MB.');return; }setImageError('');setImage(file);setPreview(URL.createObjectURL(file)); }} /></label><p className="text-xs text-gray-500">JPG or PNG, up to 5 MB. A 16:9 landscape cover is recommended.</p><ArticleCover src={preview || draft.image_url} title={draft.title} full />{imageError ? <p role="alert" className="text-sm text-danger-foreground">{imageError}</p> : problem('image')}</div></div>
        <div><h3 className="mb-2 text-sm font-semibold text-gray-700">Full Educational Content</h3><AnnouncementEditor disabled={busy} value={draft.description_document} required={submitted} submitted={submitted} onChange={document => setChanges({ ...draft, description_document: document, description: documentText(document) })} />{problem('description_document')}</div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
          <button type="button" disabled={busy} onClick={() => leave('/educational-content')} className="min-h-11 rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60">Cancel</button>
          {original.status !== 'published' ? <button type="button" disabled={busy} onClick={() => requestSave('draft')} className="min-h-11 rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60">Save as Draft</button> : null}
          <button type="button" disabled={busy} onClick={() => requestSave('published')} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60">{busy ? 'Saving…' : original.status === 'published' ? 'Save Changes' : 'Publish'}</button>
        </div>
      </form>}
      {confirmation ? popup ? <div className="education-confirmation" role="group" aria-label={confirmationTitle}>{confirmationContent}</div> : <AdminDialog title={confirmationTitle} onClose={() => setConfirmation(null)} closeDisabled={busy}>{confirmationContent}</AdminDialog> : null}
  </>;
  if (popup) return <div className="education-editor-content">{content}</div>;
  return <div className="flex min-h-screen bg-page"><Sidebar /><main className="min-w-0 flex-1"><Header title={item ? 'Edit Article' : 'Create Article'} description="Prepare educational information for LifeFlow donors." />
    <div className="mx-auto max-w-5xl space-y-5 p-4 lg:p-8"><button type="button" onClick={() => leave('/educational-content')} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-gray-600 hover:bg-primary-soft hover:text-primary"><ArrowLeft size={17} aria-hidden="true" />Back to Educational Content</button>
      {content}
    </div></main></div>;
}
