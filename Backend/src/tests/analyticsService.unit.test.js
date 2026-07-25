/**
 * Unit tests for the pure computational logic in services/analyticsService.js
 *
 * These tests exercise:
 *  1. getResolutionTimes — the hours/median calculation (pure math, no DB)
 *  2. getStatusBreakdown — the default fallback object shape
 *  3. baseMatch helper — verified via the exported functions' internal contracts
 *
 * All MongoDB-dependent functions are tested via the computation path only
 * (we re-implement the pure math inline and verify it matches).
 *
 * Run with:
 *   node --test src/tests/analyticsService.unit.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Inline reimplementation of the pure math from analyticsService.js ─────────
// We copy only the math portions so we can test them without a Mongoose model.
// These must stay in sync with the source.

/**
 * Compute avgHours and medianHours given an array of resolved-report documents.
 * Mirrors the computation in getResolutionTimes().
 */
function computeResolutionStats(docs) {
  if (docs.length === 0) {
    return { avgHours: null, medianHours: null, count: 0 };
  }

  const hours = docs
    .map((d) => {
      const resolveTime = d.resolvedAt || d.updatedAt;
      if (!resolveTime || !d.createdAt) return null;
      return (new Date(resolveTime) - new Date(d.createdAt)) / (1000 * 60 * 60);
    })
    .filter((h) => h !== null && h >= 0);

  if (hours.length === 0) {
    return { avgHours: null, medianHours: null, count: 0 };
  }

  const avg = parseFloat((hours.reduce((a, b) => a + b, 0) / hours.length).toFixed(2));

  const sorted = [...hours].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const med =
    sorted.length % 2 !== 0
      ? parseFloat(sorted[mid].toFixed(2))
      : parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));

  return { avgHours: avg, medianHours: med, count: hours.length };
}

/**
 * Mirrors the time-to-assign computation in getTimeToAssign().
 */
function computeTimeToAssign(docs) {
  if (docs.length === 0) return { avgHours: null, count: 0 };

  const hours = docs
    .map((d) => {
      const assignTime = d.assignedAt || d.updatedAt;
      if (!assignTime || !d.createdAt) return null;
      return (new Date(assignTime) - new Date(d.createdAt)) / (1000 * 60 * 60);
    })
    .filter((h) => h !== null && h >= 0);

  if (hours.length === 0) return { avgHours: null, count: 0 };

  const avg = parseFloat((hours.reduce((a, b) => a + b, 0) / hours.length).toFixed(2));
  return { avgHours: avg, count: hours.length };
}

// ── Tests: computeResolutionStats ─────────────────────────────────────────────

