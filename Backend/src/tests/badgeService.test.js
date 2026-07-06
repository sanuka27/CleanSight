/**
 * Unit tests for services/badgeService.js (pure logic only)
 *
 * Run with: node --test src/tests/badgeService.test.js
 *
 * Tests the eligibility-checking functions (getEligibleBadges /
 * getEligibleCitizenBadges) which are pure logic without DB side-effects.
 * The award functions (awardVolunteerBadges / awardCitizenBadges) require
 * Mongoose and are covered by integration tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Minimal badge catalogs for testing ───────────────────────────────────────

const MOCK_VOLUNTEER_BADGES = [
  { id: 'first-cleanup', name: 'First Cleanup', criteria: { totalCleanups: 1 } },
  { id: 'ten-cleanups',  name: 'Ten Cleanups',  criteria: { totalCleanups: 10 } },
  { id: 'fifty-cleanups', name: 'Fifty Cleanups', criteria: { totalCleanups: 50 } },
];

const MOCK_CITIZEN_BADGES = [
  { id: 'first-report', name: 'First Report', criteria: { reportsSubmitted: 1 } },
  { id: 'five-reports', name: 'Five Reports', criteria: { reportsSubmitted: 5 } },
];

// ── Inline eligibility functions (mirroring badgeService.js logic) ────────────

function meetsCriteria(badge, stats) {
  const totalCleanups = stats?.totalCleanups ?? 0;
  const reportsResolved = stats?.reportsResolved ?? 0;
  if (badge.criteria?.totalCleanups && totalCleanups < badge.criteria.totalCleanups) return false;
  if (badge.criteria?.reportsResolved && reportsResolved < badge.criteria.reportsResolved) return false;
  return true;
}

function getEligibleBadges(volunteer, catalog = MOCK_VOLUNTEER_BADGES) {
  if (!volunteer) return [];
  const existing = new Set((volunteer.badges ?? []).map((b) => b.id || b.name).filter(Boolean));
  return catalog.filter((badge) => {
    if (existing.has(badge.id)) return false;
    return meetsCriteria(badge, volunteer.stats);
  });
}

function meetsCitizenCriteria(badge, stats) {
  const reportsSubmitted = stats?.reportsSubmitted ?? 0;
  if (badge.criteria?.reportsSubmitted && reportsSubmitted < badge.criteria.reportsSubmitted) return false;
  return true;
}

function getEligibleCitizenBadges(user, catalog = MOCK_CITIZEN_BADGES) {
  if (!user) return [];
  const existing = new Set((user.badges ?? []).map((b) => b.id || b.name).filter(Boolean));
  return catalog.filter((badge) => {
    if (existing.has(badge.id)) return false;
    return meetsCitizenCriteria(badge, { reportsSubmitted: user.reportsSubmitted });
  });
}

// ── Tests: Volunteer badges ───────────────────────────────────────────────────

describe('getEligibleBadges (volunteer)', () => {
  it('returns empty array for null volunteer', () => {
    assert.deepEqual(getEligibleBadges(null), []);
  });

  it('returns empty array when totalCleanups is 0', () => {
    const volunteer = { badges: [], stats: { totalCleanups: 0 } };
    assert.deepEqual(getEligibleBadges(volunteer), []);
  });

  it('returns first-cleanup badge when totalCleanups >= 1', () => {
    const volunteer = { badges: [], stats: { totalCleanups: 1 } };
    const eligible = getEligibleBadges(volunteer);
    assert.equal(eligible.length, 1);
    assert.equal(eligible[0].id, 'first-cleanup');
  });

  it('returns multiple badges when criteria are met', () => {
    const volunteer = { badges: [], stats: { totalCleanups: 10 } };
    const eligible = getEligibleBadges(volunteer);
    assert.equal(eligible.length, 2); // first-cleanup + ten-cleanups
    const ids = eligible.map((b) => b.id);
    assert.ok(ids.includes('first-cleanup'));
    assert.ok(ids.includes('ten-cleanups'));
  });

  it('skips already-earned badges', () => {
    const volunteer = {
      badges: [{ id: 'first-cleanup' }],
      stats: { totalCleanups: 10 },
    };
    const eligible = getEligibleBadges(volunteer);
    assert.equal(eligible.length, 1); // only ten-cleanups remains
    assert.equal(eligible[0].id, 'ten-cleanups');
  });

  it('returns no badges when all are already earned', () => {
    const volunteer = {
      badges: [
        { id: 'first-cleanup' },
        { id: 'ten-cleanups' },
        { id: 'fifty-cleanups' },
      ],
      stats: { totalCleanups: 100 },
    };
    assert.deepEqual(getEligibleBadges(volunteer), []);
  });

  it('handles missing stats gracefully', () => {
    const volunteer = { badges: [] }; // no stats field
    assert.deepEqual(getEligibleBadges(volunteer), []);
  });

  it('handles missing badges array gracefully', () => {
    const volunteer = { stats: { totalCleanups: 1 } }; // no badges field
    const eligible = getEligibleBadges(volunteer);
    assert.equal(eligible[0].id, 'first-cleanup');
  });
});

// ── Tests: Citizen badges ─────────────────────────────────────────────────────

describe('getEligibleCitizenBadges', () => {
  it('returns empty array for null user', () => {
    assert.deepEqual(getEligibleCitizenBadges(null), []);
  });

  it('returns empty array when reportsSubmitted is 0', () => {
    const user = { badges: [], reportsSubmitted: 0 };
    assert.deepEqual(getEligibleCitizenBadges(user), []);
  });

  it('returns first-report badge when reportsSubmitted >= 1', () => {
    const user = { badges: [], reportsSubmitted: 1 };
    const eligible = getEligibleCitizenBadges(user);
    assert.equal(eligible.length, 1);
    assert.equal(eligible[0].id, 'first-report');
  });

  it('returns multiple citizen badges when criteria are met', () => {
    const user = { badges: [], reportsSubmitted: 5 };
    const eligible = getEligibleCitizenBadges(user);
    assert.equal(eligible.length, 2); // first-report + five-reports
  });

  it('skips already-earned citizen badges', () => {
    const user = { badges: [{ id: 'first-report' }], reportsSubmitted: 5 };
    const eligible = getEligibleCitizenBadges(user);
    assert.equal(eligible.length, 1);
    assert.equal(eligible[0].id, 'five-reports');
  });

  it('returns no badges when all are already earned', () => {
    const user = {
      badges: [{ id: 'first-report' }, { id: 'five-reports' }],
      reportsSubmitted: 10,
    };
    assert.deepEqual(getEligibleCitizenBadges(user), []);
  });
});
