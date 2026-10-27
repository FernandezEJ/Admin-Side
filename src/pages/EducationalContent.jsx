import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Plus, Search, BookOpen, FileText, Trash2 } from 'lucide-react';
import { ArticleCover } from '../components/announcements/EducationalArticlePreview';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { EmptyState, ErrorState, PageSkeleton, LoadingNotice, SkeletonValue } from '../components/ui/PageState';
import { useEducationalArticles } from '../services/useEducationalArticles';
import EducationalArticlePopup from '../components/announcements/EducationalArticlePopup';

const ARTICLE_ICONS = { published: { icon: BookOpen, classes: 'bg-success-surface text-success-foreground' }, draft: { icon: FileText, classes: 'bg-neutral-surface text-neutral-foreground' }, deleted: { icon: Trash2, classes: 'bg-danger-surface text-danger-foreground' } };
const ARTICLE_STATUSES = { published: 'Published', draft: 'Drafts', deleted: 'Deleted' };

export default function EducationalContent() {
  const location = useLocation(), navigate = useNavigate();
  const remote = useEducationalArticles(undefined, location.state?.articleStatus ?? 'published');
  const enterPopupHistory = id => navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, {
    state: { ...location.state, educationArticle: id }, preventScrollReset: true,
  });
  return <EducationalContentView remote={remote} enterPopupHistory={enterPopupHistory} />;
}

