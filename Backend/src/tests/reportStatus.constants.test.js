/**
 * Unit tests for constants/reportStatus.js — pure logic, no DB required.
 *
 * Run with:
 *   node --test src/tests/reportStatus.constants.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  REPORT_STATUS,
  STATUS_TRANSITIONS,
  ALL_STATUSES,
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
  isValidTransition,
  isTerminalStatus,
  isActiveStatus,
  getValidNextStatuses,
} from '../constants/reportStatus.js';

// ── REPORT_STATUS constants ───────────────────────────────────────────────────

describe('REPORT_STATUS constants', () => {
  it('defines all six expected status strings', () => {
    const expected = ['pending', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected'];
    for (const s of expected) {
      assert.ok(Object.values(REPORT_STATUS).includes(s), `Missing status: ${s}`);
    }
  });

  it('REPORT_STATUS.PENDING equals "pending"', () => {
    assert.equal(REPORT_STATUS.PENDING, 'pending');
  });

  it('REPORT_STATUS.RESOLVED equals "resolved"', () => {
    assert.equal(REPORT_STATUS.RESOLVED, 'resolved');
  });

  it('ALL_STATUSES contains every REPORT_STATUS value', () => {
    for (const v of Object.values(REPORT_STATUS)) {
      assert.ok(ALL_STATUSES.includes(v), `ALL_STATUSES missing: ${v}`);
    }
  });

  it('ACTIVE_STATUSES does not include resolved or rejected', () => {
    assert.ok(!ACTIVE_STATUSES.includes(REPORT_STATUS.RESOLVED));
    assert.ok(!ACTIVE_STATUSES.includes(REPORT_STATUS.REJECTED));
  });

  it('TERMINAL_STATUSES contains resolved and rejected', () => {
    assert.ok(TERMINAL_STATUSES.includes(REPORT_STATUS.RESOLVED));
    assert.ok(TERMINAL_STATUSES.includes(REPORT_STATUS.REJECTED));
  });
});

// ── isValidTransition ─────────────────────────────────────────────────────────

describe('isValidTransition', () => {
  // Valid forward transitions
  it('pending → verified is valid', () => {
    assert.ok(isValidTransition('pending', 'verified'));
  });

  it('pending → assigned is valid', () => {
    assert.ok(isValidTransition('pending', 'assigned'));
  });

  it('pending → rejected is valid', () => {
    assert.ok(isValidTransition('pending', 'rejected'));
  });

  it('verified → assigned is valid', () => {
    assert.ok(isValidTransition('verified', 'assigned'));
  });

  it('assigned → in_progress is valid', () => {
    assert.ok(isValidTransition('assigned', 'in_progress'));
  });

  it('assigned → resolved is valid', () => {
    assert.ok(isValidTransition('assigned', 'resolved'));
  });

  it('in_progress → resolved is valid', () => {
    assert.ok(isValidTransition('in_progress', 'resolved'));
  });

  it('in_progress → rejected is valid', () => {
    assert.ok(isValidTransition('in_progress', 'rejected'));
  });

  // Invalid backward/illegal transitions
  it('resolved → pending is invalid (terminal state)', () => {
    assert.ok(!isValidTransition('resolved', 'pending'));
  });

  it('rejected → pending is invalid (terminal state)', () => {
    assert.ok(!isValidTransition('rejected', 'pending'));
  });

  it('resolved → assigned is invalid', () => {
    assert.ok(!isValidTransition('resolved', 'assigned'));
  });

  it('pending → in_progress is invalid (must go through assigned first)', () => {
    assert.ok(!isValidTransition('pending', 'in_progress'));
  });

  it('pending → resolved is invalid (must go through intermediate states)', () => {
    assert.ok(!isValidTransition('pending', 'resolved'));
  });

  it('in_progress → pending is invalid (no backward transitions)', () => {
    assert.ok(!isValidTransition('in_progress', 'pending'));
  });

  // Edge cases
  it('returns false for unknown current status', () => {
    assert.ok(!isValidTransition('unknown', 'pending'));
  });

  it('returns false for unknown next status', () => {
    assert.ok(!isValidTransition('pending', 'processing'));
  });

  it('returns false for self-transition (pending → pending)', () => {
    assert.ok(!isValidTransition('pending', 'pending'));
  });

  it('returns false for null/undefined inputs', () => {
    assert.ok(!isValidTransition(null, 'pending'));
    assert.ok(!isValidTransition('pending', undefined));
    assert.ok(!isValidTransition(undefined, undefined));
  });
});

// ── isTerminalStatus ──────────────────────────────────────────────────────────

describe('isTerminalStatus', () => {
  it('returns true for "resolved"', () => {
    assert.ok(isTerminalStatus('resolved'));
  });

  it('returns true for "rejected"', () => {
    assert.ok(isTerminalStatus('rejected'));
  });

  it('returns false for "pending"', () => {
    assert.ok(!isTerminalStatus('pending'));
  });

  it('returns false for "assigned"', () => {
    assert.ok(!isTerminalStatus('assigned'));
  });

  it('returns false for unknown status', () => {
    assert.ok(!isTerminalStatus('processing'));
  });
});

// ── isActiveStatus ────────────────────────────────────────────────────────────

describe('isActiveStatus', () => {
  it('returns true for all active statuses', () => {
    for (const s of ACTIVE_STATUSES) {
      assert.ok(isActiveStatus(s), `Expected ${s} to be active`);
    }
  });

  it('returns false for "resolved"', () => {
    assert.ok(!isActiveStatus('resolved'));
  });

  it('returns false for "rejected"', () => {
    assert.ok(!isActiveStatus('rejected'));
  });

  it('returns false for unknown status', () => {
    assert.ok(!isActiveStatus('ghost'));
  });
});

// ── getValidNextStatuses ──────────────────────────────────────────────────────

describe('getValidNextStatuses', () => {
  it('returns correct next statuses for "pending"', () => {
    const nexts = getValidNextStatuses('pending');
    assert.ok(nexts.includes('verified'));
    assert.ok(nexts.includes('assigned'));
    assert.ok(nexts.includes('rejected'));
    assert.ok(!nexts.includes('resolved'));
  });

  it('returns empty array for "resolved" (terminal)', () => {
    assert.deepEqual(getValidNextStatuses('resolved'), []);
  });

  it('returns empty array for "rejected" (terminal)', () => {
    assert.deepEqual(getValidNextStatuses('rejected'), []);
  });

  it('returns empty array for unknown status', () => {
    assert.deepEqual(getValidNextStatuses('ghost'), []);
  });

  it('STATUS_TRANSITIONS covers every REPORT_STATUS key', () => {
    for (const status of Object.values(REPORT_STATUS)) {
      assert.ok(
        status in STATUS_TRANSITIONS,
        `STATUS_TRANSITIONS missing key: ${status}`
      );
    }
  });
});
