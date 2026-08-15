// ─────────────────────────────────────────────────────────────────────────────
// CleanSight API Server
// IMPORTANT: Sentry MUST be initialised before any other imports so that its
// auto-instrumentation can wrap all async operations from the very start.
// ─────────────────────────────────────────────────────────────────────────────
import './config/sentry.js';
import * as Sentry from '@sentry/node';

import express from 'express';
import cors from 'cors';
import { securityHeaders, additionalSecurityHeaders } from './middleware/securityHeaders.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import './config/firebaseAdmin.js'; // Initialize Firebase Admin
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { rateLimitRedisClient } from './middleware/rateLimit.js';
import requestLogger from './middleware/requestLogger.js';
import logger from './config/logger.js';

// Import routes
import authRoutes from './routes/auth.js';
import reportRoutes from './routes/reports.js';
import volunteerRoutes from './routes/volunteers.js';
import analyticsRoutes from './routes/analytics.js';
import dashboardRoutes from './routes/dashboard.js';
import contactRoutes from './routes/contact.js';
import contactAdminRoutes from './routes/contactAdmin.js';
import adminRoutes from './routes/admin.js';
import mlAnalyticsRoutes from './routes/mlAnalytics.js';
import notificationRoutes from './routes/notifications.js';
import publicRoutes from './routes/public.js';
import { swaggerServe, swaggerSetup, swaggerSpec } from './config/swagger.js';
import { startMlWorker, closeMlWorker } from './workers/mlWorker.js';
import { startHeartbeat, stopHeartbeat } from './services/sseService.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────────────────────────────────────
// CORS Configuration
// Support a comma-separated list of allowed origins via CLIENT_URL so
// multiple frontends (e.g. staging + production) can be served without
// a code change.
// ─────────────────────────────────────────────────────────────────────────────
const defaultDevOrigins = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://clean-sight-frontend.vercel.app',
];

const rawOrigins = process.env.CLIENT_URL || '';
const configuredOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([
  ...defaultDevOrigins,
  ...configuredOrigins,
]));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server, Postman)
    if (!origin) return callback(null, true);

    // In development mode, allow any localhost/127.0.0.1 port
    if (process.env.NODE_ENV !== 'production') {
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Disallow other origins
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 204,
};

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────
// Trust the first proxy hop so that req.ip reflects the real client IP
// (needed for express-rate-limit to key on individual clients instead of
// the proxy's IP, which would put all traffic in a single rate-limit bucket).
// Set to the number of proxy hops in front of this server (typically 1 for
// a single load balancer or Nginx reverse proxy).
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

// Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
// Referrer-Policy, Permissions-Policy, COEP/COOP/CORP, and more.
// See src/middleware/securityHeaders.js for the full configuration.
app.use(securityHeaders);
app.use(additionalSecurityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sentry auto-instruments Express out of the box in v9/v10.
// No manual request handler middleware is needed.

// Structured HTTP request logging via Winston
app.use(requestLogger);

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Service health check
 *     description: |
 *       Returns the operational status of the API, MongoDB connection, and the
 *       Redis-backed rate-limit store. Returns HTTP 200 when healthy or HTTP 503
 *       when the database is unreachable.
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 message: { type: string, example: CleanSight API is running }
 *                 timestamp: { type: string, format: date-time }
 *                 environment: { type: string, example: development }
 *                 database:
 *                   type: object
 *                   properties:
 *                     connected: { type: boolean, example: true }
 *                     host: { type: string, example: cluster0.mongodb.net }
 *                 rateLimit:
 *                   type: object
 *                   properties:
 *                     store: { type: string, enum: [redis, memory] }
 *                     redisStatus: { type: string, example: ready }
 *       503:
 *         description: Database unavailable — service degraded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: degraded }
 *                 message: { type: string }
 */
app.get('/api/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  // ioredis statuses: 'ready' = connected, everything else = not usable
  const rlRedisStatus = rateLimitRedisClient?.status ?? 'disabled';
  const rlRedisReady  = rlRedisStatus === 'ready';

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    message: 'CleanSight API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: dbConnected,
      host: mongoose.connection.host || 'unknown',
    },
    rateLimit: {
      store: rlRedisReady ? 'redis' : 'memory',
      redisStatus: rlRedisStatus,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin/contact', contactAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ml-analytics', mlAnalyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/public', publicRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// API Documentation (Swagger / OpenAPI)
// Serve the interactive Swagger UI at /api/docs.
// Only enabled outside production to avoid exposing full API surface publicly.
// To enable in production, remove the NODE_ENV guard.
// ─────────────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerServe, swaggerSetup);
  // Also expose the raw OpenAPI JSON for tooling (e.g. Postman import, code-gen)
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  logger.info('API documentation available at /api/docs');
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────────────────────
// Sentry error handler — must be BEFORE custom error handlers, AFTER all routes
Sentry.setupExpressErrorHandler(app);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Central error handler (logs via Winston + captures to Sentry)
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────────────
// Server Startup
// ─────────────────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();

    // Start the BullMQ ML worker (no-op if Redis is not configured)
    startMlWorker();

    // Start SSE heartbeat (keeps proxy connections alive every 30 s)
    startHeartbeat();

    app.listen(PORT, () => {
      logger.info('CleanSight API server started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        clientUrl: process.env.CLIENT_URL || 'http://localhost:8080',
        url: `http://localhost:${PORT}`,
      });
    });
  } catch (error) {
    logger.error('Fatal: Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    Sentry.captureException(error);
    process.exit(1);
  }
};

// Graceful shutdown — drain in-flight BullMQ jobs before exit
async function shutdown(signal) {
  logger.info(`Graceful shutdown initiated`, { signal });
  stopHeartbeat();
  await closeMlWorker();
  // Flush any pending Sentry events before exiting
  await Sentry.close(2000);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection', {
    error: err?.message,
    stack: err?.stack,
  });
  Sentry.captureException(err);
  // In production, exit to allow the process manager to restart cleanly
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught synchronous exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — shutting down', {
    error: err.message,
    stack: err.stack,
  });
  Sentry.captureException(err);
  process.exit(1);
});

startServer();

export default app;
