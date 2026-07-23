/**
 * @deprecated  ARCH-002 — Scheduled for removal.
 *
 * STATUS: Retained only for backward compatibility. No route file currently
 * imports from this module (verified 2026-07-06). Safe to delete once the
 * tracking ticket is closed.
 *
 * MIGRATION GUIDE
 * ───────────────
 * Replace any import from this file with the canonical alternatives:
 *
 *   Authentication (was `protect`):
 *     import { verifyToken } from './verifyToken.js';
 *
 *   Authorization (was `requireRole` / `authorize`):
 *     import { requireRole } from './roleGuard.js';
 *
 *   Convenience guards (was `requireVolunteer` / `requireStaff` / `requireAdmin`):
 *     import { requireVolunteer, requireStaff, requireAdmin } from './roleGuard.js';
 *
 * WHY roleGuard.js IS SUPERIOR
 * ─────────────────────────────
 * • Always fetches the role fresh from the database (no stale token claims)
 * • Checks `isSuspended` flag before allowing access
 * • Validates role names against the `ALL_ROLES` enum at middleware-factory time
 * • Attaches `req.dbUser` for downstream handlers to consume without a second DB call
 *
 * REMOVAL TIMELINE
 * ─────────────────
 * This file should be deleted in the next major release once ARCH-002 is closed.
 * Before deleting: grep the entire codebase for `from.*middleware/auth` to confirm
 * no remaining consumers.
 */

import { verifyToken } from './verifyToken.js';
import User from '../models/User.js';
import { ROLES } from '../constants/roles.js';
import logger from '../config/logger.js';

/** @deprecated Use {@link verifyToken} from `./verifyToken.js` instead. */
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
      logger.error('[auth] Authorization check failed', {
        error: error.message,
        stack: error.stack,
        firebaseUid: req.user?.firebaseUid,
      });
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
