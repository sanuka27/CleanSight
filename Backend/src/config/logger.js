/**
 * logger.js
 *
 * Centralised Winston logger for the CleanSight backend.
 *
 * TRANSPORTS
 * ──────────
 * • Console  — pretty-printed in development, JSON lines in production
 * • File     — logs/error.log  (error level only, daily rotation)
 *              logs/combined.log (all levels, daily rotation)
 *
 * LOG LEVELS (Winston standard)
 * ─────────────────────────────
 *   0 error   — uncaught exceptions, fatal failures
 *   1 warn    — recoverable issues (Redis down, stale FCM token, etc.)
 *   2 info    — normal lifecycle events (server start, DB connected)
 *   3 http    — incoming HTTP requests (used by requestLogger middleware)
 *   4 verbose — detailed flow tracing (not used by default)
 *   5 debug   — only active when LOG_LEVEL=debug
 *
 * SENSITIVE FIELD REDACTION
 * ─────────────────────────
 * The `redact` format strips values for common sensitive keys before any
 * serialisation occurs, so credentials never appear in logs or Sentry.
 *
 * USAGE
 * ─────
 *   import logger from '../config/logger.js';
 *   logger.info('Server started', { port: 5000 });
 *   logger.error('DB connection failed', { error: err.message, stack: err.stack });
 */

import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Helpers ───────────────────────────────────────────────────────────────────

const isProd = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

/**
 * Log directory: resolved relative to the project root (two levels up from
 * src/config/) so logs land at Backend/logs/ regardless of cwd.
 */
const LOG_DIR = path.resolve(__dirname, '..', '..', 'logs');

// ── Sensitive field redaction ─────────────────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  'password', 'token', 'secret', 'privateKey', 'private_key',
  'apiKey', 'api_key', 'authorization', 'Authorization',
  'FIREBASE_PRIVATE_KEY', 'RESEND_API_KEY', 'JWT_SECRET',
]);

/**
 * Recursively redact sensitive keys in a plain object.
 * Returns a new object; never mutates the original.
 *
 * @param {unknown} obj
 * @returns {unknown}
 */
function redactSensitive(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitive);

  const out = {};
  for (const [key, val] of Object.entries(obj)) {
    out[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : redactSensitive(val);
  }
  return out;
}

const redactFormat = format((info) => {
  // Redact the whole info object (which may carry arbitrary metadata)
  const { level, message, timestamp, stack, ...rest } = info;
  const redacted = redactSensitive(rest);
  return { ...redacted, level, message, timestamp, ...(stack ? { stack } : {}) };
});

// ── Custom formats ────────────────────────────────────────────────────────────

/** Shared base format applied to every transport */
const baseFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  format.errors({ stack: true }),  // Ensure error stacks are serialised
  redactFormat(),
);

/** Human-readable format for development console */
const devConsoleFormat = format.combine(
  baseFormat,
  format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const dim   = '\x1b[2m';
    const reset = '\x1b[0m';
    
    // Manual ANSI colors for the level badge
    let color = reset;
    if (level === 'error') color = '\x1b[31m'; // red
    else if (level === 'warn') color = '\x1b[33m'; // yellow
    else if (level === 'info') color = '\x1b[32m'; // green
    else if (level === 'http') color = '\x1b[35m'; // magenta
    else if (level === 'debug') color = '\x1b[34m'; // blue

    const metaStr = Object.keys(meta).length ? ` ${dim}${JSON.stringify(meta)}${reset}` : '';
    const stackStr = stack ? `\n${dim}${stack}${reset}` : '';
    return `${dim}${timestamp}${reset} [${color}${level}${reset}] ${message}${metaStr}${stackStr}`;
  }),
);

/** Machine-readable JSON format for production and file transports */
const jsonFormat = format.combine(
  baseFormat,
  format.json(),
);

// ── File transports (daily rotation) ─────────────────────────────────────────

/** Rotate error log daily, keep 30 days, cap each file at 20 MB */
const errorFileTransport = new DailyRotateFile({
  level: 'error',
  dirname: LOG_DIR,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: jsonFormat,
});

/** Rotate combined log daily, keep 14 days, cap each file at 50 MB */
const combinedFileTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: 'combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '50m',
  maxFiles: '14d',
  format: jsonFormat,
});

errorFileTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('[logger] Error log rotated', { oldFilename, newFilename });
});

combinedFileTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('[logger] Combined log rotated', { oldFilename, newFilename });
});

// ── Logger instance ───────────────────────────────────────────────────────────

const logger = createLogger({
  level: logLevel,
  silent: process.env.NODE_ENV === 'test', // Suppress logs during automated tests
  transports: [
    // Console: pretty in dev, JSON in prod
    new transports.Console({
      format: isProd ? jsonFormat : devConsoleFormat,
    }),
    // File transports (always active — even in dev, useful for debugging)
    errorFileTransport,
    combinedFileTransport,
  ],
  // Prevent Winston from exiting on uncaught exceptions; we handle those in server.js
  exitOnError: false,
});

export default logger;
