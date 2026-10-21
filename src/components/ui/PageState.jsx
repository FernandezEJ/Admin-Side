import { Inbox, CircleAlert } from 'lucide-react';

export function EmptyState({ title = 'No records found', description = 'Try changing your search or filters.' }) {
  return <div role="status" className="px-4 py-10 text-center">
    <Inbox size={28} className="mx-auto mb-3 text-gray-400" />
    <p className="font-semibold text-gray-700">{title}</p>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
  </div>;
}

export function ErrorState({ title = 'Unable to display this page', description = 'Please try again.', onRetry }) {
  return <div role="alert" className="rounded-xl border border-danger-border bg-white p-6">
    <CircleAlert size={24} className="mb-3 text-danger" />
    <h2 className="font-bold text-gray-800">{title}</h2>
    <p className="mt-2 text-sm text-gray-600">{description}</p>
    {onRetry && <button type="button" onClick={onRetry} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Try again</button>}
  </div>;
}

// Ready for future asynchronous data; mock pages do not simulate loading.
export function PageSkeleton() {
  return <div role="status" aria-label="Loading page" className="space-y-4 p-6">
    <span className="sr-only">Loading page</span>
    <div aria-hidden="true" className="h-6 w-1/3 rounded bg-gray-200 motion-safe:animate-pulse" />
    <div aria-hidden="true" className="grid gap-4 sm:grid-cols-3">
      {[1, 2, 3].map((id) => <div key={id} className="h-24 rounded-xl bg-gray-100 motion-safe:animate-pulse" />)}
    </div>
  </div>;
}
