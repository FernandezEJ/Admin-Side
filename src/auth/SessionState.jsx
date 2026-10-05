import { ErrorState, PageSkeleton } from '../components/ui/PageState';
import { useAdminSession } from './useAdminSession';

export default function SessionState() {
  const { isLoading, sessionError, refreshSession, logout } = useAdminSession();
  if (isLoading) return <PageSkeleton />;
  return <div className="mx-auto max-w-lg p-6">
    <ErrorState title="Unable to restore your session" description={sessionError} onRetry={refreshSession} />
    <button onClick={logout} className="mt-4 text-sm font-semibold text-[#b7192e]">Return to sign in</button>
  </div>;
}
