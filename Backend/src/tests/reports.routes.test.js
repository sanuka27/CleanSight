/**
 * Integration tests for /api/reports routes using Jest + Supertest.
 *
 * Strategy: Mock verifyToken middleware to inject req.user, then mock
 * all DB models and external services (ML queue, badges, SSE, notifications).
 *
 * Run with:
 *   NODE_OPTIONS=--experimental-vm-modules pnpm exec jest src/tests/reports.routes.test.js
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// ── Mock verifyToken to bypass Firebase ─────────────────────────────────────

jest.unstable_mockModule('../middleware/verifyToken.js', () => ({
  verifyToken: (req, res, next) => {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    req.user = { firebaseUid: 'reporter-uid', email: 'reporter@example.com' };
    next();
  },
  default: (req, res, next) => {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    req.user = { firebaseUid: 'reporter-uid', email: 'reporter@example.com' };
    next();
  },
}));

jest.unstable_mockModule('../middleware/rateLimit.js', () => ({
  authRateLimit:   (req, res, next) => next(),
  reportRateLimit: (req, res, next) => next(),
  meRateLimit:     (req, res, next) => next(),
}));

// ── Mock DB models ────────────────────────────────────────────────────────────

const makeReport = () => ({
  _id: { toString: () => 'report-id-123' },
  firebaseUid: 'reporter-uid',
  imageUrl: 'https://example.com/waste-photo.jpg',
  description: 'Large pile of mixed waste near the park entrance',
  location: { type: 'Point', coordinates: [72.8777, 19.076] },
  wasteType: 'general',
  urgency: 'medium',
  status: 'pending',
  imageValidationLabel: 'pending',
  aiReviewStatus: 'pending',
  wasteCategoryPredictedLabel: 'pending',
  wasteCategoryReviewStatus: 'pending',
  title: null,
  save: jest.fn().mockResolvedValue(undefined),
});

jest.unstable_mockModule('../models/Report.js', () => ({
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}));

const mockUserObj = {
  _id: 'user-mongo-id',
  firebaseUid: 'reporter-uid',
  name: 'Reporter User',
  email: 'reporter@example.com',
  role: 'citizen',
  isSuspended: false,
  reportsSubmitted: 0,
  notificationPreferences: { email: false },
  save: jest.fn().mockResolvedValue(undefined),
};

const mockUserFindOne = (returnVal) => ({
  findOne: jest.fn().mockReturnValue({
    ...returnVal,
    lean: jest.fn().mockResolvedValue(returnVal),
    select: jest.fn().mockResolvedValue(returnVal),
  }),
});

jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
  },
}));

jest.unstable_mockModule('../models/Volunteer.js', () => ({
  default: { findById: jest.fn(), updateOne: jest.fn() },
}));

jest.unstable_mockModule('../models/DeletedAccount.js', () => ({
  default: { findOne: jest.fn().mockResolvedValue(null) },
}));

// ── Mock services and infrastructure ─────────────────────────────────────────

jest.unstable_mockModule('../queues/mlQueue.js', () => ({
  enqueueMLAnalysis: jest.fn().mockResolvedValue(undefined),
  mlQueue: null,
}));

jest.unstable_mockModule('../workers/mlWorker.js', () => ({
  runMlAnalysis: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../services/badgeService.js', () => ({
  awardCitizenBadges: jest.fn().mockResolvedValue([]),
}));

jest.unstable_mockModule('../services/volunteerProgressService.js', () => ({
  recordVolunteerResolutions: jest.fn().mockResolvedValue([]),
}));

jest.unstable_mockModule('../services/notificationService.js', () => ({
  notifyStatusChange:    jest.fn().mockResolvedValue(undefined),
  notifyReportSubmitted: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../services/sseService.js', () => ({
  broadcast:  jest.fn(),
  makeEvent:  jest.fn().mockReturnValue({}),
}));

jest.unstable_mockModule('../config/logger.js', () => ({
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.unstable_mockModule('../config/sentry.js', () => ({
  default: { captureException: jest.fn() },
}));

// ── Dynamic imports ───────────────────────────────────────────────────────────

const { default: reportsRouter } = await import('../routes/reports.js');
const { default: ReportModel }   = await import('../models/Report.js');
const { default: UserModel }     = await import('../models/User.js');

// ── Minimal Express app ───────────────────────────────────────────────────────

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/reports', reportsRouter);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ success: false, message: err.message, errors: err.errors });
  });
  return app;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AUTH = { Authorization: 'Bearer valid-token' };

const VALID_BODY = {
  imageUrl:    'https://example.com/waste-photo.jpg',
  description: 'Large pile of mixed waste near the park entrance',
  location:    { lat: 19.076, lng: 72.8777 },
  wasteType:   'general',
  urgency:     'medium',
};

// ── POST /api/reports ─────────────────────────────────────────────────────────

describe('POST /api/reports', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    ReportModel.create.mockResolvedValue(makeReport());
    // The notification path in reports.js calls User.findOne(...).lean()
    // so we need a chainable mock
    UserModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockUserObj),
      select: jest.fn().mockResolvedValue(mockUserObj),
    });
    UserModel.findOneAndUpdate.mockResolvedValue({ ...mockUserObj, reportsSubmitted: 1 });
    app = buildApp();
  });

  // ── Auth ──────────────────────────────────────────────────────────────────────

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send(VALID_BODY);
    expect(res.status).toBe(401);
  });

  // ── imageUrl ───────────────────────────────────────────────────────────────────

  it('returns 400 when imageUrl is missing', async () => {
    const { imageUrl: _omit, ...body } = VALID_BODY;
    const res = await request(app).post('/api/reports').set(AUTH).send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/image url/i);
  });

  it('returns 400 when imageUrl is not a valid URL', async () => {
    const res = await request(app)
      .post('/api/reports').set(AUTH)
      .send({ ...VALID_BODY, imageUrl: 'not-a-url' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid image url/i);
  });

  it('returns 400 when imageUrl uses a non-http/https protocol', async () => {
    const res = await request(app)
      .post('/api/reports').set(AUTH)
      .send({ ...VALID_BODY, imageUrl: 'ftp://example.com/img.jpg' });
    expect(res.status).toBe(400);
  });

  // ── description ───────────────────────────────────────────────────────────────

  it('returns 400 when description is missing', async () => {
    const { description: _omit, ...body } = VALID_BODY;
    const res = await request(app).post('/api/reports').set(AUTH).send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/description/i);
  });

  it('returns 400 when description is shorter than 10 characters', async () => {
    const res = await request(app)
      .post('/api/reports').set(AUTH)
      .send({ ...VALID_BODY, description: 'Short' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/minimum 10 characters/i);
  });

  it('returns 400 when description exceeds 500 characters', async () => {
    const res = await request(app)
      .post('/api/reports').set(AUTH)
      .send({ ...VALID_BODY, description: 'X'.repeat(501) });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/500 characters/i);
  });

  // ── location ──────────────────────────────────────────────────────────────────

  it('returns 400 when location is missing', async () => {
    const { location: _omit, ...body } = VALID_BODY;
    const res = await request(app).post('/api/reports').set(AUTH).send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/location/i);
  });

  it('returns 400 when latitude is out of range (> 90)', async () => {
    const res = await request(app)
      .post('/api/reports').set(AUTH)
      .send({ ...VALID_BODY, location: { lat: 95, lng: 72 } });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/latitude/i);
  });

  it('returns 400 when latitude is out of range (< -90)', async () => {
    const res = await request(app)
      .post('/api/reports').set(AUTH)
      .send({ ...VALID_BODY, location: { lat: -95, lng: 72 } });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/latitude/i);
  });

  it('returns 400 when longitude is out of range (> 180)', async () => {
    const res = await request(app)
      .post('/api/reports').set(AUTH)
      .send({ ...VALID_BODY, location: { lat: 19, lng: 181 } });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/longitude/i);
  });

  it('returns 400 when longitude is out of range (< -180)', async () => {
    const res = await request(app)
      .post('/api/reports').set(AUTH)
      .send({ ...VALID_BODY, location: { lat: 19, lng: -181 } });
    expect(res.status).toBe(400);
  });

  // ── wasteType ─────────────────────────────────────────────────────────────────

  it('returns 400 when wasteType is not a valid value', async () => {
    const res = await request(app)
      .post('/api/reports').set(AUTH)
      .send({ ...VALID_BODY, wasteType: 'nuclear' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/waste type/i);
  });

  it('accepts all valid wasteType values', async () => {
    const validTypes = ['general', 'recyclable', 'organic', 'construction', 'hazardous'];
    for (const wasteType of validTypes) {
      ReportModel.create.mockResolvedValue(makeReport());
      const res = await request(app)
        .post('/api/reports').set(AUTH)
        .send({ ...VALID_BODY, wasteType });
      expect(res.status).toBe(201);
    }
  });

  // ── urgency ───────────────────────────────────────────────────────────────────

  it('returns 400 when urgency is not a valid level', async () => {
    const res = await request(app)
      .post('/api/reports').set(AUTH)
      .send({ ...VALID_BODY, urgency: 'extreme' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/urgency/i);
  });

  it('accepts all valid urgency levels', async () => {
    const validLevels = ['low', 'medium', 'high'];
    for (const urgency of validLevels) {
      ReportModel.create.mockResolvedValue(makeReport());
      const res = await request(app)
        .post('/api/reports').set(AUTH)
        .send({ ...VALID_BODY, urgency });
      expect(res.status).toBe(201);
    }
  });

  // ── Happy path ────────────────────────────────────────────────────────────────

  it('returns 201 with the created report on valid input', async () => {
    const res = await request(app)
      .post('/api/reports').set(AUTH)
      .send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.mlStatus).toBe('pending');
  });

  it('defaults wasteType to "general" when not provided', async () => {
    const { wasteType: _omit, ...body } = VALID_BODY;
    const res = await request(app).post('/api/reports').set(AUTH).send(body);
    expect(res.status).toBe(201);
  });

  it('defaults urgency to "medium" when not provided', async () => {
    const { urgency: _omit, ...body } = VALID_BODY;
    const res = await request(app).post('/api/reports').set(AUTH).send(body);
    expect(res.status).toBe(201);
  });
});

// ── GET /api/reports/my ───────────────────────────────────────────────────────

describe('GET /api/reports/my', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockUserObj),
      select: jest.fn().mockResolvedValue(mockUserObj),
    });
    app = buildApp();
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/reports/my');
    expect(res.status).toBe(401);
  });

  it('returns 200 with paginated results', async () => {
    ReportModel.find.mockReturnValue({
      sort:  jest.fn().mockReturnThis(),
      skip:  jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([makeReport()]),
    });
    ReportModel.countDocuments.mockResolvedValue(1);

    const res = await request(app).get('/api/reports/my').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── GET /api/reports/:id ──────────────────────────────────────────────────────

describe('GET /api/reports/:id', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    UserModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockUserObj),
      select: jest.fn().mockResolvedValue(mockUserObj),
    });
    app = buildApp();
  });

  it('returns 400 for an invalid MongoDB ObjectId', async () => {
    const res = await request(app)
      .get('/api/reports/not-a-valid-id').set(AUTH);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid report id/i);
  });

  it('returns 404 when the report is not found', async () => {
    ReportModel.findById.mockResolvedValue(null);
    const res = await request(app)
      .get('/api/reports/507f1f77bcf86cd799439011').set(AUTH);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('returns 200 with the report when found', async () => {
    ReportModel.findById.mockResolvedValue(makeReport());
    const res = await request(app)
      .get('/api/reports/507f1f77bcf86cd799439011').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
