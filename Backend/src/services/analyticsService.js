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
        assigned: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
      },
    },
  ]);

  return result || { total: 0, pending: 0, assigned: 0, resolved: 0 };
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
 * Because the current schema has no `resolvedAt` / `assignedAt`
 * timestamps beyond `createdAt`, we use `updatedAt` as a proxy for
 * the most-recent status change.  If timestamps are not available,
 * returns nulls.
 */
export async function getResolutionTimes(from, to, filter = {}) {
  const match = {
    status: 'resolved',
    updatedAt: { $gte: from, $lte: to },
    ...filter,
  };

  const docs = await Report.find(match).select('createdAt updatedAt').lean();

  if (docs.length === 0) {
    return { avgHours: null, medianHours: null, count: 0 };
  }

  const hours = docs
    .map((d) => {
      // updatedAt is the last change (resolve); createdAt is report creation
      if (!d.updatedAt || !d.createdAt) return null;
      return (new Date(d.updatedAt) - new Date(d.createdAt)) / (1000 * 60 * 60);
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
 * Proxy: for reports that are at least "assigned", measure
 * createdAt → updatedAt where status !== 'pending'.
 * Returns { avgHours } or null.
 */
export async function getTimeToAssign(from, to, filter = {}) {
  const docs = await Report.find({
    status: { $in: ['assigned', 'resolved'] },
    assignedTo: { $ne: null },
    createdAt: { $gte: from, $lte: to },
    ...filter,
  })
    .select('createdAt updatedAt')
    .lean();

  if (docs.length === 0) return { avgHours: null, count: 0 };

  const hours = docs
    .map((d) => {
      if (!d.updatedAt || !d.createdAt) return null;
      return (new Date(d.updatedAt) - new Date(d.createdAt)) / (1000 * 60 * 60);
    })
    .filter((h) => h !== null && h >= 0);

  if (hours.length === 0) return { avgHours: null, count: 0 };

  const avg = parseFloat((hours.reduce((a, b) => a + b, 0) / hours.length).toFixed(2));
  return { avgHours: avg, count: hours.length };
}
