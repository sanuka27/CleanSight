/**
 * Analytics Service
 *
 * MongoDB queries for analytics data.  All functions accept a mandatory
 * date range ({ from: Date, to: Date }) and an optional filter object
 * for role-based scoping (e.g. { firebaseUid } for citizens).
 */

import Report from '../models/Report.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Build a base match stage scoped by date-range + optional filter. */
function baseMatch(from, to, filter = {}) {
  return {
    createdAt: { $gte: from, $lte: to },
    ...filter,
  };
}

/* ------------------------------------------------------------------ */
/*  Total counts & status breakdown                                   */
/* ------------------------------------------------------------------ */

/**
 * Returns { total, pending, assigned, resolved } within the range.
 */
export async function getStatusBreakdown(from, to, filter = {}) {
  const match = baseMatch(from, to, filter);

  const [result] = await Report.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        verified: { $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } },
        assigned: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
        in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
      },
    },
  ]);

  return result || { total: 0, pending: 0, verified: 0, assigned: 0, in_progress: 0, resolved: 0, rejected: 0 };
}

/* ------------------------------------------------------------------ */
/*  Reports-per-day time series                                       */
/* ------------------------------------------------------------------ */

/**
 * Returns an array of { date: 'YYYY-MM-DD', count } buckets.
 */
export async function getReportsPerDay(from, to, filter = {}) {
  const match = baseMatch(from, to, filter);

  const buckets = await Report.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', count: 1 } },
  ]);

  return buckets;
}

/* ------------------------------------------------------------------ */
/*  Average resolution time (assigned → resolved)                     */
/* ------------------------------------------------------------------ */

/**
 * Returns { avgHours, medianHours, count } for reports that moved
 * from assigned → resolved inside the range.
 *
 * Uses `resolvedAt` when present and falls back to `updatedAt`
 * for older data.
 */
export async function getResolutionTimes(from, to, filter = {}) {
  const match = {
    status: 'resolved',
    updatedAt: { $gte: from, $lte: to },
    ...filter,
  };

  const docs = await Report.find(match).select('createdAt updatedAt resolvedAt').lean();

  if (docs.length === 0) {
    return { avgHours: null, medianHours: null, count: 0 };
  }

  const hours = docs
    .map((d) => {
      // Prefer resolvedAt (set by pre-save hook), fall back to updatedAt
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

/* ------------------------------------------------------------------ */
/*  Top waste types                                                   */
/* ------------------------------------------------------------------ */

/**
 * Returns [{ wasteType, count }] sorted descending.
 */
export async function getTopWasteTypes(from, to, filter = {}) {
  const match = baseMatch(from, to, filter);

  return Report.aggregate([
    { $match: match },
    { $group: { _id: '$wasteType', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, wasteType: '$_id', count: 1 } },
  ]);
}

/* ------------------------------------------------------------------ */
/*  Urgency breakdown                                                 */
/* ------------------------------------------------------------------ */

/**
 * Returns [{ urgency, count }] sorted descending.
 */
export async function getUrgencyBreakdown(from, to, filter = {}) {
  const match = baseMatch(from, to, filter);

  return Report.aggregate([
    { $match: match },
    { $group: { _id: '$urgency', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, urgency: '$_id', count: 1 } },
  ]);
}

/* ------------------------------------------------------------------ */
/*  Volunteer performance (staff/admin)                               */
/* ------------------------------------------------------------------ */

/**
 * Returns per-volunteer stats within the date range:
 * [{ assignedTo, assignedCount, resolvedCount }]
 */
export async function getVolunteerStats(from, to) {
  return Report.aggregate([
    {
      $match: {
        assignedTo: { $ne: null },
        createdAt: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: '$assignedTo',
        assignedCount: { $sum: 1 },
        resolvedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
        },
      },
    },
    { $sort: { resolvedCount: -1 } },
    { $project: { _id: 0, assignedTo: '$_id', assignedCount: 1, resolvedCount: 1 } },
  ]);
}

/* ------------------------------------------------------------------ */
/*  Average time-to-assign (pending → assigned)                       */
/* ------------------------------------------------------------------ */

/**
 * For reports that are at least "assigned", measure
 * createdAt → assignedAt (fallback: updatedAt).
 * Returns { avgHours } or null.
 */
export async function getTimeToAssign(from, to, filter = {}) {
  const docs = await Report.find({
    status: { $in: ['assigned', 'in_progress', 'resolved'] },
    assignedTo: { $ne: null },
    createdAt: { $gte: from, $lte: to },
    ...filter,
  })
    .select('createdAt assignedAt updatedAt')
    .lean();

  if (docs.length === 0) return { avgHours: null, count: 0 };

  const hours = docs
    .map((d) => {
      // Prefer assignedAt (set by pre-save hook), fall back to updatedAt
      const assignTime = d.assignedAt || d.updatedAt;
      if (!assignTime || !d.createdAt) return null;
      return (new Date(assignTime) - new Date(d.createdAt)) / (1000 * 60 * 60);
    })
    .filter((h) => h !== null && h >= 0);

  if (hours.length === 0) return { avgHours: null, count: 0 };

  const avg = parseFloat((hours.reduce((a, b) => a + b, 0) / hours.length).toFixed(2));
  return { avgHours: avg, count: hours.length };
}
