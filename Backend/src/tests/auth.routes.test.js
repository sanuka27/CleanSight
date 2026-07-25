/**
 * Integration tests for /api/auth routes using Jest + Supertest.
 *
 * Strategy: Mock the verifyToken middleware directly so no Firebase
 * project or MongoDB is needed. This gives us full control over the
 * simulated user context injected into req.user.
 *
 * Run with:
 *   NODE_OPTIONS=--experimental-vm-modules pnpm exec jest src/tests/auth.routes.test.js
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// ── Mock verifyToken to inject a test user directly ──────────────────────────

jest.unstable_mockModule('../middleware/verifyToken.js', () => ({
  verifyToken: (req, res, next) => {
    req.user = { firebaseUid: 'test-uid', email: 'test@example.com' };
    next();
  },
  default: (req, res, next) => {
    req.user = { firebaseUid: 'test-uid', email: 'test@example.com' };
    next();
  },
}));

jest.unstable_mockModule('../middleware/rateLimit.js', () => ({
  authRateLimit: (req, res, next) => next(),
  meRateLimit:   (req, res, next) => next(),
}));

jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/DeletedAccount.js', () => ({
  default: { findOne: jest.fn().mockResolvedValue(null) },
}));

jest.unstable_mockModule('../config/logger.js', () => ({
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.unstable_mockModule('../config/sentry.js', () => ({
  default: { captureException: jest.fn() },
}));

// ── Dynamic imports (after all mocks declared) ────────────────────────────────

const { default: authRouter } = await import('../routes/auth.js');
const { default: UserModel }  = await import('../models/User.js');

// ── Minimal Express app ───────────────────────────────────────────────────────

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  // Minimal error handler so 500s surface the actual message
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  });
  return app;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_TOKEN = 'Bearer valid-test-token';

// ── POST /api/auth/register tests ─────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockResolvedValue(null);
    UserModel.create.mockResolvedValue({
      _id: 'mongo-id',
      firebaseUid: 'test-uid',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'citizen',
      createdAt: new Date(),
    });
    app = buildApp();
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', VALID_TOKEN)
      .send({ email: 'test@example.com', role: 'citizen' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/name/i);
  });

  it('returns 400 when name is too short (< 2 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', VALID_TOKEN)
      .send({ name: 'A', email: 'test@example.com', role: 'citizen' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name/i);
  });

  it('returns 400 when name is too long (> 50 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', VALID_TOKEN)
      .send({ name: 'A'.repeat(51), email: 'test@example.com', role: 'citizen' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', VALID_TOKEN)
      .send({ name: 'John Doe', role: 'citizen' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', VALID_TOKEN)
      .send({ name: 'John Doe', email: 'not-an-email', role: 'citizen' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it('returns 400 when role is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', VALID_TOKEN)
      .send({ name: 'John Doe', email: 'john@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/role/i);
  });

  it('returns 400 when role is "admin" (not self-assignable)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', VALID_TOKEN)
      .send({ name: 'John Doe', email: 'john@example.com', role: 'admin' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid role/i);
  });

  it('returns 400 when role is "staff" (not self-assignable)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', VALID_TOKEN)
      .send({ name: 'John Doe', email: 'john@example.com', role: 'staff' });

    expect(res.status).toBe(400);
  });

  it('returns 200 when user is already registered', async () => {
    UserModel.findOne.mockResolvedValue({
      _id: 'existing-id',
      firebaseUid: 'test-uid',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'citizen',
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', VALID_TOKEN)
      .send({ name: 'John Doe', email: 'john@example.com', role: 'citizen' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it('returns 201 on successful new registration with "citizen" role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', VALID_TOKEN)
      .send({ name: 'John Doe', email: 'john@example.com', role: 'citizen' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('citizen');
  });

  it('returns 201 on successful registration with "volunteer" role', async () => {
    UserModel.create.mockResolvedValue({
      _id: 'mongo-id',
      firebaseUid: 'test-uid',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'volunteer',
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', VALID_TOKEN)
      .send({ name: 'Jane Doe', email: 'jane@example.com', role: 'volunteer' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('volunteer');
  });
});

// ── GET /api/auth/me tests ────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  it('returns 404 when user does not have a DB profile', async () => {
    UserModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', VALID_TOKEN);

    expect(res.status).toBe(404);
    expect(res.body.needsRegistration).toBe(true);
  });

  it('returns 403 when user is suspended', async () => {
    const mockUser = {
      _id: 'mongo-id',
      firebaseUid: 'test-uid',
      isSuspended: true,
      suspendedReason: 'Violation of ToS',
      save: jest.fn(),
    };
    UserModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', VALID_TOKEN);

    expect(res.status).toBe(403);
    expect(res.body.suspended).toBe(true);
  });

  it('returns 200 with user profile for a valid authenticated user', async () => {
    const mockUser = {
      _id: 'mongo-id',
      firebaseUid: 'test-uid',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'citizen',
      isSuspended: false,
      lastActiveAt: null,
      save: jest.fn().mockResolvedValue(undefined),
      reportsSubmitted: 2,
      cleanupsCompleted: 0,
      avatar: null,
      phone: null,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    UserModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', VALID_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('john@example.com');
  });
});

// ── GET /api/auth/check tests ─────────────────────────────────────────────────

describe('GET /api/auth/check', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  it('returns exists: false when user not in DB', async () => {
    UserModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app)
      .get('/api/auth/check')
      .set('Authorization', VALID_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.exists).toBe(false);
    expect(res.body.needsRegistration).toBe(true);
  });

  it('returns exists: true with role when user is found', async () => {
    UserModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'mongo-id',
        role: 'volunteer',
        isSuspended: false,
      }),
    });

    const res = await request(app)
      .get('/api/auth/check')
      .set('Authorization', VALID_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.exists).toBe(true);
    expect(res.body.role).toBe('volunteer');
  });
});
