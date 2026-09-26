export const ADMIN_ROLES = Object.freeze({
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
});

export const isSupportedRole = (role) => Object.values(ADMIN_ROLES).includes(role);

// Super Admin inherits Admin access; an empty list grants no access.
export function hasRole(role, allowedRoles = [ADMIN_ROLES.ADMIN]) {
  return isSupportedRole(role) && (
    allowedRoles.includes(role) ||
    (role === ADMIN_ROLES.SUPER_ADMIN && allowedRoles.includes(ADMIN_ROLES.ADMIN))
  );
}
