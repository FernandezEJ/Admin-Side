import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ImageOff, ImagePlus } from 'lucide-react';
import { useAdminSession } from '../../auth/useAdminSession';
import { createPermanentPost } from '../../services/permanentPostApi';
import { announcementDocument, announcementContentError, documentText } from '../../services/announcementContent';
import { ErrorState, PageSkeleton, LoadingNotice } from '../ui/PageState';
import AdminDialog from '../ui/AdminDialog';
import AnnouncementEditor from './AnnouncementEditor';
import '../../styles/permanent-post-editor.css';

export default function PermanentPostPanel() {
  const { requestAdmin } = useAdminSession();
  const model = useMemo(() => createPermanentPost(requestAdmin), [requestAdmin]);
  const remote = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  const [editing, setEditing] = useState(false);
  useEffect(() => { void model.load();return () => model.dispose(); }, [model]);
  return <PermanentPostPanelView remote={{ ...remote, model }} onEdit={() => setEditing(true)}>
    {editing && remote.item ? <PermanentPostEditor item={remote.item} remote={remote} model={model} onClose={() => setEditing(false)} /> : null}
  </PermanentPostPanelView>;
}

export function PermanentPostPanelView({ remote, onEdit, children }) {
  const { item, loading, error, saved, model } = remote;
  return <section aria-label="Permanent Post" className="rounded-2xl border border-gray-200 bg-white p-5">
    <h2 className="mb-3 text-lg font-bold text-gray-800">Permanent Post</h2>
    {loading && !item ? <PageSkeleton variant="permanent" /> : null}
    <LoadingNotice loading={loading} hasData={!!item} />{error ? <ErrorState description={error} compact={!!item} status={remote.errorStatus} busy={loading} onRetry={model?.load} /> : null}
    {item ? <div className="flex flex-wrap items-center gap-4">
      {item.image_url ? <img src={item.image_url} alt={item.title} className="h-20 w-36 shrink-0 rounded-xl object-cover" /> : <ImageOff aria-label="No cover image" className="h-20 w-36 rounded-xl bg-primary-soft p-6 text-primary" />}
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-xs font-semibold text-primary">Permanent Post / No expiration</p>
        <h3 className="mt-1 break-words font-bold text-gray-800">{item.title}</h3>
        <p className="mt-1 line-clamp-2 break-words text-sm text-gray-500">{item.summary}</p>
      </div>
      <button type="button" onClick={onEdit} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">Edit Permanent Post</button>
    </div> : null}
    {saved ? <p role="status" className="mt-3 text-sm text-success-foreground">Permanent post updated.</p> : null}
    {children}
  </section>;
}

