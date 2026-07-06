/**
 * Badge Service
 *
 * BADGE STORAGE — TWO SOURCES OF TRUTH (intentional, not a bug)
 * ─────────────────────────────────────────────────────────────
 * CleanSight has two distinct badge sets for two distinct user roles:
 *
 *  1. CITIZEN BADGES  →  stored in `User.badges`
 *     Criteria : reportsSubmitted count on the User document
 *     Awarded by: awardCitizenBadges(user)
 *     Catalog  : constants/citizenBadges.js
 *
 *  2. VOLUNTEER BADGES  →  stored in `Volunteer.badges`
 *     Criteria : totalCleanups / reportsResolved in Volunteer.stats
 *     Awarded by: awardVolunteerBadges(volunteer)
 *     Catalog  : constants/volunteerBadges.js
 *
 * These badge sets are never synced because they track fundamentally
 * different activities. A user who is both a citizen reporter and a
 * volunteer will hold badges in both collections. UI layers should fetch
 * and display them separately (see dashboard.js volunteer route).
 */

import Volunteer from '../models/Volunteer.js';
import User from '../models/User.js';
import { VOLUNTEER_BADGES } from '../constants/volunteerBadges.js';
import { CITIZEN_BADGES } from '../constants/citizenBadges.js';

function meetsCriteria(badge, stats) {
  const totalCleanups = stats?.totalCleanups ?? 0;
  const reportsResolved = stats?.reportsResolved ?? 0;

  if (badge.criteria?.totalCleanups && totalCleanups < badge.criteria.totalCleanups) {
    return false;
  }
  if (badge.criteria?.reportsResolved && reportsResolved < badge.criteria.reportsResolved) {
    return false;
  }

  return true;
}

function buildBadgePayload(badge) {
  return {
    id: badge.id,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    earnedAt: new Date(),
  };
}

export function getEligibleBadges(volunteer) {
  if (!volunteer) return [];

  const existing = new Set(
    (volunteer.badges ?? []).map((b) => b.id || b.name).filter(Boolean)
  );

  return VOLUNTEER_BADGES.filter((badge) => {
    if (existing.has(badge.id)) return false;
    return meetsCriteria(badge, volunteer.stats);
  });
}

export async function awardVolunteerBadges(volunteer) {
  const eligible = getEligibleBadges(volunteer);
  if (eligible.length === 0) return [];

  const newBadges = eligible.map(buildBadgePayload);

  await Volunteer.updateOne(
    { _id: volunteer._id },
    { $push: { badges: { $each: newBadges } } }
  );

  return newBadges;
}

function meetsCitizenCriteria(badge, stats) {
  const reportsSubmitted = stats?.reportsSubmitted ?? 0;

  if (badge.criteria?.reportsSubmitted && reportsSubmitted < badge.criteria.reportsSubmitted) {
    return false;
  }

  return true;
}

export function getEligibleCitizenBadges(user) {
  if (!user) return [];

  const existing = new Set(
    (user.badges ?? []).map((b) => b.id || b.name).filter(Boolean)
  );

  return CITIZEN_BADGES.filter((badge) => {
    if (existing.has(badge.id)) return false;
    // Pass user as the stats object since user has `reportsSubmitted`
    return meetsCitizenCriteria(badge, { reportsSubmitted: user.reportsSubmitted });
  });
}

export async function awardCitizenBadges(user) {
  const eligible = getEligibleCitizenBadges(user);
  if (eligible.length === 0) return [];

  const newBadges = eligible.map(buildBadgePayload);

  await User.updateOne(
    { _id: user._id },
    { $push: { badges: { $each: newBadges } } }
  );

  return newBadges;
}
