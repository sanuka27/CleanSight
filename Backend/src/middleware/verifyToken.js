import { firebaseAdmin } from '../config/firebaseAdmin.js';
import User from '../models/User.js';
import DeletedAccount from '../models/DeletedAccount.js';

// ── Short-lived user-profile cache (Fix 7) ───────────────────────────────────
// Caches the MongoDB user document keyed by firebaseUid for TTL_MS milliseconds.
// This eliminates the per-request DB round-trip on every authenticated API call.
//
// Eviction policy: simple TTL — entries are removed after TTL_MS regardless of
// access pattern. Suspended / deleted users are never cached so bans take effect
// immediately on the next Firebase token check.
//
// TODO (production): replace with a Redis cache (e.g. ioredis) to share state
// across worker processes and server instances.

const USER_CACHE = new Map(); // firebaseUid → { user, expiresAt }
const TTL_MS = 60 * 1000;    // 60 seconds

function getCachedUser(firebaseUid) {
  const entry = USER_CACHE.get(firebaseUid);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    USER_CACHE.delete(firebaseUid);
    return null;
  }
  return entry.user;
}

function setCachedUser(firebaseUid, user) {
  USER_CACHE.set(firebaseUid, { user, expiresAt: Date.now() + TTL_MS });
}

function invalidateCachedUser(firebaseUid) {
  USER_CACHE.delete(firebaseUid);
}

// Periodically sweep expired entries so the Map doesn't grow unbounded.
const _sweepInterval = setInterval(() => {
  const now = Date.now();
  for (const [uid, entry] of USER_CACHE) {
    if (now > entry.expiresAt) USER_CACHE.delete(uid);
  }
}, TTL_MS * 2);
_sweepInterval.unref?.();

// ─────────────────────────────────────────────────────────────────────────────

export const verifyToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided. Please authenticate.' 
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format.' 
      });
    }

    // Verify Firebase ID token (check revocation to detect deleted/disabled users)
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token, true);
    const { uid } = decodedToken;

    // ── Cache-first DB lookup ────────────────────────────────────────────────
    let dbUser = getCachedUser(uid);

    if (!dbUser) {
      // Cache miss — hit the database
      try {
        dbUser = await User.findOne({ firebaseUid: uid }).lean();
      } catch (dbErr) {
        console.error('Database lookup error in verifyToken:', dbErr);
        return res.status(500).json({
          success: false,
          message: 'Service temporarily unavailable. Please try again.',
        });
      }

      if (!dbUser) {
        // Check if the account was deleted before returning 404-style errors
        const deletedAccount = await DeletedAccount.findOne({ firebaseUid: uid }).lean();
        if (deletedAccount) {
          return res.status(410).json({
            success: false,
            message: 'Account removed',
            deleted: true,
            deletedReason: deletedAccount.reason,
            deletedAt: deletedAccount.deletedAt,
          });
        }
        // User not in DB yet (e.g. pre-registration) — don't cache
      } else if (dbUser.isSuspended) {
        // Never cache suspended users so bans are effective immediately
        invalidateCachedUser(uid);
      } else {
        // Cache healthy user profiles
        setCachedUser(uid, dbUser);
      }
    }

    // If user exists and is suspended, block access
    if (dbUser && dbUser.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Account suspended',
        suspended: true,
        suspendedReason: dbUser.suspendedReason || null,
      });
    }

    // Attach user info to request — prefer DB fields but always ensure
    // firebaseUid and email are present (DB user may not exist yet for /register)
    req.user = dbUser
      ? { ...dbUser, firebaseUid: uid, email: decodedToken.email || dbUser.email }
      : { firebaseUid: uid, email: decodedToken.email };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired. Please log in again.' 
      });
    }

    if (error.code === 'auth/user-not-found' || error.code === 'auth/user-disabled') {
      return res.status(401).json({
        success: false,
        message: 'User account is no longer available. Please log in again.',
      });
    }
    
    return res.status(401).json({ 
      success: false,
      message: 'Invalid or expired token.' 
    });
  }
};

export default verifyToken;
