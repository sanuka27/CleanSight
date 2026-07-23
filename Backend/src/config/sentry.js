/**
 * sentry.js
 *
 * Initialises Sentry for the CleanSight Node.js backend.
 *
 * IMPORTANT: This module must be imported FIRST in server.js — before Express,
 * routes, or any other application code — so that Sentry's auto-instrumentation
 * can wrap all async operations from the start.
 *
 * CONFIGURATION (env vars)
 * ────────────────────────
 *   SENTRY_DSN                 — Sentry project DSN. Leave blank to disable.
 *   SENTRY_TRACES_SAMPLE_RATE  — Fraction of transactions to trace (default 0.1 in prod)
 *   APP_VERSION                — Optional release/version tag (e.g. "1.2.3")
 *
 * GRACEFUL NO-OP
 * ──────────────
 * If SENTRY_DSN is not set, Sentry.init() is skipped entirely. The application
 * continues to run normally; no exceptions are thrown.
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import logger from './logger.js';

const DSN = process.env.SENTRY_DSN;
const isProd = process.env.NODE_ENV === 'production';

// Default to 10% in production, 100% in dev/staging for full visibility
const tracesSampleRate = parseFloat(
  process.env.SENTRY_TRACES_SAMPLE_RATE ?? (isProd ? '0.1' : '1.0')
);

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || undefined,

    integrations: [
      // Performance profiling (CPU profiling of Node.js operations)
      nodeProfilingIntegration(),
    ],

    // Capture performance traces for a sample of requests
    tracesSampleRate,

    // CPU profiling sample rate (relative to tracesSampleRate)
    profilesSampleRate: 1.0,

    // Attach the call stack to captured messages for better debugging
    attachStacktrace: true,

    // Do not send personally identifiable information
    sendDefaultPii: false,

    // Ignore health-check errors to reduce noise
    ignoreErrors: [
      'Not found',
      'Route /api/health not found',
    ],

    beforeSend(event) {
      // In development, log captured events to console for immediate visibility
      if (!isProd && event.exception) {
        logger.debug('[sentry] Captured exception (dev mode, not sent to Sentry)', {
          eventId: event.event_id,
          message: event.exception?.values?.[0]?.value,
        });
      }
      return event;
    },
  });

  logger.info('[sentry] Backend Sentry initialised', {
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate,
    release: process.env.APP_VERSION || 'unset',
  });
} else {
  logger.warn(
    '[sentry] SENTRY_DSN not set — Sentry is disabled. ' +
    'Set SENTRY_DSN in .env to enable error tracking.'
  );
}

export default Sentry;
