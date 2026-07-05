/**
 * Rate limiting middleware using `express-rate-limit`.
 *
 * Pre-configured limiters for each endpoint group:
 *   - authRateLimit    – POST /api/auth/register  (20 req / 15 min)
 *   - meRateLimit      – GET  /api/auth/me         (60 req / 15 min)
 *   - reportRateLimit  – POST /api/reports          (15 req / 15 min)
 *   - contactRateLimit – POST /api/contact          (10 req / 15 min)
 *
 * TODO (production): replace the default in-memory store with a Redis-backed
 * store via `rate-limit-redis` so limits survive process restarts and are
 * shared across multiple server instances / workers.
 *
 * Example (when Redis is available):
 *   import RedisStore from 'rate-limit-redis';
 *   import { createClient } from 'redis';
 *   const redisClient = createClient({ url: process.env.REDIS_URL });
 *   await redisClient.connect();
 *   store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }),
 */

import { rateLimit as _rateLimit } from 'express-rate-limit';

/**
 * Factory that creates an express-rate-limit middleware instance.
 * @param {{ windowMs?: number, max?: number, message?: string }} opts
 */
export function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, message } = {}) {
  return _rateLimit({
    windowMs,
    max,
    standardHeaders: true,   // sets RateLimit-* headers (RFC 6585)
    legacyHeaders: false,     // disable deprecated X-RateLimit-* headers
    message: {
      success: false,
      message: message || 'Too many requests. Please try again later.',
    },
    // Default in-memory store — swap for RedisStore in production (see above)
  });
}

// ── Named, pre-configured limiters ──────────────────────────────────────────

/** POST /api/auth/register — protect against registration floods */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many registration attempts. Please try again in 15 minutes.',
});

/**
 * GET /api/auth/me — called on every page load; allow generous headroom but
 * still cap hammering / credential-stuffing probes.
 */
export const meRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  message: 'Too many profile requests. Please try again later.',
});

/**
 * POST /api/reports — each request triggers ML inference (expensive).
 * Keep lower than auth to protect the ML service.
 */
export const reportRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: 'Too many reports submitted. Please wait before submitting again.',
});

/** POST /api/contact — matches the previous 10/15 min behaviour */
export const contactRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many messages. Please wait and try again.',
});

export default rateLimit;
