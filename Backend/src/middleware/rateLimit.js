/**
 * Simple in-memory rate limiter per IP address.
 *
 * Usage:
 *   import { rateLimit } from '../middleware/rateLimit.js';
 *   router.post('/contact', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), handler);
 *
 * For production consider `express-rate-limit` with a Redis store.
 */

/**
 * @param {{ windowMs?: number, max?: number, message?: string }} opts
 */
export function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, message } = {}) {
  const store = new Map(); // ip → { count, resetTime }

  // Cleanup expired entries every windowMs
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetTime) store.delete(key);
    }
  }, windowMs);
  cleanup.unref?.(); // don't keep the process alive

  return (req, res, next) => {
    const ip =
      req.ip ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || now >= entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      store.set(ip, entry);
    } else {
      entry.count += 1;
    }

    // Set standard rate-limit headers
    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.set('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)));

    if (entry.count > max) {
      return res.status(429).json({
        success: false,
        message:
          message ||
          'Too many requests. Please try again later.',
      });
    }

    next();
  };
}

export default rateLimit;
