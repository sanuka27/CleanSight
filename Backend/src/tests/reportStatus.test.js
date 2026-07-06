/**
 * Unit tests for constants/reportStatus.js
 *
 * Run with: node --test src/tests/reportStatus.test.js
 *
 * Pure logic tests — no DB or network needed.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  REPORT_STATUS,
  STATUS_TRANSITIONS,
  isValidTransition,
  isTerminalStatus,
  isActiveStatus,
  getValidNextStatuses,
  ALL_STATUSES,
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
} from '../constants/reportStatus.js';

describe('REPORT_STATUS constants', () => {
  it('defines the 6 canonical statuses', () => {
    const expected = ['pending', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected'];
    assert.deepEqual(Object.values(REPORT_STATUS).sort(), expected.sort());
  });

  it('ALL_STATUSES contains all 6 statuses', () => {
    assert.equal(ALL_STATUSES.length, 6);
    Object.values(REPORT_STATUS).forEach((s) => {
      assert.ok(ALL_STATUSES.includes(s), `ALL_STATUSES missing: ${s}`);
    });
  });

  it('TERMINAL_STATUSES contains resolved and rejected', () => {
    assert.ok(TERMINAL_STATUSES.includes('resolved'));
    assert.ok(TERMINAL_STATUSES.includes('rejected'));
    assert.equal(TERMINAL_STATUSES.length, 2);
  });

  it('ACTIVE_STATUSES contains the 4 non-terminal statuses', () => {
    assert.equal(ACTIVE_STATUSES.length, 4);
    assert.ok(!ACTIVE_STATUSES.includes('resolved'));
    assert.ok(!ACTIVE_STATUSES.includes('rejected'));
  });
});

describe('isValidTransition', () => {
  it('allows pending → verified', () => {
    assert.equal(isValidTransition('pending', 'verified'), true);
  });

  it('allows pending → assigned (staff fast-path)', () => {
    assert.equal(isValidTransition('pending', 'assigned'), true);
  });

  it('allows pending → rejected', () => {
    assert.equal(isValidTransition('pending', 'rejected'), true);
  });

  it('allows verified → assigned', () => {
    assert.equal(isValidTransition('verified', 'assigned'), true);
  });

  it('allows assigned → in_progress', () => {
    assert.equal(isValidTransition('assigned', 'in_progress'), true);
  });

  it('allows assigned → resolved (volunteer can resolve directly)', () => {
    assert.equal(isValidTransition('assigned', 'resolved'), true);
  });

  it('allows in_progress → resolved', () => {
    assert.equal(isValidTransition('in_progress', 'resolved'), true);
  });

  it('allows in_progress → rejected', () => {
    assert.equal(isValidTransition('in_progress', 'rejected'), true);
  });

  it('rejects resolved → pending (no resurrection)', () => {
    assert.equal(isValidTransition('resolved', 'pending'), false);
  });

  it('rejects rejected → assigned (no resurrection)', () => {
    assert.equal(isValidTransition('rejected', 'assigned'), false);
  });

  it('rejects pending → resolved (must go through assigned/in_progress first)', () => {
    assert.equal(isValidTransition('pending', 'resolved'), false);
  });

  it('rejects invalid status strings', () => {
    assert.equal(isValidTransition('nonexistent', 'resolved'), false);
    assert.equal(isValidTransition('pending', 'nonexistent'), false);
  });

  it('rejects same-status self-transitions', () => {
    assert.equal(isValidTransition('pending', 'pending'), false);
    assert.equal(isValidTransition('assigned', 'assigned'), false);
  });
});

describe('isTerminalStatus', () => {
  it('returns true for resolved', () => assert.equal(isTerminalStatus('resolved'), true));
  it('returns true for rejected', () => assert.equal(isTerminalStatus('rejected'), true));
  it('returns false for pending', () => assert.equal(isTerminalStatus('pending'), false));
  it('returns false for assigned', () => assert.equal(isTerminalStatus('assigned'), false));
});

describe('isActiveStatus', () => {
  it('returns true for pending', () => assert.equal(isActiveStatus('pending'), true));
  it('returns true for in_progress', () => assert.equal(isActiveStatus('in_progress'), true));
  it('returns false for resolved', () => assert.equal(isActiveStatus('resolved'), false));
  it('returns false for rejected', () => assert.equal(isActiveStatus('rejected'), false));
});

describe('getValidNextStatuses', () => {
  it('returns empty array for terminal statuses', () => {
    assert.deepEqual(getValidNextStatuses('resolved'), []);
    assert.deepEqual(getValidNextStatuses('rejected'), []);
  });

  it('returns correct next statuses for pending', () => {
    const nexts = getValidNextStatuses('pending');
    assert.ok(nexts.includes('verified'));
    assert.ok(nexts.includes('assigned'));
    assert.ok(nexts.includes('rejected'));
  });

  it('returns empty array for unknown status', () => {
    assert.deepEqual(getValidNextStatuses('unknown'), []);
  });
});