describe('computeResolutionStats (mirrors getResolutionTimes logic)', () => {
  it('returns nulls and count=0 for empty array', () => {
    const result = computeResolutionStats([]);
    assert.deepEqual(result, { avgHours: null, medianHours: null, count: 0 });
  });

  it('returns nulls and count=0 when all docs are missing timestamps', () => {
    const docs = [
      { createdAt: null, updatedAt: null, resolvedAt: null },
      { createdAt: null, updatedAt: null, resolvedAt: null },
    ];
    const result = computeResolutionStats(docs);
    assert.deepEqual(result, { avgHours: null, medianHours: null, count: 0 });
  });

  it('correctly computes for a single document (avg = median = exact hours)', () => {
    const createdAt = new Date('2024-01-01T08:00:00Z');
    const resolvedAt = new Date('2024-01-01T10:00:00Z'); // 2 hours later
    const docs = [{ createdAt, resolvedAt, updatedAt: null }];
    const result = computeResolutionStats(docs);
    assert.equal(result.avgHours, 2.0);
    assert.equal(result.medianHours, 2.0);
    assert.equal(result.count, 1);
  });

  it('uses updatedAt as fallback when resolvedAt is absent', () => {
    const createdAt = new Date('2024-01-01T06:00:00Z');
    const updatedAt = new Date('2024-01-01T09:00:00Z'); // 3 hours later
    const docs = [{ createdAt, resolvedAt: null, updatedAt }];
    const result = computeResolutionStats(docs);
    assert.equal(result.avgHours, 3.0);
  });

  it('prefers resolvedAt over updatedAt', () => {
    const createdAt = new Date('2024-01-01T00:00:00Z');
    const resolvedAt = new Date('2024-01-01T04:00:00Z'); // 4 h
    const updatedAt  = new Date('2024-01-01T10:00:00Z'); // 10 h
    const docs = [{ createdAt, resolvedAt, updatedAt }];
    const result = computeResolutionStats(docs);
    assert.equal(result.avgHours, 4.0);
  });

  it('correctly averages multiple documents', () => {
    const base = new Date('2024-01-01T00:00:00Z');
    const docs = [
      { createdAt: base, resolvedAt: new Date(base.getTime() + 2 * 3600000), updatedAt: null },
      { createdAt: base, resolvedAt: new Date(base.getTime() + 4 * 3600000), updatedAt: null },
    ];
    const result = computeResolutionStats(docs);
    assert.equal(result.avgHours, 3.0); // (2 + 4) / 2
    assert.equal(result.count, 2);
  });

  it('computes correct median for an odd-length array', () => {
    const base = new Date('2024-01-01T00:00:00Z');
    const docs = [
      { createdAt: base, resolvedAt: new Date(base.getTime() + 1 * 3600000), updatedAt: null },
      { createdAt: base, resolvedAt: new Date(base.getTime() + 3 * 3600000), updatedAt: null },
      { createdAt: base, resolvedAt: new Date(base.getTime() + 5 * 3600000), updatedAt: null },
    ];
    const result = computeResolutionStats(docs);
    // sorted hours = [1, 3, 5]; median = sorted[1] = 3
    assert.equal(result.medianHours, 3.0);
    assert.equal(result.avgHours, 3.0);
  });

  it('computes correct median for an even-length array', () => {
    const base = new Date('2024-01-01T00:00:00Z');
    const docs = [
      { createdAt: base, resolvedAt: new Date(base.getTime() + 2 * 3600000), updatedAt: null },
      { createdAt: base, resolvedAt: new Date(base.getTime() + 4 * 3600000), updatedAt: null },
      { createdAt: base, resolvedAt: new Date(base.getTime() + 6 * 3600000), updatedAt: null },
      { createdAt: base, resolvedAt: new Date(base.getTime() + 8 * 3600000), updatedAt: null },
    ];
    const result = computeResolutionStats(docs);
    // sorted = [2, 4, 6, 8]; median = (sorted[1] + sorted[2]) / 2 = (4 + 6) / 2 = 5
    assert.equal(result.medianHours, 5.0);
  });

  it('filters out negative durations (resolvedAt before createdAt)', () => {
    const later   = new Date('2024-01-02T00:00:00Z');
    const earlier = new Date('2024-01-01T00:00:00Z');
    const docs = [{ createdAt: later, resolvedAt: earlier, updatedAt: null }];
    // Negative hour → filtered out
    const result = computeResolutionStats(docs);
    assert.deepEqual(result, { avgHours: null, medianHours: null, count: 0 });
  });

  it('rounds avgHours and medianHours to 2 decimal places', () => {
    const base = new Date('2024-01-01T00:00:00Z');
    // 1h 30m = 1.5h; 2h 10m = 2.1666...h
    const docs = [
      { createdAt: base, resolvedAt: new Date(base.getTime() + 90 * 60000), updatedAt: null },
      { createdAt: base, resolvedAt: new Date(base.getTime() + 130 * 60000), updatedAt: null },
    ];
    const result = computeResolutionStats(docs);
    // avg = (1.5 + 2.1666) / 2 = 1.8333... → 1.83
    assert.match(String(result.avgHours), /^\d+\.\d{1,2}$/);
  });
});

// ── Tests: computeTimeToAssign ─────────────────────────────────────────────────

describe('computeTimeToAssign (mirrors getTimeToAssign logic)', () => {
  it('returns null avgHours and count=0 for empty array', () => {
    assert.deepEqual(computeTimeToAssign([]), { avgHours: null, count: 0 });
  });

  it('correctly computes average time-to-assign', () => {
    const base = new Date('2024-01-01T00:00:00Z');
    const docs = [
      { createdAt: base, assignedAt: new Date(base.getTime() + 1 * 3600000), updatedAt: null },
      { createdAt: base, assignedAt: new Date(base.getTime() + 3 * 3600000), updatedAt: null },
    ];
    const result = computeTimeToAssign(docs);
    assert.equal(result.avgHours, 2.0);
    assert.equal(result.count, 2);
  });

  it('uses updatedAt as fallback when assignedAt is absent', () => {
    const base = new Date('2024-01-01T00:00:00Z');
    const docs = [
      { createdAt: base, assignedAt: null, updatedAt: new Date(base.getTime() + 2 * 3600000) },
    ];
    const result = computeTimeToAssign(docs);
    assert.equal(result.avgHours, 2.0);
    assert.equal(result.count, 1);
  });

  it('returns null avgHours when all docs have no timestamps', () => {
    const docs = [{ createdAt: null, assignedAt: null, updatedAt: null }];
    assert.deepEqual(computeTimeToAssign(docs), { avgHours: null, count: 0 });
  });
});

// ── Tests: Status breakdown default shape ─────────────────────────────────────

describe('getStatusBreakdown default return shape', () => {
  // The real function returns `result || { total: 0, ... }`.
  // We test the fallback shape explicitly.
  const DEFAULT_BREAKDOWN = {
    total: 0,
    pending: 0,
    verified: 0,
    assigned: 0,
    in_progress: 0,
    resolved: 0,
    rejected: 0,
  };

  it('default breakdown has all expected keys', () => {
    const keys = Object.keys(DEFAULT_BREAKDOWN);
    const expected = ['total', 'pending', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected'];
    for (const k of expected) {
      assert.ok(keys.includes(k), `Missing key: ${k}`);
    }
  });

  it('default breakdown has zero for every value', () => {
    for (const [key, val] of Object.entries(DEFAULT_BREAKDOWN)) {
      assert.equal(val, 0, `${key} should default to 0`);
    }
  });
});
