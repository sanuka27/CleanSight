import { verifyToken } from './verifyToken.js';
import User from '../models/User.js';
import ROLES from '../constants/roles.js';

/**
 * Admin-only middleware.
 *
 * Strategy (in order):
 *   1. If a valid Firebase Bearer token is present → verify it, look up
 *      the user in MongoDB and check for the "admin" role.
 *   2. Otherwise, fall back to a simple `x-admin-key` header matched
 *      against the ADMIN_API_KEY env variable (handy for dev / curl).
 *
 * Usage:
 *   import { adminOnly } from '../middleware/adminAuth.js';
 *   router.get('/admin/things', adminOnly, handler);
 */
export async function adminOnly(req, res, next) {
  // ── Path 1: Bearer token (Firebase) ────────────────────────────
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      // Reuse the existing Firebase token verifier
      await new Promise((resolve, reject) => {
        verifyToken(req, res, (err) => (err ? reject(err) : resolve()));
      });

      // req.user.firebaseUid is set by verifyToken
      const user = await User.findOne({ firebaseUid: req.user.firebaseUid });
      if (user && user.role === ROLES.ADMIN) {
        req.adminUser = user;
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    } catch {
      // Token invalid / expired — fall through to key check
    }
  }

  // ── Path 2: x-admin-key header (dev / curl) ───────────────────
  const adminKey = process.env.ADMIN_API_KEY;
  const headerKey = req.headers['x-admin-key'];

  if (adminKey && headerKey && headerKey === adminKey) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication required. Provide a valid Bearer token or x-admin-key.',
  });
}

export default adminOnly;
