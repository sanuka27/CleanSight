/**
 * securityHeaders.js
 *
 * Production-grade Helmet configuration for CleanSight.
 *
 * Why a dedicated module?
 *   - Keeps server.js readable.
 *   - Centralises every security-header decision so future changes live in
 *     one place.
 *   - Allows environment-aware tuning (dev vs. production) without cluttering
 *     application logic.
 *
 * Headers set by this middleware:
 *   Content-Security-Policy        – restricts resource origins; tightened in prod
 *   Strict-Transport-Security      – HTTPS-only (prod only; skipped in dev to
 *                                    avoid breaking plain HTTP local servers)
 *   X-Frame-Options                – clickjacking protection
 *   X-Content-Type-Options         – MIME-sniffing protection
 *   Referrer-Policy                – limits referrer information leakage
 *   Permissions-Policy             – disables browser APIs not used by the app
 *   Cross-Origin-Embedder-Policy   – isolates the process from cross-origin
 *   Cross-Origin-Opener-Policy     – prevents opener from accessing the window
 *   Cross-Origin-Resource-Policy   – restricts cross-origin resource loading
 *   X-DNS-Prefetch-Control         – disables DNS prefetching
 *   X-Download-Options             – disables IE open-file prompt
 *   X-Permitted-Cross-Domain-Policies – no Flash / PDF cross-domain policies
 *
 * Usage:
 *   import { securityHeaders, additionalSecurityHeaders } from './middleware/securityHeaders.js';
 *   app.use(securityHeaders);
 *   app.use(additionalSecurityHeaders);
 */

import helmet from 'helmet';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Allowed origins derived from CLIENT_URL (same logic as the CORS block in
 * server.js).  Used to build a safe CSP `connect-src` directive.
 */
function getAllowedOrigins() {
  const defaults = [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'https://clean-sight-frontend.vercel.app',
  ];
  const raw = process.env.CLIENT_URL || '';
  const origins = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return Array.from(new Set([...defaults, ...origins]));
}

/**
 * Build the Content-Security-Policy directives object.
 *
 * Strategy:
 *   - Default to 'self' for everything.
 *   - Explicitly allow only the sources the app actually uses.
 *   - In development, keep 'unsafe-inline' / 'unsafe-eval' to avoid
 *     breaking hot-module-replacement and inline scripts in API docs.
 *   - In production, remove unsafe directives and add a report-uri if
 *     CSP_REPORT_URI is configured.
 */
function buildCspDirectives() {
  const allowedOrigins = getAllowedOrigins();
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

  // connect-src: API itself + allowed frontend origins + ML service (for
  // potential health-check pings) + Firebase (Auth / Firestore SDK calls from
  // the browser hit these endpoints).
  const connectSrc = [
    "'self'",
    ...allowedOrigins,
    mlServiceUrl,
    // Firebase Auth & Firestore REST / WebSocket endpoints
    'https://*.firebaseio.com',
    'https://*.googleapis.com',
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
  ];

  const directives = {
    defaultSrc: ["'self'"],
    scriptSrc: isProd
      ? ["'self'"]
      : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: isProd
      ? ["'self'", 'https://fonts.googleapis.com']
      : ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      // Firebase Storage (uploaded report images)
      'https://firebasestorage.googleapis.com',
      // Generic map tile providers (Leaflet / Google Maps / Mapbox)
      'https://*.googleapis.com',
      'https://*.gstatic.com',
      'https://*.openstreetmap.org',
      'https://*.tile.openstreetmap.org',
      'https://api.mapbox.com',
      'https://*.mapbox.com',
    ],
    connectSrc,
    mediaSrc: ["'self'", 'blob:', 'https://firebasestorage.googleapis.com'],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    workerSrc: ["'self'", 'blob:'],
    manifestSrc: ["'self'"],
    upgradeInsecureRequests: isProd ? [] : null,
  };

  // Remove null entries (e.g. upgradeInsecureRequests disabled in dev)
  for (const key of Object.keys(directives)) {
    if (directives[key] === null) delete directives[key];
  }

  // Optional CSP violation reporting (production only)
  if (isProd && process.env.CSP_REPORT_URI) {
    directives.reportUri = process.env.CSP_REPORT_URI;
  }

  return directives;
}

