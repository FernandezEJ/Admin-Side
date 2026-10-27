import {
  LayoutDashboard, Megaphone, BadgeCheck, Users, Gift,
  FileText, UserRoundCog, History, BookOpen,
} from 'lucide-react';
import { ADMIN_ROLES } from '../../auth/roles';

// Super Admin inherits the normal Admin entries through the shared role helper.
export const navigationItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, allowedRoles: [ADMIN_ROLES.ADMIN] },
  { name: 'Announcements', path: '/announcements', icon: Megaphone, allowedRoles: [ADMIN_ROLES.ADMIN] },
  { name: 'Educational Content', path: '/educational-content', icon: BookOpen, allowedRoles: [ADMIN_ROLES.ADMIN] },
  { name: 'Verification', path: '/verification', icon: BadgeCheck, allowedRoles: [ADMIN_ROLES.ADMIN] },
  { name: 'Donors', path: '/donors', icon: Users, allowedRoles: [ADMIN_ROLES.ADMIN] },
  { name: 'Rewards', path: '/rewards', icon: Gift, allowedRoles: [ADMIN_ROLES.ADMIN] },
  { name: 'System Reports', path: '/system-reports', icon: FileText, allowedRoles: [ADMIN_ROLES.SUPER_ADMIN] },
  { name: 'Admin Management', path: '/admin-management', icon: UserRoundCog, allowedRoles: [ADMIN_ROLES.SUPER_ADMIN] },
  { name: 'Audit Logs', path: '/audit-logs', icon: History, allowedRoles: [ADMIN_ROLES.SUPER_ADMIN] },
].map((item) => ({ ...item, section: item.allowedRoles.includes(ADMIN_ROLES.SUPER_ADMIN) ? 'SYSTEM' : 'MAIN MENU' }));
