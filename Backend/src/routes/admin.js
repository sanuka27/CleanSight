import express from 'express';
import mongoose from 'mongoose';
import { adminOnly } from '../middleware/adminAuth.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import Volunteer from '../models/Volunteer.js';
import Document from '../models/Document.js';
import Settings from '../models/Settings.js';
import AuditLog from '../models/AuditLog.js';
import { logAdminAction } from '../services/auditLogService.js';

const router = express.Router();

// All routes require admin auth
router.use(adminOnly);

/* ═══════════════════════════════════════════════════════════════════
   REPORTS
═══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/reports
 * Paginated, filtered, sorted report list.
 */
router.get('/reports', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      wasteType,
      urgency,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      from,
      to,
      assignedTo,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build filter
    const filter = {};

    if (status) {
      const statuses = String(status).split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length) filter.status = { $in: statuses };
    }
    if (wasteType) {
      const types = String(wasteType).split(',').map(s => s.trim()).filter(Boolean);
      if (types.length) filter.wasteType = { $in: types };
    }
    if (urgency) {
      const urgencies = String(urgency).split(',').map(s => s.trim()).filter(Boolean);
      if (urgencies.length) filter.urgency = { $in: urgencies };
    }
    if (assignedTo) {
      filter.assignedTo = String(assignedTo);
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(String(from));
      if (to)   filter.createdAt.$lte = new Date(String(to));
    }

    // Text search on description + title (case-insensitive, injection-safe)
    if (search && String(search).trim()) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      filter.$or = [{ title: rx }, { description: rx }];
    }

    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sortField = ['createdAt', 'updatedAt', 'urgency', 'status'].includes(String(sortBy))
      ? String(sortBy)
      : 'createdAt';

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Report.countDocuments(filter),
    ]);

    // Enrich with reporter name
    const uids = [...new Set(reports.map(r => r.firebaseUid))];
    const users = await User.find({ firebaseUid: { $in: uids } })
      .select('firebaseUid name email avatar')
      .lean();
    const userMap = Object.fromEntries(users.map(u => [u.firebaseUid, u]));

    // Enrich with assigned volunteer name
    const assignedUids = [...new Set(reports.map(r => r.assignedTo).filter(Boolean))];
    const assignedUsers = await User.find({ firebaseUid: { $in: assignedUids } })
      .select('firebaseUid name email')
      .lean();
    const assignedMap = Object.fromEntries(assignedUsers.map(u => [u.firebaseUid, u]));

    const enriched = reports.map(r => ({
      ...r,
      reporter: userMap[r.firebaseUid] || null,
      assignedVolunteer: r.assignedTo ? assignedMap[r.assignedTo] || { firebaseUid: r.assignedTo } : null,
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('Admin get reports error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   BULK REPORT ACTIONS
═══════════════════════════════════════════════════════════════════ */

const MAX_BULK = 200;
const VALID_STATUSES_BULK = ['pending', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected'];

/**
 * Validate and deduplicate an array of report IDs.
 * Returns { error } on failure or { ids } with the unique de-duped list on success.
 */
function validateBulkIds(reportIds) {
  if (!Array.isArray(reportIds) || reportIds.length === 0) {
    return { error: 'reportIds must be a non-empty array' };
  }
  // Deduplicate while preserving order
  const unique = [...new Set(reportIds.map(String))];
  if (unique.length > MAX_BULK) {
    return { error: `reportIds must not exceed ${MAX_BULK} unique items` };
  }
  const invalid = unique.filter(id => !mongoose.Types.ObjectId.isValid(id));
  if (invalid.length > 0) {
    return { error: `Invalid report IDs: ${invalid.slice(0, 5).join(', ')}` };
  }
  return { ids: unique };
}

/**
 * POST /api/admin/reports/bulk/assign
 * Bulk assign reports to a volunteer.
 */
router.post('/reports/bulk/assign', async (req, res) => {
  try {
    const { reportIds, volunteerUid, note } = req.body;

    const { error: idErr, ids: uniqueIds } = validateBulkIds(reportIds);
    if (idErr) return res.status(400).json({ success: false, message: idErr });
    if (!volunteerUid || typeof volunteerUid !== 'string') {
      return res.status(400).json({ success: false, message: 'volunteerUid is required' });
    }

    const volunteer = await User.findOne({ firebaseUid: String(volunteerUid), role: 'volunteer' });
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found or not a volunteer role' });
    }

    const objectIds = uniqueIds.map(id => new mongoose.Types.ObjectId(id));
    const existing = await Report.find({ _id: { $in: objectIds } }).select('_id status').lean();
    const existingMap = Object.fromEntries(existing.map(r => [r._id.toString(), r]));

    const succeeded = [];
    const failed = [];

    const bulkOps = [];
    for (const id of uniqueIds) {
      const report = existingMap[id];
      if (!report) {
        failed.push({ id, reason: 'Report not found' });
        continue;
      }
      if (report.status === 'resolved' || report.status === 'rejected') {
        failed.push({ id, reason: `Cannot assign a ${report.status} report` });
        continue;
      }
      const $set = { assignedTo: volunteerUid, status: 'assigned', updatedAt: new Date() };
      if (note) $set.adminNote = String(note).slice(0, 1000);
      bulkOps.push({ updateOne: { filter: { _id: new mongoose.Types.ObjectId(id) }, update: { $set, $unset: { rejectionReason: '' } } } });
      succeeded.push(id);
    }

    if (bulkOps.length > 0) {
      await Report.bulkWrite(bulkOps, { ordered: false });
    }

    logAdminAction({
      req,
      actor: req.adminUser,
      action: 'REPORTS_BULK_ASSIGNED',
      entityType: 'report',
      entityId: 'bulk',
      metadata: {
        countRequested: uniqueIds.length,
        countSucceeded: succeeded.length,
        countFailed: failed.length,
        volunteerUid,
        volunteerName: volunteer.name || null,
        firstNReportIds: uniqueIds.slice(0, 20),
      },
    });

    res.json({ success: true, updatedCount: succeeded.length, failed });
  } catch (err) {
    console.error('Bulk assign error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/reports/bulk/status
 * Bulk update report status.
 */
router.post('/reports/bulk/status', async (req, res) => {
  try {
    const { reportIds, status } = req.body;

    const { error: idErr, ids: uniqueIds } = validateBulkIds(reportIds);
    if (idErr) return res.status(400).json({ success: false, message: idErr });
    if (!status || !VALID_STATUSES_BULK.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${VALID_STATUSES_BULK.join(', ')}`,
      });
    }

    // Keyed by CURRENT status: lists of target statuses that are NOT allowed.
    // Prevents re-opening resolved/rejected reports into active workflow states.
    const BLOCKED_TRANSITIONS = {
      resolved: ['pending', 'verified', 'assigned', 'in_progress'],
      rejected: ['pending', 'verified', 'assigned', 'in_progress'],
    };

    const objectIds = uniqueIds.map(id => new mongoose.Types.ObjectId(id));
    const existing = await Report.find({ _id: { $in: objectIds } }).select('_id status').lean();
    const existingMap = Object.fromEntries(existing.map(r => [r._id.toString(), r]));

    const succeeded = [];
    const failed = [];
    const bulkOps = [];

    for (const id of uniqueIds) {
      const report = existingMap[id];
      if (!report) {
        failed.push({ id, reason: 'Report not found' });
        continue;
      }
      if (report.status === status) {
        // Already at target status — count as success (idempotent)
        succeeded.push(id);
        continue;
      }
      const blockedTargets = BLOCKED_TRANSITIONS[report.status] || [];
      if (blockedTargets.includes(status)) {
        failed.push({ id, reason: `Transition from '${report.status}' to '${status}' is not allowed` });
        continue;
      }

      const $set = { status, updatedAt: new Date() };
      const $unset = {};
      if (status === 'resolved') $set.resolvedAt = new Date();
      else $unset.resolvedAt = '';
      if (status !== 'rejected') $unset.rejectionReason = '';

      const update = Object.keys($unset).length ? { $set, $unset } : { $set };
      bulkOps.push({ updateOne: { filter: { _id: new mongoose.Types.ObjectId(id) }, update } });
      succeeded.push(id);
    }

    if (bulkOps.length > 0) {
      await Report.bulkWrite(bulkOps, { ordered: false });
    }

    logAdminAction({
      req,
      actor: req.adminUser,
      action: 'REPORTS_BULK_STATUS_UPDATED',
      entityType: 'report',
      entityId: 'bulk',
      metadata: {
        countRequested: uniqueIds.length,
        countSucceeded: succeeded.length,
        countFailed: failed.length,
        status,
        firstNReportIds: uniqueIds.slice(0, 20),
      },
    });

    res.json({ success: true, updatedCount: succeeded.length, failed });
  } catch (err) {
    console.error('Bulk status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/reports/bulk/reject
 * Bulk reject reports with a required reason.
 */
router.post('/reports/bulk/reject', async (req, res) => {
  try {
    const { reportIds, reason } = req.body;

    const { error: idErr, ids: uniqueIds } = validateBulkIds(reportIds);
    if (idErr) return res.status(400).json({ success: false, message: idErr });
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'reason is required (min 5 characters)' });
    }

    const safeReason = reason.trim().slice(0, 500);
    const objectIds = uniqueIds.map(id => new mongoose.Types.ObjectId(id));
    const existing = await Report.find({ _id: { $in: objectIds } }).select('_id status').lean();
    const existingMap = Object.fromEntries(existing.map(r => [r._id.toString(), r]));

    const succeeded = [];
    const failed = [];
    const bulkOps = [];

    for (const id of uniqueIds) {
        continue;
      }
      bulkOps.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id) },
          update: {
            $set: { status: 'rejected', rejectionReason: safeReason, updatedAt: new Date() },
            $unset: { resolvedAt: '' },
          },
        },
      });
      succeeded.push(id);
    }

    if (bulkOps.length > 0) {
      await Report.bulkWrite(bulkOps, { ordered: false });
    }

    logAdminAction({
      req,
      actor: req.adminUser,
      action: 'REPORTS_BULK_REJECTED',
      entityType: 'report',
      entityId: 'bulk',
      metadata: {
        countRequested: uniqueIds.length,
        countSucceeded: succeeded.length,
        countFailed: failed.length,
        reason: safeReason.slice(0, 100),
        firstNReportIds: uniqueIds.slice(0, 20),
      },
    });

    res.json({ success: true, updatedCount: succeeded.length, failed });
  } catch (err) {
    console.error('Bulk reject error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/reports/bulk/export
 * Export selected reports as CSV (file download).
 * Body: { reportIds: [...] } OR { filters: { status, wasteType, urgency, q, dateFrom, dateTo } }
 */
router.post('/reports/bulk/export', async (req, res) => {
  try {
    const { reportIds, filters } = req.body;

    let reports;

    if (Array.isArray(reportIds) && reportIds.length > 0) {
      // Validate and deduplicate IDs
      const { error: idErr, ids: uniqueIds } = validateBulkIds(reportIds);
      if (idErr) return res.status(400).json({ success: false, message: idErr });
      const objectIds = uniqueIds.map(id => new mongoose.Types.ObjectId(id));
      reports = await Report.find({ _id: { $in: objectIds } }).sort({ createdAt: -1 }).lean();
    } else if (filters && typeof filters === 'object') {
      const filter = {};
      if (filters.status) {
        const statuses = String(filters.status).split(',').map(s => s.trim()).filter(Boolean);
        if (statuses.length) filter.status = { $in: statuses };
      }
      if (filters.wasteType) {
        const types = String(filters.wasteType).split(',').map(s => s.trim()).filter(Boolean);
        if (types.length) filter.wasteType = { $in: types };
      }
      if (filters.urgency) {
        const urgencies = String(filters.urgency).split(',').map(s => s.trim()).filter(Boolean);
        if (urgencies.length) filter.urgency = { $in: urgencies };
      }
      if (filters.dateFrom || filters.dateTo) {
        const createdAtFilter = {};
        if (filters.dateFrom) {
          const fromDate = new Date(String(filters.dateFrom));
          if (isNaN(fromDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid dateFrom filter' });
          }
          createdAtFilter.$gte = fromDate;
        }
        if (filters.dateTo) {
          const toDate = new Date(String(filters.dateTo));
          if (isNaN(toDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid dateTo filter' });
          }
          createdAtFilter.$lte = toDate;
        }
        if (Object.keys(createdAtFilter).length > 0) {
          filter.createdAt = createdAtFilter;
        }
      }
      if (filters.q && String(filters.q).trim()) {
        const escaped = String(filters.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rx = new RegExp(escaped, 'i');
        filter.$or = [{ title: rx }, { description: rx }];
      }
      reports = await Report.find(filter).sort({ createdAt: -1 }).limit(5000).lean();
    } else {
      return res.status(400).json({ success: false, message: 'Provide reportIds or filters' });
    }

    // Enrich with basic reporter info
    const uids = [...new Set(reports.map(r => r.firebaseUid))];
    const users = await User.find({ firebaseUid: { $in: uids } }).select('firebaseUid name email').lean();
    const userMap = Object.fromEntries(users.map(u => [u.firebaseUid, u]));

    // Build CSV
    const headers = ['id', 'title', 'description', 'status', 'wasteType', 'urgency',
      'lat', 'lng', 'reporterName', 'reporterEmail', 'assignedTo', 'rejectionReason',
      'createdAt', 'updatedAt', 'resolvedAt'];

    function escapeCsv(val) {
      const str = String(val ?? '');
      // Mitigate CSV formula injection
      const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
      if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
        return `"${safe.replace(/"/g, '""')}"`;
      }
      return safe;
    }

    const rows = reports.map(r => {
      const reporter = userMap[r.firebaseUid] || {};
      return [
        r._id.toString(),
        r.title || '',
        r.description,
        r.status,
        r.wasteType,
        r.urgency,
        r.location?.coordinates?.[1] ?? '',
        r.location?.coordinates?.[0] ?? '',
        reporter.name || '',
        reporter.email || '',
        r.assignedTo || '',
        r.rejectionReason || '',
        r.createdAt ? new Date(r.createdAt).toISOString() : '',
        r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
        r.resolvedAt ? new Date(r.resolvedAt).toISOString() : '',
      ].map(escapeCsv).join(',');
    });

    const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n');

    logAdminAction({
      req,
      actor: req.adminUser,
      action: 'REPORTS_BULK_EXPORTED',
      entityType: 'report',
      entityId: 'bulk',
      metadata: {
        countExported: reports.length,
        exportedByIds: Array.isArray(reportIds) && reportIds.length > 0,
        firstNReportIds: (reportIds || []).slice(0, 20),
      },
    });

    const filename = `reports-export-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error('Bulk export error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/reports/map
 * Lightweight, bbox-filterable report list for the admin map view.
 *
 * Query params:
 *   bbox       – west,south,east,north (comma-separated floats)
 *   status     – comma-separated statuses
 *   wasteType  – comma-separated waste types
 *   urgency    – comma-separated urgency levels
 *   unassigned – "true" to show only unassigned reports
 *   dateFrom   – ISO date string (lower bound on createdAt)
 *   dateTo     – ISO date string (upper bound on createdAt)
 *   q          – free-text search on title/description
 */
router.get('/reports/map', async (req, res) => {
  try {
    const { bbox, status, wasteType, urgency, unassigned, dateFrom, dateTo, q } = req.query;

    const filter = {};

    // ── Bounding box ────────────────────────────────────────────────
    if (bbox) {
      const parts = String(bbox).split(',').map(Number);
      if (parts.length !== 4 || parts.some(n => isNaN(n))) {
        return res.status(400).json({ success: false, message: 'bbox must be 4 comma-separated numbers: west,south,east,north' });
      }
      const [west, south, east, north] = parts;
      if (west < -180 || east > 180 || south < -90 || north > 90 || west > east || south > north) {
        return res.status(400).json({ success: false, message: 'bbox values out of valid range' });
      }
      filter.location = {
        $geoWithin: {
          $box: [[west, south], [east, north]],
        },
      };
    }

    // ── Status ──────────────────────────────────────────────────────
    if (status) {
      const statuses = String(status).split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length) filter.status = { $in: statuses };
    }

    // ── Waste type ──────────────────────────────────────────────────
    if (wasteType) {
      const types = String(wasteType).split(',').map(s => s.trim()).filter(Boolean);
      if (types.length) filter.wasteType = { $in: types };
    }

    // ── Urgency ─────────────────────────────────────────────────────
    if (urgency) {
      const urgencies = String(urgency).split(',').map(s => s.trim()).filter(Boolean);
      if (urgencies.length) filter.urgency = { $in: urgencies };
    }

    // ── Unassigned only ─────────────────────────────────────────────
    if (unassigned === 'true') {
      filter.assignedTo = null;
    }

    // ── Date range ──────────────────────────────────────────────────
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const d = new Date(String(dateFrom));
        if (isNaN(d.getTime())) return res.status(400).json({ success: false, message: 'Invalid dateFrom' });
        filter.createdAt.$gte = d;
      }
      if (dateTo) {
        const d = new Date(String(dateTo));
        if (isNaN(d.getTime())) return res.status(400).json({ success: false, message: 'Invalid dateTo' });
        filter.createdAt.$lte = d;
      }
    }

    // ── Text search ─────────────────────────────────────────────────
    if (q && String(q).trim()) {
      const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      filter.$or = [{ title: rx }, { description: rx }];
    }

    // ── Query with lightweight projection ───────────────────────────
    const reports = await Report.find(filter)
      .select('title description location status wasteType urgency assignedTo createdAt imageUrl')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    // Enrich with assigned volunteer name (lightweight)
    const assignedUids = [...new Set(reports.map(r => r.assignedTo).filter(Boolean))];
    let assignedMap = {};
    if (assignedUids.length > 0) {
      const assignedUsers = await User.find({ firebaseUid: { $in: assignedUids } })
        .select('firebaseUid name email')
        .lean();
      assignedMap = Object.fromEntries(assignedUsers.map(u => [u.firebaseUid, u]));
    }

    const data = reports.map(r => ({
      _id: r._id,
      title: r.title,
      description: r.description ? r.description.slice(0, 120) : '',
      location: r.location,
      status: r.status,
      wasteType: r.wasteType,
      urgency: r.urgency,
      assignedTo: r.assignedTo || null,
      assignedVolunteer: r.assignedTo
        ? assignedMap[r.assignedTo] || { firebaseUid: r.assignedTo }
        : null,
      createdAt: r.createdAt,
      imageUrl: r.imageUrl || null,
    }));

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('Admin map reports error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/reports/:id
 * Full report details with reporter info.
 */
router.get('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID' });
    }

    const report = await Report.findById(id).lean();
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    const [reporter, assignedVolunteer] = await Promise.all([
      User.findOne({ firebaseUid: report.firebaseUid }).select('name email avatar reportsSubmitted createdAt').lean(),
      report.assignedTo
        ? User.findOne({ firebaseUid: report.assignedTo }).select('name email avatar cleanupsCompleted').lean()
        : null,
    ]);

    res.json({
      success: true,
      data: {
        ...report,
        reporter: reporter || null,
        assignedVolunteer: assignedVolunteer || null,
      },
    });
  } catch (err) {
    console.error('Admin get report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/admin/reports/:id/status
 * Admin status update with extended transitions.
 */
router.patch('/reports/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID' });
    }

    const VALID_STATUSES = ['pending', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    // Fetch old status for metadata before updating
    const oldReport = await Report.findById(id).lean();
    const statusFrom = oldReport?.status || null;

    const $set = { status };
    const $unset = {};
    if (status === 'rejected') {
      $set.rejectionReason = rejectionReason || 'No reason provided';
    } else {
      $unset.rejectionReason = '';
    }
    if (status === 'resolved') {
      $set.resolvedAt = new Date();
    } else {
      $unset.resolvedAt = '';
    }
    const update = Object.keys($unset).length ? { $set, $unset } : { $set };

    const report = await Report.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    logAdminAction({
      req,
      actor: req.adminUser,
      action: 'REPORT_STATUS_CHANGED',
      entityType: 'report',
      entityId: id,
      metadata: {
        statusFrom,
        statusTo: status,
        ...(status === 'rejected' && { rejectionReason: $set.rejectionReason }),
      },
    });

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Admin update status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/admin/reports/:id/assign
 * Assign report to a volunteer.
 */
router.patch('/reports/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { volunteerUid } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID' });
    }
    if (!volunteerUid) {
      return res.status(400).json({ success: false, message: 'volunteerUid is required' });
    }

    // Verify volunteer exists
    const volunteer = await User.findOne({ firebaseUid: volunteerUid, role: 'volunteer' });
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    const report = await Report.findByIdAndUpdate(
      id,
      {
        $set: { assignedTo: volunteerUid, status: 'assigned' },
        $unset: { rejectionReason: '', resolvedAt: '' },
      },
      { new: true }
    ).lean();

    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    logAdminAction({
      req,
      actor: req.adminUser,
      action: 'REPORT_ASSIGNED',
      entityType: 'report',
      entityId: id,
      metadata: {
        assignedToUid:   volunteerUid,
        assignedToEmail: volunteer.email || null,
        assignedToName:  volunteer.name  || null,
      },
    });

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Admin assign report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/reports/:id/note
 * Add/update admin note on a report.
 */
router.post('/reports/:id/note', async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID' });
    }

    const report = await Report.findByIdAndUpdate(
      id,
      { adminNote: note || '' },
      { new: true }
    ).lean();

    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    logAdminAction({
      req,
      actor: req.adminUser,
      action: 'REPORT_NOTE_ADDED',
      entityType: 'report',
      entityId: id,
      metadata: { noteLength: (note || '').length },
    });

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Admin note error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/reports/export/csv
 * Export reports as CSV (returns JSON array for frontend to render).
 */
router.get('/reports/export/csv', async (req, res) => {
  try {
    const { from, to, status, wasteType } = req.query;
    const filter = {};

    if (status) {
      const statuses = String(status).split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length) filter.status = { $in: statuses };
    }
    if (wasteType) {
      const types = String(wasteType).split(',').map(s => s.trim()).filter(Boolean);
      if (types.length) filter.wasteType = { $in: types };
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(String(from));
      if (to)   filter.createdAt.$lte = new Date(String(to));
    }

    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    const rows = reports.map(r => ({
      id: r._id.toString(),
      title: r.title || '',
      description: r.description,
      status: r.status,
      wasteType: r.wasteType,
      urgency: r.urgency,
      lat: r.location?.coordinates?.[1] ?? '',
      lng: r.location?.coordinates?.[0] ?? '',
      reporterUid: r.firebaseUid,
      assignedTo: r.assignedTo || '',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      resolvedAt: r.resolvedAt || '',
    }));

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Admin export error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   VOLUNTEERS
═══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/volunteers
 * List all volunteers with stats.
 */
router.get('/volunteers', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Users with role=volunteer
    const userFilter = { role: 'volunteer' };
    if (search && String(search).trim()) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      userFilter.$or = [{ name: rx }, { email: rx }];
    }

    const [users, total] = await Promise.all([
      User.find(userFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(userFilter),
    ]);

    const uids = users.map(u => u.firebaseUid);

    // Get volunteer profiles
    const volProfiles = await Volunteer.find({ user: { $in: users.map(u => u._id) } })
      .lean();
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

    // Filter by isActive if requested
    const filtered = isActive !== undefined
      ? enriched.filter(v => v.isActive === (isActive === 'true'))
      : enriched;

    const effectiveTotal = isActive !== undefined ? filtered.length : total;
    res.json({
      success: true,
      data: filtered,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: effectiveTotal,
        pages: Math.ceil(effectiveTotal / Number(limit)),
      },
    });
  } catch (err) {
    console.error('Admin get volunteers error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/volunteers/:uid
 * Single volunteer profile + tasks.
 */
router.get('/volunteers/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const user = await User.findOne({ firebaseUid: uid }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const [profile, tasks] = await Promise.all([
      Volunteer.findOne({ user: user._id }).lean(),
      Report.find({ assignedTo: uid })
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean(),
    ]);

    const resolvedCount = tasks.filter(t => t.status === 'resolved').length;
    const inProgressCount = tasks.filter(t => t.status === 'in_progress' || t.status === 'assigned').length;

    res.json({
      success: true,
      data: {
        user,
        profile: profile || null,
        tasks,
        stats: {
          total: tasks.length,
          resolved: resolvedCount,
          inProgress: inProgressCount,
          completionRate: tasks.length > 0
            ? Math.round((resolvedCount / tasks.length) * 100)
            : 0,
        },
      },
    });
  } catch (err) {
    console.error('Admin get volunteer error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   ANALYTICS
═══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/analytics/overview?range=7d|30d|90d|custom&from=ISO&to=ISO
 */
router.get('/analytics/overview', async (req, res) => {
  try {
    const { range = '7d', from, to } = req.query;
    const { start, end } = resolveDateRange(range, from, to);

    const [statusBreakdown, wasteTypes, urgencyBreakdown, userGrowth, resolution] =
      await Promise.all([
        // Status counts
        Report.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        // Waste type counts
        Report.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: '$wasteType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        // Urgency counts
        Report.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: '$urgency', count: { $sum: 1 } } },
        ]),
        // New users in range
        User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        // Avg resolution time (createdAt → resolvedAt, fallback to updatedAt)
        Report.aggregate([
          {
            $match: {
              status: 'resolved',
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $project: {
              resolutionMs: {
                $subtract: [{ $ifNull: ['$resolvedAt', '$updatedAt'] }, '$createdAt'],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgMs: { $avg: '$resolutionMs' },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    // Convert status breakdown to object
    const statusMap = {};
    statusBreakdown.forEach(s => { statusMap[s._id] = s.count; });

    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);

    res.json({
      success: true,
      data: {
        totals: {
          total,
          pending:    statusMap.pending    || 0,
          verified:   statusMap.verified   || 0,
          assigned:   statusMap.assigned   || 0,
          inProgress: statusMap.in_progress || 0,
          resolved:   statusMap.resolved   || 0,
          rejected:   statusMap.rejected   || 0,
        },
        rates: {
          resolutionRate: total > 0
            ? Math.round(((statusMap.resolved || 0) / total) * 100)
            : 0,
          assignmentRate: total > 0
            ? Math.round((((statusMap.assigned || 0) + (statusMap.in_progress || 0)) / total) * 100)
            : 0,
        },
        wasteTypes: wasteTypes.map(w => ({ wasteType: w._id, count: w.count })),
        urgencyBreakdown: urgencyBreakdown.map(u => ({ urgency: u._id, count: u.count })),
        newUsers: userGrowth,
        avgResolutionHours: resolution[0]?.avgMs
          ? Math.round(resolution[0].avgMs / 1000 / 3600 * 10) / 10
          : null,
        resolvedCount: resolution[0]?.count || 0,
      },
    });
  } catch (err) {
    console.error('Admin analytics overview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/analytics/trends?range=7d|30d|90d&from=ISO&to=ISO
 * Daily report counts split by status.
 */
router.get('/analytics/trends', async (req, res) => {
  try {
    const { range = '30d', from, to } = req.query;
    const { start, end } = resolveDateRange(range, from, to);

    const pipeline = [
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ];

    const raw = await Report.aggregate(pipeline);

    // Pivot: { date → { total, resolved, pending, ... } }
    const dateMap = {};
    raw.forEach(r => {
      const { date, status } = r._id;
      if (!dateMap[date]) dateMap[date] = { date, total: 0 };
      dateMap[date][status] = r.count;
      dateMap[date].total += r.count;
    });

    res.json({
      success: true,
      data: Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (err) {
    console.error('Admin analytics trends error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/analytics/volunteer-performance?range=30d
 */
router.get('/analytics/volunteer-performance', async (req, res) => {
  try {
    const { range = '30d', from, to } = req.query;
    const { start, end } = resolveDateRange(range, from, to);

    const stats = await Report.aggregate([
      {
        $match: {
          assignedTo: { $ne: null },
          updatedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$assignedTo',
          assigned: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          avgResolutionMs: {
            $avg: {
              $cond: [
                { $and: [{ $eq: ['$status', 'resolved'] }, { $ne: ['$resolvedAt', null] }] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                null,
              ],
            },
          },
        },
      },
      { $sort: { resolved: -1 } },
      { $limit: 20 },
    ]);

    const uids = stats.map(s => s._id).filter(Boolean);
    const users = await User.find({ firebaseUid: { $in: uids } })
      .select('firebaseUid name email avatar')
      .lean();
    const userMap = Object.fromEntries(users.map(u => [u.firebaseUid, u]));

    const enriched = stats.map(s => ({
      firebaseUid: s._id,
      user: userMap[s._id] || { firebaseUid: s._id, name: 'Unknown' },
      assigned: s.assigned,
      resolved: s.resolved,
      completionRate: s.assigned > 0 ? Math.round((s.resolved / s.assigned) * 100) : 0,
      avgResolutionHours: s.avgResolutionMs
        ? Math.round(s.avgResolutionMs / 1000 / 3600 * 10) / 10
        : null,
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Admin volunteer performance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   DOCUMENTS
═══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/documents
 */
router.get('/documents', async (req, res) => {
  try {
    const { category, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (category) filter.category = String(category);

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      Document.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Document.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: docs,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    console.error('Admin get documents error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/documents
 * Body: { title, url, fileType?, fileSize?, category?, description? }
 */
router.post('/documents', async (req, res) => {
  try {
    const { title, url, fileType, fileSize, category, description } = req.body;

    if (!title || !url) {
      return res.status(400).json({ success: false, message: 'title and url are required' });
    }

    // Validate URL scheme to prevent XSS via javascript: or data: URLs
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ success: false, message: 'URL must use http or https' });
      }
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid URL format' });
    }

    const uploadedBy = req.adminUser?.firebaseUid || 'system';
    const doc = await Document.create({ title, url, fileType, fileSize, category, description, uploadedBy });

    logAdminAction({
      req,
      actor: req.adminUser,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'document',
      entityId: String(doc._id),
      metadata: { title, url, category, fileType, fileSize: fileSize || 0 },
    });

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error('Admin create document error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/admin/documents/:id
 */
router.delete('/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document ID' });
    }

    const doc = await Document.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    logAdminAction({
      req,
      actor: req.adminUser,
      action: 'DOCUMENT_DELETED',
      entityType: 'document',
      entityId: id,
      metadata: { title: doc.title, url: doc.url, category: doc.category },
    });

    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    console.error('Admin delete document error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   SETTINGS
═══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/settings
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { key: 'system' },
      { $setOnInsert: { key: 'system' } },
      { new: true, upsert: true }
    ).lean();
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Admin get settings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/settings
 */
router.put('/settings', async (req, res) => {
  try {
    const allowedFields = [
      'reportAutoExpiryDays',
      'mapDefaultRadiusKm',
      'severityThresholds',
      'allowVolunteerSelfAssign',
      'requireImageForReport',
      'maxReportsPerDay',
    ];

    const update = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    }

    // Capture old values before update for meaningful metadata
    const oldSettings = await Settings.findOne({ key: 'system' }).lean();
    const oldValues = {};
    const newValues = {};
    for (const field of Object.keys(update)) {
      oldValues[field] = oldSettings?.[field] ?? null;
      newValues[field] = update[field];
    }

    const settings = await Settings.findOneAndUpdate(
      { key: 'system' },
      { $set: update },
      { new: true, upsert: true }
    ).lean();

    logAdminAction({
      req,
      actor: req.adminUser,
      action: 'SETTINGS_UPDATED',
      entityType: 'settings',
      entityId: 'system',
      metadata: { oldValues, newValues },
    });

    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Admin update settings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   USER MANAGEMENT (admin-only)
═══════════════════════════════════════════════════════════════════ */

// Safe fields projection - never return sensitive internal data
const USER_SAFE_FIELDS =
  'firebaseUid name email role avatar phone isVerified isSuspended suspendedReason suspendedAt reportsSubmitted cleanupsCompleted createdAt updatedAt';

const VALID_ROLES = ['citizen', 'volunteer', 'staff', 'admin'];

/**
 * GET /api/admin/users
 * Query: q (search), role, status (active|suspended), sort (newest|oldest|name), page, limit
 */
router.get('/users', async (req, res) => {
  try {
    const { q, role, status, sort = 'newest', page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = {};

    if (role && VALID_ROLES.includes(String(role))) {
      filter.role = String(role);
    }
    if (status === 'suspended') filter.isSuspended = true;
    if (status === 'active')    filter.isSuspended = { $ne: true };

    if (q && String(q).trim()) {
      const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      filter.$or = [{ name: rx }, { email: rx }];
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name:   { name: 1 },
    };
    const sortKey = sortMap[String(sort)] || sortMap.newest;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(USER_SAFE_FIELDS)
        .sort(sortKey)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/users/:id
 * Returns user profile + stats (reports count, tasks count, last activity)
 */
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findById(id).select(USER_SAFE_FIELDS).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const [reportsCount, tasksCount, lastReport] = await Promise.all([
      Report.countDocuments({ firebaseUid: user.firebaseUid }),
      user.role === 'volunteer'
        ? Report.countDocuments({ assignedTo: user.firebaseUid, status: 'resolved' })
        : Promise.resolve(null),
      Report.findOne({ firebaseUid: user.firebaseUid })
        .sort({ createdAt: -1 })
        .select('createdAt')
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        user,
        stats: {
          reportsSubmitted: reportsCount,
          tasksCompleted: tasksCount,
          lastActivity: lastReport?.createdAt || user.updatedAt,
        },
      },
    });
  } catch (err) {
    console.error('Admin get user error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Body: { role: "citizen"|"volunteer"|"staff"|"admin" }
 * Prevents self-demotion lockout (last admin cannot demote themselves).
 */
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !VALID_ROLES.includes(String(role))) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be one of: ' + VALID_ROLES.join(', ') });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    // Prevent self-demotion lockout: admin trying to remove their own admin role
    if (
      target.firebaseUid === req.adminUser.firebaseUid &&
      target.role === 'admin' &&
      String(role) !== 'admin'
    ) {
      const otherAdminCount = await User.countDocuments({
        role: 'admin',
        _id: { $ne: target._id },
      });
      if (otherAdminCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote yourself — you are the only admin. Promote another user first.',
        });
      }
    }

    const oldRole = target.role;
    target.role = String(role);
    target.updatedByUid = req.adminUser.firebaseUid;
    await target.save();

    await logAdminAction({
      req,
      actor: req.adminUser,
      action: 'USER_ROLE_CHANGED',
      entityType: 'user',
      entityId: target._id.toString(),
      metadata: { targetEmail: target.email, targetUid: target.firebaseUid, oldRole, newRole: String(role) },
    });

    const safeUser = await User.findById(target._id).select(USER_SAFE_FIELDS).lean();
    res.json({ success: true, data: safeUser });
  } catch (err) {
    console.error('Admin update user role error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/admin/users/:id/suspend
 * Body: { isSuspended: boolean, reason?: string }
 */
router.patch('/users/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const { isSuspended, reason } = req.body;

    if (typeof isSuspended !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isSuspended must be a boolean' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    // Cannot suspend your own account
    if (target.firebaseUid === req.adminUser.firebaseUid) {
      return res.status(400).json({ success: false, message: 'Cannot suspend your own account.' });
    }

    target.isSuspended    = isSuspended;
    target.suspendedReason = isSuspended ? (reason ? String(reason).slice(0, 500) : null) : null;
    target.suspendedAt    = isSuspended ? new Date() : null;
    target.updatedByUid   = req.adminUser.firebaseUid;
    await target.save();

    await logAdminAction({
      req,
      actor: req.adminUser,
      action: isSuspended ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
      entityType: 'user',
      entityId: target._id.toString(),
      metadata: {
        targetEmail: target.email,
        targetUid: target.firebaseUid,
        isSuspended,
        reason: reason || null,
      },
    });

    const safeUser = await User.findById(target._id).select(USER_SAFE_FIELDS).lean();
    res.json({ success: true, data: safeUser });
  } catch (err) {
    console.error('Admin suspend user error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/users/:id/reports
 * Paginated report history for a user.
 */
router.get('/users/:id/reports', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findById(id).select('firebaseUid').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const filter = { firebaseUid: user.firebaseUid };
    if (status) {
      const validStatuses = ['pending', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected'];
      if (validStatuses.includes(String(status))) filter.status = String(status);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Report.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('Admin get user reports error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/users/:id/tasks
 * Volunteer task (assigned report) history.
 */
router.get('/users/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findById(id).select('firebaseUid role').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role !== 'volunteer') {
      return res.status(400).json({ success: false, message: 'Task history is only available for volunteers.' });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [tasks, total] = await Promise.all([
      Report.find({ assignedTo: user.firebaseUid })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Report.countDocuments({ assignedTo: user.firebaseUid }),
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('Admin get user tasks error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   AUDIT LOG
═══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/audit-logs
 * Query: page, limit, action, actorUid, entityType, dateFrom, dateTo, search
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 30,
      action,
      actorUid,
      entityType,
      dateFrom,
      dateTo,
      search,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const filter = {};

    if (action)     filter.action     = String(action);
    if (actorUid)   filter.actorUid   = String(actorUid);
    if (entityType) filter.entityType = String(entityType);

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(String(dateFrom));
      if (dateTo) {
        const toStr = String(dateTo);
        // If dateTo is a date-only string (e.g. "2024-01-15"), interpret it as end-of-day UTC
        filter.createdAt.$lte = toStr.length === 10 && !toStr.includes('T')
          ? new Date(toStr + 'T23:59:59.999Z')
          : new Date(toStr);
      }
    }

    if (search && String(search).trim()) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      filter.$or = [
        { actorEmail: rx },
        { entityId:   rx },
        { 'metadata.assignedToEmail': rx },
        { 'metadata.title': rx },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page:  Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('Admin audit logs error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/audit-logs/:id
 */
router.get('/audit-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid audit log ID' });
    }
    const log = await AuditLog.findById(id).lean();
    if (!log) return res.status(404).json({ success: false, message: 'Audit log not found' });
    res.json({ success: true, data: log });
  } catch (err) {
    console.error('Admin audit log detail error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   HELPER
═══════════════════════════════════════════════════════════════════ */

function resolveDateRange(range, from, to) {
  if (from && to) {
    return { start: new Date(from), end: new Date(to) };
  }
  const end = new Date();
  const start = new Date();
  const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
  start.setDate(start.getDate() - days);
  return { start, end };
}

export default router;
