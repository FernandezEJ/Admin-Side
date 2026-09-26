import { matchesMonth } from './monthOptions';
import { recoveryDates, monthKey } from './recoveryPolicy';
import { ADMIN_ROLES } from '../auth/roles';

export const mockAdmins = [
  { id: 1, name: 'Maria Santos', email: 'maria@lifeflow.test', role: ADMIN_ROLES.ADMIN, status: 'active', created_at: '2026-08-12T02:00:00Z' },
  { id: 2, name: 'Juan Dela Cruz', email: 'juan@lifeflow.test', role: ADMIN_ROLES.ADMIN, status: 'inactive', deactivated_at: '2026-09-20T08:00:00Z', scheduled_for_deletion_at: '2026-10-20T08:00:00Z', created_at: '2026-08-20T06:30:00Z' },
  { id: 3, name: 'Ana Reyes', email: 'ana@lifeflow.test', role: ADMIN_ROLES.ADMIN, status: 'active', created_at: '2026-09-05T01:15:00Z' },
];

export const auditActions = {
  approved_verification: 'Approved donation verification',
  requested_revision: 'Requested proof revision',
  rejected_proof: 'Rejected donation proof',
  published_announcement: 'Published announcement',
  updated_reward: 'Updated reward',
  created_admin: 'Created Admin account',
  deactivated_admin: 'Deactivated Admin account',
  signed_in: 'Signed in',
};

export const mockAuditLogs = [
  { id: 8, actor_name: 'Maria Santos', actor_role: ADMIN_ROLES.ADMIN, action: 'approved_verification', module: 'Verification', target_type: 'DonationParticipation', target_id: 24, details: 'Approved donation proof for activity #24.', created_at: '2026-09-23T09:35:00Z' },
  { id: 7, actor_name: 'Ana Reyes', actor_role: ADMIN_ROLES.ADMIN, action: 'requested_revision', module: 'Verification', target_type: 'DonationParticipation', target_id: 25, details: 'Requested a clearer image of the donation certificate.', created_at: '2026-09-23T07:20:00Z' },
  { id: 6, actor_name: 'Maria Santos', actor_role: ADMIN_ROLES.ADMIN, action: 'rejected_proof', module: 'Verification', target_type: 'DonationParticipation', target_id: 22, details: 'Proof did not match the selected donation activity.', created_at: '2026-09-22T08:10:00Z' },
  { id: 5, actor_name: 'Ana Reyes', actor_role: ADMIN_ROLES.ADMIN, action: 'published_announcement', module: 'Announcements', target_type: 'Announcement', target_id: 12, details: 'Published the September community blood drive announcement.', created_at: '2026-09-22T06:10:00Z' },
  { id: 4, actor_name: 'Maria Santos', actor_role: ADMIN_ROLES.ADMIN, action: 'updated_reward', module: 'Rewards', target_type: 'Reward', target_id: 5, details: 'Updated grocery voucher availability.', created_at: '2026-09-21T03:45:00Z' },
  { id: 3, actor_name: 'Sample Admin', actor_role: ADMIN_ROLES.SUPER_ADMIN, action: 'deactivated_admin', module: 'Admin Management', target_type: 'Admin', target_id: 2, details: 'Deactivated Juan Dela Cruz after assignment ended.', created_at: '2026-09-20T08:00:00Z' },
  { id: 2, actor_name: 'Sample Admin', actor_role: ADMIN_ROLES.SUPER_ADMIN, action: 'created_admin', module: 'Admin Management', target_type: 'Admin', target_id: 3, details: 'Created an Admin account for Ana Reyes.', created_at: '2026-09-05T01:15:00Z' },
  { id: 1, actor_name: 'Sample Admin', actor_role: ADMIN_ROLES.SUPER_ADMIN, action: 'signed_in', module: 'System', target_type: 'Admin', target_id: 10, details: 'Signed in to the administration portal.', created_at: '2026-09-05T01:00:00Z' },
].map((log) => ({ ...log, action_label: auditActions[log.action] }));

export function filterAdmins(admins, search, status = '') {
  const query = search.trim().toLowerCase();
  return admins.filter((admin) => (!status || admin.status === status) && `${admin.name} ${admin.email}`.toLowerCase().includes(query));
}

// Local transitions only; replace at the API boundary when Laravel is connected.
export function saveAdmin(admins, draft, id = null) {
  const name = draft.name.trim();
  const email = draft.email.trim().toLowerCase();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a name and a valid email address.');
  }
  if (admins.some((admin) => admin.id !== id && admin.email.toLowerCase() === email)) {
    throw new Error('An Admin with this email already exists.');
  }
  if (id !== null) return admins.map((admin) => admin.id === id ? { ...admin, name, email } : admin);
  return [...admins, { id: Math.max(0, ...admins.map((admin) => admin.id)) + 1, name, email,
    role: ADMIN_ROLES.ADMIN, status: 'active', created_at: new Date().toISOString() }];
}

export function setAdminStatus(admins, id, status, timestamp = new Date().toISOString()) {
  return admins.map((admin) => admin.id === id ? { ...admin, status, deactivated_at: status === 'inactive' ? timestamp : null, scheduled_for_deletion_at: status === 'inactive' ? recoveryDates(timestamp).scheduled_for_deletion_at : null } : admin);
}

export function filterAuditLogs(logs, search, module = '', month = '') {
  const query = search.trim().toLowerCase();
  return logs.filter((log) => (!module || log.module === module) && matchesMonth(monthKey(log.created_at), month) &&
    `${log.actor_name} ${log.action_label} ${log.details}`.toLowerCase().includes(query));
}

export function formatDate(value, withTime = false) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(value));
}
