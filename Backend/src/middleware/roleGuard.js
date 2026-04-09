/**
 * Role-based Authorization Middleware
 * 
 * Provides role checking middleware for route protection.
 * Always verifies role from database, never trusts client claims.
 */

import User from '../models/User.js';
import { ROLES, ALL_ROLES } from '../constants/roles.js';

/**
 * Middleware factory that requires specific role(s) to access a route.
 * Must be used after verifyToken middleware.
 * 
 * @param {...string} allowedRoles - Roles allowed to access the route
 * @returns {Function} Express middleware
 * 
 * @example
 * // Single role
 * router.get('/admin-only', verifyToken, requireRole(ROLES.ADMIN), handler);
 * 
 * // Multiple roles
 * router.get('/staff-or-admin', verifyToken, requireRole(ROLES.STAFF, ROLES.ADMIN), handler);
 */
export function requireRole(...allowedRoles) {
  // Validate that all roles are valid
  const invalidRoles = allowedRoles.filter(r => !ALL_ROLES.includes(r));
  if (invalidRoles.length > 0) {
    console.warn(`Warning: Invalid roles specified in requireRole: ${invalidRoles.join(', ')}`);
  }

  return async (req, res, next) => {
    try {
      // Ensure verifyToken has run and attached user
      if (!req.user || !req.user.firebaseUid) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please log in.',
        });
      }

      const { firebaseUid } = req.user;

      // Always fetch fresh role from database - never trust cached role
      const user = await User.findOne({ firebaseUid }).lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found. Please complete registration.',
        });
      }

      // Check if user is suspended
      if (user.isSuspended) {
        return res.status(403).json({
          success: false,
          message: 'Account suspended',
          suspended: true,
        });
      }

      // Check role
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: `Role '${user.role}' is not authorized to access this resource.`,
        });
      }

      // Attach full user object for downstream handlers
      req.dbUser = user;
      
      // Also update req.user with DB values
      req.user = { ...req.user, ...user };

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
      });
    }
  };
}

/**
 * Convenience middleware: require volunteer role or higher
 */
export const requireVolunteer = requireRole(
  ROLES.VOLUNTEER, 
  ROLES.STAFF, 
  ROLES.ADMIN
);

/**
 * Convenience middleware: require staff role or higher
 */
export const requireStaff = requireRole(
  ROLES.STAFF, 
  ROLES.ADMIN
);

/**
 * Convenience middleware: require admin role only
 */
export const requireAdmin = requireRole(ROLES.ADMIN);

/**
 * Middleware that attaches DB user but doesn't enforce role.
 * Useful for routes that need user data but are open to all authenticated users.
 * Must be used after verifyToken middleware.
 */
export async function attachDbUser(req, res, next) {
  try {
    if (!req.user || !req.user.firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const user = await User.findOne({ firebaseUid: req.user.firebaseUid }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found. Please complete registration.',
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Account suspended',
        suspended: true,
      });
    }

    req.dbUser = user;
    req.user = { ...req.user, ...user };
    next();
  } catch (error) {
    console.error('Attach DB user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load user profile',
    });
  }
}

/**
 * Check if the authenticated user owns a resource.
 * Factory function that returns middleware.
 * 
 * @param {Function} getResourceOwnerUid - Function that extracts owner UID from request
 * @returns {Function} Express middleware
 * 
 * @example
 * router.delete('/:id', verifyToken, requireOwnership(async (req) => {
 *   const report = await Report.findById(req.params.id);
 *   return report?.firebaseUid;
 * }), deleteHandler);
 */
export function requireOwnership(getResourceOwnerUid) {
  return async (req, res, next) => {
    try {
      const ownerUid = await getResourceOwnerUid(req);
      const userUid = req.user?.firebaseUid;
      const userRole = req.dbUser?.role || req.user?.role;

      // Admin and staff can access any resource
      if ([ROLES.ADMIN, ROLES.STAFF].includes(userRole)) {
        return next();
      }

      // Check ownership
      if (!ownerUid || ownerUid !== userUid) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource.',
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
      });
    }
  };
}

export default {
  requireRole,
  requireVolunteer,
  requireStaff,
  requireAdmin,
  attachDbUser,
  requireOwnership,
};
