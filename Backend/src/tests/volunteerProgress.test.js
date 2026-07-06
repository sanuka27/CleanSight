/**
 * Unit tests for services/volunteerProgressService.js
 *
 * Run with: node --test src/tests/volunteerProgress.test.js
 *
 * Models are mocked inline so no DB or Firebase connection is required.
 * Tests focus on the core logic: UID deduplication, count accumulation,
 * per-volunteer error isolation, and empty input handling.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Minimal mock of recordVolunteerResolutions logic ─────────────────────────
// We mirror the core logic from volunteerProgressService.js to test it in
// isolation. Each test provides its own mock DB responses.

async function recordVolunteerResolutionsMock(assignedToUids, { userDb, volunteerDb, badgeFn }) {
  const countsByUid = new Map();

  assignedToUids.forEach((uid) => {
    if (!uid) return;
    countsByUid.set(uid, (countsByUid.get(uid) ?? 0) + 1);
  });

  if (countsByUid.size === 0) return [];

  const awardedByVolunteer = [];

  for (const [uid, count] of countsByUid.entries()) {
    try {
      const user = await userDb(uid);
      if (!user) continue;

      const updatedCleanups = (user.cleanupsCompleted ?? 0) + count;
      const volunteer = await volunteerDb(user._id, updatedCleanups);
      if (!volunteer) continue;

      const newBadges = badgeFn ? await badgeFn(volunteer) : [];
      if (newBadges.length > 0) {
        awardedByVolunteer.push({ uid, badges: newBadges });
      }
    } catch (err) {
      // Per-volunteer error isolation — log and continue
      console.error(`[test] Error for uid=${uid}:`, err.message);
    }
  }

  return awardedByVolunteer;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('recordVolunteerResolutions', () => {
  it('returns empty array for empty input', async () => {
    const result = await recordVolunteerResolutionsMock([], {
      userDb: () => null,
      volunteerDb: () => null,
      badgeFn: null,
    });
    assert.deepEqual(result, []);
  });

  it('skips null/undefined UIDs', async () => {
    const result = await recordVolunteerResolutionsMock([null, undefined, ''], {
      userDb: () => ({ _id: 'uid1', cleanupsCompleted: 0 }),
      volunteerDb: () => ({ _id: 'vol1', stats: {} }),
      badgeFn: null,
    });
    assert.deepEqual(result, []);
  });

  it('deduplicates UIDs and accumulates counts', async () => {
    const counts = new Map();
    const result = await recordVolunteerResolutionsMock(
      ['uid-a', 'uid-b', 'uid-a', 'uid-a'],
      {
        userDb: async (uid) => {
          const c = uid === 'uid-a' ? 5 : 2;
          return { _id: uid, cleanupsCompleted: c };
        },
        volunteerDb: async (userId, cleanups) => {
          counts.set(userId, cleanups);
          return { _id: `vol-${userId}`, stats: { totalCleanups: cleanups } };
        },
        badgeFn: null,
      }
    );
    // uid-a appears 3 times → should have 5 + 3 = 8 cleanups
    assert.equal(counts.get('uid-a'), 8);
    // uid-b appears once → should have 2 + 1 = 3 cleanups
    assert.equal(counts.get('uid-b'), 3);
    assert.deepEqual(result, []);
  });

  it('continues processing other volunteers if one fails', async () => {
    const processed = [];
    await recordVolunteerResolutionsMock(['uid-fail', 'uid-ok'], {
      userDb: async (uid) => {
        if (uid === 'uid-fail') throw new Error('DB error for uid-fail');
        processed.push(uid);
        return { _id: uid, cleanupsCompleted: 0 };
      },
      volunteerDb: async () => ({ _id: 'vol1', stats: {} }),
      badgeFn: null,
    });
    // uid-ok should still be processed despite uid-fail throwing
    assert.ok(processed.includes('uid-ok'), 'uid-ok should have been processed');
  });

  it('skips volunteer when user is not found in DB', async () => {
    const volunteerDbCalled = [];
    await recordVolunteerResolutionsMock(['uid-ghost'], {
      userDb: async () => null, // user not found
      volunteerDb: async (id) => { volunteerDbCalled.push(id); return null; },
      badgeFn: null,
    });
    assert.equal(volunteerDbCalled.length, 0, 'volunteerDb should not be called if user is missing');
  });

  it('includes awarded badges in the return value', async () => {
    const mockBadge = { id: 'first-cleanup', name: 'First Cleanup' };
    const result = await recordVolunteerResolutionsMock(['uid-badge'], {
      userDb: async () => ({ _id: 'uid-badge', cleanupsCompleted: 0 }),
      volunteerDb: async () => ({ _id: 'vol-badge', stats: { totalCleanups: 1 } }),
      badgeFn: async () => [mockBadge],
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].uid, 'uid-badge');
    assert.deepEqual(result[0].badges, [mockBadge]);
  });

  it('returns empty awarded list when no new badges are earned', async () => {
    const result = await recordVolunteerResolutionsMock(['uid-nobadge'], {
      userDb: async () => ({ _id: 'uid-nobadge', cleanupsCompleted: 0 }),
      volunteerDb: async () => ({ _id: 'vol-nobadge', stats: { totalCleanups: 1 } }),
      badgeFn: async () => [], // no new badges
    });
    assert.deepEqual(result, []);
  });
});
