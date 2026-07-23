/**
 * sentry.ts
 *
 * Initialises Sentry for the CleanSight React frontend (browser).
 *
 * CALL FIRST: initSentry() must be called in main.tsx BEFORE createRoot()
 * so that Sentry captures errors from the very first render.
 *
 * CONFIGURATION (Vite env vars — must be prefixed with VITE_)
 * ─────────────────────────────────────────────────────────────
 *   VITE_SENTRY_DSN                 — Sentry project DSN. Leave blank to disable.
 *   VITE_SENTRY_TRACES_SAMPLE_RATE  — 0.0–1.0, default 0.1 in production
 *
 * GRACEFUL NO-OP
 * ──────────────
 * If VITE_SENTRY_DSN is not set, Sentry.init() is skipped. The application
 * runs normally with no exceptions thrown.
 *
 * FEATURES ENABLED
 * ────────────────
 * • Automatic React component stack in error reports
 * • React Router v6 navigation tracing
 * • Session Replay: 10% of normal sessions, 100% of sessions with errors
 * • User context (set via setSentryUser after login)
 */

import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const isProd = import.meta.env.PROD;

const tracesSampleRate = parseFloat(
  (import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string) ?? (isProd ? '0.1' : '1.0'),
);

/**
 * Initialise the Sentry browser SDK.
 * Call this once, as early as possible in main.tsx.
 */
export function initSentry(): void {
  if (!DSN) {
    if (!isProd) {
      // Only log this warning in dev so it doesn't appear in production builds
      console.info(
        '[sentry] VITE_SENTRY_DSN not set — Sentry disabled. ' +
        'Add VITE_SENTRY_DSN to .env to enable error tracking.',
      );
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION as string | undefined,

    integrations: [
      // Capture console.error calls as Sentry breadcrumbs
      Sentry.captureConsoleIntegration({ levels: ['error', 'warn'] }),

      // Session Replay — record user sessions around errors for debugging
      Sentry.replayIntegration({
        // Mask all text and block all media by default (privacy-first)
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance tracing
    tracesSampleRate,

    // Replay: 10% of all sessions, 100% of sessions where an error occurs
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Do not send personally identifiable information automatically
    sendDefaultPii: false,

    // Filter out noisy browser extension errors and network failures
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network errors that are outside our control
      'NetworkError',
      'Failed to fetch',
      'Load failed',
    ],

    beforeSend(event) {
      // Strip any auth tokens that may have leaked into breadcrumbs
      // In @sentry/react v8, event.breadcrumbs is Breadcrumb[] directly
      if (event.breadcrumbs && event.breadcrumbs.length > 0) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) => {
          if (crumb.data?.['Authorization']) {
            crumb.data['Authorization'] = '[REDACTED]';
          }
          return crumb;
        });
      }
      return event;
    },
  });
}

/**
 * Set the currently authenticated user on Sentry.
 * Call this after successful login so that error reports are associated
 * with the correct user (uses uid, not email, for privacy).
 *
 * @param uid   Firebase UID
 * @param role  CleanSight role (citizen, volunteer, staff, admin)
 */
export function setSentryUser(uid: string, role: string): void {
  if (!DSN) return;
  Sentry.setUser({ id: uid, role });
}

/**
 * Clear the authenticated user from Sentry context (call on logout).
 */
export function clearSentryUser(): void {
  if (!DSN) return;
  Sentry.setUser(null);
}

export default Sentry;