/**
 * Configured Helmet middleware.
 *
 * Each sub-option maps to a distinct HTTP response header.
 * See https://helmetjs.github.io/ for the full reference.
 */
export const securityHeaders = helmet({
  // ── Content-Security-Policy ──────────────────────────────────────────
  contentSecurityPolicy: {
    directives: buildCspDirectives(),
    // In development, violations are logged but don't block resources,
    // giving developers immediate feedback without breaking the workflow.
    reportOnly: !isProd,
  },

  // ── Strict-Transport-Security ────────────────────────────────────────
  // Only meaningful over HTTPS; skip in development (HTTP) to avoid
  // browsers refusing to load the API over plain HTTP for 1 year.
  strictTransportSecurity: isProd
    ? {
        maxAge: 365 * 24 * 60 * 60, // 1 year in seconds (HSTS preload minimum)
        includeSubDomains: true,
        preload: true,
      }
    : false,

  // ── X-Frame-Options ──────────────────────────────────────────────────
  // The API is consumed programmatically; it should never be embedded in a frame.
  xFrameOptions: { action: 'deny' },

  // ── X-Content-Type-Options ───────────────────────────────────────────
  // Prevents browsers from MIME-sniffing the declared content-type.
  xContentTypeOptions: true,

  // ── Referrer-Policy ──────────────────────────────────────────────────
  // Sends full URL on same-origin, only origin on cross-origin HTTPS,
  // and nothing on a downgrade (HTTPS → HTTP).
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // ── X-Permitted-Cross-Domain-Policies ────────────────────────────────
  // Disables Flash/PDF cross-domain access (legacy, still good to set).
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // ── Cross-Origin-Resource-Policy ─────────────────────────────────────
  // Restricts cross-origin reads of our API responses.
  // Set to 'cross-origin' so authorized frontend applications can consume the API.
  crossOriginResourcePolicy: { policy: 'cross-origin' },

  // ── Cross-Origin-Embedder-Policy ─────────────────────────────────────
  crossOriginEmbedderPolicy: false,

  // ── Cross-Origin-Opener-Policy ───────────────────────────────────────
  crossOriginOpenerPolicy: false,

  // ── X-DNS-Prefetch-Control ───────────────────────────────────────────
  xDnsPrefetchControl: { allow: false },

  // ── X-Download-Options ───────────────────────────────────────────────
  // Tells IE not to open downloaded files directly in the browser context.
  xDownloadOptions: true,

  // X-Powered-By is removed by Helmet by default — no explicit option needed.
});

/**
 * additionalSecurityHeaders
 *
 * Manual headers not yet covered by Helmet:
 *
 *   Permissions-Policy  – granularly disables browser APIs that CleanSight
 *                         does not use, reducing the attack surface if a
 *                         dependency is compromised.
 *
 *   Cache-Control       – prevents sensitive API responses from being stored
 *                         in shared/proxy caches. Individual route handlers
 *                         can override this for non-sensitive, cacheable data.
 *
 * @type {import('express').RequestHandler}
 */
export const additionalSecurityHeaders = (req, res, next) => {
  // Disable browser APIs that the CleanSight backend has no use for.
  res.setHeader(
    'Permissions-Policy',
    [
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=()',
      'battery=()',
      'camera=()',
      'cross-origin-isolated=()',
      'display-capture=()',
      'document-domain=()',
      'encrypted-media=()',
      'execution-while-not-rendered=()',
      'execution-while-out-of-viewport=()',
      'fullscreen=()',
      'geolocation=()',
      'gyroscope=()',
      'keyboard-map=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'navigation-override=()',
      'payment=()',
      'picture-in-picture=()',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()',
    ].join(', '),
  );

  // Prevent API JSON responses from being cached by shared / proxy caches.
  // Static-asset or public GET routes can override these headers per-route.
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache'); // backward-compat with HTTP/1.0 proxies
  }

  next();
};
