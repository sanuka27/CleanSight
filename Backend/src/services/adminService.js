/**
 * Admin Service
 * 
 * Business logic for admin operations.
 * Keeps route handlers thin and logic testable.
 */

import mongoose from 'mongoose';
import Report from '../models/Report.js';
import User from '../models/User.js';
import Volunteer from '../models/Volunteer.js';
import { REPORT_STATUS, isValidTransition } from '../constants/reportStatus.js';
import { resolveDateRange } from '../utils/dateRange.js';

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────
export const MAX_BULK_OPERATIONS = 200;
export const VALID_STATUSES = Object.values(REPORT_STATUS);
export const VALID_WASTE_CATEGORIES = ['glass', 'mixed', 'paper', 'plastic'];
export const VALID_REVIEW_ACTIONS = ['approve', 'reject', 'override'];

// ─────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────

/**
 * Escape special regex characters for safe text search.
 */
export function escapeRegex(str) {
  if (!str) return '';
  return String(str).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse comma-separated query param into array of trimmed values.
 */
export function parseCommaSeparated(value) {
  if (!value) return [];
  return String(value).split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Validate and deduplicate an array of report IDs for bulk operations.
 * @returns {{ error?: string, ids?: string[] }}
 */
export function validateBulkIds(reportIds) {
  if (!Array.isArray(reportIds) || reportIds.length === 0) {
    return { error: 'reportIds must be a non-empty array' };
  }
  const unique = [...new Set(reportIds.map(String))];
  if (unique.length > MAX_BULK_OPERATIONS) {
    return { error: `reportIds must not exceed ${MAX_BULK_OPERATIONS} unique items` };
  }
  const invalid = unique.filter(id => !mongoose.Types.ObjectId.isValid(id));
  if (invalid.length > 0) {
    return { error: `Invalid report IDs: ${invalid.slice(0, 5).join(', ')}` };
  }
  return { ids: unique };
}

/**
 * Build pagination object from query params.
 */
export function buildPagination(page, limit, total) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  return {
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum),
    skip: (pageNum - 1) * limitNum,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Report Operations
// ─────────────────────────────────────────────────────────────────────

/**
 * Build filter object for report queries from query params.
 */
export function buildReportFilter(query) {
  const {
    status,
    wasteType,
    urgency,
    aiReviewStatus,
    wasteCategoryReviewStatus,
    wasteCategoryPredictedLabel,
    search,
    from,
    to,
    assignedTo,
  } = query;

  const filter = {};

  // Multi-value filters
  const statuses = parseCommaSeparated(status);
  if (statuses.length) filter.status = { $in: statuses };

  const types = parseCommaSeparated(wasteType);
  if (types.length) filter.wasteType = { $in: types };

  const urgencies = parseCommaSeparated(urgency);
  if (urgencies.length) filter.urgency = { $in: urgencies };

  const aiStatuses = parseCommaSeparated(aiReviewStatus);
  if (aiStatuses.length) filter.aiReviewStatus = { $in: aiStatuses };

  const catStatuses = parseCommaSeparated(wasteCategoryReviewStatus);
  if (catStatuses.length) filter.wasteCategoryReviewStatus = { $in: catStatuses };

  const catLabels = parseCommaSeparated(wasteCategoryPredictedLabel);
  if (catLabels.length) filter.wasteCategoryPredictedLabel = { $in: catLabels };

  if (assignedTo) {
    filter.assignedTo = String(assignedTo);
  }

  // Date range filter
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(String(from));
    if (to) filter.createdAt.$lte = new Date(String(to));
  }

  // Text search (case-insensitive, injection-safe)
  if (search && String(search).trim()) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: rx }, { description: rx }];
  }

  return filter;
}

/**
 * Enrich reports with user information.
 */
export async function enrichReportsWithUsers(reports) {
  if (!reports.length) return reports;

  // Get reporter info
  const reporterUids = [...new Set(reports.map(r => r.firebaseUid))];
  const reporters = await User.find({ firebaseUid: { $in: reporterUids } })
    .select('firebaseUid name email avatar')
    .lean();
  const reporterMap = Object.fromEntries(reporters.map(u => [u.firebaseUid, u]));

  // Get assigned volunteer info
  const assignedUids = [...new Set(reports.map(r => r.assignedTo).filter(Boolean))];
  const assignedUsers = assignedUids.length
    ? await User.find({ firebaseUid: { $in: assignedUids } })
        .select('firebaseUid name email')
        .lean()
    : [];
  const assignedMap = Object.fromEntries(assignedUsers.map(u => [u.firebaseUid, u]));

  return reports.map(r => ({
    ...r,
    reporter: reporterMap[r.firebaseUid] || null,
    assignedVolunteer: r.assignedTo
      ? (assignedMap[r.assignedTo] || { firebaseUid: r.assignedTo })
      : null,
  }));
}

// ─────────────────────────────────────────────────────────────────────
// Volunteer Operations
// ─────────────────────────────────────────────────────────────────────

