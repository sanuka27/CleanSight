import { verifyToken } from './verifyToken.js';
import User from '../models/User.js';
import { ROLES } from '../constants/roles.js';

/**
 * Admin-only middleware.
 *
 * Strategy (in order):
 *   1. If a valid Firebase Bearer token is present → verify it, look up
 *      the user in MongoDB and check for the "admin" role.
 *   2. Otherwise, fall back to a simple `x-admin-key` header matched
 *      against the ADMIN_API_KEY env variable.
 *
 * ⚠️  SECURITY: The x-admin-key fallback is disabled entirely in production
 * (NODE_ENV === 'production'). It is retained only as a development/curl
 * convenience. Never set ADMIN_API_KEY in a production environment.
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

  // ── Path 2: x-admin-key header (dev only) ─────────────────────
  // This fallback is completely disabled in production to prevent accidental
  // API key exposure from granting admin access.
  if (process.env.NODE_ENV === 'production') {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Provide a valid Bearer token.',
    });
  }

  const adminKey = process.env.ADMIN_API_KEY;
  const headerKey = req.headers['x-admin-key'];

  if (adminKey && headerKey && headerKey === adminKey) {
    // Provide a sentinel adminUser so downstream routes can safely
    // access req.adminUser.firebaseUid for audit logging / ownership fields.
    req.adminUser = {
      firebaseUid: 'system-api-key',
      role: 'admin',
      name: 'API Key',
      email: null,
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication required. Provide a valid Bearer token or x-admin-key.',
  });
}

export default adminOnly;
