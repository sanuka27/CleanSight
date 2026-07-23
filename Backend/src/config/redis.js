/**
 * Redis Connection Factory
 *
 * BullMQ requires a *separate* ioredis instance for each of:
 *   Queue, Worker, QueueEvents, QueueScheduler
 * so we export a factory function rather than a singleton.
 *
 * If REDIS_URL (or REDIS_HOST) is not set, the factory returns null.
 * Callers should treat null as "Redis unavailable — use fallback".
 *
 * Configuration (see .env.example):
 *   REDIS_URL=redis://localhost:6379        (preferred)
 *   REDIS_HOST=localhost                    (alternative)
 *   REDIS_PORT=6379
 *   REDIS_PASSWORD=                         (optional)
 *   REDIS_TLS=false                         (set true for TLS, e.g. Upstash)
 */

import IORedis from 'ioredis';
import logger from './logger.js';

const REDIS_URL  = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASS = process.env.REDIS_PASSWORD || undefined;
const REDIS_TLS  = process.env.REDIS_TLS === 'true';

let _warned = false;

/**
 * Create a new ioredis connection for use with BullMQ.
 * Returns null when Redis is not configured so callers can fall back gracefully.
 *
 * @returns {IORedis | null}
 */
export function createRedisConnection() {
  if (!REDIS_URL && !process.env.REDIS_HOST) {
    if (!_warned) {
      logger.warn(
        '[redis] REDIS_URL / REDIS_HOST not set — job queue disabled. ' +
        'ML inference will fall back to setImmediate. ' +
        'Set REDIS_URL=redis://localhost:6379 and run Redis to enable the queue.'
      );
      _warned = true;
    }
    return null;
  }

  const options = {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,    // Required by BullMQ
    ...(REDIS_PASS && { password: REDIS_PASS }),
    ...(REDIS_TLS  && { tls: {} }),
  };

  const connection = REDIS_URL
    ? new IORedis(REDIS_URL, options)
    : new IORedis({ host: REDIS_HOST, port: REDIS_PORT, ...options });

  connection.on('error', (err) => {
    // Log but don't crash — BullMQ handles reconnection internally.
    logger.error('[redis] Connection error', { error: err.message });
  });

  connection.on('connect', () => {
    logger.info('[redis] Connected ✓');
  });

  return connection;
}
