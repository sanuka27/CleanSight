/**
 * Role Constants
 * 
 * Defines all roles and role-related permissions in the system.
 */

export const ROLES = {
  CITIZEN: 'citizen',
  VOLUNTEER: 'volunteer',
  STAFF: 'staff',
  ADMIN: 'admin',
};

/** All valid roles as an array. */
export const ALL_ROLES = Object.values(ROLES);

/** Roles that users can self-assign during registration. */
export const SELF_ASSIGNABLE_ROLES = [ROLES.CITIZEN, ROLES.VOLUNTEER];

/** Roles that can only be assigned by admins. */
export const ADMIN_ASSIGNED_ROLES = [ROLES.STAFF, ROLES.ADMIN];

/** Roles that can see global analytics. */
export const ANALYTICS_GLOBAL_ROLES = [ROLES.STAFF, ROLES.ADMIN];

/** Roles that can view volunteer-level analytics. */
export const ANALYTICS_VOLUNTEER_ROLES = [ROLES.STAFF, ROLES.ADMIN];

/** Roles that can manage reports (assign, update status, etc.). */
export const REPORT_MANAGEMENT_ROLES = [ROLES.STAFF, ROLES.ADMIN];

/** Roles that can manage users. */
export const USER_MANAGEMENT_ROLES = [ROLES.ADMIN];

/** Role hierarchy for permission checks (higher index = more permissions). */
export const ROLE_HIERARCHY = {
  [ROLES.CITIZEN]: 0,
  [ROLES.VOLUNTEER]: 1,
  [ROLES.STAFF]: 2,
  [ROLES.ADMIN]: 3,
};

/**
 * Check if a role has at least the given permission level.
 * @param {string} userRole - The user's role
 * @param {string} requiredRole - The minimum required role
 * @returns {boolean}
 */
export function hasMinimumRole(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

/**
 * Check if a role can manage another role (for admin operations).
 * A role can only manage roles lower in the hierarchy.
 * @param {string} managerRole - The managing user's role
 * @param {string} targetRole - The target user's role
 * @returns {boolean}
 */
export function canManageRole(managerRole, targetRole) {
  // Only admins can manage roles
  if (managerRole !== ROLES.ADMIN) return false;
  // Can manage all roles except other admins
  return targetRole !== ROLES.ADMIN;
}

export default ROLES;
