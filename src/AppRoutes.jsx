import { Routes, Route, Navigate } from 'react-router-dom';
import RequireRole from './auth/RequireRole';
import { ADMIN_ROLES } from './auth/roles';

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ChangeInitialPassword from './pages/ChangeInitialPassword';
import Dashboard from './pages/Dashboard';
import Announcements from './pages/Announcements';
import CreateAnnouncement from './pages/CreateAnnouncement';
import ViewAnnouncement from './pages/ViewAnnouncement';
import EditAnnouncement from './pages/EditAnnouncement';
import Verification from './pages/Verification';
import VerificationDetail from './pages/VerificationDetail';
import Donors from './pages/Donors';
import Rewards from './pages/Rewards';
import AddReward from './pages/AddReward';
import SystemReports from './pages/SystemReports';
import AdminManagement from './pages/AdminManagement';
import AuditLogs from './pages/AuditLogs';


export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route element={<RequireRole initialPassword />}>
        <Route path="/change-initial-password" element={<ChangeInitialPassword />} />
      </Route>
      <Route element={<RequireRole />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/announcements/create" element={<CreateAnnouncement />} />
        <Route path="/announcements/:id" element={<ViewAnnouncement />} />
        <Route path="/announcements/:id/edit" element={<EditAnnouncement />} />
        <Route path="/verification" element={<Verification />} />
        <Route path="/verification/:id" element={<VerificationDetail />} />
        <Route path="/donors" element={<Donors />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/rewards/create" element={<AddReward />} />
        <Route path="/rewards/:id/edit" element={<AddReward />} />
        <Route element={<RequireRole allowedRoles={[ADMIN_ROLES.SUPER_ADMIN]} />}>
          <Route path="/system-reports" element={<SystemReports />} />
          <Route path="/admin-management" element={<AdminManagement />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/reports" element={<Navigate to="/system-reports" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
