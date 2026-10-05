import { Navigate, Outlet } from 'react-router-dom';
import { useAdminSession } from './useAdminSession';
import { hasRole } from './roles';
import SessionState from './SessionState';

// These guards provide UX; Laravel separately enforces API authorization.
export default function RequireRole({ allowedRoles, initialPassword = false }) {
  const { isAuthenticated, role, isLoading, sessionError, mustChangePassword } = useAdminSession();
  if (isLoading || sessionError) return <SessionState />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (mustChangePassword && !initialPassword) return <Navigate to="/change-initial-password" replace />;
  if (!mustChangePassword && initialPassword) return <Navigate to="/dashboard" replace />;
  if (!hasRole(role, allowedRoles)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
