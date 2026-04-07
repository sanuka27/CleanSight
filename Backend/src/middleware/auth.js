/**
 * @deprecated This file is deprecated. Use verifyToken.js for Firebase authentication
 * and requireRole middleware for authorization.
 * 
 * This file remains for backward compatibility during migration.
 * All routes should migrate to Firebase-based authentication.
 */

import { verifyToken } from './verifyToken.js';
import User from '../models/User.js';
import { ROLES } from '../constants/roles.js';

/**
 * @deprecated Use verifyToken middleware instead
 * This is a compatibility wrapper that delegates to Firebase auth
 */
export const protect = verifyToken;

/**
 * Authorization middleware - requires verifyToken to run first
 * @param {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      // Get user from DB if not already attached
      if (!req.user?.role) {
        const user = await User.findOne({ firebaseUid: req.user.firebaseUid });
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User profile not found. Please complete registration.'
          });
        }
        req.user = { ...req.user, ...user.toObject() };
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Role '${req.user.role}' is not authorized to access this route`
        });
      }
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

/**
 * Convenience role guards that can be used after verifyToken
 */
export const requireRole = authorize;
export const requireVolunteer = authorize(ROLES.VOLUNTEER, ROLES.STAFF, ROLES.ADMIN);
export const requireStaff = authorize(ROLES.STAFF, ROLES.ADMIN);
export const requireAdmin = authorize(ROLES.ADMIN);
