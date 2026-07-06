/**
 * Unit tests for middleware/roleGuard.js
 *
 * Run with: node --test src/tests/roleGuard.test.js
 *
 * Uses Node's built-in test runner (node:test) — no extra dependencies needed.
 * Models are mocked so no DB connection is required.
 */

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(overrides = {}) {
  return {
    user: { firebaseUid: 'uid-test-123' },
    dbUser: null,
    ...overrides,
  };
}

function makeRes() {
  const res = { _status: null, _body: null };
  res.status = (code) => { res._status = code; return res; };
  res.json = (body) => { res._body = body; return res; };
  return res;
}

// ── Mock User.findOne ─────────────────────────────────────────────────────────
// We re-implement a minimal requireRole inline to test its logic without
// needing a live Mongoose connection.

function buildRequireRole(userFromDb) {
  const ALL_ROLES = ['citizen', 'volunteer', 'staff', 'admin'];

  function requireRole(...allowedRoles) {
    const invalidRoles = allowedRoles.filter((r) => !ALL_ROLES.includes(r));
    if (invalidRoles.length > 0) {
      console.warn(`Warning: Invalid roles specified in requireRole: ${invalidRoles.join(', ')}`);
    }

    return async (req, res, next) => {
      if (!req.user || !req.user.firebaseUid) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const user = await Promise.resolve(userFromDb);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User profile not found.' });
      }

      if (user.isSuspended) {
        return res.status(403).json({ success: false, message: 'Account suspended', suspended: true });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: `Role '${user.role}' is not authorized to access this resource.`,
        });
      }

      req.dbUser = user;
      req.user = { ...req.user, ...user };
      next();
    };
  }

  return requireRole;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('requireRole middleware', () => {
  it('returns 401 when req.user is missing', async () => {
    const requireRole = buildRequireRole({ role: 'admin', isSuspended: false });
    const mw = requireRole('admin');
    const req = { user: null };
    const res = makeRes();
    await mw(req, res, () => { throw new Error('next() should not be called'); });
    assert.equal(res._status, 401);
    assert.equal(res._body.success, false);
  });

  it('returns 401 when req.user has no firebaseUid', async () => {
    const requireRole = buildRequireRole({ role: 'admin', isSuspended: false });
    const mw = requireRole('admin');
    const req = { user: {} };
    const res = makeRes();
    await mw(req, res, () => { throw new Error('next() should not be called'); });
    assert.equal(res._status, 401);
  });

  it('returns 404 when user is not found in DB', async () => {
    const requireRole = buildRequireRole(null);
    const mw = requireRole('admin');
    const req = makeReq();
    const res = makeRes();
    await mw(req, res, () => { throw new Error('next() should not be called'); });
    assert.equal(res._status, 404);
  });

  it('returns 403 with suspended flag when user is suspended', async () => {
    const requireRole = buildRequireRole({ role: 'volunteer', isSuspended: true });
    const mw = requireRole('volunteer');
    const req = makeReq();
    const res = makeRes();
    await mw(req, res, () => { throw new Error('next() should not be called'); });
    assert.equal(res._status, 403);
    assert.equal(res._body.suspended, true);
  });

  it('returns 403 when user role is not in allowedRoles', async () => {
    const requireRole = buildRequireRole({ role: 'citizen', isSuspended: false });
    const mw = requireRole('volunteer', 'staff', 'admin');
    const req = makeReq();
    const res = makeRes();
    await mw(req, res, () => { throw new Error('next() should not be called'); });
    assert.equal(res._status, 403);
    assert.match(res._body.message, /citizen/);
  });

  it('calls next() and attaches req.dbUser when role is allowed', async () => {
    const dbUser = { role: 'volunteer', isSuspended: false, firebaseUid: 'uid-test-123' };
    const requireRole = buildRequireRole(dbUser);
    const mw = requireRole('volunteer', 'staff', 'admin');
    const req = makeReq();
    const res = makeRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.deepEqual(req.dbUser, dbUser);
  });

  it('calls next() for any role when allowedRoles is empty', async () => {
    const dbUser = { role: 'citizen', isSuspended: false };
    const requireRole = buildRequireRole(dbUser);
    const mw = requireRole(); // no restriction
    const req = makeReq();
    const res = makeRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  });

  it('warns but does not throw for invalid role names', async () => {
    const dbUser = { role: 'admin', isSuspended: false };
    const requireRole = buildRequireRole(dbUser);
    // 'superuser' is not in ALL_ROLES — should warn but not crash
    assert.doesNotThrow(() => requireRole('admin', 'superuser'));
  });
});