/**
 * Get volunteers with stats.
 */
export async function getVolunteersWithStats(filter = {}, skip = 0, limit = 20) {
  const baseFilter = { ...filter, role: 'volunteer' };

  const [users, total] = await Promise.all([
    User.find(baseFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(baseFilter),
  ]);

  if (!users.length) {
    return { data: [], total };
  }

  const uids = users.map(u => u.firebaseUid);
  const userIds = users.map(u => u._id);

  // Get volunteer profiles
  const volProfiles = await Volunteer.find({ user: { $in: userIds } }).lean();
  const volByUser = Object.fromEntries(volProfiles.map(v => [v.user.toString(), v]));

  // Get assignment stats from Reports
  const assignmentStats = await Report.aggregate([
    { $match: { assignedTo: { $in: uids } } },
    {
      $group: {
        _id: '$assignedTo',
        assigned: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
      },
    },
  ]);
  const statsMap = Object.fromEntries(assignmentStats.map(s => [s._id, s]));

  const enriched = users.map(u => {
    const profile = volByUser[u._id.toString()];
    const stats = statsMap[u.firebaseUid] || { assigned: 0, resolved: 0, inProgress: 0 };
    return {
      ...u,
      volunteerProfile: profile || null,
      stats: {
        assigned: stats.assigned,
        resolved: stats.resolved,
        inProgress: stats.inProgress,
        completionRate: stats.assigned > 0
          ? Math.round((stats.resolved / stats.assigned) * 100)
          : 0,
      },
      isActive: profile?.isActive ?? true,
    };
  });

  return { data: enriched, total };
}

// ─────────────────────────────────────────────────────────────────────
// Analytics Operations
// ─────────────────────────────────────────────────────────────────────

/**
 * Get overview analytics for a date range.
 */
export async function getAnalyticsOverview(range = '7d', from, to) {
  const { start, end } = resolveDateRange(range, from, to);

  const dateFilter = { createdAt: { $gte: start, $lte: end } };

  const [
    totalReports,
    reportsByStatus,
    newUsers,
    topVolunteers,
  ] = await Promise.all([
    Report.countDocuments(dateFilter),
    Report.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    User.countDocuments(dateFilter),
    Report.aggregate([
      { $match: { ...dateFilter, assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  // Convert status array to object
  const statusCounts = Object.fromEntries(
    Object.values(REPORT_STATUS).map(s => [s, 0])
  );
  reportsByStatus.forEach(({ _id, count }) => {
    if (statusCounts.hasOwnProperty(_id)) {
      statusCounts[_id] = count;
    }
  });

  // Enrich top volunteers with names
  const volunteerUids = topVolunteers.map(v => v._id);
  const volunteerUsers = volunteerUids.length
    ? await User.find({ firebaseUid: { $in: volunteerUids } })
        .select('firebaseUid name')
        .lean()
    : [];
  const userMap = Object.fromEntries(volunteerUsers.map(u => [u.firebaseUid, u.name]));

  const enrichedVolunteers = topVolunteers.map(v => ({
    firebaseUid: v._id,
    name: userMap[v._id] || 'Unknown',
    reportsHandled: v.count,
  }));

  return {
    dateRange: { start, end },
    totalReports,
    reportsByStatus: statusCounts,
    newUsers,
    topVolunteers: enrichedVolunteers,
    resolutionRate: totalReports > 0
      ? Math.round((statusCounts.resolved / totalReports) * 100)
      : 0,
  };
}

/**
 * Get daily trend data for charts.
 */
export async function getDailyTrends(range = '7d', from, to) {
  const { start, end } = resolveDateRange(range, from, to);

  const trends = await Report.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        created: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    dateRange: { start, end },
    data: trends.map(t => ({
      date: t._id,
      created: t.created,
      resolved: t.resolved,
    })),
  };
}

/**
 * Get waste type distribution.
 */
export async function getWasteTypeDistribution(range = '7d', from, to) {
  const { start, end } = resolveDateRange(range, from, to);

  const distribution = await Report.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: '$wasteType', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const total = distribution.reduce((sum, d) => sum + d.count, 0);

  return {
    dateRange: { start, end },
    total,
    data: distribution.map(d => ({
      wasteType: d._id || 'Unknown',
      count: d.count,
      percentage: total > 0 ? Math.round((d.count / total) * 100) : 0,
    })),
  };
}

export default {
  // Helpers
  escapeRegex,
  parseCommaSeparated,
  validateBulkIds,
  buildPagination,
  buildReportFilter,
  enrichReportsWithUsers,
  
  // Operations
  getVolunteersWithStats,
  getAnalyticsOverview,
  getDailyTrends,
  getWasteTypeDistribution,
  
  // Constants
  MAX_BULK_OPERATIONS,
  VALID_STATUSES,
  VALID_WASTE_CATEGORIES,
  VALID_REVIEW_ACTIONS,
};
