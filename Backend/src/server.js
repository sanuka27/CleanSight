import express from 'express';
import cors from 'cors';
import { securityHeaders, additionalSecurityHeaders } from './middleware/securityHeaders.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import './config/firebaseAdmin.js'; // Initialize Firebase Admin
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { rateLimitRedisClient } from './middleware/rateLimit.js';

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
import { startMlWorker, closeMlWorker } from './workers/mlWorker.js';
import { startHeartbeat, stopHeartbeat } from './services/sseService.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────────────────────────────
// CORS Configuration
// Support a comma-separated list of allowed origins via CLIENT_URL so
// multiple frontends (e.g. staging + production) can be served without
// a code change.
// ─────────────────────────────────────────────────────────────────────
const rawOrigins = process.env.CLIENT_URL || 'http://localhost:8080';
let allowedOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
// Guard: if CLIENT_URL is blank/whitespace-only, fall back to the dev default
// so CORS doesn't silently block every cross-origin request.
if (allowedOrigins.length === 0) allowedOrigins = ['http://localhost:8080'];

const corsOptions = {
  origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
};

// ─────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────
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

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// ─────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────────────
// 404 handler for undefined routes
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────
// Server Startup
// ─────────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();

    // Start the BullMQ ML worker (no-op if Redis is not configured)
    startMlWorker();

    // Start SSE heartbeat (keeps proxy connections alive every 30 s)
    startHeartbeat();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:8080'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown — drain in-flight BullMQ jobs before exit
async function shutdown(signal) {
  console.log(`\n[server] ${signal} received — shutting down gracefully...`);
  stopHeartbeat();
  await closeMlWorker();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // In production, you might want to exit gracefully
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

startServer();

export default app;
