/**
 * rateLimit.js
 *
 * Rate limiting middleware using `express-rate-limit` backed by a Redis store
 * (`rate-limit-redis`) for horizontal scaling.
 *
 * Why Redis?
 *   The default in-memory store is per-process: a fleet of Node workers or a
 *   rolling restart will reset every counter, making rate-limits trivially easy
 *   to bypass.  A shared Redis store fixes both problems.
 *
 * Graceful degradation:
 *   If REDIS_URL / REDIS_HOST is not set, or Redis is unreachable at startup,
 *   the middleware automatically falls back to the in-memory store and logs a
 *   warning.  This keeps local dev and CI environments working without Docker.
 *
 * Pre-configured limiters (unchanged API — routes import these by name):
 *   authRateLimit    – POST /api/auth/register   (20 req / 15 min)
 *   meRateLimit      – GET  /api/auth/me          (60 req / 15 min)
 *   reportRateLimit  – POST /api/reports           (15 req / 15 min)
 *   contactRateLimit – POST /api/contact           (10 req / 15 min)
 *
 * Environment variables (see .env.example):
 *   REDIS_URL      – preferred, e.g. redis://localhost:6379
 *   REDIS_HOST     – alternative host (default: localhost)
 *   REDIS_PORT     – alternative port (default: 6379)
 *   REDIS_PASSWORD – optional auth password
 *   REDIS_TLS      – set "true" for TLS connections (e.g. Upstash)
 */

import { rateLimit as _rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import IORedis from 'ioredis';

// ── Redis client for rate limiting ────────────────────────────────────────────
// Separate from the BullMQ client: BullMQ requires maxRetriesPerRequest=null
// and enableReadyCheck=false which are incompatible with the awaited sendCommand
// calls that rate-limit-redis makes.  A standard ioredis client works perfectly.

const REDIS_URL  = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASS = process.env.REDIS_PASSWORD || undefined;
const REDIS_TLS  = process.env.REDIS_TLS === 'true';

/**
 * Shared ioredis client used by all rate-limit store instances.
 * Null when Redis is not configured — triggers in-memory fallback.
 * @type {IORedis | null}
 */
let _rateLimitRedis = null;

if (REDIS_URL || REDIS_HOST) {
  const opts = {
    lazyConnect: true,            // don't connect until .connect() is called
    retryStrategy: (times) => {
      // Back off exponentially, cap at 30 s, stop after 10 failures so we
      // don't spam logs in environments where Redis is intentionally absent.
      if (times > 10) return null; // null = stop retrying
      return Math.min(times * 200, 30_000);
    },
    ...(REDIS_PASS && { password: REDIS_PASS }),
    ...(REDIS_TLS  && { tls: {} }),
  };

  _rateLimitRedis = REDIS_URL
    ? new IORedis(REDIS_URL, opts)
    : new IORedis({ host: REDIS_HOST || 'localhost', port: REDIS_PORT, ...opts });

  _rateLimitRedis.on('connect', () =>
    console.log('[rate-limit] Redis store active ✓'),
  );
  _rateLimitRedis.on('error', (err) =>
    console.warn('[rate-limit] Redis error (falling back to in-memory):', err.message),
  );

  // Initiate the connection; errors are handled by the 'error' listener above.
  _rateLimitRedis.connect().catch(() => {
    // connect() rejection is already surfaced via the 'error' event — swallow
    // here to prevent an unhandled-rejection crash.
  });
} else {
  console.warn(
    '[rate-limit] REDIS_URL / REDIS_HOST not set — using in-memory store. ' +
    'Rate-limit counters will NOT be shared across workers. ' +
    'Set REDIS_URL=redis://localhost:6379 for production.',
  );
}

/**
 * Build a RedisStore for the given prefix, or return undefined to use the
 * default in-memory store when Redis is not available.
 *
 * @param {string} prefix  Key prefix, e.g. "rl:auth:"
 * @returns {RedisStore | undefined}
 */
function buildStore(prefix) {
  if (!_rateLimitRedis) return undefined;

  return new RedisStore({
    // rate-limit-redis wraps the sendCommand call so it works with ioredis
    sendCommand: (...args) => _rateLimitRedis.call(...args),
    prefix,
  });
}

// ── Exported client reference (used by health check in server.js) ─────────────
export const rateLimitRedisClient = _rateLimitRedis;

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create an express-rate-limit middleware instance backed by Redis (if
 * available) or the in-memory store as a fallback.
 *
 * @param {{
 *   windowMs?  : number,
 *   max?       : number,
 *   message?   : string,
 *   keyPrefix? : string,
 * }} opts
 */
export function rateLimit({
  windowMs   = 15 * 60 * 1000,
  max        = 10,
  message,
  keyPrefix  = 'rl:default:',
} = {}) {
  return _rateLimit({
    windowMs,
    max,
    standardHeaders: true,   // sets RateLimit-* headers (RFC 6585 draft-7)
    legacyHeaders:   false,  // disable deprecated X-RateLimit-* headers
    message: {
      success: false,
      message: message || 'Too many requests. Please try again later.',
    },
    store: buildStore(keyPrefix),
  });
}

// ── Named, pre-configured limiters ───────────────────────────────────────────

/** POST /api/auth/register — protect against registration floods */
export const authRateLimit = rateLimit({
  windowMs:  15 * 60 * 1000, // 15 minutes
  max:       20,
  message:   'Too many registration attempts. Please try again in 15 minutes.',
  keyPrefix: 'rl:auth:',
});

/**
 * GET /api/auth/me — called on every page load; allow generous headroom but
 * still cap hammering / credential-stuffing probes.
 */
export const meRateLimit = rateLimit({
  windowMs:  15 * 60 * 1000, // 15 minutes
  max:       60,
  message:   'Too many profile requests. Please try again later.',
  keyPrefix: 'rl:me:',
});

/**
 * POST /api/reports — each request triggers ML inference (expensive).
 * Keep lower than auth to protect the ML service.
 */
export const reportRateLimit = rateLimit({
  windowMs:  15 * 60 * 1000, // 15 minutes
  max:       15,
  message:   'Too many reports submitted. Please wait before submitting again.',
  keyPrefix: 'rl:reports:',
});

/** POST /api/contact — matches the previous 10/15 min behaviour */
export const contactRateLimit = rateLimit({
  windowMs:  15 * 60 * 1000,
  max:       10,
  message:   'Too many messages. Please wait and try again.',
  keyPrefix: 'rl:contact:',
});

export default rateLimit;
