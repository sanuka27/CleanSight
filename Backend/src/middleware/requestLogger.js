/**
 * requestLogger.js
 *
 * Express middleware that logs every incoming HTTP request through Winston.
 *
 * FORMAT (one line per request)
 * ─────────────────────────────
 *   timestamp [http] METHOD /path → STATUS in XXms  ip=x.x.x.x
 *
 * SKIP RULES
 * ──────────
 *   • /api/health  — High-frequency liveness probes generate extreme noise.
 *                    Skip them so that meaningful events are not buried.
 *
 * LEVEL
 * ─────
 *   http — sits between info (2) and verbose (4), so it is only emitted when
 *   LOG_LEVEL=http or lower (debug). In production (LOG_LEVEL=info) HTTP logs
 *   are suppressed on the console but still captured in the combined file log.
 *
 * USAGE
 * ─────
 *   import requestLogger from './middleware/requestLogger.js';
 *   app.use(requestLogger);
 */

import logger from '../config/logger.js';

/** Paths to exclude from HTTP request logging */
const SKIP_PATHS = new Set(['/api/health']);

/**
 * Express middleware that logs request details after the response is sent.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const requestLogger = (req, res, next) => {
  // Skip noisy health-check pings
  if (SKIP_PATHS.has(req.path)) return next();

  const startAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1_000_000;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    // Determine log level based on HTTP status code
    const level =
      statusCode >= 500 ? 'error' :
      statusCode >= 400 ? 'warn'  :
      'http';

    logger[level](`${method} ${originalUrl} → ${statusCode}`, {
      method,
      url: originalUrl,
      status: statusCode,
      durationMs: Math.round(durationMs),
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
};

export default requestLogger;
