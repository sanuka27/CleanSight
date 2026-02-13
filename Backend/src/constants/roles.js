/**
 * Shared role constants.
 */

export const ROLES = {
  CITIZEN: 'citizen',
  VOLUNTEER: 'volunteer',
  STAFF: 'staff',
  ADMIN: 'admin',
};

/** Roles that can see global analytics. */
export const ANALYTICS_GLOBAL_ROLES = [ROLES.STAFF, ROLES.ADMIN];

/** Roles that can view volunteer-level analytics. */
export const ANALYTICS_VOLUNTEER_ROLES = [ROLES.STAFF, ROLES.ADMIN];

/** All valid roles as an array. */
export const ALL_ROLES = Object.values(ROLES);

export default ROLES;