export function PermanentPostEditor({ item, remote, model, onClose }) {
  // One editing session keeps its saved baseline even if the surrounding list refreshes.
  const [initial] = useState(() => ({ ...item, description_document: announcementDocument(item) }));
  const [draft, setDraft] = useState(initial), [image, setImage] = useState(null), [preview, setPreview] = useState('');
  const [submitted, setSubmitted] = useState(false), [imageError, setImageError] = useState(''), [discard, setDiscard] = useState(false);
  const [failedCover, setFailedCover] = useState('');
  const fieldId = useId(), fileInput = useRef(null), keepEditing = useRef(null), returnFocus = useRef(null);
  const dirty = !!image || JSON.stringify(draft) !== JSON.stringify(initial);
  const cover = preview || initial.image_url;
  const titleError = submitted && !draft.title.trim();
  const summaryError = submitted && !draft.summary.trim();
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    if (discard) {
      keepEditing.current?.focus();
    } else if (returnFocus.current?.isConnected) {
      returnFocus.current.focus();
      returnFocus.current = null;
    }
  }, [discard]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => { event.preventDefault();event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const close = () => { if (!remote.busy) { if (discard) setDiscard(false);else if (dirty) { returnFocus.current = globalThis.document?.activeElement;setDiscard(true); } else onClose(); } };
  const save = async (event) => {
    event.preventDefault();setSubmitted(true);
    if (remote.busy || imageError || !draft.title.trim() || !draft.summary.trim() || announcementContentError(draft.description_document, true)) return;
    if (await model.save(draft, image)) onClose();
  };
  const field = (name, value) => setDraft(current => ({ ...current, [name]: value }));
  return <div className={`permanent-post-editor${discard ? ' is-confirming-discard' : ''}`}>
    <AdminDialog title={discard ? 'Discard unsaved changes?' : 'Edit Permanent Post'} onClose={close} closeDisabled={remote.busy}>
      {discard ? <div className="permanent-post-discard space-y-4"><p>Your changes have not been saved.</p><div className="flex flex-wrap justify-end gap-3">
        <button ref={keepEditing} type="button" onClick={() => setDiscard(false)} className="min-h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold hover:bg-gray-50">Keep Editing</button>
        <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-white hover:bg-danger-hover">Discard Changes</button>
      </div></div> : null}
      {/* Keep the editor mounted while confirming discard so browser undo/selection survives. */}
      <form onSubmit={save} hidden={discard} className="permanent-post-form" aria-busy={remote.busy}>
        <div className="permanent-post-editor-body"><LoadingNotice loading={remote.busy} />
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-600">Philippine Red Cross · No expiration</p>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">Permanent</span>
          </div>
          {remote.error ? <p role="alert" className="mb-5 rounded-xl border border-danger-border bg-danger-surface p-3 text-sm text-danger-foreground">{remote.error}</p> : null}
          <div className="permanent-post-details">
            <section aria-label="Cover image" className="min-w-0">
              <h3 className="mb-2 text-sm font-semibold">Cover image</h3>
              <div className="permanent-post-cover">
                {cover && failedCover !== cover ? <img alt="Permanent post cover preview" src={cover} onError={() => setFailedCover(cover)} /> :
                  <div role="status" className="flex flex-col items-center gap-2 p-4 text-center text-sm text-gray-600">
                    <ImageOff size={28} aria-hidden="true" className="text-primary" /><span>{cover ? 'Cover preview unavailable' : 'No cover image'}</span>
                  </div>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="permanent-post-cover-control">
                  <ImagePlus size={17} aria-hidden="true" />{cover ? 'Replace Cover' : 'Choose Cover'}
                  <input ref={fileInput} type="file" accept="image/jpeg,image/png" disabled={remote.busy} className="sr-only"
                    aria-invalid={!!imageError} aria-describedby={`${fieldId}-image-help${imageError ? ` ${fieldId}-image-error` : ''}`} onChange={event => {
                      const file = event.target.files?.[0];if (!file) return;
                      if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) { setImageError('Choose a JPG or PNG image up to 5 MB.');return; }
                      setImageError('');setImage(file);setPreview(URL.createObjectURL(file));
                    }} />
                </label>
                {image || imageError ? <button type="button" disabled={remote.busy} className="min-h-11 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-gray-50 disabled:opacity-60" onClick={() => {
                  setImage(null);setPreview('');setImageError('');if (fileInput.current) fileInput.current.value = '';
                }}>{initial.image_url ? 'Use saved cover' : 'Clear selection'}</button> : null}
              </div>
              <p id={`${fieldId}-image-help`} className="mt-2 text-xs leading-5 text-gray-600">JPG or PNG, up to 5 MB. A replacement is uploaded only when you save.</p>
              {imageError ? <p id={`${fieldId}-image-error`} role="alert" className="mt-2 text-sm text-danger-foreground">{imageError}</p> : null}
            </section>
            <div className="min-w-0 space-y-5">
              <div>
                <label htmlFor={`${fieldId}-title`} className="block text-sm font-semibold">Title</label>
                <input id={`${fieldId}-title`} name="title" required maxLength={255} value={draft.title} disabled={remote.busy}
                  aria-invalid={titleError} aria-describedby={titleError ? `${fieldId}-title-error` : undefined}
                  onChange={event => field('title', event.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-gray-200 px-3 text-sm disabled:bg-gray-50" />
                {titleError ? <p id={`${fieldId}-title-error`} role="alert" className="mt-2 text-sm text-danger-foreground">Enter a title.</p> : null}
              </div>
              <div>
                <label htmlFor={`${fieldId}-summary`} className="block text-sm font-semibold">Short description</label>
                <textarea id={`${fieldId}-summary`} name="summary" required maxLength={500} value={draft.summary} disabled={remote.busy}
                  aria-invalid={summaryError} aria-describedby={`${fieldId}-summary-help${summaryError ? ` ${fieldId}-summary-error` : ''}`}
                  onChange={event => field('summary', event.target.value)} className="mt-2 block min-h-28 w-full resize-y rounded-xl border border-gray-200 p-3 text-sm leading-6 disabled:bg-gray-50" />
                <p id={`${fieldId}-summary-help`} className="mt-2 text-xs text-gray-600">A short introduction for the permanent post. Maximum 500 characters.</p>
                {summaryError ? <p id={`${fieldId}-summary-error`} role="alert" className="mt-2 text-sm text-danger-foreground">Enter a short description.</p> : null}
              </div>
            </div>
          </div>
          <section aria-labelledby={`${fieldId}-content-label`} className="mt-6 min-w-0">
            <h3 id={`${fieldId}-content-label`} className="mb-2 block text-sm font-semibold">Full content</h3>
            <AnnouncementEditor value={draft.description_document} submitted={submitted} disabled={remote.busy}
              onChange={document => setDraft(current => ({ ...current, description_document: document, description: documentText(document) }))} />
          </section>
        </div>
        <footer className="permanent-post-editor-footer">
          <button type="button" onClick={close} disabled={remote.busy} className="min-h-11 rounded-xl border border-gray-200 px-5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={remote.busy} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">{remote.busy ? 'Saving…' : 'Save Changes'}</button>
        </footer>
      </form>
    </AdminDialog>
  </div>;
}
