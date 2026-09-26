import { Navigate, Outlet } from 'react-router-dom';
import { useAdminSession } from './useAdminSession';
import { hasRole } from './roles';

// Frontend guards are UX-only; Laravel must enforce real authorization later.
export default function RequireRole({ allowedRoles }) {
  const { isAuthenticated, role } = useAdminSession();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!hasRole(role, allowedRoles)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
