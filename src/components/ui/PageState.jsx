import { useEffect, useRef, useState } from 'react';
import { Inbox, CircleAlert } from 'lucide-react';
import { readErrorFeedback, watchSlowRequest } from '../../services/readFeedback';

export function EmptyState({ title = 'No records found', description = 'Try changing your search or filters.' }) {
  return <div role="status" className="px-4 py-10 text-center">
    <span className="lf-icon-badge lf-icon-brand mx-auto mb-3" aria-hidden="true"><Inbox size={22} /></span>
    <p className="font-semibold text-gray-700">{title}</p>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
  </div>;
}

export function ErrorState({ title = 'Unable to display this page', description = 'Please try again.', status, onRetry, busy = false, compact = false }) {
  const feedback = readErrorFeedback(status, description);
  const pending = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    if (pending.current || busy) return;
    pending.current = true;setRetrying(true);
    try { await onRetry(); } finally { pending.current = false;setRetrying(false); }
  };
  return <div role="alert" className={`rounded-xl border border-danger-border bg-white ${compact ? 'flex flex-wrap items-start gap-3 p-3' : 'p-6'}`}>
    <CircleAlert size={24} aria-hidden="true" className={`shrink-0 text-danger ${compact ? '' : 'mb-3'}`} />
    <div className={compact ? 'min-w-0 flex-1 basis-48' : ''}>
      <h2 className="font-bold text-gray-800">{feedback.title || title}</h2>
      <p className="mt-2 break-words text-sm text-gray-600">{feedback.description}</p>
      {compact && <p className="mt-1 text-xs text-gray-500">Previously loaded information is still shown.</p>}
    </div>
    {onRetry && feedback.retry && <button type="button" onClick={retry} disabled={busy || retrying} aria-busy={busy || retrying} className={`${compact ? '' : 'mt-4'} min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60`}>{retrying ? 'Retrying…' : 'Try again'}</button>}
  </div>;
}

export function LoadingNotice({ loading, hasData = false, label = 'Refreshing this section…', requestKey }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => watchSlowRequest(loading, setSlow), [loading, requestKey]);
  if (!loading) return null;
  return <p role="status" className={slow || hasData ? 'px-4 py-2 text-sm text-gray-500' : 'sr-only'}>
    {slow ? 'Loading is taking longer than usual…' : hasData ? label : 'Loading this section…'}
  </p>;
}

const shape = 'rounded-lg bg-gray-200/70 motion-safe:animate-pulse';
export function SkeletonValue() {
  return <span aria-label="Loading count" role="status" className="inline-block max-w-full"><span aria-hidden="true" className={`${shape} block h-8 w-16`} /></span>;
}

export function PageSkeleton({ variant = 'page', cards = 3, rows = 5, columns = 5, header = true, label = 'Loading page' }) {
  const table = <div className="space-y-4 rounded-xl border border-gray-200 p-4">
    {Array.from({ length: rows + (header ? 1 : 0) }, (_, row) => <div key={row} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: columns }, (_, col) => <div key={col} className={`${shape} ${header && !row ? 'h-3' : 'h-8'}`} />)}
    </div>)}
  </div>;
  const metrics = <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: cards }, (_, id) => <div key={id} className="space-y-3 rounded-xl border border-gray-200 bg-white p-5"><div className={`${shape} h-3 w-2/3`} /><div className={`${shape} h-8 w-1/3`} /></div>)}</div>;
  return <div role="status" aria-busy="true" aria-label={label} data-skeleton={variant} className="min-w-0 space-y-5 p-4 sm:p-6">
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className="space-y-5">
      {['page', 'dashboard', 'report'].includes(variant) && metrics}
      {['table', 'page', 'report'].includes(variant) && table}
      {['dashboard', 'report', 'chart'].includes(variant) && <div className={`grid gap-4 ${variant === 'dashboard' ? 'lg:grid-cols-2' : ''}`}><div className={`${shape} h-64`} />{variant === 'dashboard' && <div className={`${shape} h-64`} />}</div>}
      {variant === 'dashboard' && table}
      {variant === 'gallery' && <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: cards }, (_, id) => <div key={id} className="overflow-hidden rounded-2xl border border-gray-200"><div className={`${shape} h-44 rounded-none`} /><div className="space-y-4 p-5"><div className={`${shape} h-5 w-3/4`} /><div className={`${shape} h-3`} /><div className={`${shape} h-12`} /></div></div>)}</div>}
      {['detail', 'form', 'permanent'].includes(variant) && <div className={`grid gap-5 ${variant === 'permanent' ? 'sm:grid-cols-[9rem_1fr]' : 'md:grid-cols-2'}`}><div className={`${shape} ${variant === 'permanent' ? 'h-20' : 'h-64'}`} /><div className="space-y-5">{Array.from({ length: variant === 'permanent' ? 3 : 5 }, (_, id) => <div key={id} className={`${shape} h-6`} />)}</div></div>}
    </div>
  </div>;
}