export function EducationalContentView({ remote, enterPopupHistory }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedId, setSelectedId] = useState(location.state?.educationArticle ?? null);
  const opening = useRef(!!location.state?.educationArticle), opener = useRef(null), gallery = useRef(null);
  const { items, meta, counts, categories, filters, loading, error, model } = remote;
  const filter = patch => void model.load({ ...filters, ...patch, page: 1 });
  const openArticle = path => navigate(path, { state: { articleStatus: filters.status } });
  const openDetails = (id, event) => {
    if (opening.current) return;
    opening.current = true;
    opener.current = event.currentTarget;
    opener.current.focus({ preventScroll: true });
    // Same URL, with one history entry for Back/Forward; the gallery stays mounted.
    enterPopupHistory?.(id);
    setSelectedId(id);
  };
  const dismiss = useCallback(() => {
    opening.current = false;
    setSelectedId(null);
    requestAnimationFrame(() => {
      if (!opener.current?.isConnected) gallery.current?.focus({ preventScroll: true });
    });
  }, []);
  useEffect(() => {
    const forward = event => {
      const id = event.state?.usr?.educationArticle;
      if (id) { opening.current = true;setSelectedId(id); }
    };
    window.addEventListener('popstate', forward);
    return () => window.removeEventListener('popstate', forward);
  }, []);
  const refresh = useCallback(async () => {
    await model.load();
    const state = model.getSnapshot();
    if (!state.error && state.meta && state.meta.current_page > state.meta.last_page) {
      await model.load({ ...state.filters, page: Math.max(1, state.meta.last_page) });
    }
    if (!opening.current && !opener.current?.isConnected) gallery.current?.focus({ preventScroll: true });
  }, [model]);
  return <div className="flex min-h-screen bg-page"><Sidebar /><main className="min-w-0 flex-1">
    <Header title="Educational Content" description="Manage timeless blood-donation learning articles." />
    <div className="space-y-6 p-4 lg:p-8">
      <section className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-gray-800">Educational Library</h2><p className="mt-1 text-sm text-gray-500">Helpful learning, separate from donation events.</p></div>
        <button type="button" onClick={() => openArticle('/educational-content/create')} className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-hover"><Plus size={18} aria-hidden="true" />New Article</button></section>
      <section aria-label="Article status" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Object.entries(ARTICLE_STATUSES).map(([key, label]) => { const { icon: Icon, classes } = ARTICLE_ICONS[key];return <button key={key} type="button"
          aria-label={`Show ${label} articles: ${counts[key] ?? 'count unavailable'}`} aria-pressed={filters.status === key}
          onClick={() => { if (filters.status !== key) filter({ status: key }); }}
          className={`min-w-0 rounded-2xl border p-5 text-left transition hover:border-primary-border hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${filters.status === key ? 'border-primary bg-selected' : 'border-gray-200 bg-white hover:bg-primary-soft'}`}>
          <span className="flex items-center justify-between gap-3"><span className="min-w-0">
            <span className="block break-words text-sm font-medium text-gray-500">{label}</span>
            <span className="mt-2 block break-words text-2xl font-bold text-gray-800">{loading && !meta ? <SkeletonValue /> : counts[key] ?? '—'}</span>
          </span><span className="flex shrink-0 items-center gap-2"><span className={`lf-icon-badge ${classes}`}><Icon size={22} aria-hidden="true" /></span><ChevronRight size={18} aria-hidden="true" className="shrink-0 text-primary" /></span></span>
        </button>;})}
      </section>
      <section ref={gallery} tabIndex={-1} aria-label="Educational article gallery" className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full min-w-0 flex-1 sm:min-w-40">
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
            <input type="search" aria-label="Search articles" placeholder="Search article title..." maxLength={255} value={filters.search} onChange={event => filter({ search: event.target.value })} className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none focus:border-primary focus:bg-white" />
          </div>
          <select aria-label="Article category" value={filters.category} onChange={event => filter({ category: event.target.value })} className="h-11 max-w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600"><option value="all">All Categories</option>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <button type="button" onClick={() => filter({ search: '', category: 'all' })} className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-500 hover:bg-gray-50">Clear Filters</button></div>
        {error ? <ErrorState description={error} compact={!!meta} status={remote.errorStatus} busy={loading} onRetry={() => model.load()} /> : null}
        <LoadingNotice requestKey={JSON.stringify(filters)} loading={loading} hasData={!!meta} />{loading && !meta ? <PageSkeleton variant="gallery" /> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map(article => <button key={article.id} type="button" aria-label={`Read article: ${article.title || 'Untitled draft'}`} aria-haspopup="dialog" onClick={event => openDetails(article.id, event)} className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white text-left transition hover:border-primary-border hover:bg-primary-soft hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <ArticleCover src={article.image_url} title={article.title} />
          <div className="space-y-2 p-4"><div className="flex items-center justify-between gap-3"><span className="min-w-0 break-words text-xs font-semibold text-primary">{article.category_label || 'Uncategorized'}</span><ChevronRight size={19} aria-hidden="true" className="shrink-0 text-primary" /></div><h3 className="break-words font-bold text-gray-800">{article.title || 'Untitled draft'}</h3><p className="line-clamp-2 break-words text-sm text-gray-500">{article.short_description || 'No description yet.'}</p><p className="text-xs text-gray-500">{ARTICLE_STATUSES[article.status]}</p></div>
        </button>)}</div>}
        {!loading && !error && meta?.total === 0 ? <EmptyState title={filters.search.trim() || filters.category !== 'all' ? "No articles match your filters" : `No ${ARTICLE_STATUSES[filters.status].toLowerCase()} articles yet`} description="Try another filter or create a new learning article." /> : null}
        {meta && meta.last_page > 1 ? <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><button disabled={loading || meta.current_page <= 1} onClick={() => model.load({ ...filters, page: meta.current_page - 1 })} className="min-h-11 rounded-xl border border-gray-200 px-4 disabled:opacity-50">Previous</button><span>Page {meta.current_page} of {meta.last_page}</span><button disabled={loading || meta.current_page >= meta.last_page} onClick={() => model.load({ ...filters, page: meta.current_page + 1 })} className="min-h-11 rounded-xl border border-gray-200 px-4 disabled:opacity-50">Next</button></div> : null}
      </section>
    </div>
  </main>{selectedId !== null ? <EducationalArticlePopup key={selectedId} id={selectedId} onDismiss={dismiss} onChanged={refresh} /> : null}</div>;
}
